---
name: weekly-report
label: 周报/汇报
description: 结构化的周报月报等周期性工作汇报生成，以数据和事实驱动
mode: content-generate
inputs:
  - name: report_type
    type: string
    required: false
    label: 汇报类型
    hint: 选择汇报的周期类型
    ui: dropdown
    options:
      - 周报
      - 月报
      - 项目阶段性汇报
      - 季度总结
      - 年度复盘
  - name: week_range
    type: text
    required: true
    label: 汇报周期
    hint: 如 3月10日-3月16日(可多选)
    ui: multiselect
    options: [本周, 本月, 本季度, 本年度]
  - name: team_size
    type: string
    required: false
    label: 团队规模
    hint: 汇报覆盖的团队范围
    ui: dropdown
    options:
      - 个人
      - 2-5人小团队
      - 6-15人中型团队
      - 15人以上部门
      - 跨部门协同
  - name: key_achievements
    type: text
    required: true
    label: 关键成果
    hint: 本期完成的核心工作(可多选)
    ui: multiselect
    options: [功能上线, 性能优化, 用户增长, 团队建设, 流程改进, 技术攻关]
  - name: achievement_type
    type: string
    required: false
    label: 成果类型
    hint: 成果所属类别（可多选）
    ui: multiselect
    options: [产品开发, 运营增长, 团队管理, 技术攻坚, 流程优化, 数据建设]
  - name: metrics
    type: text
    required: false
    label: 量化指标
    hint: 可量化的数据表现(可多选)
    ui: multiselect
    options: [环比增长, 同比下降, 达成率, 转化率, 完成度, 用户留存]
  - name: blockers
    type: text
    required: false
    label: 卡点/问题
    hint: 当前遇到的阻碍(可多选)
    ui: multiselect
    options: [资源不足, 进度延误, 技术难题, 需求变更, 协作障碍, 外部依赖]
  - name: next_week_plan
    type: text
    required: true
    label: 下周计划
    hint: 下一周期的工作安排(可多选)
    ui: multiselect
    options: [继续推进, 验收测试, 需求评审, 数据复盘, 团队同步, 项目收尾]
  - name: audience_level
    type: string
    required: false
    label: 汇报对象
    hint: 阅读对象层级
    ui: dropdown
    options:
      - 领导层
      - 团队内部
      - 个人记录
      - 跨部门同步
craft:
  requires: [anti-ai-slop]
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0:
      - no_factual_errors
    P1:
      - data_or_evidence
      - paragraph_breathing
---
# 周报/汇报生成

## 结构
1. **摘要（2-3行）**：本期核心结论。领导只读这个。
2. **关键成果**：用"动词+名词+数字"格式。每条一行。
   - 示例：完成XX模块上线，覆盖3个核心场景
   - 示例：输出用户调研报告1份，访谈12人
3. **量化指标**：用对比。环比/同比/目标完成率。只说一个数字不说背景=无效。
4. **卡点**：不要只抛问题。每条卡点附"已尝试方案+需要的支持"。
5. **下周计划**：同样用"动词+名词+数字"。优先级标注[P0][P1]。

## 写作原则
- 每条先给结论，再给细节支持。
- 数据前后一致，不美化，不模糊。
- 量词统一。

## 禁止项
- 不写"在领导的关怀下""在团队的共同努力下"
- 不写流水账
- 不写模糊表述"有所提升""基本完成"