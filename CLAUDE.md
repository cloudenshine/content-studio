# Content Studio — 内容创作执行引擎

> 零依赖·本地优先·层级约束驱动·CLI/WebUI 双模式
> 版本 0.4.0 · taxonomy 1.1 · 2026-06-30

## 架构

```
┌─ 用户层 ───────────────────────────┐
│  CLI (cli.mjs) │ Web UI (server.js) │
└──────────────┬───────────────────────┘
               ↓
┌─ 适配层 ───────────────────────────┐
│  src/registry.js       技能/风格注册表│
│  src/example-registry.js 只读实例注册表│
│  src/server.js         HTTP API + UI│
│  src/vault-watcher.js  vault 读写   │
│  lib/constraint-engine.js tax加载   │
│  lib/skill-loader.js   SKILL.md加载 │
└──────────────┬───────────────────────┘
               ↓
┌─ 内核 (lib/core/) 纯函数零 I/O ────┐
│  scorer / prompt-assembler          │
│  constraint-engine / parse-frontmatter│
│  rag / llm-judge / memory          │
└──────────────────────────────────────┘
               ↓
┌─ 资产 ──────────────────────────────┐
│  taxonomy.json / skills/ designs/ craft/ │
│  examples/all-categories/ 通过实例与证据 │
└──────────────────────────────────────┘
```

## CLI 参数

```bash
node cli.mjs --prompt "..."           # 必填
  --skill <路径>                      # 技能
  --design <id>[:强度]               # 风格/多风格混合
  --mode ollama|byok|cli             # LLM 后端
  --vault-out <路径> --vault-dir <名> # 写入 Obsidian vault
  --rag-dir <路径>                    # 知识检索
  --memory <路径>                     # 偏好笔记
  --judge                            # LLM-as-judge
  --auto-revise --max-revisions <N>  # 自动纠偏
  --project <名>                      # 项目 MOC
  --history / --read-history <id>    # 历史
  --list-examples / --read-example   # 只读实例
```

## Web UI 功能

| 功能 | 说明 |
|------|------|
| 层级分类导航 | 5大→中→小类，选择即约束 |
| 创作表单 | 动态生成字段：用户想法(textarea) + 结构化字段 |
| AI 自动补全 | 输入想法后一键智能填充全部字段 |
| 风格包混合 | 多选+强度滑块，主要/辅助风格分层 |
| 联网搜索 | 生成前搜索实时内容 |
| 参考源 | 粘贴/URL抓取/Obsidian/文件上传 |
| 评估面板 | 6维雷达 + P0/P1/P2 硬检查 |
| 历史管理 | 生成记录查看/删除 |
| Vault 保存 | 直接写入 Obsidian vault |
| 技能编辑器 | Web 端管理 SKILL.md |

## 核心文件

| 文件 | 职责 |
|------|------|
| `taxonomy.json` | 5 大类层级约束树（38 节点） |
| `lib/core/` | 7 个纯函数内核文件（零 I/O，零依赖） |
| `lib/constraint-engine.js` | taxonomy 加载 + 约束链合并 |
| `lib/skill-loader.js` | SKILL.md 懒加载 + LRU 缓存 |
| `src/registry.js` | 技能/风格/工艺注册表 + saveSkill |
| `src/example-registry.js` | 25 类通过实例只读注册表 |
| `src/server.js` | HTTP API + Web UI + AI 自动补全 |
| `src/vault-watcher.js` | Obsidian vault 读写 |
| `cli.mjs` | CLI 入口 |
| `modules/persist/store.js` | 历史持久化 |
| `craft/*.md` | 5 条工艺规则 |
| `examples/all-categories/` | v2 交付实例、manifest 和 verification |
| `test/` | 合同/核心/前端 测试套件 |

## 已删除

- `obsidian/` — Obsidian 插件（API 兼容性问题，已转为 vault 直写方式）
- `restore-checkpoint.bat` — 临时恢复脚本

## 验证与边界

- app 版本为 `0.4.0`，taxonomy 版本为 `1.1`，delivery schema 为 `v2`。
- 修改合同后运行 `npm run delivery:validate` 和 `npm test`。
- `.content-studio/` 属于运行时私有目录，不得提交；正式实例仅来自验证通过后的发布步骤。
- 实例 CLI/API/UI 只能读取，不得增加删除、覆盖或写回草稿的快捷操作。

## 约束体系

5 大类 → 20+ 中类 → 38+ 小类，约束通过层级继承合并：
- doctrine[] — 引导式原则（合并父+子）
- forbidden_patterns[] — 禁止模式（合并）
- p0_checks[] — 硬性检查（合并）
- tone_range / word_range — 子覆盖父

约束已注入 prompt 的"硬性约束"段。
