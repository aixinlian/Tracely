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
import { addReport, findExistingReport } from "@/lib/reports";
import { resolveGitAuthor } from "@/lib/settings";

/**
 * Report generation is lifted out of the Daily page into an app-level context
 * so that an in-flight generation survives route changes. When the user leaves
 * the page mid-generation and comes back, both the "生成中" button state and the
 * resulting content are still here.
 */

type GenerationState = {
  /** Whether a generation is currently running. */
  generating: boolean;
  /** The period the running/last generation targets. */
  content: string | null;
  error: string | null;
  /** The period whose content is currently held, so the page can match display. */
  resultPeriod: ReportPeriod | null;
};

type ReportGenerationContextValue = GenerationState & {
  generate: (period: ReportPeriod) => Promise<void>;
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

  prompt += `\n请用中文生成一份${periodLabel}，包括：\n`;
  prompt += `1. 工作概述（2-3 句话总结主要工作）\n`;
  prompt += `2. 按项目分类的详细工作内容（列出关键提交和改动）\n`;
  prompt += `3. 遇到的问题与解决方案（如果有）\n`;
  prompt += `4. 下一步计划（可选）\n\n`;
  prompt += `使用 Markdown 格式，语言简洁、专业。`;

  return prompt;
}

export function ReportGenerationProvider({ children }: { children: ReactNode }) {
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultPeriod, setResultPeriod] = useState<ReportPeriod | null>(null);

  // Guard against overlapping generations (e.g. rapid double clicks).
  const runningRef = useRef(false);

  const generate = useCallback(async (period: ReportPeriod) => {
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

    try {
      const existing = await findExistingReport(period, range.start, range.end);
      if (existing) {
        setContent(existing.content);
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

      await addReport({
        period,
        startDate: range.start,
        endDate: range.end,
        content: generated,
        projectIds: projects.map((p) => p.id),
        providerId: defaultProvider.id,
      });
    } catch (e) {
      setError(`生成失败：${String(e)}`);
    } finally {
      setGenerating(false);
      runningRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setContent(null);
    setError(null);
    setResultPeriod(null);
  }, []);

  return (
    <ReportGenerationContext.Provider
      value={{ generating, content, error, resultPeriod, generate, reset }}
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
