---
name: research-note
label: 研究笔记
description: 学术研究过程记录，从文献收集到结论撰写的全阶段笔记
mode: content-generate
inputs:
  - name: research_question
    type: text
    required: true
    label: 研究问题
    hint: 研究的核心问题(可多选)
    ui: multiselect
    options: [探索性, 验证性, 比较性, 预测性, 描述性, 因果性]
  - name: current_status
    type: string
    required: false
    label: 当前阶段
    hint: 研究进展到哪一步
    ui: dropdown
    options:
      - 文献收集
      - 实验设计
      - 数据分析
      - 结论撰写
      - 初步探索
  - name: key_sources
    type: text
    required: false
    label: 关键文献
    hint: 已阅读或待读的核心文献(可多选)
    ui: multiselect
    options: [学术论文, 行业报告, 专著, 数据平台, 专业期刊, 会议论文]
  - name: preliminary_findings
    type: text
    required: false
    label: 初步发现
    hint: 当前的研究发现或观察(可多选)
    ui: multiselect
    options: [数据支持, 现象观察, 趋势判断, 初步结论, 异常发现, 关联推测]
  - name: next_steps
    type: text
    required: false
    label: 下一步
    hint: 接下来要完成的行动(可多选)
    ui: multiselect
    options: [数据补充, 方法优化, 范围扩展, 验证迭代, 文献查阅, 实验设计]
  - name: questions_for_review
    type: text
    required: false
    label: 待讨论问题
    hint: 需要与导师/同事讨论的疑问(可多选)
    ui: multiselect
    options: [方法可靠性, 结论局限性, 应用场景, 创新性, 可重复性, 理论贡献]
craft:
  requires: []
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0:
      - no_factual_errors
    P1: []
---
# 研究笔记

## 目的
研究笔记不是论文。它是你在思考过程中的对话记录——写给未来的自己看的。

## 结构建议
1. **研究问题与假设**：当前的研究问题是什么。如果细化或调整了，写下为什么。
2. **进展记录**（按阶段）
   - **文献收集**：读了什么→关键论点→与我的研究的关系→待查缺口
   - **实验设计**：设计方案→变量定义→预期结果→可能的混淆因素
   - **数据分析**：方法选择→初步结果→异常值→需要深入的方向
   - **结论撰写**：主要发现→支持的证据→矛盾点→局限性
3. **想法与备忘**：随时涌现的灵感、关联思考、可能的新方向。不必完整，但要及时记。
4. **待办清单**：[ ] 未完成 / [x] 已完成。优先级标注。

## 写作原则
- 诚实记录。负结果比正结果更有价值。
- 每条想法标注日期。方便追溯思考脉络。
- 文献引用即时标注。不留"回头再补"的坑。
- 区分事实（F）、观点（O）、疑问（Q）。用小标记。

## 禁止项
- 不要事后修改原始记录——有新的理解就追加，不改旧笔记
- 不隐藏矛盾数据
- 不写套话