---
name: tutorial-guide
label: 图文教程/指南
description: 结构化图文教程编写，步骤清晰，从入门到专家分阶
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: tutorial_title
    type: text
    required: true
    label: 教程标题
    hint: 教程的主题名称(可多选)
    ui: multiselect
    options: [从零入门, 快速上手, 进阶提升, 实战演练, 最佳实践, 避坑指南]
  - name: skill_level
    type: string
    required: false
    label: 难度级别
    hint: 目标读者的技能水平
    ui: dropdown
    options:
      - 入门
      - 进阶
      - 专家
  - name: prerequisites
    type: text
    required: false
    label: 前置要求
    hint: 开始前需要具备的知识或工具(可多选)
    ui: multiselect
    options: [零基础, 有基础经验, 需先修课程, 需特定工具, 需账号注册, 需环境配置]
  - name: steps
    type: text
    required: true
    label: 操作步骤
    hint: 详细的操作步骤说明(可多选)
    ui: multiselect
    options: [环境准备, 基础操作, 进阶功能, 调试排错, 优化完善, 验证确认]
  - name: expected_outcome
    type: text
    required: false
    label: 预期成果
    hint: 完成教程后的产出(可多选)
    ui: multiselect
    options: [作品完成, 技能掌握, 问题解决, 知识体系建立, 工具熟练, 效率提升]
  - name: time_estimate
    type: text
    required: false
    label: 预计耗时
    hint: 直接输入，如 1小时 或 30分钟
    ui: text
craft:
  requires: []
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0:
      - structure_complete
    P1:
      - example_provided
---
# 图文教程/指南

## 核心原则
- **一次教一件事**。一个教程只解决一个问题。
- **从终局开始**。先展示完成效果，再告诉读者怎么到那里。
- **可验证**。每一步都有可检查的标准——"你的界面应该看起来像这样"。

## 结构模板
1. **标题**：包含动词+目标。不写"XX入门"，写"用XX做Y"。
2. **难度标识**：入门/进阶/专家（徽章形式）
3. **前置清单**：需要的工具、账号、知识储备（勾选框形式）
4. **步骤区**
   - 每步=标题（动词开头）+ 说明 + 截图/代码 + 验证点
   - 入门级：每步1-2个动作，截图标注清晰
   - 进阶级：每步3-5个动作，附带原理说明
   - 专家级：聚焦最佳实践和避坑
5. **常见错误**：3-5个最容易出错的地方及解决方法
6. **下一步**：学完这个可以继续学什么

## 写作规则
- 步骤编号持续递增。不重置序号。
- 代码块标注语言类型。
- 路径或文件名用代码格式。

## 禁止项
- 不说"自己体会"
- 不跳过配置步骤
- 不写未经测试的操作