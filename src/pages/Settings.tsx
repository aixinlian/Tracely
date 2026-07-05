import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Cpu,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  UserRound,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, EmptyState, PageHeader } from "@/components/page/primitives";
import { db, type Provider } from "@/lib/db";
import {
  addProvider,
  parseModels,
  removeProvider,
  updateProvider,
} from "@/lib/providers";
import { listModels } from "@/lib/ai";
import { getGitUserName } from "@/lib/git";
import {
  disableAutostart,
  enableAutostart,
  isAutostartEnabled,
  resolveGitAuthor,
  setGitAuthor,
  clearAllData,
} from "@/lib/settings";

/** Preset providers with their default endpoints, for the name dropdown. */
const PROVIDER_PRESETS: { name: string; endpoint: string }[] = [
  { name: "OpenAI", endpoint: "https://api.openai.com/v1" },
  { name: "DeepSeek", endpoint: "https://api.deepseek.com/v1" },
  { name: "通义千问", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { name: "Kimi", endpoint: "https://api.moonshot.cn/v1" },
  { name: "智谱 GLM", endpoint: "https://open.bigmodel.cn/api/paas/v4" },
  { name: "本地 Ollama", endpoint: "http://localhost:11434/v1" },
];

const CUSTOM_PROVIDER = "__custom__";

function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-8">
      <div>
        <PageHeader title="系统设置" description="配置应用的偏好与选项。" />

        <Card className="divide-y divide-border/60">
          <SettingRow
            title="外观主题"
            description="在深色与浅色模式之间切换。"
            control={
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                {theme === "dark" ? "深色" : "浅色"}
              </Button>
            }
          />
          <AutostartRow />
          <GitAuthorRow />
          <ClearCacheRow />
        </Card>
      </div>

      <ProviderSection />
    </div>
  );
}

