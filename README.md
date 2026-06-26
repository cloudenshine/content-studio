# Content Studio — 层级内容创作系统

> Open Design 架构 · 零依赖 · 本地优先 · 层级约束驱动

三位一体运行模式：

| 模式 | 引擎 | 费用 | 定位 |
|------|------|:----:|------|
| 🖥️ **Local CLI** | Claude Code / Cursor / Codex | 已有订阅 | 主力推荐 |
| 🦙 Ollama | 本地 LLM | 免费 | 离线/隐私 |
| ☁️ API | OpenAI 兼容 | 按量 | 备选 |

## 快速开始

```bash
cd content-studio
node src/server.js
# 打开 http://localhost:3456
```

## 体系架构

```
分类树 → 选类 → 约束链合并 → 技能加载 → LLM 生成 → 5 维自评 + P0/P1/P2 硬检查
```

- **分类树**：5 大类 × 20+ 中类 × 50+ 小类，每节点定义 scope/doctrine/tone/craft/p0
- **约束引擎**：大类→中类→小类约束继承合并
- **技能懒加载**：只加载当前路径对应的 SKILL.md，LRU 缓存 3 个
- **工艺规则**：反 AI 套话 / 句式节奏 / 感官描写
- **10 个风格包**：从网文爽文到硬核科幻到温暖治愈

## 目录结构

```
content-studio/
├── cli.mjs               命令行工具
├── taxonomy.json          完整分类树
├── lib/                   核心引擎
│   ├── constraint-engine.js  约束链合并
│   └── skill-loader.js       懒加载技能
├── src/                   HTTP API
│   ├── server.js            REST 服务 + 三种 LLM 适配器
│   └── registry.js          技能/风格注册表 + 自评引擎
├── ui/index.html          单页 Web 应用
├── skills/                25 个技能，按分类树组织
├── designs/               10 个风格包
├── craft/                 通用工艺规则
└── obsidian/              Obsidian 集成
```

## 三种运行模式

```bash
# Local CLI（默认，自动检测 Claude Code）
node src/server.js

# Ollama
set LLM_MODE=ollama
node src/server.js

# API
set LLM_MODE=api
set BYOK_API_KEY=sk-xxx
node src/server.js
```

或通过 Web UI 的 🖥️ 🦙 ☁️ 按钮直接切换，设置面板支持各模式的独立参数配置。

## 零依赖

```json
"dependencies": {}
```

纯 Node ESM，无需 `npm install`。
