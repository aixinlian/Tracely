import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Calendar,
  CalendarDays,
  Check,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/page/primitives";
import { toast } from "@/components/ui/toast";
import { db, type ReportPeriod } from "@/lib/db";
import {
  getPeriodRange,
  getPeriodLabel,
  formatDateRange,
  formatDateRangeCompact,
} from "@/lib/period";
import {
  useReportGeneration,
  type ChatMessage,
} from "@/components/report-generation-provider";
import { validateReportGeneration } from "@/lib/validation";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: { value: ReportPeriod; label: string; icon: typeof Calendar }[] = [
  { value: "daily", label: "日报", icon: FileText },
  { value: "weekly", label: "周报", icon: CalendarDays },
  { value: "monthly", label: "月报", icon: Calendar },
  { value: "yearly", label: "年报", icon: Sparkles },
];

// ── Chat panel ─────────────────────────────────────────────────────────────────

function ChatPanel() {
  const { chatMessages, refining, refine } = useReportGeneration();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  // Sent-message history for ↑ / ↓ navigation (like a terminal).
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1); // -1 = not browsing
  const draftRef = useRef("");        // draft saved when entering history

  // Scroll to bottom when new messages arrive.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, refining]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg || refining) return;
    historyRef.current.push(msg);
    historyIndexRef.current = -1;
    draftRef.current = "";
    setInput("");
    await refine(msg);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    const history = historyRef.current;
    if (e.key === "ArrowUp" && history.length > 0) {
      e.preventDefault();
      if (historyIndexRef.current === -1) {
        draftRef.current = input;
        historyIndexRef.current = history.length - 1;
      } else if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
      }
      setInput(history[historyIndexRef.current]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndexRef.current === -1) return;
      if (historyIndexRef.current < history.length - 1) {
        historyIndexRef.current += 1;
        setInput(history[historyIndexRef.current]);
      } else {
        historyIndexRef.current = -1;
        setInput(draftRef.current);
      }
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {/* Message list — only rendered after the first follow-up */}
      {chatMessages.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
          {chatMessages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {refining && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span className="text-xs">AI 正在修改报告…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <textarea
          className={cn(
            "min-h-20 max-h-40 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary",
          )}
          placeholder="对报告提出修改意见，例如：帮我增加到 10 条 / 把语气改得更正式…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={refining}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!input.trim() || refining}
          className="shrink-0"
        >
          {refining ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        按 Enter 发送，Shift + Enter 换行
      </p>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] select-text rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant messages: show a compact confirmation with the item count,
  // since the full report is already visible above.
  const itemCount = (message.content.match(/^\d+\./gm) ?? []).length;
  const isError = message.content.startsWith("⚠️");

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "flex items-center gap-1.5 select-text rounded-lg px-3 py-2 text-xs",
          isError
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isError ? (
          message.content
        ) : (
          <>
            <Check className="size-3 shrink-0 text-green-500" />
            {itemCount > 0
              ? `报告已更新，共 ${itemCount} 条`
              : "报告已根据您的要求更新"}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DailyReport() {
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [copied, setCopied] = useState(false);
  const { generating, content, error, resultPeriod, isFromCache, generate } =
    useReportGeneration();

  const projects = useLiveQuery(() => db.projects.toArray(), []);
  const providers = useLiveQuery(() => db.providers.toArray(), []);
  const reports = useLiveQuery(
    () => db.reports.where("period").equals(period).count(),
    [period],
  );

  const defaultProvider = providers?.find((p) => p.defaultModel);
  const range = getPeriodRange(period);

  // Only surface content/error that belongs to the period on screen right now.
  const showContent = resultPeriod === period ? content : null;
  const showError = resultPeriod === period ? error : null;

  const totalProjects = projects?.length ?? 0;
  const totalReports = reports ?? 0;

  async function handleGenerate(period: ReportPeriod, forceRegenerate = false) {
    // Validate configuration before generating
    const validation = await validateReportGeneration();
    if (!validation.isValid) {
      toast.error(validation.message || "配置验证失败");
      return;
    }
    await generate(period, forceRegenerate);
  }

  async function handleCopy() {
    if (!showContent) return;
    try {
      await navigator.clipboard.writeText(showContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("复制失败", e);
    }
  }

  return (
    <div>
      <PageHeader
        title="生成报告"
        description="根据所有项目的 Git 提交记录与未提交改动，快速生成工作报告。"
        action={
          <Button onClick={() => handleGenerate(period)} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                生成{getPeriodLabel(period)}
              </>
            )}
          </Button>
        }
      />

      <div className="mb-6 flex items-center gap-2">
        {PERIOD_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = period === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-card-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="关联项目" value={`${totalProjects} 个`} icon={FileText} />
        <StatCard
          label="时间范围"
          value={formatDateRangeCompact(range.start, range.end)}
          title={formatDateRange(range.start, range.end)}
          icon={CalendarDays}
        />
        <StatCard label={`本${getPeriodLabel(period).slice(0, 1)}报告`} value={`${totalReports} 份`} icon={Sparkles} />
      </div>

      {showError ? (
        <Card className="mt-6 p-6">
          <p className="text-sm text-destructive">{showError}</p>
        </Card>
      ) : null}

      {showContent ? (
        <Card className="mt-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">
                {getPeriodLabel(period)} · {formatDateRange(range.start, range.end)}
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isFromCache && resultPeriod === period
                  ? "已从历史记录加载，点击重新生成可获取最新内容。"
                  : "已生成，可直接编辑后保存或导出。"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isFromCache && resultPeriod === period ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerate(period, true)}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      重新生成中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-4" />
                      重新生成
                    </>
                  )}
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={copied}
              >
                {copied ? (
                  <>
                    <Check className="size-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    复制
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Report content */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div
              className="report-content rounded-lg border border-border bg-muted/20 p-4 text-sm"
              dangerouslySetInnerHTML={{
                __html: showContent
                  .replace(/\n/g, "<br/>")
                  .replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => {
                    const level = hashes.length;
                    return `<h${level} class="font-semibold mt-4 mb-2">${text}</h${level}>`;
                  })
                  .replace(/^\*\s+(.+)$/gm, "<li>$1</li>")
                  .replace(/(<li>.*<\/li>)/gs, "<ul class='list-disc pl-5 space-y-1'>$1</ul>")
                  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
              }}
            />
          </div>

          {/* Follow-up chat */}
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5" />
              对生成结果不满意？在下方继续对话来调整报告
            </div>
            <ChatPanel />
          </div>
        </Card>
      ) : generating ? (
        <Card className="mt-6 p-6">
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 bg-muted/20 p-8 text-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              正在生成{getPeriodLabel(period)}，可切换页面，生成完成后结果会保留在这里。
            </p>
          </div>
        </Card>
      ) : totalProjects === 0 ? (
        <EmptyState
          icon={FileText}
          title="还没有项目"
          description="请先在「项目管理」中添加本地 Git 仓库，然后回到这里生成报告。"
        />
      ) : !defaultProvider ? (
        <EmptyState
          icon={Sparkles}
          title="还没有 AI 供应商"
          description="请先在「系统设置」中配置一个 OpenAI 兼容供应商。"
        />
      ) : (
        <Card className="mt-6 p-6">
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            点击右上角「生成{getPeriodLabel(period)}」按钮开始
          </div>
        </Card>
      )}
    </div>
  );
}