function AutostartRow() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    isAutostartEnabled()
      .then((v) => alive && setEnabled(v))
      .catch(() => alive && setEnabled(false));
    return () => {
      alive = false;
    };
  }, []);

  async function toggle() {
    if (enabled === null || busy) return;
    setBusy(true);
    try {
      if (enabled) {
        await disableAutostart();
        setEnabled(false);
      } else {
        await enableAutostart();
        setEnabled(true);
      }
    } catch (e) {
      console.error("切换开机自启失败", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingRow
      title="开机自启"
      description="登录系统后自动启动 Tracely。"
      control={
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          disabled={enabled === null || busy}
        >
          {enabled === null ? "…" : enabled ? "已开启" : "未开启"}
        </Button>
      }
    />
  );
}

function ClearCacheRow() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    setClearing(true);
    try {
      await clearAllData();
      setConfirmOpen(false);
      // 刷新页面以重新加载空白状态
      window.location.reload();
    } catch (e) {
      console.error("清除缓存失败", e);
      alert(`清除失败：${String(e)}`);
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      <SettingRow
        title="清除缓存"
        description="清除所有本地数据，包括项目、供应商、报告和设置。"
        control={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
            清除所有数据
          </Button>
        }
      />

      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-popover p-5 text-popover-foreground shadow-2xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <Dialog.Title className="text-base font-semibold text-destructive">
              确认清除所有数据
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              此操作将永久删除：
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>所有项目配置</li>
                <li>所有 AI 供应商配置</li>
                <li>所有历史报告</li>
                <li>应用设置（主题、Git 用户名等）</li>
              </ul>
              <p className="mt-3 font-medium text-destructive">
                此操作不可撤销，确定要继续吗？
              </p>
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmOpen(false)}
                disabled={clearing}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClear}
                disabled={clearing}
              >
                {clearing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    清除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    确认清除
                  </>
                )}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function GitAuthorRow() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    // Prefill with the saved filter, or auto-detect the machine's git user.name.
    let alive = true;
    resolveGitAuthor()
      .then((v) => alive && setValue(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function persist(next: string) {
    setValue(next);
    setGitAuthor(next);
    setSaved(true);
  }

  async function detect() {
    setDetecting(true);
    try {
      const name = await getGitUserName();
      if (name) persist(name);
    } catch (e) {
      console.error("读取 git 用户名失败", e);
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">Git 用户名</p>
          <p className="text-sm text-muted-foreground">
            只统计该作者的提交。留空则统计仓库内所有人的提交。
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="relative flex-1">
          <UserRound className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            onBlur={() => persist(value)}
            placeholder="你的 git user.name 或邮箱"
            className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={detect}
          disabled={detecting}
          title="从本机 git config 读取 user.name"
        >
          {detecting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          自动读取
        </Button>
      </div>
      {saved ? (
        <p className="mt-1.5 text-xs text-muted-foreground">已保存。</p>
      ) : null}
    </div>
  );
}

type DialogState =
  | { mode: "closed" }
  | { mode: "add" }
  | { mode: "edit"; provider: Provider };

function ProviderSection() {
  const providers = useLiveQuery(
    () => db.providers.orderBy("createdAt").reverse().toArray(),
    [],
  );
  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [pendingDelete, setPendingDelete] = useState<Provider | null>(null);

  const open = dialog.mode !== "closed";

  return (
    <div>
      <PageHeader
        title="AI 供应商"
        description="配置兼容 OpenAI 接口的供应商，自带 Key，用于生成日报。"
        action={
          <Button onClick={() => setDialog({ mode: "add" })}>
            <Plus className="size-4" />
            添加供应商
          </Button>
        }
      />

      {providers === undefined ? null : providers.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="还没有供应商"
          description="添加一个 OpenAI 兼容供应商，填入端点、API Key 和模型。"
          action={
            <Button variant="outline" onClick={() => setDialog({ mode: "add" })}>
              <Plus className="size-4" />
              添加供应商
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {providers.map((provider) => (
            <Card key={provider.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Server className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {provider.name}
                  </p>
                  {provider.defaultModel ? (
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {provider.defaultModel}
                    </span>
                  ) : null}
                </div>
                <p
                  className="mt-0.5 truncate text-xs text-muted-foreground"
                  title={provider.endpoint}
                >
                  {provider.endpoint}
                </p>
                {provider.models.length > 0 ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground/80">
                    {provider.models.length} 个模型 · {provider.models.join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="编辑"
                  onClick={() => setDialog({ mode: "edit", provider })}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="删除"
                  onClick={() => setPendingDelete(provider)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProviderDialog
        state={dialog}
        open={open}
        onClose={() => setDialog({ mode: "closed" })}
      />

      <ConfirmDelete
        provider={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete?.id != null) {
            await removeProvider(pendingDelete.id);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function ProviderDialog({
  state,
  open,
  onClose,
}: {
  state: DialogState;
  open: boolean;
  onClose: () => void;
}) {
  const editing = state.mode === "edit" ? state.provider : null;

  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelsText, setModelsText] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Which preset the name field maps to; "__custom__" means free-form input.
  const [nameChoice, setNameChoice] = useState<string>(CUSTOM_PROVIDER);

  useEffect(() => {
    if (!open) return;
    const initialName = editing?.name ?? "";
    setName(initialName);
    setEndpoint(editing?.endpoint ?? "");
    setApiKey(editing?.apiKey ?? "");
    setModelsText(editing?.models.join("\n") ?? "");
    setDefaultModel(editing?.defaultModel ?? "");
    setError(null);
    setSaving(false);
    setSyncing(false);
    setSyncMsg(null);
    // Match the initial name against a preset, else treat as custom.
    const matched = PROVIDER_PRESETS.some((p) => p.name === initialName);
    setNameChoice(initialName && matched ? initialName : CUSTOM_PROVIDER);
  }, [open, editing]);

  const models = parseModels(modelsText);

  function handleNameChoice(choice: string) {
    setNameChoice(choice);
    if (choice === CUSTOM_PROVIDER) {
      setName("");
      return;
    }
    const preset = PROVIDER_PRESETS.find((p) => p.name === choice);
    if (preset) {
      setName(preset.name);
      // Only prefill the endpoint when it's still empty, to avoid clobbering.
      if (!endpoint.trim()) setEndpoint(preset.endpoint);
    }
  }

  async function handleSyncModels() {
    setError(null);
    setSyncMsg(null);
    if (!endpoint.trim()) {
      setError("请先填写端点地址，再同步模型。");
      return;
    }
    setSyncing(true);
    try {
      const fetched = await listModels(endpoint.trim(), apiKey.trim() || undefined);
      if (fetched.length === 0) {
        setSyncMsg("该端点未返回任何模型。");
        return;
      }
      // Merge with any manually-entered models, de-duplicated.
      const merged = Array.from(new Set([...models, ...fetched])).sort();
      setModelsText(merged.join("\n"));
      setSyncMsg(`已同步 ${fetched.length} 个模型。`);
    } catch (e) {
      setError(`同步模型失败：${String(e)}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError("请填写供应商名称。");
      return;
    }
    if (!endpoint.trim()) {
      setError("请填写端点地址。");
      return;
    }
    if (models.length === 0) {
      setError("请至少填写一个模型。");
      return;
    }

    const input = {
      name,
      endpoint,
      apiKey,
      models,
      defaultModel: models.includes(defaultModel) ? defaultModel : models[0],
    };

    setSaving(true);
    try {
      if (editing) {
        await updateProvider(editing.id, input);
      } else {
        await addProvider(input);
      }
      onClose();
    } catch (e) {
      setError(`保存失败：${String(e)}`);
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
            {editing ? "编辑供应商" : "添加供应商"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            填写一个兼容 OpenAI 接口的供应商信息，数据仅保存在本地。
          </Dialog.Description>

          <div className="mt-4 space-y-4">
            <Field label="供应商名称">
              <Select
                value={nameChoice}
                onValueChange={(v) => handleNameChoice(v ?? CUSTOM_PROVIDER)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_PRESETS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_PROVIDER}>自定义…</SelectItem>
                </SelectContent>
              </Select>
              {nameChoice === CUSTOM_PROVIDER ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入自定义供应商名称"
                  className="mt-2 h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              ) : null}
            </Field>

            <Field label="端点">
              <input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>

            <Field label="API Key（可选，本地保存）">
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                placeholder="sk-…"
                className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </Field>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="block text-sm font-medium">
                  模型（每行一个，或用逗号分隔）
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncModels}
                  disabled={syncing || !endpoint.trim()}
                  title="从端点的 /models 接口拉取可用模型"
                >
                  {syncing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  同步模型
                </Button>
              </div>
              <textarea
                value={modelsText}
                onChange={(e) => setModelsText(e.target.value)}
                placeholder={"gpt-4o\ngpt-4o-mini"}
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              {syncMsg ? (
                <p className="mt-1.5 text-xs text-muted-foreground">{syncMsg}</p>
              ) : null}
            </div>

            {models.length > 0 ? (
              <Field label="默认模型">
                <Select
                  value={models.includes(defaultModel) ? defaultModel : models[0]}
                  onValueChange={(v) => v && setDefaultModel(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}

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
  provider,
  onCancel,
  onConfirm,
}: {
  provider: Provider | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={!!provider} onOpenChange={(next) => !next && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-popover p-5 text-popover-foreground shadow-2xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <Dialog.Title className="text-base font-semibold">
            删除供应商
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            确定要删除「{provider?.name}」吗？该操作不可撤销。
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
