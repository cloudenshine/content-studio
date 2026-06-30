# Content Studio 完整使用手册

> 棱镜内容工坊。零依赖·本地优先·层级约束驱动。

---

## 一、启动 LLM 后端（三选一）

```powershell
# Ollama（本地推荐）
ollama serve
ollama pull qwen2.5:7b

# BYOK（需要 API Key）
# 直接在命令中传入 --api-key sk-xxx --mode byok

# CLI 命令（如 claude/cursor）
# 直接用 --mode cli
```

## 二、CLI 模式

### 基本用法

```powershell
node cli.mjs --prompt "你的创作需求" --skill 路径 --design 风格ID
```

### 完整参数

| 参数 | 说明 |
|------|------|
| `--prompt` | 创作提示（必填） |
| `--skill` | 技能路径，如 `文学创作/小说/短篇小说` |
| `--design` | 风格 ID 及强度，如 `hard-scifi:70,xiaohongshu:30` |
| `--mode` | LLM 模式：ollama / byok / cli |
| `--vault-out <路径>` | 写入 Obsidian vault 目录 |
| `--vault-dir <名>` | vault 子目录名（默认 _content-studio） |
| `--rag-dir <路径>` | 知识库目录，做 RAG 检索 |
| `--memory <文件/目录>` | 偏好笔记 |
| `--judge` | LLM-as-judge 评分 |
| `--auto-revise` | P0 未过时自动修订 |
| `--project <名>` | 项目 MOC 管理 |
| `--history` | 列出历史 |
| `--read-history <id>` | 查看历史详情 |
| `--list-examples` | 列出25类通过实例 |
| `--read-example <id>` | 读取实例正文与验收摘要 |

### 工作流示例

```powershell
# 写一篇小红书
node cli.mjs --skill 媒体社交/社媒帖子/小红书 --design xiaohongshu --prompt "推荐一本书"

# 写入 Obsidian vault
node cli.mjs --prompt "..." --vault-out "E:/my-vault" --project "读书笔记"

# 基于 vault 笔记写文章
node cli.mjs --prompt "AI 对齐问题" --rag-dir "E:/vault/笔记/AI"

# 自动纠偏
node cli.mjs --prompt "..." --auto-revise --max-revisions 3
```

## 三、Web UI 模式

```powershell
node src/server.js
# 浏览器打开 http://localhost:3456
```

Web UI 提供：
- 分类导航选择技能/风格
- 生成表单 + 评估结果
- 🤖 **AI 自动补全**（输入想法后一键填充全部字段）
- ✏️ **自由文本输入**（字数/章节/时长等字段可自由输入）
- **复制** / **保存到历史** / **保存到 Vault** 按钮
- **历史记录面板**（查看/删除）
- **联网搜索** 开关（获取实时内容）
- **Obsidian 连接**（输入 vault 路径后可直接写入）
- **技能编辑器**（管理 skills/ 目录）
- **通过实例**（只读浏览 25 类正文和验收摘要）

### 浏览验收实例

```powershell
node cli.mjs --list-examples
node cli.mjs --read-example AC-24
```

也可启动 Web UI 后点击顶部“✅ 实例”，按文学创作、商业写作、知识输出、媒体社交、学术专业筛选。

实例 API 只有读取能力：

- `GET /api/examples`
- `GET /api/examples/:id`

## 四、全分类复验

```powershell
npm run delivery:validate
npm test

# 需要重新生成证据时，必须使用新的运行目录
npm run delivery:prepare -- --run .content-studio/deliveries/<新目录>
npm run delivery:run -- --run .content-studio/deliveries/<新目录>
npm run delivery:review -- --run .content-studio/deliveries/<新目录>
npm run delivery:verify -- --run .content-studio/deliveries/<新目录>
```

只有 `verify` 达到25/25后才能执行 `delivery:publish`。发布步骤只提升最终 prompt、output、review 和验证证据，不提升日志或中间版本。

## 五、约束体系

系统按你选择的体裁自动加载对应的约束：

```
选择 文学创作/小说/长篇小说
  ↓ 约束引擎合并
文学创作大类 doctrine（主题立意、情感弧线）
  + 小说中类 doctrine（故事结构、角色选择代价）
  + 长篇小说小类 doctrine（伏笔三步、信息投放）
  + forbidden（乒乓球对话、机械降神）
  + p0_checks（角色一致性、因果逻辑等）
  → 全部注入 prompt 的"硬性约束"段
```

## 六、存储

| 存储位置 | 方式 | 说明 |
|---------|------|------|
| `.content-studio/history/` | 自动保存 | 每次生成自动记录 |
| Obsidian vault | `--vault-out` 或 Web UI 保存按钮 | 写入 vault 的 `_content-studio/` 目录 |
| `examples/all-categories/` | 项目只读资产 | 25类合成实例及验收证据 |

`.content-studio/` 已被 Git 忽略；这里的个人历史、运行日志和中间版本不会进入正式项目资产。
