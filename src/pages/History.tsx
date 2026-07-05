import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Calendar,
  CalendarDays,
  Clock,
  Download,
  FileText,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/page/primitives";
import { db, type Report, type ReportPeriod } from "@/lib/db";
import { addReport, removeReport } from "@/lib/reports";
import { getPeriodLabel, formatDateRange } from "@/lib/period";
import { cn } from "@/lib/utils";

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
  const [toast, setToast] = useState<string | null>(null);

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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete(id: number) {
    await removeReport(id);
    setConfirmDeleteId(null);
    if (previewReport?.id === id) setPreviewReport(null);
    showToast("报告已删除。");
  }

  function handleExportJSON() {
    const data = (filtered ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ id: _id, ...rest }) => rest,
    );
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    triggerDownload(
      blob,
      `tracely-reports-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }

  function handleExportMarkdown() {
    const md = (filtered ?? [])
      .map((r) => {
        const heading = `# ${getPeriodLabel(r.period)} · ${formatDateRange(r.startDate, r.endDate)}`;
        const meta = `> 生成时间：${new Date(r.createdAt).toLocaleString("zh-CN")}`;
        return `${heading}\n\n${meta}\n\n${r.content}`;
      })
      .join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown; charset=utf-8" });
    triggerDownload(
      blob,
      `tracely-reports-${new Date().toISOString().slice(0, 10)}.md`,
    );
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
        showToast(`已成功导入 ${count} 条报告。`);
      } catch (err) {
        showToast(`导入失败：${String(err)}`);
      }
    };
    input.click();
  }

  const total = filtered?.length ?? 0;

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

      {/* Toast */}
      {toast && (
        <div className="mb-4 rounded-lg border border-border bg-muted/60 px-4 py-2 text-sm text-muted-foreground">
          {toast}
        </div>
      )}

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
          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              confirmDelete={confirmDeleteId === report.id}
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
  confirmDelete: boolean;
  onPreview: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function ReportCard({
  report,
  confirmDelete,
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div
            className="rounded-lg border border-border bg-muted/20 p-4 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report.content) }}
          />
        </div>
      </div>
    </div>
  );
}
