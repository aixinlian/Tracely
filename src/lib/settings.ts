import { appDataDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from "@tauri-apps/plugin-autostart";
import { pickFolder } from "@/lib/pick-folder";
import { getGitUserName } from "@/lib/git";

const DATA_DIR_KEY = "tracely-data-dir";
const GIT_AUTHOR_KEY = "tracely-git-author";

/**
 * The user-chosen data directory, or the platform default app data dir when
 * the user hasn't overridden it. This is where local reports/db live.
 */
export async function getDataDir(): Promise<string> {
  const override = localStorage.getItem(DATA_DIR_KEY);
  if (override) return override;
  return appDataDir();
}

/** Whether the data directory has been overridden from the default. */
export function hasCustomDataDir(): boolean {
  return localStorage.getItem(DATA_DIR_KEY) != null;
}

/** Prompt the user to pick a new data directory. Returns the chosen path. */
export async function chooseDataDir(): Promise<string | null> {
  const selected = await pickFolder();
  if (selected) localStorage.setItem(DATA_DIR_KEY, selected);
  return selected;
}

/** Reset the data directory back to the platform default. */
export function resetDataDir(): void {
  localStorage.removeItem(DATA_DIR_KEY);
}

/** Ensure a directory exists then reveal it in the OS file manager. */
export async function openDataDir(path: string): Promise<void> {
  await invoke("open_data_dir", { path });
}

/**
 * The git author to filter commits by when generating reports. Empty string
 * means "no filter" — count everyone's commits. Stored locally.
 */
export function getGitAuthor(): string {
  return localStorage.getItem(GIT_AUTHOR_KEY) ?? "";
}

/** Persist the git author filter. Pass an empty string to clear it. */
export function setGitAuthor(name: string): void {
  const trimmed = name.trim();
  if (trimmed) localStorage.setItem(GIT_AUTHOR_KEY, trimmed);
  else localStorage.removeItem(GIT_AUTHOR_KEY);
}

/**
 * The effective git author: the user's saved value, falling back to the
 * machine's global `git config user.name` the first time (auto-detected).
 */
export async function resolveGitAuthor(): Promise<string> {
  const saved = getGitAuthor();
  if (saved) return saved;
  try {
    return await getGitUserName();
  } catch {
    return "";
  }
}

// Re-export autostart controls so the UI imports from one place.
export { disableAutostart, enableAutostart, isAutostartEnabled };
