/**
 * llm-judge.js — LLM-as-judge 评分模式
 *
 * 可选的替代评分方式：用 LLM 评估输出质量。
 * 由调用者决定使用启发式（默认）还是 LLM 评分。
 */

/** 构建 LLM judge 用的评估 prompt */
export function buildJudgePrompt(content, skillMeta, constraints) {
  const ev = skillMeta.evaluation || {};
  const dimensions = ev.dimensions || ["logical_consistency", "audience_resonance", "structural_integrity", "language_quality", "originality"];
  const hardChecks = ev.hard_checks || {};
  const allP0 = [
    ...(hardChecks.P0 || []),
    ...(ev.P0 || []),
    ...(constraints?.p0_checks || []),
  ].filter((check, index, values) => values.indexOf(check) === index);

  const parts = [];

  parts.push("# 角色");
  parts.push("你是一个专业的写作质量评估师。请对以下内容进行评分。");
  parts.push("");

  parts.push("# 评分维度（每项 1-10 分）");
  for (const dim of dimensions) {
    parts.push(`- ${dim}`);
  }
  parts.push("");

  if (allP0.length > 0) {
    parts.push("# 硬性检查（通过/不通过）");
    for (const check of allP0) {
      parts.push(`- ${check}`);
    }
    parts.push("");
  }

  parts.push("# 输出格式");
  parts.push("请严格按照以下 JSON 格式输出，不要附加任何其他内容：");
  parts.push(`{
  "scores": {
    "${dimensions.map(d => `"${d}": <1-10>`).join(",\n    ")}"
  },
  "P0": {${allP0.map(c => `\n    "${c}": <true/false>`).join(",")}
  },
  "summary": "<一句话总结>"
}`);
  parts.push("");

  parts.push("# 待评估内容");
  parts.push(content);

  return parts.join("\n");
}
