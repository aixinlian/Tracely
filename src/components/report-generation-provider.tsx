import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { db, type ReportPeriod } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import { getRepoActivity, type RepoActivity } from "@/lib/git";
import { getPeriodRange, getPeriodLabel, formatDateRange } from "@/lib/period";
import { addReport, updateReport, findExistingReport } from "@/lib/reports";
import { resolveGitAuthor } from "@/lib/settings";

/**
 * Report generation is lifted out of the Daily page into an app-level context
 * so that an in-flight generation survives route changes. When the user leaves
 * the page mid-generation and comes back, both the "生成中" button state and the
 * resulting content are still here.
 */

export type ChatMessage = {
  role: "user" | "assistant";
  /** user: the raw instruction; assistant: the full updated report content */
  content: string;
};

type GenerationState = {
  /** Whether a generation is currently running. */
  generating: boolean;
  /** The period the running/last generation targets. */
  content: string | null;
  error: string | null;
  /** The period whose content is currently held, so the page can match display. */
  resultPeriod: ReportPeriod | null;
  /** Whether the current content is from cache (existing report). */
  isFromCache: boolean;
  /** Follow-up chat messages after the initial generation. */
  chatMessages: ChatMessage[];
  /** Whether a follow-up refinement is in progress. */
  refining: boolean;
};

type ReportGenerationContextValue = GenerationState & {
  generate: (period: ReportPeriod, forceRegenerate?: boolean) => Promise<void>;
  refine: (userMessage: string) => Promise<void>;
  reset: () => void;
};

const ReportGenerationContext =
  createContext<ReportGenerationContextValue | null>(null);

function buildPrompt(
  period: ReportPeriod,
  start: string,
  end: string,
  activities: { projectName: string; activity: RepoActivity }[],
): string {
  const periodLabel = getPeriodLabel(period);
  const dateRange = formatDateRange(start, end);

  let prompt = `你是一个技术工作报告助手。请根据以下 Git 提交记录和未提交改动，生成一份清晰、专业的${periodLabel}。\n\n`;
  prompt += `时间范围：${dateRange}\n\n`;

  for (const { projectName, activity } of activities) {
    prompt += `## 项目：${projectName}\n\n`;

    if (activity.commits.length > 0) {
      prompt += `### 已提交记录（${activity.commits.length} 条）\n\n`;
      for (const commit of activity.commits) {
        prompt += `- **${commit.message}**\n`;
        prompt += `  作者：${commit.author} | 时间：${commit.date}\n`;
        prompt += `  哈希：${commit.hash.slice(0, 8)}\n\n`;
      }
    }

    if (activity.uncommitted.length > 0) {
      prompt += `### 未提交改动（${activity.uncommitted.length} 个文件）\n\n`;
      for (const line of activity.uncommitted.slice(0, 20)) {
        prompt += `- ${line}\n`;
      }
      if (activity.uncommitted.length > 20) {
        prompt += `- ... 还有 ${activity.uncommitted.length - 20} 个文件\n`;
      }
      prompt += `\n`;
    }

    if (activity.commits.length === 0 && activity.uncommitted.length === 0) {
      prompt += `本项目在此期间没有提交记录或未提交改动。\n\n`;
    }
  }

  prompt += `\n请用中文生成一份${periodLabel}，要求：\n`;
  prompt += `1. 使用列表格式，每一条代表一项具体工作\n`;
  prompt += `2. 每条以序号开头，描述具体做了什么（例如："1. 企业人员档案模型添加上传者和文件大小并推送至线上数据库"）\n`;
  prompt += `3. 不要分项目分类，将所有工作按重要性或时间顺序排列\n`;
  prompt += `4. 每条工作描述要具体、清晰，包含关键的技术点或功能点\n`;
  prompt += `5. 语言简洁、专业，避免冗长的段落\n\n`;
  prompt += `输出格式示例：\n`;
  prompt += `1. 完成了某某功能模块的开发和测试\n`;
  prompt += `2. 修复了某某页面的样式问题\n`;
  prompt += `3. 优化了某某接口的性能\n\n`;
  prompt += `请直接输出工作列表，不需要标题和总结。`;

  return prompt;
}

function buildRefinePrompt(currentContent: string, userMessage: string): string {
  return (
    `以下是当前已生成的工作报告：\n` +
    `---\n${currentContent}\n---\n\n` +
    `用户要求：${userMessage}\n\n` +
    `请根据用户的要求修改报告，直接输出修改后的完整工作列表，` +
    `格式与原报告保持一致（以序号开头的列表），不需要额外的标题或说明。`
  );
}

