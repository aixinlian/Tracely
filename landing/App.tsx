import { useEffect, useState } from "react";
import {
  GitCommitHorizontal,
  Sparkles,
  PencilLine,
  Archive,
  ShieldCheck,
  Feather,
  Moon,
  Sun,
  ArrowRight,
  Check,
} from "lucide-react";

const REPO_URL = "https://github.com/aixinlian/Tracely";

// lucide-react 1.x removed brand icons (incl. Github). Inline the mark so the
// build stays self-contained; swap for a lucide icon later if desired.
function Github({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function useDarkMode() {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.backgroundColor = dark
      ? "oklch(0.145 0 0)"
      : "oklch(1 0 0)";
    try {
      localStorage.setItem("tracely-theme", dark ? "dark" : "light");
    } catch {}
  }, [dark]);
  return [dark, () => setDark((v) => !v)] as const;
}

const features = [
  {
    icon: GitCommitHorizontal,
    title: "多仓库扫描",
    desc: "配置多个本地 Git 仓库，一键聚合今天的全部提交与未提交改动。",
  },
  {
    icon: Sparkles,
    title: "AI 总结",
    desc: "兼容 OpenAI 接口，支持 DeepSeek / 通义 / Kimi / 本地 Ollama，自带 Key 零订阅。",
  },
  {
    icon: PencilLine,
    title: "手动编辑",
    desc: "生成的是草稿，Markdown 编辑器随便改、随便补，最终交付你说了算。",
  },
  {
    icon: Archive,
    title: "本地归档",
    desc: "日报存本地数据库，可翻历史、按周聚合，工作痕迹一目了然。",
  },
  {
    icon: ShieldCheck,
    title: "隐私优先",
    desc: "纯本地运行，代码与提交信息不经过任何第三方服务器。",
  },
  {
    icon: Feather,
    title: "轻量",
    desc: "基于 Tauri，安装包仅几 MB，占用内存低，启动即用。",
  },
];

const steps = [
  {
    num: "01",
    title: "配置仓库与 AI",
    desc: "填入你的 AI 接口地址、Key 和模型，添加要追踪的本地 Git 仓库路径。",
  },
  {
    num: "02",
    title: "一键抓取",
    desc: "点击生成，Tracely 读取今天的 git log 与未提交 diff，整理成结构化记录。",
  },
  {
    num: "03",
    title: "AI 生成草稿",
    desc: "调用你配置的 AI 接口，把琐碎的提交翻译成一份人话日报。",
  },
  {
    num: "04",
    title: "编辑并归档",
    desc: "在编辑器里调整补充，保存到本地，随时回看或聚合成周报。",
  },
];

function Nav({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary p-1 shadow-sm">
            <img src="./tracely-mark.svg" alt="Tracely" className="size-full" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            Tracely
          </span>
          <span className="text-sm text-muted-foreground">简迹</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            特性
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            工作原理
          </a>
          <a href="#privacy" className="transition-colors hover:text-foreground">
            隐私
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="切换主题"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/85"
          >
            <Github className="size-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* soft sky-blue glow backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-10%] mx-auto h-[500px] max-w-4xl rounded-full bg-primary/20 blur-[120px]"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 md:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
          >
            <span className="flex size-1.5 rounded-full bg-primary" />
            本地优先 · 开源免费 · 自带 AI Key
          </a>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
            写日报时，
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary to-chart-3 bg-clip-text text-transparent">
              别再回忆今天干了啥
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Tracely 简迹 读取你本地 Git 仓库的提交与改动，交给 AI
            自动整理成一份工作日报草稿。简单地，留下你的工作痕迹。
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="group flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/85"
            >
              <Github className="size-4" />
              在 GitHub 上查看
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how"
              className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
            >
              看看怎么用
            </a>
          </div>
        </div>

        {/* mock report preview */}
        <div className="mx-auto mt-16 max-w-3xl">
          <MockReport />
        </div>
      </div>
    </section>
  );
}

function MockReport() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5">
      {/* window bar */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-3">
        <span className="size-3 rounded-full bg-destructive/60" />
        <span className="size-3 rounded-full bg-chart-2/60" />
        <span className="size-3 rounded-full bg-primary/60" />
        <span className="ml-3 text-xs text-muted-foreground">
          今日日报 · 2026-07-05
        </span>
      </div>
      <div className="grid gap-0 md:grid-cols-[1fr_1.4fr]">
        {/* commit timeline */}
        <div className="border-b border-border/70 p-5 md:border-b-0 md:border-r">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            抓取到的提交
          </p>
          <ul className="space-y-4 text-sm">
            {[
              "feat: 新增日报导出功能",
              "fix: 修复历史页分页错位",
              "refactor: 抽离 git 抓取层",
            ].map((c, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1 flex size-2.5 shrink-0 rounded-full bg-primary" />
                <span className="font-mono text-[13px] text-muted-foreground">
                  {c}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* generated report */}
        <div className="p-5">
          <p className="mb-4 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary">
            <Sparkles className="size-3" />
            AI 生成的日报
          </p>
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="font-medium">今日工作小结</p>
            <p className="text-muted-foreground">
              完成日报导出功能开发，支持一键导出 Markdown。
            </p>
            <p className="text-muted-foreground">
              修复了历史记录页面的分页错位问题，并对 git
              抓取逻辑做了重构，拆分为独立模块，便于后续多数据源接入。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          你的 Git 历史，已经记录了大部分工作
        </h2>
        <p className="mt-4 text-muted-foreground">
          只是没人帮你翻译成人话。Tracely 补上这一步。
        </p>
      </div>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="border-y border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            四步，从提交记录到一份日报
          </h2>
          <p className="mt-4 text-muted-foreground">
            全程本地运行，只有你点击生成时，结构化摘要才会发往你自己的 AI 接口。
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.num}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <span className="text-2xl font-semibold text-primary/30">
                {s.num}
              </span>
              <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  const points = [
    "所有 Git 数据与日报内容仅存储在本地数据库",
    "仅当你点击生成时，结构化摘要才发送到你自己配置的 AI 接口",
    "Tracely 不收集、不上传任何数据到作者的服务器",
    "开源、自带 Key、零订阅成本",
  ];
  return (
    <section id="privacy" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            隐私说明
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
            数据始终在你手里
          </h2>
          <p className="mt-4 text-muted-foreground">
            市面上的同类工具要么靠屏幕截图，要么是云端服务。Tracely
            选择本地优先，代码和提交信息不外传。
          </p>
        </div>
        <ul className="space-y-4">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="size-3.5" />
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                {p}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-card px-8 py-16 text-center shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 max-w-lg rounded-full bg-primary/20 blur-[100px]"
        />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            简单地，留下你的工作痕迹
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            开源免费，克隆下来就能用。让 Git 历史替你写日报。
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="group mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/85"
          >
            <Github className="size-4" />
            前往 GitHub
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary p-0.5">
            <img src="./tracely-mark.svg" alt="Tracely" className="size-full" />
          </div>
          <span>Tracely · 简迹</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <span>MIT License</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [dark, toggle] = useDarkMode();
  return (
    <div className="min-h-screen">
      <Nav dark={dark} toggle={toggle} />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Privacy />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
