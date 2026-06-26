# Content Studio — 层级内容创作系统

> Open Design 架构 · 零依赖 · 本地优先 · 层级约束驱动

## 体系架构

```
用户界面（3步引导）
  Step 1: 选大类 (文学/商业/知识/媒体/学术)
  Step 2: 选中类 (小说/剧本/营销/报告...)
  Step 3: 选小类 (长篇小说/产品页/小红书...)
    ↓
约束引擎 (constraint-engine.js) 按路径合并约束链
    ↓
技能加载器 (skill-loader.js) 只加载当前技能
    ↓
LLM 生成 → 5维自评 + P0/P1/P2 硬检查
```

## 分类树 (taxonomy.json)

```
5 大类 → 20+ 中类 → 50+ 小类
文学创作: 小说(长篇/中篇/短篇/微型) 剧本 诗歌 散文 儿童文学
商业写作: 营销文案(产品页/社媒短文) 汇报报告(周报/调研) 产品文档
知识输出: 课程脚本(视频/教程) 深度分析
媒体社交: 社媒帖子(小红书/公众号/微博) 新闻通讯
学术专业: 论文 技术文档 研究笔记
```

## 核心文件

| 文件 | 职责 |
|------|------|
| `taxonomy.json` | 完整分类树 + 每个节点的约束定义 |
| `lib/constraint-engine.js` | 按路径合并约束链（大类→中类→小类） |
| `lib/skill-loader.js` | 懒加载技能（LRU 缓存 3 个） |
| `src/registry.js` | 评分引擎 + prompt 组装 |
| `src/server.js` | HTTP API + 分类导航端点 |
| `skills/.../SKILL.md` | 技能定义（按分类路径组织） |
| `designs/.../DESIGN.md` | 风格包定义 |
| `craft/*.md` | 通用工艺规则 |

## 关键 API

| 端点 | 说明 |
|------|------|
| `GET /api/taxonomy?parent=` | 获取某节点下的子节点列表 |
| `GET /api/taxonomy/长篇小说` | 获取该路径的约束+可用技能 |
| `GET /api/skills?parent=` | 列出某路径下的可用技能 |
| `POST /api/generate` | 生成（传 skill 为分类路径） |

## 约束继承规则

每个节点在 taxonomy.json 中定义约束，子节点继承并追加父节点约束：

- `doctrine[]` — 父项 + 子项合并
- `allowed_craft[]` — 子收窄父（取子值）
- `forbidden_patterns[]` — 合并
- `p0_checks[]` — 合并
- `tone_range` — 子覆盖父

## 运行

| 命令 | 功能 |
|------|------|
| `npm start` | 启动服务器 (localhost:3456) |
| `node cli.mjs --skill 长篇小说 --prompt "..."` | 命令行生成 |
