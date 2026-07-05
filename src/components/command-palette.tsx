import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Dialog } from "@base-ui/react/dialog";
import {
  CornerDownLeft,
  FileText,
  FolderKanban,
  History,
  Moon,
  Search,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "daily-report",
        label: "生成日报",
        hint: "页面",
        icon: FileText,
        keywords: "daily report richbao",
        run: () => navigate("/daily-report"),
      },
      {
        id: "projects",
        label: "项目管理",
        hint: "页面",
        icon: FolderKanban,
        keywords: "project xiangmu",
        run: () => navigate("/projects"),
      },
      {
        id: "history",
        label: "历史记录",
        hint: "页面",
        icon: History,
        keywords: "history lishi",
        run: () => navigate("/history"),
      },
      {
        id: "settings",
        label: "系统设置",
        hint: "页面",
        icon: Settings,
        keywords: "settings shezhi",
        run: () => navigate("/settings"),
      },
      {
        id: "toggle-theme",
        label: theme === "dark" ? "切换到浅色主题" : "切换到深色主题",
        hint: "操作",
        icon: theme === "dark" ? Sun : Moon,
        keywords: "theme zhuti dark light",
        run: toggleTheme,
      },
    ],
    [navigate, theme, toggleTheme],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Reset transient state whenever the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function runAt(index: number) {
    const cmd = filtered[index];
    if (!cmd) return;
    onOpenChange(false);
    cmd.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        filtered.length ? (i - 1 + filtered.length) % filtered.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(active);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-150" />
        <Dialog.Popup
          initialFocus={inputRef}
          className="fixed left-1/2 top-[15%] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border/60 bg-popover text-popover-foreground shadow-2xl outline-none data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 transition-all duration-150"
        >
          <Dialog.Title className="sr-only">命令面板</Dialog.Title>
          <div className="flex items-center gap-2.5 border-b border-border/60 px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="搜索页面或操作..."
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                没有匹配的命令
              </p>
            ) : (
              filtered.map((cmd, index) => (
                <button
                  key={cmd.id}
                  type="button"
                  onMouseMove={() => setActive(index)}
                  onClick={() => runAt(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                    index === active
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/80",
                  )}
                >
                  <cmd.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{cmd.label}</span>
                  {cmd.hint ? (
                    <span className="text-xs text-muted-foreground">
                      {cmd.hint}
                    </span>
                  ) : null}
                  {index === active ? (
                    <CornerDownLeft className="size-3.5 text-muted-foreground" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
