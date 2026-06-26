---
name: 中篇小说
label: 中篇小说章节 (20K-80K字)
description: 生成一章中篇小说正文，主线聚焦，节奏紧凑
mode: content-generate
inputs:
  - name: premise
    type: text
    required: true
    label: 本章前提
    hint: (可多选)
    ui: multiselect
    options: [主角成长, 阴谋揭露, 救援行动, 发现秘密, 身份反转, 情感冲突]
  - name: target_words
    type: integer
    default: 4000
    label: 目标字数
    ui: dropdown
    options: [2000, 3000, 4000, 5000]
  - name: chapter_type
    type: string
    label: 章节类型
    ui: multiselect
    options: [推进主线, 发展冲突, 铺垫反转, 高潮场景, 收官收尾]
craft:
  requires: [anti-ai-slop, sentence-rhythm, sensory-imagery]
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, audience_resonance, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0: [no_factual_errors, no_character_ooc]
    P1: [hook_present, satisfaction_moment_exists]
---
# 中篇小说章节生成

中篇小说主线聚焦，不超过2条支线。节奏较紧凑，省去长篇的世界观全貌展示。

## 结构

1. **开场钩子**（前200字）
2. **场景推进**（3个节拍）
3. **核心事件**（这章最重要的1个事件写透）
4. **章末收束或悬念**（前呼后应）
- 每500字放一个小钩子或转折
