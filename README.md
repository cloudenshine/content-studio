# Content Studio

> 零依赖·层级约束驱动·多体裁内容创作引擎

当前版本：Content Studio `0.4.0` · taxonomy `1.1` · delivery schema `v2`。

## 快速开始

```bash
cd content-studio

# CLI 生成
node cli.mjs --prompt "写一个短篇故事" --skill 文学创作/小说/短篇小说

# 启动 Web UI
node src/server.js
# 浏览器打开 http://localhost:3456

# 查看可用技能和风格
node cli.mjs --list-skills
node cli.mjs --list-designs

# 浏览25类已验收实例
node cli.mjs --list-examples
node cli.mjs --read-example AC-05
```

## 核心概念

- **taxonomy.json** — 5 大类层级约束树，体裁自动适配
- **skills/** — 26 个创作技能模板（SKILL.md），含用户想法 + AI 自动补全
- **designs/** — 10 种语言风格包（DESIGN.md），支持多风格混合
- **craft/** — 工艺规则（5 条）
- **lib/core/** — 7 个纯函数内核文件，零依赖
- **examples/all-categories/** — 25类通过硬合同与语义复核的只读实例

## Web UI 新特性

- 🤖 **AI 自动补全**：输入创作想法后一键智能填充全部表单字段
- ✏️ **自由输入量化字段**：字数/章节/时长等改为文本框，不再限制下拉选项
- 💬 **用户想法优先**：所有体裁表单首位为「用户想法」textarea，作为 prompt 最高优先级指引
- 🎨 **多风格混合**：可多选风格包并调节强度，主要/辅助风格分层

## 质量证据

- `npm test`：运行合同、核心逻辑和实例 registry 测试。
- `npm run delivery:validate`：确认25个案例与25个权威 Skill 一一对应。
- `examples/all-categories/verification.json`：逐项验收结果。
- `examples/all-categories/manifest.json`：模型、版本、taxonomy、案例和 Skill 摘要。

Web UI 顶部的“✅ 实例”入口可按大类浏览正文与验收摘要。实例与个人历史严格分离，只读且不能覆盖草稿。

`.content-studio/` 是本地运行目录，包含历史、临时交付和日志，已被 Git 忽略；正式实例只存放在 `examples/`。

## LLM 后端

| 模式 | 命令 | 说明 |
|------|------|------|
| CLI | `--mode cli` | Claude/Cursor/Codex/Gemini（主力推荐） |
| Ollama | `--mode ollama` | 本地免费（需安装） |
| API | `--mode api --api-key sk-xxx` | OpenAI 兼容 |

## 完整用法

详见 `USAGE.md`。
