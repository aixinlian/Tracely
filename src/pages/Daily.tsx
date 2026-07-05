import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Calendar,
  CalendarDays,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/page/primitives";
import { db, type ReportPeriod } from "@/lib/db";
import {
  getPeriodRange,
  getPeriodLabel,
  formatDateRange,
  formatDateRangeCompact,
} from "@/lib/period";
import { useReportGeneration } from "@/components/report-generation-provider";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: { value: ReportPeriod; label: string; icon: typeof Calendar }[] = [
  { value: "daily", label: "日报", icon: FileText },
  { value: "weekly", label: "周报", icon: CalendarDays },
  { value: "monthly", label: "月报", icon: Calendar },
  { value: "yearly", label: "年报", icon: Sparkles },
];

export default function DailyReport() {
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const { generating, content, error, resultPeriod, generate } =
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

  return (
    <div>
      <PageHeader
        title="生成报告"
        description="根据所有项目的 Git 提交记录与未提交改动，快速生成工作报告。"
        action={
          <Button onClick={() => generate(period)} disabled={generating}>
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
                已生成，可直接编辑后保存或导出。
              </p>
            </div>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div
              className="rounded-lg border border-border bg-muted/20 p-4 text-sm"
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
