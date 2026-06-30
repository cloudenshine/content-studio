---
name: weibo-post
label: 微博短文
description: 微博短内容创作，前40字决定点击，强调快速传播和互动
mode: content-generate
inputs:
  - name: user_idea
    type: text
    required: true
    label: 用户想法
    hint: 你想创作什么？一句话想法、一个场景、一种感觉都可以，越具体越好
    ui: textarea
  - name: core_message
    type: text
    required: true
    label: 核心信息
    hint: 前40字决定点击率(可多选)
    ui: multiselect
    options: [观点表达, 资讯分享, 幽默段子, 互动提问, 产品推荐, 生活记录]
  - name: post_type
    type: string
    required: false
    label: 博文类型
    hint: 内容的形式类别（可多选）
    ui: multiselect
    options:
      - 观点
      - 资讯
      - 段子
      - 互动
      - 安利
  - name: word_count
    type: text
    required: false
    label: 字数
    hint: 直接输入字数，如 140
    ui: text
  - name: hashtags
    type: text
    required: false
    label: 话题标签
    hint: 要带的话题标签，空格分隔(可多选)
    ui: multiselect
    options: [行业标签, 话题标签, 品牌标签, 热点标签, 地域标签, 兴趣标签]
  - name: mention_accounts
    type: text
    required: false
    label: @账号
    hint: 要提及的账号，空格分隔
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
    P1: []
---
# 微博短文

## 前40字定生死
- 第一条信息必须完整——即使只读到这里，读者也知道你在说什么。
- 用具体替换抽象。"这个办法让我月收入翻倍"强过"一个有效的赚钱方法"。
- 制造信息差："很少有人知道……""我发现了一个……"

## 内容类型写法
- **观点贴**：态度鲜明。不怕有争议，怕没观点。用"我为什么说……"开头。
- **资讯贴**：5W1H浓缩在140字内。核心事实前置。链接放评论或文末。
- **段子贴**：铺垫短（1-2句）→反转快。节奏像讲脱口秀。
- **互动贴**：提问结尾。给选项比给开放问题更容易获得回复。带投票。
- **安利贴**：真实体验+具体效果+购买/获取方式。不写广告腔。

## 排版
- 空行制造呼吸。每2-3行一个段落。
- 数字用阿拉伯数字。
- 话题标签不超过2个。放在文末。
- @账号不超过1个（除非互动需求）。

## 禁止项
- 不写"求转发""求关注"
- 不写营销号体（"惊了""彻底火了"）
- 不抄段子署自己名