import { db, type Report, type ReportPeriod } from "@/lib/db";

export type NewReport = {
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  content: string;
  projectIds: number[];
  providerId: number;
};

export async function addReport(input: NewReport): Promise<number> {
  const now = Date.now();
  return db.reports.add({
    ...input,
    createdAt: now,
    updatedAt: now,
  } as Report);
}

export async function updateReport(
  id: number,
  changes: Partial<Pick<Report, "content">>,
): Promise<void> {
  const patch: Partial<Report> = { updatedAt: Date.now() };
  if (changes.content !== undefined) patch.content = changes.content;
  await db.reports.update(id, patch);
}

export async function removeReport(id: number): Promise<void> {
  await db.reports.delete(id);
}

/** Get all reports for a specific period, sorted by startDate descending. */
export async function getReportsByPeriod(
  period: ReportPeriod,
): Promise<Report[]> {
  return db.reports
    .where("period")
    .equals(period)
    .reverse()
    .sortBy("startDate");
}

/** Get the most recent report for a specific period and date range. */
export async function findExistingReport(
  period: ReportPeriod,
  startDate: string,
  endDate: string,
): Promise<Report | undefined> {
  return db.reports
    .where("period")
    .equals(period)
    .and((r) => r.startDate === startDate && r.endDate === endDate)
    .first();
}
