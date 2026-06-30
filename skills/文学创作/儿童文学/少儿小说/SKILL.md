---
name: childrens-novel
label: 少儿小说
description: 面向6-14岁少儿的章节小说创作，传递积极成长主题
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: logline
    type: text
    required: true
    label: 故事梗概
    hint: 一句话概括故事核心(可多选)
    ui: multiselect
    options: [成长冒险, 校园故事, 家庭温情, 奇幻探索, 友谊考验, 解谜破案]
  - name: protagonist_age
    type: text
    required: true
    label: 主角年龄
    hint: 主角的年龄设定(可多选)
    ui: multiselect
    options: [6-8岁, 9-11岁, 12-14岁, 15-18岁]
  - name: theme
    type: text
    required: true
    label: 主题
    hint: 故事的核心主题（如友谊、勇气、成长）(可多选)
    ui: multiselect
    options: [友谊, 勇气, 成长, 家庭, 梦想, 正义, 智慧, 坚持]
  - name: chapters
    type: text
    required: false
    label: 章节数
    hint: 直接输入章节数，如 8
    ui: text
craft:
  requires: [anti-ai-slop]
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0:
      - positive_theme
    P1: []
---
# 少儿小说

6-14岁少儿的成长故事。

## 核心原则
- 主角就是读者想成为的人——不是完美的，但是有勇气的。
- 每个章节结尾留一个钩子：一个问题、一个悬念、一个未完成的动作。
- 主题必须正面。不是说教，而是让角色在行动中证明"坚持""诚实""同理心"的价值。

## 结构框架（以8章为例）
1-2章：建立世界。主角的日常、渴望、缺陷。
3-4章：冲突升级。主角做出选择，后果出现。
5-6章：低谷。最难的时刻，主角差点放弃。
7章：转折。主角找到内在力量。
8章：解决。成长被看见。

## 语言
- 对话体现性格，不解释情绪。用动作带出感受。
- 章节标题要有悬念感。
- 避免"从此过上幸福生活"式的仓促结尾。成长是 bittersweet 的。

## 禁止项
- 不矮化儿童智商
- 不下结论式总结"这个故事告诉我们"
- 不使用低幼叠词（吃饭饭、睡觉觉）