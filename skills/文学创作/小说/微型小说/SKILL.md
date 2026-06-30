---
name: 微型小说
label: 微型小说 (<2K字)
description: 一篇极短篇，突出一个瞬间、一个反转或一个意象
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: core_idea
    type: text
    required: true
    label: 核心创意
    hint: 一句话，如"一个人在电梯里发现昨天已死的人站在他身后"(可多选)
    ui: multiselect
    options: [时间循环, 身份错位, 超能觉醒, 平行世界, 末日生存, 记忆篡改]
  - name: target_words
    type: text
    default: 1000
    label: 目标字数
    hint: 直接输入字数，如 800
    ui: text
  - name: twist
    type: string
    label: 结尾类型
    ui: dropdown
    options: ["反转（事实翻转）", "余味（情绪收束）", "留白（开放式）", "呼应（回到开头）"]
craft:
  requires: [anti-ai-slop, sentence-rhythm]
output:
  format: markdown
evaluation:
  dimensions: [structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P1: [hook_present]
---
# 微型小说创作

微型小说（闪小说/微小说）的黄金法则：**去掉一切修饰词**。

## 结构

- 场景：不超过2个
- 人物：不超过3个（含线索人物）
- 对话：不超过2组
- 时间跨度：不超过1小时

## 结尾铁律

最后一句话决定了整篇微型小说的质量。
- 必须意外但合理
- 让读者在读完后沉默3秒
- 好的结尾让读者从头再读一遍

## 字数建议

- 100字：日本掌篇小说，一个场景一个意象
- 500字：标准微型小说，2个场景1个反转
- 1000字：闪小说，3个场景1个完整故事
