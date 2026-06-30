/**
 * prompt-assembler.js — 纯函数 prompt 组装引擎
 *
 * 纯函数，零 I/O，零 Node 内置依赖。
 * 入参 skill/designs/craftRules/userPrompt 四个数据对象，
 * 出参一个完整的 prompt 字符串。
 * 设计对象必须由调用者预加载（resolveDesigns），本函数不做 I/O。
 */

export function assemblePrompt(skill, designs, craftRules, userPrompt) {
  const parts = [];

  parts.push("# 角色与任务\n");
  parts.push(`你是根据"${skill.meta?.label || skill.meta?.name || skill.id}"技能模板工作的写作专家。`);
  if (skill.meta?.description) parts.push(`\n${skill.meta.description}`);
  parts.push("");

  // ── taxonomy 约束注入 ────
  if (skill.constraints) {
    const c = skill.constraints;
    parts.push("# 硬性约束（必须遵守）\n");

    if (c.scope) parts.push(`## 创作范围\n${c.scope}\n`);

    if (c.doctrine && c.doctrine.length > 0) {
      parts.push("## 核心原则");
      for (const d of c.doctrine) parts.push(`- ${d}`);
      parts.push("");
    }

    if (c.forbidden_patterns && c.forbidden_patterns.length > 0) {
      parts.push("## 禁止项");
      for (const f of c.forbidden_patterns) parts.push(`- 严禁：${f}`);
      parts.push("");
    }

    if (c.tone_range && c.tone_range !== "any") {
      const toneDesc = Array.isArray(c.tone_range) ? c.tone_range.join("、") : c.tone_range;
      parts.push(`## 语气要求\n全文语气必须控制在：${toneDesc}\n`);
    }

    if (c.word_range) {
      parts.push(`## 字数要求\n目标字数范围：${c.word_range[0]}-${c.word_range[1]} 字\n`);
    }

    if (c.p0_checks && c.p0_checks.length > 0) {
      parts.push("## 质量门（P0 必须满足）");
      for (const p of c.p0_checks) parts.push(`- 必须通过检查：${p}`);
      parts.push("");
    }

    parts.push("");
  }

  // 多风格混合
  if (designs && designs.length > 0) {
    const sorted = [...designs]
      .filter(d => d.design && d.design.body && (d.strength ?? 100) > 0)
      .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));

    if (sorted.length > 0) {
      parts.push("# 语言风格与规则 — 混合策略\n");
      parts.push("本内容需要融合以下风格：\n");

      if (sorted.length === 1) {
        const d = sorted[0];
        parts.push(`单一风格: ${d.design.meta?.label || d.id}`);
        if (d.strength < 100) parts.push(`（按 ${d.strength}% 强度应用）`);
        parts.push("");
        parts.push(d.design.body);
      } else {
        const primary = sorted[0];
        const secondary = sorted.slice(1);

        parts.push(`- **主要风格**：${primary.design.meta?.label || primary.id} — 主导内容的主体结构、叙事骨架和基本节奏\n`);
        parts.push(`- **辅助风格**：`);
        parts.push(secondary.map(s => `${s.design.meta?.label || s.id}（影响 ${s.strength}% 的区域）`).join("、"));
        parts.push(" — 在特定部分注入其特征\n");

        parts.push("### 混合策略\n");
        parts.push("1. **主体结构**：主要风格的规则覆盖全文骨架");
        if (secondary.length >= 1) {
          parts.push(`2. **开头/钩子**：参考 ${secondary[0].design.meta?.label || secondary[0].id} 的风格特征`);
        }
        if (secondary.length >= 2) {
          parts.push(`3. **结尾/互动**：参考 ${secondary[1].design.meta?.label || secondary[1].id} 的风格特征`);
        }
        parts.push("4. **冲突时**：以主要风格为准，辅风格只影响对应区域");
        parts.push("");

        parts.push("### 各风格详细规则\n");
        for (const d of sorted) {
          parts.push(`---\n【${d.design.meta?.label || d.id}】—— ${d === primary ? "主要" : `辅助 (${d.strength}%)`}\n`);
          parts.push(d.design.body);
          parts.push("");
        }
      }
    }
  }

  if (craftRules && craftRules.length > 0) {
    parts.push("# 通用写作工艺规则\n");
    for (const rule of craftRules) {
      parts.push(`## ${rule.name}`);
      parts.push(rule.content);
    }
    parts.push("");
  }

  if (skill.body) {
    parts.push("# 结构要求\n");
    parts.push(skill.body);
    parts.push("");
  }

  parts.push("# 输出格式\n");
  parts.push("请严格按照以下要求输出：");
  parts.push("- 正文直接输出，不需要额外说明");
  parts.push("- 使用 Markdown 格式");
  parts.push("- 不得包含元评论（如 `以下内容由AI生成`）");
  parts.push("");

  parts.push("# 用户需求\n");
  parts.push(userPrompt);

  return parts.join("\n");
}
