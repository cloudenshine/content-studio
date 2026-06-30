# All-category Execution Delivery

权威范围是当前 taxonomy 中全部可执行 skill。每个分类必须有且仅有一个代表性实例，并产生真实本地模型输出、合同结果和复核结果。

运行目录默认位于：

`.content-studio/deliveries/all-categories/`

常用命令：

```powershell
npm run delivery:validate
npm run delivery:prepare
npm run delivery:run
npm run delivery:verify
```

`run` 只调用 `127.0.0.1:11434` 的本地 Ollama，不写历史、Vault 或 memory。支持断点续跑，已存在的非空输出不会重复生成。

通过条件：25 个分类全部存在、元数据和 prompt 合法、真实输出非空、实例断言通过、unsupported P0 已由明确复核项覆盖，最终逐分类状态为 passed。
