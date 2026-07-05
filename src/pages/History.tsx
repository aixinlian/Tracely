import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Calendar,
  CalendarDays,
  Check,
  CheckSquare,
  Clock,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/page/primitives";
import { toast } from "@/components/ui/toast";
import { db, type Report, type ReportPeriod } from "@/lib/db";
import { addReport, removeReport, updateReport } from "@/lib/reports";
import { getPeriodLabel, formatDateRange } from "@/lib/period";
import { chatCompletion } from "@/lib/ai";
import { cn } from "@/lib/utils";

type LocalChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PeriodFilter = ReportPeriod | "all";

const PERIOD_OPTIONS: {
  value: PeriodFilter;
  label: string;
  icon: typeof Clock;
}[] = [
  { value: "all", label: "全部", icon: Clock },
  { value: "daily", label: "日报", icon: FileText },
  { value: "weekly", label: "周报", icon: CalendarDays },
  { value: "monthly", label: "月报", icon: Calendar },
  { value: "yearly", label: "年报", icon: Sparkles },
];

/** Build a prompt that asks the AI to refine an existing report. */
function buildRefinePrompt(currentContent: string, userMessage: string): string {
  return (
    `以下是当前已生成的工作报告：\n` +
    `---\n${currentContent}\n---\n\n` +
    `用户要求：${userMessage}\n\n` +
    `请根据用户的要求修改报告，直接输出修改后的完整工作列表，` +
    `格式与原报告保持一致（以序号开头的列表），不需要额外的标题或说明。`
  );
}

