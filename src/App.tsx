import { useEffect, useState } from "react";
import { useLocation, Outlet } from "react-router";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/command-palette";
import "./styles/index.css";

const titles: Record<string, string> = {
  "/daily-report": "生成日报",
  "/projects": "项目管理",
  "/history": "历史记录",
  "/settings": "系统设置",
};

function App() {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? "Tracely";
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20 text-foreground">
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <Topbar
          title={title}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onOpenCommand={() => setCommandOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="mx-auto w-full max-w-5xl px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}

export default App;
