---
name: picture-book-text
label: 绘本文字
description: 低幼绘本文字创作，每页不超过100字，注重韵律和画面感
mode: content-generate
inputs:
  - name: story_core
    type: text
    required: true
    label: 故事核心
    hint: 故事的核心概念或主线(可多选)
    ui: multiselect
    options: [探索发现, 日常习惯, 情绪认知, 亲子关系, 自然认知, 社交启蒙, 晚安故事]
  - name: page_count
    type: string
    required: false
    label: 页数
    hint: 绘本的总页数
    ui: dropdown
    options:
      - 8
      - 12
      - 16
      - 20
      - 24
  - name: age_range
    type: string
    required: false
    label: 适读年龄
    hint: 目标读者年龄段
    ui: dropdown
    options:
      - 0-3
      - 3-6
      - 6-8
craft:
  requires: [sentence-rhythm, sensory-imagery]
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0: []
    P1: []
---
# 绘本文字

每页不超过100字。给翻书的小手留时间。

## 节奏
- 读出声来。每页的文字就是一拍。长短交替——短句加速，长句舒缓。
- 重复是力量："小熊走啊走。走啊走。走啊走。"孩子跟着节奏晃。
- 押韵可以，但不硬押。自然的音韵比勉强押韵更重要。

## 画面
- 文字只写看不见的东西。看得见的交给插画师。
- 别说"这是一只红色的小鸟"。画里有。
- 写声音、写感受、写气味——"吱呀——门开了""毛茸茸的，暖乎乎的"。
- 翻页有惊喜。每页结尾留一个小悬念，下一页揭晓。

## 结构
- 三幕式，但极简。开头（2-4页）→中段（4-12页）→结尾（2-4页）。
- 0-3岁：文字更少（每页10-30字），拟声词多，节奏像儿歌。
- 3-6岁：简单情节，重复句式，情感明确。
- 6-8岁：可以有小悬念和幽默，语言丰富一些。

## 禁止项
- 不写教条式结尾
- 不写画里已经有的东西
- 不用复杂从句