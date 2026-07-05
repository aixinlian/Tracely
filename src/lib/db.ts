import Dexie, { type EntityTable } from "dexie";

export interface Project {
  id: number;
  name: string;
  path: string;
  description?: string;
  /** Branches to include when generating reports. Empty/undefined = current branch. */
  branches?: string[];
  createdAt: number;
  updatedAt: number;
}

/**
 * An AI provider (供应商) — an OpenAI-compatible service the user configures
 * with their own key. Each provider exposes one endpoint (端点) and one or
 * more models.
 */
export interface Provider {
  id: number;
  /** Display name, e.g. "OpenAI" / "DeepSeek" / "本地 Ollama". */
  name: string;
  /** Endpoint (端点), e.g. https://api.openai.com/v1 */
  endpoint: string;
  /** API key, stored locally only. Optional for keyless local endpoints. */
  apiKey?: string;
  /** Available model names, e.g. ["gpt-4o", "gpt-4o-mini"]. */
  models: string[];
  /** The model selected as default for this provider. */
  defaultModel?: string;
  createdAt: number;
  updatedAt: number;
}

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export interface Report {
  id: number;
  /** Period type: daily, weekly, monthly, yearly. */
  period: ReportPeriod;
  /** Start date of the period (ISO 8601 date string, e.g. "2026-07-05"). */
  startDate: string;
  /** End date of the period (ISO 8601 date string). */
  endDate: string;
  /** AI-generated report content (markdown). */
  content: string;
  /** Project IDs included in this report. */
  projectIds: number[];
  /** Provider ID used to generate this report. */
  providerId: number;
  createdAt: number;
  updatedAt: number;
}

const db = new Dexie("tracely") as Dexie & {
  projects: EntityTable<Project, "id">;
  providers: EntityTable<Provider, "id">;
  reports: EntityTable<Report, "id">;
};

db.version(1).stores({
  // `path` is unique so the same repo can't be added twice.
  projects: "++id, &path, name, createdAt",
});

db.version(2).stores({
  projects: "++id, &path, name, createdAt",
  providers: "++id, name, createdAt",
});

db.version(3).stores({
  projects: "++id, &path, name, createdAt",
  providers: "++id, name, createdAt",
  reports: "++id, period, startDate, createdAt",
});

export { db };
