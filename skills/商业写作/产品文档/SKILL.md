---
name: product-documentation
label: 产品文档/用户指南
description: 清晰易用的产品文档和用户指南编写，兼顾不同角色的阅读需求
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
  - name: document_type
    type: string
    required: false
    label: 文档类型
    hint: 编写的文档类别
    ui: dropdown
    options:
      - 用户手册
      - API文档
      - 快速上手
      - FAQ
      - 版本发布说明
  - name: target_user
    type: text
    required: true
    label: 目标用户
    hint: 文档的主要阅读人群(可多选)
    ui: multiselect
    options: [开发人员, 运维人员, 产品经理, 终端用户, 管理者, 测试人员]
  - name: core_features
    type: text
    required: false
    label: 核心功能
    hint: 产品的关键功能列表(可多选)
    ui: multiselect
    options: [核心功能, 特色亮点, 差异优势, 使用场景, 集成能力, 扩展功能]
  - name: usage_scenarios
    type: text
    required: false
    label: 使用场景
    hint: 典型的使用场景描述(可多选)
    ui: multiselect
    options: [企业级, 个人使用, 团队协作, 自动化流程, 远程办公, 数据管理]
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
      - key_message_clear
---
# 产品文档/用户指南

## 核心原则
- **用户视角**：不说"系统提供了X功能"，说"你可以用X来做Y"。
- **任务导向**：按用户要完成的任务组织文档，不是按功能菜单。
- **最小认知负担**：一个步骤只说一件事。一个句子不超过30字。

## 结构模板
1. **概述**：这个文档帮谁解决什么问题（1-2段）
2. **前置条件**：开始前需要什么（账号、权限、依赖）
3. **快速开始**：5步以内完成第一个任务
4. **核心操作**：按场景分节。每节=目标→步骤→预期结果
5. **故障排除**：常见问题+解决方案
6. **参考**：快捷键、配置项、术语表

## 写作规则
- 步骤用有序列表。每个步骤以动词开头。
- 避免"请注意""温馨提示"。要么告诉用户做什么，要么不写。
- 截图标注用箭头和文字框。不说"如上图所示"。
- API文档保持参数描述、示例、返回值三要素。

## 禁止项
- 不用被动语态
- 不写"很简单""很容易"
- 不遗漏错误处理说明