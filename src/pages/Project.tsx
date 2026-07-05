import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Check,
  FolderKanban,
  FolderOpen,
  FolderSearch,
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/page/primitives";
import { db, type Project } from "@/lib/db";
import {
  addProject,
  addProjects,
  nameFromPath,
  projectExists,
  removeProject,
  removeProjects,
  updateProject,
} from "@/lib/projects";
import { pickFolder } from "@/lib/pick-folder";
import { listBranches, scanGitRepos, type DiscoveredRepo } from "@/lib/git";
import { cn } from "@/lib/utils";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type DialogState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "batch-add" }
  | { mode: "edit"; project: Project };

export default function ProjectManagement() {
  const projects = useLiveQuery(
    () => db.projects.orderBy("createdAt").reverse().toArray(),
    [],
  );
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const open = dialog.mode !== "closed";

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    await removeProjects(Array.from(selected));
    setSelected(new Set());
    setSelectMode(false);
  }

  function toggleSelectAll() {
    if (!projects) return;
    if (selected.size === projects.length) {
      // All selected → deselect all
      setSelected(new Set());
    } else {
      // Some or none selected → select all
      setSelected(new Set(projects.map((p) => p.id)));
    }
  }

  return (
    <div>
      <PageHeader
        title="项目管理"
        description="选择本地项目文件夹，把每天的工作记录归类到对应的项目下。"
        action={
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {projects && selected.size === projects.length
                    ? "取消全选"
                    : "全选"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={selected.size === 0}
                >
                  <Trash2 className="size-4" />
                  删除 {selected.size > 0 ? `(${selected.size})` : ""}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectMode(false);
                    setSelected(new Set());
                  }}
                >
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDialog({ mode: "batch-add" })}
                >
                  <FolderSearch className="size-4" />
                  批量添加
                </Button>
                <Button onClick={() => setDialog({ mode: "add" })}>
                  <Plus className="size-4" />
                  新建项目
                </Button>
                {projects && projects.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectMode(true)}
                  >
                    选择
                  </Button>
                ) : null}
              </>
            )}
          </div>
        }
      />

      {projects === undefined ? null : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="还没有项目"
          description="添加第一个本地 Git 仓库，Tracely 会从它的提交历史生成日报。"
          action={
            <Button variant="outline" onClick={() => setDialog({ mode: "add" })}>
              <Plus className="size-4" />
              选择本地项目
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {projects.map((project) => {
            const isSelected = selected.has(project.id);
            return (
              <Card
                key={project.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 transition-colors",
                  selectMode && "cursor-pointer hover:bg-muted/40",
                  isSelected && "ring-2 ring-primary",
                )}
                onClick={() => selectMode && toggleSelect(project.id)}
              >
                {selectMode ? (
                  <div
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {isSelected ? <Check className="size-3.5" /> : null}
                  </div>
                ) : null}
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FolderKanban className="size-5" />
                </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{project.name}</p>
                <p
                  className="mt-0.5 truncate text-xs text-muted-foreground"
                  title={project.path}
                >
                  {project.path}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {project.branches && project.branches.length > 0 ? (
                    project.branches.map((branch) => (
                      <span
                        key={branch}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        <GitBranch className="size-3" />
                        {branch}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-xs text-muted-foreground/70">
                      <GitBranch className="size-3" />
                      当前分支
                    </span>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground/70">
                {formatDate(project.createdAt)}
              </span>
              {!selectMode ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="编辑"
                    onClick={() => setDialog({ mode: "edit", project })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="删除"
                    onClick={() => setPendingDelete(project)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}
        </div>
      )}

      <ProjectDialog
        state={dialog}
        open={open}
        onClose={() => setDialog({ mode: "closed" })}
      />

      <BatchAddDialog
        open={dialog.mode === "batch-add"}
        onClose={() => setDialog({ mode: "closed" })}
      />

      <ConfirmDelete
        project={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete?.id != null) {
            await removeProject(pendingDelete.id);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function ProjectDialog({
  state,
  open,
  onClose,
}: {
  state: DialogState;
  open: boolean;
  onClose: () => void;
}) {
  const editing = state.mode === "edit" ? state.project : null;

  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [description, setDescription] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the dialog opens for a new target.
  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setPath(editing?.path ?? "");
    setDescription(editing?.description ?? "");
    setSelected(editing?.branches ?? []);
    setBranches([]);
    setBranchError(null);
    setError(null);
    setSaving(false);
    setLoadingBranches(false);
    // When editing, load the repo's branches up front so the user can adjust.
    if (editing) void loadBranches(editing.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  async function loadBranches(repoPath: string) {
    setLoadingBranches(true);
    setBranchError(null);
    try {
      const result = await listBranches(repoPath);
      setBranches(result.branches);
      // For a fresh pick, default to the currently checked-out branch.
      if (!editing && result.current) setSelected([result.current]);
    } catch (e) {
      setBranches([]);
      setBranchError(String(e));
    } finally {
      setLoadingBranches(false);
    }
  }

  async function handlePick() {
    setError(null);
    try {
      const picked = await pickFolder();
      if (!picked) return;
      setPath(picked);
      setSelected([]);
      if (!name.trim()) setName(nameFromPath(picked));
      await loadBranches(picked);
    } catch (e) {
      setError(`无法打开文件夹选择器：${String(e)}`);
    }
  }

  function toggleBranch(branch: string) {
    setSelected((prev) =>
      prev.includes(branch)
        ? prev.filter((b) => b !== branch)
        : [...prev, branch],
    );
  }

  async function handleSave() {
    setError(null);

    if (editing) {
      setSaving(true);
      try {
        await updateProject(editing.id, { name, description, branches: selected });
        onClose();
      } catch (e) {
        setError(`保存失败：${String(e)}`);
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!path.trim()) {
      setError("请先选择一个项目文件夹。");
      return;
    }

    setSaving(true);
    try {
      if (await projectExists(path)) {
        setError("这个文件夹已经添加过了。");
        return;
      }
      await addProject({ name, path, description, branches: selected });
      onClose();
    } catch (e) {
      setError(`添加失败：${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border/60 bg-popover p-5 text-popover-foreground shadow-2xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <Dialog.Title className="text-base font-semibold">
            {editing ? "编辑项目" : "新建项目"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            {editing
              ? "更新项目的名称、备注与要跟踪的分支。"
              : "选择一个本地 Git 仓库文件夹作为项目。"}
          </Dialog.Description>

          <div className="mt-4 space-y-4">
            <Field label="项目文件夹">
              <div className="flex items-center gap-2">
                <input
                  value={path}
                  readOnly
                  placeholder="尚未选择"
                  title={path}
                  className="h-8 min-w-0 flex-1 truncate rounded-lg border border-border bg-muted/40 px-2.5 text-sm text-muted-foreground outline-none"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePick}
                  disabled={!!editing}
                >
                  <FolderOpen className="size-4" />
                  选择
                </Button>
              </div>
              {editing ? (
                <p className="mt-1.5 text-xs text-muted-foreground/70">
                  项目路径创建后不可修改。
                </p>
              ) : null}
            </Field>

            <Field label="项目名称">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如 tracely"
                className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>

            {path ? (
              <Field label="跟踪分支">
                <BranchPicker
                  loading={loadingBranches}
                  error={branchError}
                  branches={branches}
                  selected={selected}
                  onToggle={toggleBranch}
                  onReload={() => void loadBranches(path)}
                />
                <p className="mt-1.5 text-xs text-muted-foreground/70">
                  不选则默认使用当前所在分支。
                </p>
              </Field>
            ) : null}

            <Field label="备注（可选）">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="这个项目是做什么的…"
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {editing ? "保存" : "添加"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BranchPicker({
  loading,
  error,
  branches,
  selected,
  onToggle,
  onReload,
}: {
  loading: boolean;
  error: string | null;
  branches: string[];
  selected: string[];
  onToggle: (branch: string) => void;
  onReload: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        读取分支中…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-2.5 py-2">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="ghost"
          size="xs"
          className="mt-1.5"
          onClick={onReload}
        >
          <RefreshCw className="size-3" />
          重试
        </Button>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-sm text-muted-foreground">
        没有找到分支。
      </p>
    );
  }

  return (
    <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-border bg-background p-1">
      {branches.map((branch) => {
        const active = selected.includes(branch);
        return (
          <button
            key={branch}
            type="button"
            onClick={() => onToggle(branch)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {active ? <Check className="size-3" /> : null}
            </span>
            <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{branch}</span>
          </button>
        );
      })}
    </div>
  );
}

function BatchAddDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [candidates, setCandidates] = useState<DiscoveredRepo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    setCandidates([]);
    setSelected(new Set());
    setScanning(false);
    setAdding(false);
    setError(null);
  }, [open]);

  async function handleScanFolder() {
    setError(null);
    try {
      const folder = await pickFolder();
      if (!folder) return;
      setScanning(true);
      const discovered = await scanGitRepos(folder);
      // Filter out already-added projects
      const existing = await db.projects.toArray();
      const existingPaths = new Set(existing.map((p) => p.path));
      const fresh = discovered.filter((d) => !existingPaths.has(d.path));
      setCandidates((prev) => {
        const merged = [...prev, ...fresh];
        // Deduplicate by path
        const seen = new Set<string>();
        return merged.filter((r) => {
          if (seen.has(r.path)) return false;
          seen.add(r.path);
          return true;
        });
      });
    } catch (e) {
      setError(`扫描失败：${String(e)}`);
    } finally {
      setScanning(false);
    }
  }

  async function handlePickSingle() {
    setError(null);
    try {
      const folder = await pickFolder();
      if (!folder) return;
      // Check if it's a git repo
      const isRepo = folder.includes(".git") || (await listBranches(folder).then(() => true).catch(() => false));
      if (!isRepo) {
        setError("所选文件夹不是一个 Git 仓库。");
        return;
      }
      const name = nameFromPath(folder);
      const existing = await projectExists(folder);
      if (existing) {
        setError("该项目已添加过。");
        return;
      }
      setCandidates((prev) => {
        if (prev.some((c) => c.path === folder)) return prev;
        return [...prev, { path: folder, name }];
      });
    } catch (e) {
      setError(`添加失败：${String(e)}`);
    }
  }

  function toggleSelect(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === candidates.length) {
      // All selected → deselect all
      setSelected(new Set());
    } else {
      // Some or none selected → select all
      setSelected(new Set(candidates.map((c) => c.path)));
    }
  }

  function removeCandidate(path: string) {
    setCandidates((prev) => prev.filter((c) => c.path !== path));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setAdding(true);
    setError(null);
    try {
      const toAdd = candidates.filter((c) => selected.has(c.path));
      await addProjects(
        toAdd.map((c) => ({ name: c.name, path: c.path })),
      );
      onClose();
    } catch (e) {
      setError(`批量添加失败：${String(e)}`);
    } finally {
      setAdding(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-border/60 bg-popover p-5 text-popover-foreground shadow-2xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <Dialog.Title className="text-base font-semibold">
            批量添加项目
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            扫描父文件夹自动发现 Git 仓库，或逐个添加分散的项目。
          </Dialog.Description>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScanFolder}
              disabled={scanning}
            >
              {scanning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FolderSearch className="size-4" />
              )}
              扫描文件夹
            </Button>
            <Button variant="outline" size="sm" onClick={handlePickSingle}>
              <Plus className="size-4" />
              添加单个
            </Button>
            {candidates.length > 0 ? (
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selected.size === candidates.length ? "取消全选" : "全选"}
              </Button>
            ) : null}
          </div>

          {candidates.length > 0 ? (
            <div className="mt-4 max-h-80 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-2">
              {candidates.map((repo) => {
                const isSelected = selected.has(repo.path);
                return (
                  <div
                    key={repo.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/40",
                      isSelected && "bg-accent",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSelect(repo.path)}
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {isSelected ? <Check className="size-3.5" /> : null}
                    </button>
                    <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{repo.name}</p>
                      <p
                        className="truncate text-xs text-muted-foreground"
                        title={repo.path}
                      >
                        {repo.path}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeCandidate(repo.path)}
                      title="移除"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              点击「扫描文件夹」发现 Git 仓库，或「添加单个」逐个选择。
            </p>
          )}

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={selected.size === 0 || adding}
            >
              添加 {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function ConfirmDelete({
  project,
  onCancel,
  onConfirm,
}: {
  project: Project | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={!!project} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-popover p-5 text-popover-foreground shadow-2xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <Dialog.Title className="text-base font-semibold">删除项目</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            确定要删除「{project?.name}」吗？这不会影响本地文件，只是从 Tracely
            移除该项目。
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              取消
            </Button>
            <Button variant="destructive" size="sm" onClick={onConfirm}>
              删除
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
