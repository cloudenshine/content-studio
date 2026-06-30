---
name: xiaohongshu-note
label: 小红书笔记
description: 种草推荐、经验分享类小红书笔记创作，图文并茂提升互动率
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
    hint: 笔记的核心话题(可多选)
    ui: multiselect
    options: [好物测评, 经验分享, 教程指南, 种草推荐, 生活方式, 旅行打卡]
  - name: note_type
    type: string
    required: false
    label: 笔记类型
    hint: 笔记的内容形式（可多选）
    ui: multiselect
    options:
      - 种草推荐
      - 经验分享
      - 教程指南
      - 好物测评
      - 生活方式
  - name: target_audience
    type: text
    required: true
    label: 目标受众
    hint: 笔记希望触达的人群(可多选)
    ui: multiselect
    options: [学生党, 职场新人, 宝妈, 美妆爱好者, 旅行达人, 吃货, 健身族]
  - name: key_points
    type: text
    required: false
    label: 核心要点
    hint: 笔记要传达的关键信息(可多选)
    ui: multiselect
    options: [问题定义, 解决方案, 实施步骤, 效果验证, 注意事项, 心得总结]
  - name: product_name
    type: text
    required: false
    label: 产品名称
    hint: 涉及的产品或品牌名
    ui: text
craft:
  requires: []
output:
  format: markdown
evaluation:
  dimensions: [logical_consistency, structural_integrity, language_quality, originality, ai_density]
  hard_checks:
    P0:
      - hook_present
    P1:
      - call_to_action
---
# 小红书笔记

## 标题规则
- 字数15-20字。包含数字或关键词。
- 制造好奇心："99%的人不知道……""我试了XX次终于……"
- 使用emoji点缀，但不堆砌。

## 正文结构
1. **封面钩子（首段2-3行）**：最值钱的结论先抛出来。配合首图文字。
2. **个人真实体验**："我是怎么发现的""用了多久""真实感受"。
   - 用具体场景，不用抽象描述。
   - 好就说好在哪，不好就说不好在哪。真实感=信任。
3. **干货/清单**（用emoji做bullet point）：
   - 📍 地点/价格/购买渠道
   - ✅ 优点列举（3-5个）
   - ❌ 缺点/注意事项（1-2个）
4. **总结推荐**：什么人群适合、什么时候买最划算。
5. **标签**：3-5个。一级标签+细分标签。如 #护肤 #敏感肌面霜

## 排版
- 段与段之间空行。
- 关键词加粗或换行突出。
- 每段不超过4行。

## 禁止项
- 不写广告感重的"性价比超高""闭眼入"
- 不盗图
- 不虚构使用体验