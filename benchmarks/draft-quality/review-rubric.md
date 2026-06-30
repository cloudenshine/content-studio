# 草稿质量盲评表

评审时只查看随机标签 A/B/C，不查看 `blind-map.json`。

## 主指标：人工返工等级

- 0：可直接使用
- 1：轻微措辞或格式调整
- 2：局部重写，但主体可保留
- 3：需要大幅重写
- 4：不可用或偏离任务

## 次指标（1–5 分）

- `task_completion`：是否完成用户真正要求的任务
- `information_accuracy`：是否保留已知信息、避免编造和逻辑错误
- `structure_usability`：结构是否便于直接继续编辑或发布
- `language_naturalness`：中文是否自然，是否存在明显模板腔或 AI 腔
- `genre_fit`：是否符合指定体裁和目标受众

## 评审原则

1. 先标返工等级，再打次指标，避免综合分反过来影响实际判断。
2. 不因为篇幅长、修辞多或机器评分高而加分。
3. 若出现事实编造或违反必须保留信息，在 `notes` 中写明。
4. 同一 case 的 A/B/C 应在同一次评审中完成。
5. 不查看其他评审人的分数，也不提前解盲。

## reviews.json 条目格式

```json
{
  "case_id": "FIC-01",
  "label": "A",
  "rework": 2,
  "scores": {
    "task_completion": 4,
    "information_accuracy": 5,
    "structure_usability": 3,
    "language_naturalness": 3,
    "genre_fit": 4
  },
  "notes": "第二段需要压缩。"
}
```
