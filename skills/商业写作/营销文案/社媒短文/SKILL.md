---
name: social-media-short
label: 社交媒体短文
description: 微博/即刻/朋友圈等平台的短文案创作，快速抓住注意力
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: core_message
    type: text
    required: true
    label: 核心信息
    hint: 你想传达的核心观点(可多选)
    ui: multiselect
    options: [观点表达, 情感共鸣, 行动号召, 信息传递, 经验分享, 幽默段子]
  - name: platform
    type: string
    required: false
    label: 平台
    hint: 发布的目标平台
    ui: dropdown
    options:
      - 微博
      - 即刻
      - 朋友圈
      - LinkedIn
  - name: word_count
    type: text
    required: false
    label: 字数
    hint: 直接输入字数，如 140
    ui: text
  - name: tone
    type: string
    required: false
    label: 语气风格
    hint: 文案的语气基调（可多选）
    ui: multiselect
    options:
      - 专业
      - 亲切
      - 幽默
      - 激励
      - 深度
  - name: target_action
    type: text
    required: false
    label: 目标行动
    hint: 希望读者做什么(可多选)
    ui: multiselect
    options: [评论互动, 转发分享, 点击链接, 收藏保存, 扫码关注, 参与讨论]
craft:
  requires: []
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0:
      - no_factual_errors
    P1:
      - hook_present
---
# 社交媒体短文

140字能说完的，不用280字。

## 开头即钩子
- 前20字决定是否被读完。用反常识、用具体数字、用冲突。
- 别铺垫。第一句就把最值钱的信息扔出去。

## 平台规则
- **微博**：前40字决定点击。话题标签不超过2个。@提要及时且真诚。
- **即刻**：更个人化、更碎片。像在跟朋友发消息。
- **朋友圈**：第一行=标题。折叠线之前说完重点。配图比文案重要。
- **LinkedIn**：专业但不僵硬。用真实案例开场。结尾留讨论空间。

## 节奏
- 短句。一个观点一段。两行就换行。
- 数字醒目。
- 结尾要么是金句，要么是提问，要么是行动指令。

## 禁止项
- 不写"震惊""全网疯传"
- 不堆关键词
- 不写空洞的"加油""努力"