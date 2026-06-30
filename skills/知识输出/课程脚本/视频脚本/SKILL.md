---
name: video-script
label: 课程视频口播脚本
description: 知识类课程视频的口播脚本创作，兼顾听觉理解和记忆留存
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: course_title
    type: text
    required: true
    label: 课程名称
    hint: 所属课程的名称(可多选)
    ui: multiselect
    options: [入门教程, 进阶课程, 实战训练, 专题研究, 系列讲座, 速成班]
  - name: lesson_title
    type: text
    required: true
    label: 课时标题
    hint: 本节课的标题(可多选)
    ui: multiselect
    options: [概念解析, 案例分析, 实操演示, 常见问题, 总结回顾, 实战演练]
  - name: duration_minutes
    type: text
    required: false
    label: 时长（分钟）
    hint: 直接输入分钟数，如 10
    ui: text
  - name: target_audience
    type: text
    required: true
    label: 目标受众
    hint: 本节课面向的学员(可多选)
    ui: multiselect
    options: [初级学员, 中级学员, 高级学员, 零基础学员, 转行学员, 在职提升]
  - name: learning_objective
    type: text
    required: true
    label: 学习目标
    hint: 学员学完本节能做什么(可多选)
    ui: multiselect
    options: [知识理解, 技能掌握, 思维转变, 方法应用, 问题解决, 独立实践]
  - name: key_points
    type: text
    required: false
    label: 核心知识点
    hint: 本节课要传授的关键内容(可多选)
    ui: multiselect
    options: [核心概念, 关键步骤, 注意事项, 常见误区, 最佳实践, 进阶技巧]
  - name: example_scenario
    type: text
    required: false
    label: 案例场景
    hint: 用于讲解的实例或场景(可多选)
    ui: multiselect
    options: [真实案例, 模拟场景, 对比分析, 实操演示, 错误示范, 行业标杆]
craft:
  requires: []
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0:
      - learning_objective_clear
    P1:
      - example_provided
---
# 课程视频口播脚本

## 节奏控制
- **每分钟200-250字**。10分钟≈2000-2500字。留白比填满重要。
- 每5-7分钟切换一次信息类型：概念→案例→问题→总结。
- 用提问制造悬念："你有没有遇到过这种情况……"

## 结构框架
1. **钩子（30秒）**：一个具体场景、一个反常识问题、一个"做不到"的痛点→引出本节课价值
2. **目标预告（20秒）**："这节课结束，你将能……"
3. **概念讲解（40%时间）**：一个概念→一个比喻→一个例子。比喻是用已知解释未知的桥梁。
4. **操作演示/案例拆解（30%时间）**：边做边说。先说做什么，再说为什么。
5. **常见误区（15%时间）**：学员最容易犯的错，以及如何避免。
6. **总结与作业（剩余时间）**：3句话回顾核心。布置一个具体动作。

## 口播语言
- 写出来读一读。读不顺的地方改。
- 短句为主。长句拆成两个。
- 关键词重复三遍："重点是——重点是——重点是——"
- 不用书面语。"即"改成"就是"；"故"改成"所以"。

## 禁止项
- 不写"众所周知""显而易见"
- 不写"我相信你一定可以"
- 不堆砌术语不解释