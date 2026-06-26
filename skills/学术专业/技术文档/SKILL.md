---
name: technical-documentation
label: 技术文档
description: 面向开发者和运维人员的专业技术文档编写，兼顾准确性和可操作性
mode: content-generate
inputs:
  - name: doc_title
    type: text
    required: true
    label: 文档标题
    hint: 文档的主题名称(可多选)
    ui: multiselect
    options: [安装指南, 配置手册, API参考, FAQ, 最佳实践, 迁移指南]
  - name: product_version
    type: text
    required: false
    label: 产品版本
    hint: 适用的产品版本号(可多选)
    ui: multiselect
    options: [v1.0, v2.0, 最新版, 稳定版, 测试版, LTS版]
  - name: document_type
    type: string
    required: false
    label: 文档类型
    hint: 技术文档的类别
    ui: dropdown
    options:
      - API参考
      - 架构说明
      - 部署指南
      - 配置手册
      - 集成指南
  - name: target_audience
    type: string
    required: false
    label: 目标读者
    hint: 文档的主要阅读人群
    ui: dropdown
    options:
      - 开发人员
      - 运维人员
      - 产品经理
      - 终端用户
  - name: code_examples
    type: text
    required: false
    label: 代码示例
    hint: 演示用的代码片段(可多选)
    ui: multiselect
    options: [JavaScript, Python, Java, Go, Rust, SQL, Shell, TypeScript]
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
# 技术文档

## 通用原则
- **准确高于可读**。错误的文档比没有文档更糟。
- **可复现**。每条指令执行后，读者得到的结果唯一确定。
- **版本锁定**。每份文档标注适用的版本号。版本变更时文档同步更新。

## 按类型组织

### API参考
- 每个端点独立一节：HTTP方法+路径→认证方式→请求参数（名称/类型/必填/说明）→请求示例（curl）→响应格式（JSON）→响应示例→错误码
- 参数默认值显式标注。

### 部署指南
- 环境要求（硬件/OS/依赖/端口）→安装步骤（逐行命令）→配置说明→验证方法→回滚方案
- 每个步骤附带预期输出或验证点。

### 架构说明
- 先给整体架构图（文字描述各模块关系）→再逐层展开。
- 决策记录：为什么选这个技术方案，不选别的。

### 配置手册
- 配置项列表：名称→类型→默认值→说明→示例。
- 标注配置项之间的依赖关系。

## 写作规范
- 命令行用代码块，标注shell。
- 路径和变量名用反引号包裹。
- 版本号遵循语义化版本（semver）规范。

## 禁止项
- 不写"后面会讲到"——直接给出链接或重复必要信息
- 不隐藏错误信息——让用户看到真实报错
- 不写"这个很简单"——对新手不友好