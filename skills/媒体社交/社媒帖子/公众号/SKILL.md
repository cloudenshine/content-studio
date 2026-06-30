---
name: wechat-article
label: 公众号推文
description: 公众号图文推送创作，兼顾打开率、完读率和转化
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: title
    type: text
    required: true
    label: 标题
    hint: 控制在25字以内(可多选)
    ui: multiselect
    options: [数字型, 提问型, 反常识型, 痛点型, 故事型, 攻略型]
  - name: article_type
    type: string
    required: false
    label: 文章类型
    hint: 内容的形式类别（可多选）
    ui: multiselect
    options:
      - 观点干货
      - 故事叙事
      - 行业分析
      - 产品推广
      - 活动预告
  - name: core_message
    type: text
    required: true
    label: 核心信息
    hint: 文章要传达的根本观点(可多选)
    ui: multiselect
    options: [信息传递, 观点表达, 情感共鸣, 行动号召, 经验分享, 行业洞察]
  - name: target_audience
    type: text
    required: true
    label: 目标受众
    hint: 文章的阅读人群(可多选)
    ui: multiselect
    options: [职场人士, 创业者, 宝妈群体, 学生群体, 投资人, 科技爱好者]
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
      - hook_present
      - key_message_clear
    P1: []
---
# 公众号推文

## 标题
- 25字以内。包含核心关键词。
- 四种公式：① 数字+结果（"3个方法让XX提升50%"）② 反常识（"XX越大，死得越快"）③ 痛点+解决方案（"总是XX？因为你没做Y"）④ 悬念+利益（"我花了XX元才明白的事"）
- 不标题党。承诺的内容正文必须兑现。

## 开头（前300字决定留存）
- 前3行必须出现"你"——跟读者有关。
- 开场方式：一个具体故事、一个扎心问题、一组冲击性数据、一个反常识判断。
- 快速给出阅读承诺："这篇文章会给你3个……"

## 正文
- **观点干货型**：分3-5个论点。每点=观点+论证+案例+小结。每800-1000字给一个"金句"收尾。
- **故事叙事型**：冲突→挣扎→转折→解决。情感节奏比逻辑重要。
- **行业分析型**：数据驱动。每个论点至少一个数据来源。最后给出趋势判断。
- 段落短。手机屏幕2-3行换一段。

## 结尾
- 总结核心观点（3句话以内）。
- 互动引导：提问/投票/评论区话题。
- 行动号召：关注/在看/转发/购买。

## 禁止项
- 不写"点击上方蓝字关注"
- 不堆砌无关热点
- 不说"你中招了吗"之类套话