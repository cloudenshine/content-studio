---
name: 长篇小说
label: 长篇小说章节 (>80K字)
description: 生成一章长篇小说正文，结构完整，适合复杂世界观
mode: content-generate
inputs:
  - name: premise
    type: text
    required: true
    label: 本章前提
    hint: 这一章发生了什么核心事件？(可多选)
    ui: multiselect
    options: [主角成长, 阴谋揭露, 救援行动, 发现秘密, 身份反转, 情感冲突]
  - name: target_words
    type: integer
    default: 5000
    label: 目标字数
    ui: dropdown
    options: [3000, 5000, 8000, 10000]
  - name: pov_character
    type: string
    label: 视角人物
    ui: dropdown
    options: [主角视角, 重要配角视角, 反派视角, 上帝视角, 多视角切换]
  - name: chapter_type
    type: string
    label: 章节类型
    ui: multiselect
    options: [推进主线, 支线展开, 战斗/冲突, 过渡/铺垫, 揭秘/反转, 情感/日常, 世界展示]
  - name: previous_chapter_hook
    type: text
    label: 上一章钩子
    hint: 上一章结尾留下了什么悬念？(可多选)
    ui: multiselect
    options: [悬念未解, 新危机, 角色处境, 意外发现, 反转铺垫]
  - name: character_state
    type: text
    label: 人物近况
    hint: 主要人物当前状态和情绪(可多选)
    ui: multiselect
    options: [巅峰状态, 受伤低谷, 迷茫探索, 愤怒爆发, 冷静决策, 情感波动]
design_system:
  requires: true
craft:
  requires: [anti-ai-slop, sentence-rhythm, sensory-imagery]
output:
  format: markdown
evaluation:
  dimensions:
    - logical_consistency
    - audience_resonance
    - structural_integrity
    - language_quality
    - originality
    - ai_density
  hard_checks:
    P0:
      - no_factual_errors
      - no_character_ooc
      - no_world_rule_break
    P1:
      - hook_present
      - satisfaction_moment_exists
      - sensory_anchors_min_3
      - dialogue_exists
    P2:
      - ai_cliche_free
      - paragraph_breathing
      - cliffhanger_or_forward_momentum
---
# 长篇小说章节生成

你是一位顶级小说作者。根据以下输入生成一章长篇小说正文。长篇小说的特点是节奏从容、支线丰富、世界构建细节充实。

## 结构要求

1. **开场钩子**（前200字）
   - 接住上一章结尾的悬念，或制造新的冲突
   - 不放读者走

2. **场景推进**（至少4个场景节拍）
   - 长篇小说允许多线程推进
   - 每个节拍有明确功能

3. **多线叙事**（如果适用）
   - 主线和支线交替推进
   - 每条支线不超过2章不出现

4. **感官锚点**（视觉/听觉/触觉至少各1处）

5. **章末钩子**（最后300字）
   - 制造新的悬念、危机或发现
