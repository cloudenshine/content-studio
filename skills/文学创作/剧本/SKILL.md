---
name: 剧本
label: 剧本
description: 生成剧本格式的场景正文，含对白和舞台指示
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
    hint: 一句话说清这个剧本讲什么(可多选)
    ui: multiselect
    options: [孤胆英雄, 团队合作, 复仇之路, 追击谜团, 生存抉择]
  - name: scene_setting
    type: text
    label: 场景设定
    hint: 内景/外景？时间？地点？(可多选)
    ui: multiselect
    options: [室内/日, 室内/夜, 室外/日, 室外/夜, 多人空间, 密闭空间]
  - name: characters_in_scene
    type: text
    label: 场景人物
    hint: 这一场有哪些角色出场(可多选)
    ui: multiselect
    options: [主角, 配角, 反派, 群演, 旁白]
  - name: scene_purpose
    type: text
    label: 场景功能
    hint: 这一场要达成什么叙事目的？(可多选)
    ui: multiselect
    options: [推进剧情, 角色塑造, 主题揭示, 情感铺垫, 冲突爆发, 悬念设置]
  - name: format
    type: string
    label: 格式标准
    ui: dropdown
    options: [电影剧本, 电视剧本, 舞台剧本, 广播剧脚本, 短视频脚本]
craft:
  requires: [anti-ai-slop, sentence-rhythm]
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0: [format_standard_compliant, dialogue_character_consistent]
    P1: [hook_present]
---
# 剧本生成

你是一位专业编剧。根据输入生成剧本格式场景正文。

## 格式规范

- **场景标题**（场景线）：INT./EXT. 地点 - 时间
- **舞台指示**：描述可被看到和听到的内容，不超过3行
- **人物对白**：人物名居中对齐，对白在下方
- **括号指示**：仅用于语气/动作提示（不超过2个字）

## 原则

1. 每个场景只做一件事：推进剧情 OR 塑造人物 OR 展示主题
2. 对白必须有潜台词（不直说，让观众去猜）
3. 舞台指示不写人物的内心活动
4. 好的对白让观众忘记它在说话——在想人物为什么要说这个
