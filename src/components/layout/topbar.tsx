import { PanelLeft, PanelLeftClose, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WindowControls } from "@/components/layout/window-controls";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

type TopbarProps = {
  title: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenCommand: () => void;
};

export function Topbar({
  title,
  collapsed,
  onToggleSidebar,
  onOpenCommand,
}: TopbarProps) {
  return (
    <header
      className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background/95 pl-2 pr-0 backdrop-blur supports-backdrop-filter:bg-background/80"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleSidebar}
          aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
          className="text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
        <h1 className="text-[13px] font-semibold tracking-tight text-foreground/90">{title}</h1>
      </div>

      <div className="flex h-full items-center gap-2" data-tauri-drag-region>
        <button
          type="button"
          onClick={onOpenCommand}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm transition-all hover:border-border hover:bg-muted/50 hover:text-foreground hover:shadow"
        >
          <Search className="size-3.5" />
          <span>搜索命令</span>
          <kbd className="ml-2 rounded border border-border/50 bg-background px-1.5 py-0.5 font-mono text-[10px] shadow-sm">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>

        <WindowControls />
      </div>
    </header>
  );
}
