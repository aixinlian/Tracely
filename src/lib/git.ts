import { invoke } from "@tauri-apps/api/core";

export interface RepoBranches {
  /** The currently checked-out branch, or null on a detached HEAD. */
  current: string | null;
  /** All local branch names. */
  branches: string[];
}

export interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface RepoActivity {
  /** Commits in the specified time range. */
  commits: CommitInfo[];
  /** Uncommitted changes (modified/added/deleted files). */
  uncommitted: string[];
}

export interface DiscoveredRepo {
  /** Absolute path to the repository. */
  path: string;
  /** Folder name, used as default project name. */
  name: string;
}

/** List the local branches of a git repository at `path`. */
export async function listBranches(path: string): Promise<RepoBranches> {
  return invoke<RepoBranches>("list_branches", { path });
}

/** Read the machine's global git `user.name`, or "" when unset. */
export async function getGitUserName(): Promise<string> {
  return invoke<string>("get_git_user_name");
}

/**
 * Scan a parent folder and discover all immediate child folders that are git
 * repositories. Non-recursive beyond one level to stay fast. Returns empty
 * array when the parent itself isn't a directory.
 */
export async function scanGitRepos(path: string): Promise<DiscoveredRepo[]> {
  return invoke<DiscoveredRepo[]>("scan_git_repos", { path });
}

/** Get git activity for a repository in a given time range. */
export async function getRepoActivity(
  path: string,
  since: string,
  until: string,
  branches?: string[],
  author?: string,
): Promise<RepoActivity> {
  return invoke<RepoActivity>("get_repo_activity", {
    path,
    since,
    until,
    branches,
    author,
  });
}
