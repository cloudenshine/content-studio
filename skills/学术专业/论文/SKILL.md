---
name: academic-paper
label: 学术论文
description: 规范化学术论文写作，遵循学术写作规范与引用格式
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: paper_title
    type: text
    required: true
    label: 论文标题
    hint: 论文的完整标题(可多选)
    ui: multiselect
    options: [实证研究, 理论探讨, 方法创新, 综述分析, 案例研究, 比较研究]
  - name: abstract
    type: text
    required: true
    label: 摘要
    hint: 论文的摘要内容(可多选)
    ui: multiselect
    options: [背景介绍, 问题提出, 方法描述, 结果呈现, 结论总结, 研究意义]
  - name: keywords
    type: text
    required: false
    label: 关键词
    hint: 3-5个关键词，逗号分隔(可多选)
    ui: multiselect
    options: [核心概念, 方法论, 应用领域, 技术方向, 理论基础, 实证分析]
  - name: section_structure
    type: string
    required: false
    label: 章节结构
    hint: 论文的章节组织方式
    ui: dropdown
    options:
      - IMRaD
      - 理论框架
      - 案例研究
      - 文献综述
      - 混合方法
  - name: references
    type: text
    required: false
    label: 参考文献
    hint: 引用的文献列表(可多选)
    ui: multiselect
    options: [学术论文, 行业报告, 专著, 数据平台, 专业期刊, 会议论文]
craft:
  requires: [sentence-rhythm]
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0:
      - citation_format
      - structure_complete
    P1: []
---
# 学术论文

## 结构规范（以IMRaD为例）

1. **标题**：准确、简洁。包含核心变量和研究对象。
2. **摘要**（150-300字）：背景→问题→方法→结果→结论。每句话承载一个信息。不引用文献。
3. **引言**：从大背景收窄到研究空白→本研究填补了什么→研究问题与假设。
4. **方法**：可复现为标准。参与者、材料、流程、数据分析方法。每一步都写为什么选这个。
5. **结果**：客观报告发现。图表先行，文字说明趋势。不在此处讨论含义。
6. **讨论**：结果如何回答研究问题→与前人研究一致/不一致→局限性→未来方向。
7. **结论**：主要贡献1-2句话。不重复摘要。

## 语言规则（sentence-rhythm）
- 句子长短交替。复杂概念先用长句说明，再用短句收结论点。
- 段落首句是主题句。段落末句是过渡或总结。
- 被动语态在方法部分使用，其余部分用主动语态。
- 术语首次出现时定义。

## 引用规范
- 文中引用与参考文献列表一一对应。
- 统一引用格式（APA/MLA/Chicago等）。全文一致。
- 间接引用必须用自己的话重述，不改写原句结构。

## 禁止项
- 不写"填补了空白"——让读者自己判断
- 不写情绪化表述（"令人惊讶地""有趣的是"）
- 不引用未读过的原始文献（二次引用需标注"转引自"）