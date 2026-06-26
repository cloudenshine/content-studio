---
name: research-report
label: 调研/分析报告
description: 基于研究方法的结构化调研分析报告生成，数据驱动结论
mode: content-generate
inputs:
  - name: research_topic
    type: text
    required: true
    label: 调研主题
    hint: 调研的核心问题领域(可多选)
    ui: multiselect
    options: [用户需求, 市场趋势, 竞品动态, 技术评估, 行业标准, 商业模式]
  - name: research_method
    type: string
    required: false
    label: 研究方法
    hint: 采用的研究手段（可多选）
    ui: multiselect
    options:
      - 定量分析
      - 定性分析
      - 文献综述
      - 竞品分析
      - 用户调研
      - 行业研究
  - name: key_findings
    type: text
    required: true
    label: 关键发现
    hint: 调研得出的核心结论(可多选)
    ui: multiselect
    options: [趋势分析, 用户行为, 竞品对比, 市场变化, 技术突破, 行业痛点]
  - name: data_sources
    type: text
    required: false
    label: 数据来源
    hint: 引用的数据和资料出处(可多选)
    ui: multiselect
    options: [内部数据, 公开报告, 用户访谈, 问卷调查, 行业白皮书, 学术论文]
  - name: conclusion
    type: text
    required: true
    label: 结论
    hint: 基于发现得出的最终判断(可多选)
    ui: multiselect
    options: [建议采纳, 暂缓执行, 需进一步研究, 条件性通过, 推荐实施, 放弃方案]
  - name: recommendations
    type: text
    required: false
    label: 建议
    hint: 基于结论的行动建议(可多选)
    ui: multiselect
    options: [优化策略, 资源调整, 流程重组, 技术升级, 团队培训, 市场拓展]
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
      - structure_complete
---
# 调研/分析报告

## 强制结构
1. **摘要（Executive Summary）**（200字以内）
   - 一句话回答：为什么做、怎么做的、发现了什么、所以呢？
2. **背景与目的**
   - 调研动机、要回答的核心问题、调研范围
3. **方法论**
   - 样本量、数据采集方式、分析方法、局限性
4. **核心发现**（报告主体）
   - 每条发现=观点+数据支持+解读
   - 用图表辅助说明（文字描述图表趋势）
5. **结论**
   - 基于发现，回到研究问题，给出判断
6. **建议**
   - 可执行的行动项。每条建议包含：做什么、谁做、预期效果

## 写作原则
- 结论先行。每个章节第一句就是核心观点。
- 数据不孤立。每个数字都需要对比基线或目标值。
- 区分相关性和因果性。不说"因为A所以B"除非有证据。

## 禁止项
- 不编造数据
- 不模糊归因
- 不把观点当事实写