import { NavLink } from "react-router";
import {
  FileText,
  FolderKanban,
  History,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { to: "/daily-report", label: "生成日报", icon: FileText },
  { to: "/projects", label: "项目管理", icon: FolderKanban },
  { to: "/history", label: "历史记录", icon: History },
  { to: "/settings", label: "系统设置", icon: Settings },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-12 items-center gap-2.5 border-b border-sidebar-border/50",
          collapsed ? "justify-center px-0" : "px-4",
        )}
        data-tauri-drag-region
      >
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary p-1 shadow-sm">
          <img src="/tracely-mark.svg" alt="Tracely" className="size-full" />
        </div>
        {!collapsed && (
          <span className="text-[13px] font-semibold tracking-tight text-foreground">Tracely</span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-3">
        {!collapsed && (
          <p className="px-3 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            工作台
          </p>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                collapsed ? "justify-center px-0" : "",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "size-4 shrink-0 transition-all duration-150",
                    isActive
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground/80",
                  )}
                />
                {!collapsed && <span className="tracking-tight">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border/50 p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg py-2 transition-colors hover:bg-sidebar-accent/30",
            collapsed ? "justify-center px-0" : "px-3",
          )}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/60 text-xs font-semibold text-muted-foreground shadow-sm">
            T
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-xs font-medium leading-tight text-sidebar-foreground">本地用户</span>
              <span className="text-[11px] leading-tight text-muted-foreground/70">
                离线模式
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
