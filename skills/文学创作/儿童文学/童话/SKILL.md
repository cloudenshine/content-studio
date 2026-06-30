---
name: fairy-tale
label: 童话故事
description: 面向3-8岁儿童的童话故事创作，传递积极价值观
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: core_conflict
    type: text
    required: true
    label: 核心冲突
    hint: 故事要解决的核心矛盾或问题(可多选)
    ui: multiselect
    options: [友谊考验, 战胜恐惧, 解决谜题, 帮助他人, 克服困难, 成长蜕变, 亲情温暖]
  - name: character_name
    type: text
    required: true
    label: 主角名字
    hint: 故事的儿童主角
    ui: multiselect
    options: [小兔子, 小熊, 小猫咪, 小蜗牛, 小星星, 小雨滴, 小树叶]
  - name: moral_lesson
    type: text
    required: true
    label: 道德寓意
    hint: 故事想让孩子明白的道理(可多选)
    ui: multiselect
    options: [诚实守信, 勇敢坚强, 友善互助, 知足感恩, 坚持不懈, 尊重他人, 爱护环境]
  - name: word_count
    type: text
    default: 800
    label: 字数
    hint: 直接输入字数，如 800
    ui: text
craft:
  requires: [anti-ai-slop, sensory-imagery]
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0:
      - positive_theme
      - age_appropriate_language
    P1: []
---
# 童话故事

给3-8岁孩子写一个童话。

## 基调
- 温暖、明亮。悲伤可以存在，但必须被希望包裹。
- 句子简短——每句不超过20个字。一个句子一个动作。
- 用感官写，别说"他很伤心"，写"他的眼泪啪嗒啪嗒掉在面包上"。

## 结构
1. 开头（100-150字）：平静日常被打破。主角遇见问题。
2. 发展（200-400字）：尝试解决，遇到阻碍，获得帮助（动物/老人/魔法物件）。
3. 高潮（100-200字）：直面冲突。主角靠自己（或友谊）克服困难。
4. 结尾（100-150字）：问题解决。点明寓意。不说教，让故事自然带出道理。

## 语言规则
- 不用成语。用具体名词和动词。"跑"代替"疾步如飞"。
- 象声词加分："咔嚓""呼啦""滴答"。
- 对话短，一个人只说一句话。
- 字数误差不超过10%。