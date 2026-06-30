# Draft Quality Benchmark

这套基准用于判断现有约束和修订是否真的减少个人创作者的返工，不用于给模型做排行榜。

## 使用

```powershell
npm run benchmark:validate
node scripts/draft-benchmark.mjs prepare --out .content-studio/benchmarks/run-01
```

`prepare` 会生成：

- `manifest.json`：20 个 case、60 个生成槽位
- `prompts/`：baseline、guided 和 revised 模板
- `blind-review.json`：评审所需的随机 A/B/C 清单
- `blind-map.json`：解盲映射，评审前不要打开
- `reviews.json`：待填写评分模板

把各条件输出写到 manifest 指定的 `output_file` 后，按照 `review-rubric.md` 填写 `reviews.json`。完成后运行：

```powershell
node scripts/draft-benchmark.mjs summarize --run .content-studio/benchmarks/run-01
```

## 判断顺序

1. 先比较平均返工等级。
2. 再检查信息准确性是否下降。
3. 按任务族查看差异，避免用全局平均掩盖体裁退化。
4. 最后才参考机器评分和失败检查。

没有人工评审结果之前，不应据此修改 taxonomy 或评分阈值。
