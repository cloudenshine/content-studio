---
name: deep-analysis
label: 深度分析/科普文章
description: 面向不同读者的深度分析文章，用论据驱动论点，兼顾可读性和严谨性
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: topic
    type: text
    required: true
    label: 主题
    hint: 分析/科普的核心主题(可多选)
    ui: multiselect
    options: [科技, 生活, 教育, 职场, 情感, 健康, 财经, 娱乐]
  - name: target_reader
    type: string
    required: false
    label: 目标读者
    hint: 文章面向的读者类型
    ui: dropdown
    options:
      - 普通读者
      - 业内人士
      - 决策者
      - 学生
  - name: thesis
    type: text
    required: true
    label: 核心论点
    hint: 文章要论证的核心观点(可多选)
    ui: multiselect
    options: [因果关系, 对比分析, 趋势预测, 案例论证, 理论研究, 数据驱动]
  - name: key_arguments
    type: text
    required: false
    label: 关键论据
    hint: 支撑论点的分论点(可多选)
    ui: multiselect
    options: [数据支撑, 案例引用, 逻辑推导, 专家观点, 历史对比, 行业洞察]
  - name: data_sources
    type: text
    required: false
    label: 数据来源
    hint: 引用的研究、报告、数据出处(可多选)
    ui: multiselect
    options: [内部数据, 公开报告, 用户访谈, 问卷调查, 行业白皮书, 学术论文]
  - name: word_count
    type: text
    required: false
    label: 字数
    hint: 直接输入字数，如 2000
    ui: text
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
      - data_or_evidence
      - key_message_clear
---
# 深度分析/科普文章

## 结构
1. **开篇（10%字数）**：一个具体场景、一个反直觉事实、一个待解答的问题。让读者觉得"这跟我有关系"。
2. **背景（15%字数）**：这个概念为什么值得被讨论？历史脉络或行业现状。
3. **核心论证（55%字数）**：论点→论据→解读。
   - 每个分论点独立成节。
   - 每个分论点配至少一个数据/案例/引用。
   - 说清楚"这个证据说明什么"以及"为什么它重要"。
4. **反驳与限定（10%字数）**：承认对立观点或该论点的边界。不写绝对化的结论。
5. **结论与启示（10%字数）**：回到开篇的问题。给出可操作的启示。

## 读者适配
- **普通读者**：多用类比。少用术语，用了必须解释。开头必须有"为什么你该关心"。
- **业内人士**：直接切入深度。引用最新研究。关注方法论和细节。
- **决策者**：结论前置。每条论据附带"这意味着"的解读。提供行动建议。
- **学生**：概念清晰。逻辑链条完整。附参考文献。

## 禁止项
- 不写"震惊""不可思议"
- 不把相关性当因果写
- 不引用未经核实的自媒体数据