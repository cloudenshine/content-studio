---
name: press-release
label: 新闻稿/通讯稿
description: 标准新闻稿格式撰写，适合媒体发布和公关传播
mode: content-generate
inputs:
  - name: headline
    type: text
    required: true
    label: 标题
    hint: 新闻稿的主标题(可多选)
    ui: multiselect
    options: [事件报道, 成果发布, 活动预告, 人事变动, 合作公告, 行业趋势]
  - name: date
    type: text
    required: true
    label: 发布日期
    hint: 新闻发布的日期
    ui: text
  - name: location
    type: text
    required: false
    label: 地点
    hint: 新闻发生的城市/地点
    ui: text
  - name: key_facts
    type: text
    required: true
    label: 关键事实
    hint: 新闻的核心事实信息(可多选)
    ui: multiselect
    options: [核心数据, 时间节点, 参与方, 影响范围, 后续计划, 背景补充]
  - name: quotes
    type: text
    required: false
    label: 引语
    hint: 相关人士的引用(可多选)
    ui: multiselect
    options: [高管表态, 专家评论, 用户反馈, 合作伙伴评价, 行业观点, 官方声明]
  - name: boilerplate
    type: text
    required: false
    label: 机构简介
    hint: 发布机构的固定介绍
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
      - structure_complete
---
# 新闻稿/通讯稿

## 标准结构（倒金字塔）

1. **标题**：主标题+副标题（可选）。包含核心信息。动词主动、具体。
2. **导语**（第一段，100字以内）：5W1H全部覆盖。谁、何时、何地、何事、为何、如何。一个段落讲完。
3. **正文**（按重要性递减排列）：
   - 第二段：展开导语中最重要的要素。提供背景或上下文。
   - 第三段：补充细节，数据支撑。
   - 引语段落：插入1-2段直接引语。引语必须来自真实可查的人。
   - 后续段落：按优先级递减排列次要信息。
4. **关于（About）**：机构标准简介。不超80字。
5. **媒体联系**：联系人、电话、邮箱、官网。

## 写作规则
- 第三人称。全篇不使用"我们""我"。
- 事实先行，观点靠引语表达。
- 引语不能虚构。每一段引语必须注明说话人身份。
- 日期格式统一：2024年3月15日。

## 禁止项
- 不写主观评价（"极好的""重大的"）
- 不使用第一人称
- 不隐藏负面信息