/** Minimal markdown → HTML, mirrors the approach used in Daily.tsx. */
function renderMarkdown(content: string): string {
  return content
    .replace(/\n/g, "<br/>")
    .replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => {
      const level = hashes.length;
      return `<h${level} class="font-semibold mt-4 mb-2">${text}</h${level}>`;
    })
    .replace(/^\*\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul class='list-disc pl-5 space-y-1'>$1</ul>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function History() {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [search, setSearch] = useState("");
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const reports = useLiveQuery(
    () =>
      periodFilter === "all"
        ? db.reports.orderBy("createdAt").reverse().toArray()
        : db.reports
            .where("period")
            .equals(periodFilter)
            .reverse()
            .sortBy("startDate"),
    [periodFilter],
  );

  const filtered = reports?.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.content.toLowerCase().includes(q) ||
      r.startDate.includes(q) ||
      r.endDate.includes(q) ||
      getPeriodLabel(r.period).includes(q)
    );
  });

  function toggleSelectAll() {
    if (!filtered) return;
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  }

  function toggleSelect(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await removeReport(id);
      if (previewReport?.id === id) setPreviewReport(null);
    }
    setSelectedIds(new Set());
    toast.success(`已删除 ${selectedIds.size} 份报告。`);
  }

  async function handleDelete(id: number) {
    await removeReport(id);
    setConfirmDeleteId(null);
    if (previewReport?.id === id) setPreviewReport(null);
    selectedIds.delete(id);
    setSelectedIds(new Set(selectedIds));
    toast.success("报告已删除。");
  }

  async function handleExportJSON() {
    try {
      const data = (filtered ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ id: _id, ...rest }) => rest,
      );
      if (data.length === 0) {
        toast.warning("没有可导出的报告数据。");
        return;
      }

      // 使用 Tauri 的保存对话框
      const filePath = await save({
        defaultPath: `tracely-reports-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [
          {
            name: "JSON",
            extensions: ["json"],
          },
        ],
      });

      if (!filePath) {
        // 用户取消了保存
        return;
      }

      // 写入文件内容
      const jsonContent = JSON.stringify(data, null, 2);
      await writeTextFile(filePath, jsonContent);

      toast.success(`已导出 ${data.length} 份报告为 JSON 文件。`);
    } catch (err) {
      toast.error(`导出失败：${String(err)}`);
      console.error("Export JSON failed:", err);
    }
  }

  async function handleExportMarkdown() {
    try {
      const md = (filtered ?? [])
        .map((r) => {
          const heading = `# ${getPeriodLabel(r.period)} · ${formatDateRange(r.startDate, r.endDate)}`;
          const meta = `> 生成时间：${new Date(r.createdAt).toLocaleString("zh-CN")}`;
          return `${heading}\n\n${meta}\n\n${r.content}`;
        })
        .join("\n\n---\n\n");

      if (!md) {
        toast.warning("没有可导出的报告数据。");
        return;
      }

      // 使用 Tauri 的保存对话框
      const filePath = await save({
        defaultPath: `tracely-reports-${new Date().toISOString().slice(0, 10)}.md`,
        filters: [
          {
            name: "Markdown",
            extensions: ["md"],
          },
        ],
      });

      if (!filePath) {
        // 用户取消了保存
        return;
      }

      // 写入文件内容
      await writeTextFile(filePath, md);

      toast.success("已导出为 Markdown 文件。");
    } catch (err) {
      toast.error(`导出失败：${String(err)}`);
      console.error("Export Markdown failed:", err);
    }
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data: unknown = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error("期望 JSON 数组格式。");
        let count = 0;
        for (const item of data) {
          if (
            !item ||
            typeof item !== "object" ||
            !("period" in item) ||
            !("startDate" in item) ||
            !("endDate" in item) ||
            !("content" in item)
          )
            continue;
          await addReport({
            period: (item as Report).period,
            startDate: (item as Report).startDate,
            endDate: (item as Report).endDate,
            content: (item as Report).content,
            projectIds: (item as Report).projectIds ?? [],
            providerId: (item as Report).providerId ?? 0,
          });
          count++;
        }
        toast.success(`已成功导入 ${count} 条报告。`);
      } catch (err) {
        toast.error(`导入失败：${String(err)}`);
      }
    };
    input.click();
  }

  const total = filtered?.length ?? 0;
  const allSelected = filtered && filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <div>
      <PageHeader
        title="历史记录"
        description="查看、管理过往生成的工作报告，支持删除、导入与导出。"
        action={
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 text-sm text-muted-foreground">
              <Search className="size-4 shrink-0" />
              <input
                className="w-36 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                placeholder="搜索报告..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {selectedIds.size > 0 ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="size-4" />
                删除选中 ({selectedIds.size})
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Upload className="size-4" />
              导入
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              disabled={total === 0}
            >
              <Download className="size-4" />
              导出 JSON
            </Button>
          </div>
        }
      />

      {/* Period filter */}
      <div className="mb-6 flex items-center gap-2">
        {PERIOD_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = periodFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setPeriodFilter(opt.value)}
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

      {/* List */}
      {!filtered || filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="暂无历史记录"
          description={
            search.trim()
              ? "没有与搜索词匹配的报告。"
              : "生成报告后，历史记录会在这里展示。"
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Select all button */}
          <div className="flex items-center gap-2 px-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="text-muted-foreground"
            >
              {allSelected ? (
                <CheckSquare className="size-4" />
              ) : (
                <Square className="size-4" />
              )}
              {allSelected ? "取消全选" : "全选"}
            </Button>
            {selectedIds.size > 0 ? (
              <span className="text-xs text-muted-foreground">
                已选中 {selectedIds.size} / {total}
              </span>
            ) : null}
          </div>

          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              selected={selectedIds.has(report.id)}
              confirmDelete={confirmDeleteId === report.id}
              onToggleSelect={() => toggleSelect(report.id)}
              onPreview={() => setPreviewReport(report)}
              onDeleteRequest={() => setConfirmDeleteId(report.id)}
              onDeleteConfirm={() => handleDelete(report.id)}
              onDeleteCancel={() => setConfirmDeleteId(null)}
            />
          ))}
        </div>
      )}

      {/* Export as Markdown secondary action */}
      {total > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExportMarkdown}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            导出为 Markdown (.md)
          </button>
        </div>
      )}

      {/* Preview modal */}
      {previewReport && (
        <PreviewModal
          report={previewReport}
          onClose={() => setPreviewReport(null)}
          onDelete={() => {
            setConfirmDeleteId(previewReport.id);
            setPreviewReport(null);
          }}
        />
      )}
    </div>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

