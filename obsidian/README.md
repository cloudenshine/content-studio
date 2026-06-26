# content-studio → Obsidian 集成指南

通过 Obsidian 的 **Templater** 插件，你可以在笔记中直接调用 content-studio 生成内容，无需离开编辑器。

---

## 前置条件

1. content-studio 已在运行：`npm start` → http://localhost:3456
2. Obsidian 已安装 **Templater** 社区插件
3. Ollama 已运行且有可用模型

---

## 安装步骤

### 1. 安装 Templater 插件

1. Obsidian → 设置 → 社区插件 → 浏览
2. 搜索 **Templater** (作者 SilentVoid)
3. 安装并启用

### 2. 配置 Templater Script 文件夹

1. Obsidian → 设置 → Templater
2. 找到 **Script files folder location**
3. 设置为你的 Templater 脚本存放路径（如 `Templates/scripts/`）
4. 将 `obsidian/content-studio.js` **复制** 到该目录

### 3. 添加模板命令

1. Obsidian → 设置 → Templater
2. 在 **Trigger Template on new file creation** 下方找到 **User Script functions**
3. 点击 **Add new template command**
4. 选择 `content-studio.js`
5. 可选：绑定快捷键（如 `Ctrl+Shift+G`）

### 4. 验证

1. 确保 content-studio 正在运行（`npm start`）
2. 在任意笔记中写下需求并选中文本
3. 运行 Templater 命令：`Ctrl+Shift+G`（或通过命令面板）
4. 选择技能 → 选择风格 → 填写字段
5. 生成结果自动插入到光标位置

---

## 使用方式

### 方式一：选中文本后生成（推荐）

```
在笔记中写下你的创作需求，选中它，然后运行脚本。

示例（选中后执行脚本）：
---
一个初创公司的智能会议纪要工具
目标用户：30-50人科技公司的项目经理
核心卖点：录音自动转文字+任务自动分配
---
```

### 方式二：弹出输入框

如果不选中文本，脚本会弹出输入框让你手动输入。

### 方式三：笔记 Frontmatter + 选中

在笔记 frontmatter 中指定技能和风格，脚本会自动读取：

```yaml
---
content-studio-skill: product-copy
content-studio-design: xiaohongshu
---
```

（此功能尚未实现 — 后续版本）

---

## 生成结果格式

插入到笔记中的结果包含：

```
> **content-studio 生成结果**
> 📦 产品文案 · 🎨 小红书风
> 🟢 评分 7.5/10 · P0 ✅ P1 ✅ · 519 字 · 25.4s
> 📝 一个初创公司的智能会议纪要工具...
>
> **评分明细**
> 逻辑一致性: ★★★★☆ 8/10
> 受众共鸣度: ★★★☆☆ 5/10
> ...

[正文内容]
```

---

## 故障排除

| 问题 | 原因 | 解决 |
|------|------|------|
| "content-studio 未运行" | 服务未启动 | 运行 `npm start` |
| "无可用技能" | skills/ 目录为空 | 检查 skills/ 目录 |
| 生成超时 | 模型响应慢 | 检查 Ollama 状态或换小模型 |
| 脚本不执行 | Templater 配置错误 | 检查 Script files folder 路径 |

---

## 升级路径：知识库联动（方案二）

当方案一跑通后，可以进一步让 content-studio 直接读取 Obsidian 笔记库作为素材：

1. 在 content-studio 设置中配置 vault 路径
2. 创建使用 `obsidian-knowledge` craft 规则的技能
3. 技能会自动检索相关笔记作为创作参考

此功能尚在开发中。如果你需要，请告知具体使用场景。
