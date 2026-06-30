---
name: product-page
label: 产品页面文案
description: 高转化率的产品页面文案创作，从痛点钩子到行动号召
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: product_name
    type: text
    required: true
    label: 产品名称
    hint: 产品的完整名称
    ui: text
  - name: product_type
    type: string
    required: false
    label: 产品类型
    hint: 产品的类别归属
    ui: multiselect
    options:
      - SaaS/软件
      - 实物商品
      - 知识付费
      - 咨询服务
      - 社群/会员
      - APP/移动端
  - name: target_audience
    type: string
    required: true
    label: 目标受众
    hint: 产品的核心购买人群
    ui: multiselect
    options:
      - 职场中层管理者
      - 创业者
      - 自由职业者
      - 技术开发人员
      - 大学生
      - 宝妈
      - 银发族
  - name: core_benefit
    type: text
    required: true
    label: 核心价值
    hint: 产品解决什么根本问题(可多选)
    ui: multiselect
    options: [解决问题, 提升效率, 节省成本, 改善体验, 创造价值, 降低风险]
  - name: benefit_category
    type: string
    required: false
    label: 价值类别
    hint: 选择产品带来的价值维度（可多选）
    ui: multiselect
    options: [功能价值, 情感价值, 社交价值, 经济价值, 效率价值, 品牌价值]
  - name: price_point
    type: string
    required: false
    label: 价格区间
    hint: 产品的价格定位
    ui: dropdown
    options:
      - 免费
      - 9.9-99元
      - 100-499元
      - 500-1999元
      - 2000-9999元
      - 10000元以上
      - 订阅制
  - name: social_proof
    type: text
    required: false
    label: 社会证明
    hint: 用户评价、数据、案例等信任素材(可多选)
    ui: multiselect
    options: [用户评价, 销售数据, 行业认证, 媒体报道, 客户案例, 专家推荐]
  - name: call_to_action
    type: string
    required: false
    label: 行动号召
    hint: 希望用户采取的行动
    ui: multiselect
    options:
      - 立即购买
      - 免费试用
      - 预约演示
      - 下载资料
      - 扫码关注
      - 咨询客服
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
      - call_to_action
      - key_message_clear
      - data_or_evidence
---
# 产品文案生成

## 强制结构
1. **痛点钩子**（前150字）
2. **解决方案引入**（100-150字）
3. **价值锚点**（3-5个价值点）
4. **社会证明**
5. **价格与风险消除**
6. **行动号召**（最后80字）

## 写作原则
- 每一段都在回答"所以呢？"
- 使用"你/你的"第二人称
- 具体 > 抽象
- 避免形容词堆砌

## 禁止项
- 不用"致力于""倾力打造""重磅推出"
- 不写"XX产品是行业领先的"
- 不虚构数据和案例