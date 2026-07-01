# Tracely
简迹，生成日报
<div align="center">

# Tracely · 简迹

**自动从 Git 记录生成工作日报的开发者工具**

简单地,留下你的工作痕迹。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/built%20with-Tauri-24C8DB.svg)](https://tauri.app)

</div>

---

## 这是什么

Tracely(简迹)是一个本地优先的桌面工具,帮程序员解决一个老大难问题:**写日报时想不起今天到底干了啥**。

它会读取你本地 Git 仓库的提交历史和未提交改动,自动整理成结构化的工作记录,再交给 AI 总结成一份日报草稿。你可以直接编辑、补充,然后归档。所有数据都存在本地,代码和提交信息不上传任何服务器。

## 为什么做这个

- 日报是负担,但回忆"今天写了什么"更是负担。
- 你的 Git 历史其实已经记录了大部分工作,只是没人帮你翻译成人话。
- 市面上的同类工具要么靠屏幕截图(隐私顾虑大),要么是云端服务(代码外传)。Tracely 选择**本地优先 + 自带 AI Key**,数据始终在你手里。

## 核心特性

- 🔍 **多仓库扫描** — 配置多个本地仓库,一键聚合今天的全部提交与未提交改动
- 🤖 **AI 总结** — 兼容 OpenAI 接口(支持 OpenAI / DeepSeek / 通义 / Kimi / 本地 Ollama 等),自带 Key,零订阅成本
- ✍️ **手动编辑** — 生成的是草稿,Markdown 编辑器随便改、随便补
- 📅 **本地归档** — 日报存本地数据库,可翻历史、按周聚合
- 🔒 **隐私优先** — 纯本地运行,代码与提交信息不经过任何第三方服务器
- 🪶 **轻量** — 基于 Tauri,安装包仅几 MB,占用内存低

## 工作原理

```
   本地 Git 仓库
        │  git log + git diff(未提交)
        ▼
   ┌─────────────┐
   │  数据抓取层  │  整理成结构化的"今天干了啥"
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │   AI 总结    │  调用你配置的 AI 接口,生成日报草稿
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  编辑 & 归档  │  手动调整 → 存入本地数据库
   └─────────────┘
```

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | [Tauri 2](https://tauri.app) |
| 前端 | React + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui |
| 本地存储 | SQLite |
| AI | OpenAI 兼容接口(用户自带 Key) |

## 快速开始

> 开发环境需要 [Node.js](https://nodejs.org) 与 [Rust 工具链](https://www.rust-lang.org/tools/install)(Tauri 依赖,装一次即可)。

```bash
# 克隆项目
git clone https://github.com/<your-name>/tracely.git
cd tracely

# 安装依赖
pnpm install

# 启动开发模式
pnpm tauri dev

# 打包
pnpm tauri build
```

## 使用方式

1. 打开应用,在设置页填入你的 AI 接口地址、API Key 和模型名。
2. 添加你要追踪的本地 Git 仓库路径(可多个)。
3. 点击「生成今日日报」,Tracely 抓取今天的提交与改动并交给 AI 总结。
4. 在编辑器里调整、补充,保存归档。
5. 随时回看历史日报,或按周聚合生成周报。

## 配置 AI

Tracely 不内置任何 AI 服务,也不替你付费。你需要在设置页填入一个 OpenAI 兼容接口:

| 字段 | 示例 |
|------|------|
| API URL | `https://api.openai.com/v1` / `https://api.deepseek.com/v1` / `http://localhost:11434/v1`(Ollama) |
| API Key | 你自己的密钥(本地保存,不上传) |
| 模型 | `gpt-4o` / `deepseek-chat` / `qwen-plus` 等 |

## 隐私说明

- 所有 Git 数据与日报内容**仅存储在本地**。
- 仅当你点击生成时,结构化的工作摘要会发送到**你自己配置的** AI 接口。
- Tracely 不收集、不上传任何数据到作者的服务器(作者也没有服务器)。

## 路线图

- [x] 多仓库 Git 抓取 + AI 生成日报
- [x] Markdown 编辑与本地归档
- [ ] 周报 / 月报自动聚合
- [ ] 定时提醒
- [ ] 多数据源(PR / Issue / 任务系统)
- [ ] 导出(Markdown / PDF)

## 贡献

欢迎 Issue 和 PR。这是一个个人维护的开源项目,功能按需迭代。

## 协议

[MIT](LICENSE) © Tracely