export function ReportGenerationProvider({ children }: { children: ReactNode }) {
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultPeriod, setResultPeriod] = useState<ReportPeriod | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [refining, setRefining] = useState(false);

  // Guard against overlapping generations / refinements.
  const runningRef = useRef(false);

  const generate = useCallback(async (period: ReportPeriod, forceRegenerate = false) => {
    if (runningRef.current) return;
    runningRef.current = true;

    const range = getPeriodRange(period);

    const projects = await db.projects.toArray();
    if (projects.length === 0) {
      setError("请先在「项目管理」中添加至少一个项目。");
      runningRef.current = false;
      return;
    }

    const providers = await db.providers.toArray();
    const defaultProvider = providers.find((p) => p.defaultModel);
    if (!defaultProvider) {
      setError("请先在「系统设置」中配置一个 AI 供应商。");
      runningRef.current = false;
      return;
    }

    setGenerating(true);
    setError(null);
    setContent(null);
    setResultPeriod(period);
    setIsFromCache(false);
    setChatMessages([]); // Clear chat history on fresh generation

    try {
      const existing = await findExistingReport(period, range.start, range.end);
      if (existing && !forceRegenerate) {
        setContent(existing.content);
        setIsFromCache(true);
        setGenerating(false);
        runningRef.current = false;
        return;
      }

      // Filter commits to the configured git author, so reports only count
      // the user's own work rather than every contributor in the repo.
      const author = await resolveGitAuthor();

      const activities: { projectName: string; activity: RepoActivity }[] = [];
      for (const project of projects) {
        try {
          const activity = await getRepoActivity(
            project.path,
            range.start,
            range.end,
            project.branches,
            author || undefined,
          );
          activities.push({ projectName: project.name, activity });
        } catch (e) {
          console.error(`Failed to get activity for ${project.name}:`, e);
        }
      }

      const prompt = buildPrompt(period, range.start, range.end, activities);

      const generated = await chatCompletion({
        endpoint: defaultProvider.endpoint,
        apiKey: defaultProvider.apiKey,
        model: defaultProvider.defaultModel || defaultProvider.models[0] || "",
        prompt,
      });

      setContent(generated);
      setIsFromCache(false);

      // If regenerating, update existing report instead of creating a new one
      if (forceRegenerate && existing) {
        await updateReport(existing.id, { content: generated });
      } else {
        await addReport({
          period,
          startDate: range.start,
          endDate: range.end,
          content: generated,
          projectIds: projects.map((p) => p.id),
          providerId: defaultProvider.id,
        });
      }
    } catch (e) {
      setError(`生成失败：${String(e)}`);
    } finally {
      setGenerating(false);
      runningRef.current = false;
    }
  }, []);

  const refine = useCallback(
    async (userMessage: string) => {
      if (runningRef.current || !content || !resultPeriod) return;
      runningRef.current = true;
      setRefining(true);

      // Append user message to chat history immediately so the UI feels responsive.
      setChatMessages((prev) => [...prev, { role: "user", content: userMessage }]);

      try {
        const providers = await db.providers.toArray();
        const defaultProvider = providers.find((p) => p.defaultModel);
        if (!defaultProvider) {
          throw new Error("未找到 AI 供应商，请先在「系统设置」中配置。");
        }

        const prompt = buildRefinePrompt(content, userMessage);
        const updated = await chatCompletion({
          endpoint: defaultProvider.endpoint,
          apiKey: defaultProvider.apiKey,
          model: defaultProvider.defaultModel || defaultProvider.models[0] || "",
          prompt,
        });

        setContent(updated);

        // Append assistant acknowledgement to chat history.
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: updated },
        ]);

        // Persist the updated content to the DB.
        const range = getPeriodRange(resultPeriod);
        const existing = await findExistingReport(
          resultPeriod,
          range.start,
          range.end,
        );
        if (existing) {
          await updateReport(existing.id, { content: updated });
        }
      } catch (e) {
        // Show error in chat instead of the global error banner.
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ 请求失败：${String(e)}` },
        ]);
      } finally {
        setRefining(false);
        runningRef.current = false;
      }
    },
    [content, resultPeriod],
  );

  const reset = useCallback(() => {
    setContent(null);
    setError(null);
    setResultPeriod(null);
    setIsFromCache(false);
    setChatMessages([]);
  }, []);

  return (
    <ReportGenerationContext.Provider
      value={{
        generating,
        content,
        error,
        resultPeriod,
        isFromCache,
        chatMessages,
        refining,
        generate,
        refine,
        reset,
      }}
    >
      {children}
    </ReportGenerationContext.Provider>
  );
}

export function useReportGeneration() {
  const ctx = useContext(ReportGenerationContext);
  if (!ctx) {
    throw new Error(
      "useReportGeneration must be used within a ReportGenerationProvider",
    );
  }
  return ctx;
}