interface ReportCardProps {
  report: Report;
  selected: boolean;
  confirmDelete: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function ReportCard({
  report,
  selected,
  confirmDelete,
  onToggleSelect,
  onPreview,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: ReportCardProps) {
  // Strip markdown syntax for the one-line preview
  const preview = report.content
    .replace(/#+\s/g, "")
    .replace(/\*+/g, "")
    .replace(/\n+/g, " ")
    .slice(0, 110);

  return (
    <Card className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/30">
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60"
      >
        {selected ? (
          <CheckSquare className="size-5 text-primary" />
        ) : (
          <Square className="size-5" />
        )}
      </button>

      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="size-5" />
      </div>

      {/* Main clickable area */}
      <button className="min-w-0 flex-1 text-left" onClick={onPreview}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {getPeriodLabel(report.period)} ·{" "}
            {formatDateRange(report.startDate, report.endDate)}
          </span>
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground">
            {report.period}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {preview}…
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          {new Date(report.createdAt).toLocaleString("zh-CN")}
        </p>
      </button>

      {/* Delete action */}
      <div className="flex shrink-0 items-center gap-1">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs text-destructive">确认删除？</span>
            <Button variant="destructive" size="sm" onClick={onDeleteConfirm}>
              删除
            </Button>
            <Button variant="ghost" size="sm" onClick={onDeleteCancel}>
              取消
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest();
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────

interface PreviewModalProps {
  report: Report;
  onClose: () => void;
  onDelete: () => void;
}

function PreviewModal({ report, onClose, onDelete }: PreviewModalProps) {
  const [content, setContent] = useState(report.content);
  const [chatMessages, setChatMessages] = useState<LocalChatMessage[]>([]);
  const [refining, setRefining] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const refiningRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const draftRef = useRef("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, refining]);

  async function handleRefine() {
    const msg = chatInput.trim();
    if (!msg || refiningRef.current) return;
    refiningRef.current = true;
    setRefining(true);
    historyRef.current.push(msg);
    historyIndexRef.current = -1;
    draftRef.current = "";
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);

    try {
      const providers = await db.providers.toArray();
      const defaultProvider = providers.find((p) => p.defaultModel);
      if (!defaultProvider) throw new Error("未找到 AI 供应商，请先在「系统设置」中配置。");

      const prompt = buildRefinePrompt(content, msg);
      const updated = await chatCompletion({
        endpoint: defaultProvider.endpoint,
        apiKey: defaultProvider.apiKey,
        model: defaultProvider.defaultModel || defaultProvider.models[0] || "",
        prompt,
      });

      setContent(updated);
      await updateReport(report.id, { content: updated });
      setChatMessages((prev) => [...prev, { role: "assistant", content: updated }]);
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ 请求失败：${String(e)}` },
      ]);
    } finally {
      setRefining(false);
      refiningRef.current = false;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRefine();
      return;
    }
    const history = historyRef.current;
    if (e.key === "ArrowUp" && history.length > 0) {
      e.preventDefault();
      if (historyIndexRef.current === -1) {
        draftRef.current = chatInput;
        historyIndexRef.current = history.length - 1;
      } else if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
      }
      setChatInput(history[historyIndexRef.current]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndexRef.current === -1) return;
      if (historyIndexRef.current < history.length - 1) {
        historyIndexRef.current += 1;
        setChatInput(history[historyIndexRef.current]);
      } else {
        historyIndexRef.current = -1;
        setChatInput(draftRef.current);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">
              {getPeriodLabel(report.period)} ·{" "}
              {formatDateRange(report.startDate, report.endDate)}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              生成于 {new Date(report.createdAt).toLocaleString("zh-CN")}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable content + chat */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Report content */}
          <div
            className="report-content rounded-lg border border-border bg-muted/20 p-4 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />

          {/* Follow-up chat */}
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5" />
              对报告内容不满意？在下方继续对话来调整
            </div>

            {/* Message bubbles */}
            {chatMessages.length > 0 && (
              <div className="mb-3 flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                {chatMessages.map((msg, i) => (
                  <ModalChatBubble key={i} message={msg} />
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
                placeholder="例如：帮我增加到 10 条 / 把语气改得更正式…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={refining}
              />
              <Button
                size="sm"
                onClick={handleRefine}
                disabled={!chatInput.trim() || refining}
                className="shrink-0"
              >
                {refining ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              按 Enter 发送，Shift + Enter 换行 · 修改自动保存
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal chat bubble ─────────────────────────────────────────────────────────

function ModalChatBubble({ message }: { message: LocalChatMessage }) {
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
