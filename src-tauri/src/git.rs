use std::path::Path;
use std::process::Command;

use serde::Serialize;

#[derive(Serialize)]
pub struct DiscoveredRepo {
    /// Absolute path of the git repository.
    pub path: String,
    /// Folder name, used as a default project name.
    pub name: String,
}

#[derive(Serialize)]
pub struct RepoBranches {
    /// The currently checked-out branch, if the repo is on one.
    pub current: Option<String>,
    /// All local branch names.
    pub branches: Vec<String>,
}

#[derive(Serialize, Clone)]
pub struct CommitInfo {
    pub hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct RepoActivity {
    /// Commits in the specified time range.
    pub commits: Vec<CommitInfo>,
    /// Uncommitted changes (modified/added/deleted files).
    pub uncommitted: Vec<String>,
}

/// Run `git` inside `repo` and return stdout, or an error string on failure.
fn run_git(repo: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(repo)
        .output()
        .map_err(|e| format!("无法执行 git，请确认已安装：{e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(stderr.trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

/// List the local branches of a git repository at `path`.
#[tauri::command]
pub fn list_branches(path: String) -> Result<RepoBranches, String> {
    let repo = Path::new(&path);
    if !repo.is_dir() {
        return Err("文件夹不存在。".into());
    }

    // Confirm this is actually a work tree before listing branches.
    let is_repo = run_git(repo, &["rev-parse", "--is-inside-work-tree"])?;
    if is_repo.trim() != "true" {
        return Err("这个文件夹不是一个 Git 仓库。".into());
    }

    let raw = run_git(repo, &["branch", "--format=%(refname:short)"])?;
    let branches: Vec<String> = raw
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .map(String::from)
        .collect();

    // `git branch --show-current` is empty on a detached HEAD.
    let current = run_git(repo, &["branch", "--show-current"])
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    Ok(RepoBranches { current, branches })
}

/// Read the global git `user.name`, used to prefill the author filter.
/// Returns an empty string when it isn't configured.
#[tauri::command]
pub fn get_git_user_name() -> Result<String, String> {
    // `--global` so it works from any directory, not just inside a repo.
    let output = Command::new("git")
        .args(["config", "--global", "user.name"])
        .output()
        .map_err(|e| format!("无法执行 git，请确认已安装：{e}"))?;

    // A missing key exits non-zero; treat that as "not configured" rather than error.
    if !output.status.success() {
        return Ok(String::new());
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Get git activity for a repository in a given time range.
/// `since` and `until` are ISO 8601 date strings (e.g. "2026-07-05").
/// `branches` is an optional list of branches to include; if empty, uses current branch.
/// `author` optionally filters commits to a single author (matches name or email).
#[tauri::command]
pub fn get_repo_activity(
    path: String,
    since: String,
    until: String,
    branches: Option<Vec<String>>,
    author: Option<String>,
) -> Result<RepoActivity, String> {
    let repo = Path::new(&path);
    if !repo.is_dir() {
        return Err("文件夹不存在。".into());
    }

    let is_repo = run_git(repo, &["rev-parse", "--is-inside-work-tree"])?;
    if is_repo.trim() != "true" {
        return Err("这个文件夹不是一个 Git 仓库。".into());
    }

    // Build git log command
    let since_arg = format!("--since={}", since);
    let until_arg = format!("--until={}", until);

    let mut log_args = vec![
        "log",
        "--pretty=format:%H%x1E%an%x1E%aI%x1E%s",
        &since_arg,
        &until_arg,
    ];

    // Filter to a single author when one is provided (matches name or email).
    let author_arg;
    if let Some(ref a) = author {
        if !a.trim().is_empty() {
            author_arg = format!("--author={}", a.trim());
            log_args.push(&author_arg);
        }
    }

    // Add branch filters
    let branch_refs: Vec<String>;
    if let Some(ref branch_list) = branches {
        if !branch_list.is_empty() {
            branch_refs = branch_list.iter().map(|b| b.to_string()).collect();
            for b in &branch_refs {
                log_args.push(b);
            }
        }
    }

    let log_output = run_git(repo, &log_args).unwrap_or_default();

    let commits: Vec<CommitInfo> = log_output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('\x1E').collect();
            if parts.len() >= 4 {
                Some(CommitInfo {
                    hash: parts[0].to_string(),
                    author: parts[1].to_string(),
                    date: parts[2].to_string(),
                    message: parts[3].to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    // Get uncommitted changes
    let status_output = run_git(repo, &["status", "--porcelain"]).unwrap_or_default();
    let uncommitted: Vec<String> = status_output
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(String::from)
        .collect();

    Ok(RepoActivity {
        commits,
        uncommitted,
    })
}

/// Scan a parent folder and return every immediate subfolder that is a git
/// repository (contains a `.git` entry). Also includes the parent itself when
/// it happens to be a repo. Non-recursive beyond one level to stay fast.
#[tauri::command]
pub fn scan_git_repos(path: String) -> Result<Vec<DiscoveredRepo>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err("文件夹不存在。".into());
    }

    let mut repos = Vec::new();

    // A `.git` entry (dir for normal repos, file for worktrees/submodules).
    let is_repo = |dir: &Path| dir.join(".git").exists();

    if is_repo(root) {
        repos.push(DiscoveredRepo {
            path: root.to_string_lossy().into_owned(),
            name: root
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_else(|| path.clone()),
        });
    }

    let entries = std::fs::read_dir(root).map_err(|e| format!("无法读取文件夹：{e}"))?;
    for entry in entries.flatten() {
        let child = entry.path();
        if child.is_dir() && is_repo(&child) {
            repos.push(DiscoveredRepo {
                path: child.to_string_lossy().into_owned(),
                name: child
                    .file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_default(),
            });
        }
    }

    // Stable, predictable order by name.
    repos.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(repos)
}
