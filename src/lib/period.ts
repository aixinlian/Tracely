import type { ReportPeriod } from "@/lib/db";

export interface DateRange {
  start: string; // ISO 8601 date string
  end: string;
}

/** Get the date range for a given period relative to today. */
export function getPeriodRange(
  period: ReportPeriod,
  referenceDate = new Date(),
): DateRange {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  switch (period) {
    case "daily": {
      const start = formatDate(date);
      const end = formatDate(date);
      return { start, end };
    }

    case "weekly": {
      // Start of week (Monday)
      const dayOfWeek = date.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startDate = new Date(date);
      startDate.setDate(date.getDate() + diff);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      return {
        start: formatDate(startDate),
        end: formatDate(endDate),
      };
    }

    case "monthly": {
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      return {
        start: formatDate(startDate),
        end: formatDate(endDate),
      };
    }

    case "yearly": {
      const startDate = new Date(date.getFullYear(), 0, 1);
      const endDate = new Date(date.getFullYear(), 11, 31);

      return {
        start: formatDate(startDate),
        end: formatDate(endDate),
      };
    }
  }
}

/** Format a Date object as ISO 8601 date string (YYYY-MM-DD). */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format a date range for display. */
export function formatDateRange(start: string, end: string): string {
  if (start === end) {
    return formatDisplayDate(start);
  }
  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
}

/** Compact date range for tight spaces, e.g. "07-05" or "07-01 ~ 07-31". */
export function formatDateRangeCompact(start: string, end: string): string {
  if (start === end) return start.slice(5);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return sameYear
    ? `${start.slice(5)} ~ ${end.slice(5)}`
    : `${start} ~ ${end}`;
}

/** Format an ISO date string for display (Chinese locale). */
function formatDisplayDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Get the period label in Chinese. */
export function getPeriodLabel(period: ReportPeriod): string {
  switch (period) {
    case "daily":
      return "日报";
    case "weekly":
      return "周报";
    case "monthly":
      return "月报";
    case "yearly":
      return "年报";
  }
}
