import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

const appWindow = getCurrentWindow();

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    appWindow.isMaximized().then(setMaximized).catch(() => {});
    appWindow
      .onResized(() => {
        appWindow.isMaximized().then(setMaximized).catch(() => {});
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => unlisten?.();
  }, []);

  return (
    <div className="flex items-stretch self-stretch" data-tauri-drag-region={false}>
      <ControlButton label="最小化" onClick={() => appWindow.minimize()}>
        <Minus className="size-3.5" />
      </ControlButton>
      <ControlButton
        label={maximized ? "还原" : "最大化"}
        onClick={() => appWindow.toggleMaximize()}
      >
        {maximized ? (
          <Copy className="size-3" />
        ) : (
          <Square className="size-3" />
        )}
      </ControlButton>
      <ControlButton
        label="关闭"
        onClick={() => appWindow.close()}
        className="hover:bg-destructive hover:text-white"
      >
        <X className="size-4" />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  label,
  onClick,
  className,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
