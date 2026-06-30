/**
 * scorer.js — 纯函数评分引擎
 *
 * 纯函数，零 I/O，零 Node 内置依赖。
 * 入参 content/meta/constraints，出参评分对象。
 * 可在 Node.js 和 Obsidian (Electron) 两环境使用。
 */

/* ═══════════════════════════════════════════════════════════════
   自评引擎
   ═══════════════════════════════════════════════════════════════ */
export function normalizeHardChecks(evaluation = {}) {
  const nested = evaluation.hard_checks && typeof evaluation.hard_checks === "object"
    ? evaluation.hard_checks
    : {};
  const values = priority => [
    ...(Array.isArray(nested[priority]) ? nested[priority] : []),
    ...(Array.isArray(evaluation[priority]) ? evaluation[priority] : []),
  ];
  return {
    P0: [...new Set(values("P0"))],
    P1: [...new Set(values("P1"))],
    P2: [...new Set(values("P2"))],
  };
}

export function evaluateOutput(content, skillMeta, constraints) {
  const ev = skillMeta.evaluation || {};
  const dimensions = ev.dimensions || ["logical_consistency", "audience_resonance", "structural_integrity", "language_quality", "originality"];
  const hardChecks = normalizeHardChecks(ev);

  // 合并 taxonomy 约束中的 p0_checks → P0 检查
  if (constraints && constraints.p0_checks && constraints.p0_checks.length > 0) {
    hardChecks.P0 = [...new Set([
      ...(hardChecks.P0 || []),
      ...constraints.p0_checks
    ])];
  }

  const wordCount = content.length;
  const hasDialogue = (content.match(/[""「」『』【】]/g) || []).length > 0;
  const hasParagraphBreathing = content.split("\n\n").length > 5;
  const avgSentenceLen = avgSentenceLength(content);
  const aiClicheCount = countAICliches(content);
  const burstiness = measureBurstiness(content);
  const styleShiftScore = detectStyleShift(content);

  const aiDensity = clamp((aiClicheCount * 5 + (1 - Math.min(burstiness / 0.6, 1)) * 20 + styleShiftScore * 10) / 5, 1, 10);

  const scores = {};
  for (const dim of dimensions) {
    switch (dim) {
      case "logical_consistency":
        scores[dim] = clamp(8 - aiClicheCount * 0.5, 1, 10);
        break;
      case "audience_resonance":
        scores[dim] = clamp(hasDialogue ? 8 : 5, 1, 10);
        break;
      case "structural_integrity":
        scores[dim] = clamp(hasParagraphBreathing ? 8 : 5, 1, 10);
        break;
      case "language_quality":
        scores[dim] = clamp(10 - avgSentenceLen * 0.08 - aiClicheCount * 0.3, 1, 10);
        break;
      case "originality":
        scores[dim] = clamp(8 - aiClicheCount * 0.8, 1, 10);
        break;
      case "ai_density":
        scores[dim] = clamp(10 - aiDensity, 1, 10);
        break;
      default:
        scores[dim] = 7;
    }
  }

  const checks = {};
  const hardChecksByPriority = { P0: {}, P1: {}, P2: {} };
  const unsupportedChecks = { P0: [], P1: [], P2: [] };
  const recordCheck = (priority, check, result) => {
    if (result === undefined) unsupportedChecks[priority].push(check);
    const value = result === undefined ? null : result;
    checks[check] = value;
    hardChecksByPriority[priority][check] = value;
  };
  if (hardChecks.P0) {
    for (const check of hardChecks.P0) {
      recordCheck("P0", check, passP0(check, content));
    }
  }
  if (hardChecks.P1) {
    for (const check of hardChecks.P1) {
      recordCheck("P1", check, passP1(check, content));
    }
  }
  if (hardChecks.P2) {
    for (const check of hardChecks.P2) {
      recordCheck("P2", check, passP2(check, content));
    }
  }

  const scoreValues = Object.values(scores);
  const allP0Passed = hardChecks.P0.every(c => hardChecksByPriority.P0[c] === true);
  const allP1Passed = hardChecks.P1.every(c => hardChecksByPriority.P1[c] === true);
  const allP2Passed = hardChecks.P2.every(c => hardChecksByPriority.P2[c] === true);

  return {
    scores,
    overall: scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length,
    hard_checks: checks,
    hard_checks_by_priority: hardChecksByPriority,
    unsupported_checks: unsupportedChecks,
    all_P0_passed: allP0Passed,
    all_P1_passed: allP1Passed,
    all_P2_passed: allP2Passed,
    word_count: wordCount,
    ai_density: aiDensity,
    burstiness: Math.round(burstiness * 100) / 100,
    style_shift: styleShiftScore,
  };
}

/* ═══════════════════════════════════════════════════════════════
   辅助函数
   ═══════════════════════════════════════════════════════════════ */

export function avgSentenceLength(text) {
  const sentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 5);
  if (sentences.length === 0) return 0;
  return sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
}

export function countAICliches(text) {
  const cliches = [
    "值得注意的是", "不得不说", "众所周知", "在这个世界上",
    "从某种程度上", "基于以上", "总而言之", "我们需要", "我们可以", "我们将要",
    "不可否认的是", "平心而论", "引起了广泛关注", "受到高度关注",
    "发挥着不可替代的作用", "为XX提供了有力保障", "奠定了坚实基础",
    "我们坚信", "我们有理由相信", "在当今社会", "在当今时代",
    "从某种角度来说", "某种意义上讲", "坦率地说", "老实说", "说实话",
    "充满了挑战和机遇", "充满了机遇和挑战",
    "XX不仅是一种XX，更是一种XX",
    "随着社会的发展", "随着时代的进步", "随着科技的不断发展",
    "在这个充满变数的时代", "在这样的大背景下",
    "归根结底", "说白了", "简单来说", "毋庸置疑的是",
    "引起了社会各界的广泛关注", "具有深远的历史意义",
  ];
  let count = cliches.reduce((c, phrase) => c + (text.includes(phrase) ? 1 : 0), 0);
  const fanYuanQi = (text.match(/不仅[^，。]*，更[^，。]*/g) || []).length;
  const tongShi = (text.match(/[^，。]*的同时[，。]/g) || []).length;
  const ranEr = (text.match(/[。！？\n][然而但是不过但]/g) || []).length;
  return count + Math.max(0, fanYuanQi - 1) + Math.max(0, tongShi - 2) + Math.max(0, ranEr - 2);
}

export function measureBurstiness(text) {
  const sentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 5);
  if (sentences.length < 4) return 0.5;
  const lengths = sentences.map(s => s.trim().length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean < 1) return 0.5;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  return Math.min(Math.sqrt(variance) / mean, 1.5);
}

export function detectStyleShift(text) {
  const sentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 8);
  if (sentences.length < 6) return 0;
  let shifts = 0;
  for (let i = 1; i < sentences.length; i++) {
    const prev = sentences[i - 1];
    const curr = sentences[i];
    const prevFormal = (prev.match(/的[^，。]*之|与否|及其|以及|所谓|而言/g) || []).length;
    const currFormal = (curr.match(/的[^，。]*之|与否|及其|以及|所谓|而言/g) || []).length;
    const prevCasual = (prev.match(/吧|嘛|啦|哦|嗯|哈|呀/g) || []).length;
    const currCasual = (curr.match(/吧|嘛|啦|哦|嗯|哈|呀/g) || []).length;
    if ((prevFormal > 0 && currCasual > 0) || (prevCasual > 0 && currFormal > 0)) {
      shifts++;
    }
  }
  return Math.min(shifts / Math.max(1, sentences.length / 5), 1);
}

export function passP0(check, content) {
  switch (check) {
    // ── 文学创作 ──
    case "character_choice_has_cost": return (content.match(/选择|决定|放弃|代价|牺牲|付出|失去/g) || []).length >= 2 && content.length > 40;
    case "plot_driven_by_causality": return (content.match(/因为|所以|因此|结果|于是|导致|为了/g) || []).length >= 2;
    case "no_resurrection_without_cost": return true;
    case "foreshadowing_has_payoff": return (content.match(/果然|原来|竟然|正如|终于/g) || []).length >= 1 || content.length > 1500;
    case "dialogue_is_subtext": return (content.match(/[""「」]/g) || []).length >= 3;
    case "stage_direction_is_visual": return (content.match(/[。！？]/g) || []).length >= 3;
    // ── 商业写作 ──
    case "value_proposition_clear": return content.length > 100 && !content.includes("等等");
    case "no_vague_claims": return !/(颠覆|赋能|闭环|抓手|打通|对齐)/.test(content);
    case "data_supports_claim": return (content.match(/\d+%|\d+倍|\d+万|\d+亿/g) || []).length >= 1;
    case "message_before_data": return !content.startsWith("数据") && content.length > 80;
    // ── 通用 / 保持兼容 ──
    case "hook_present": return content.length > 100;
    case "age_appropriate_language": return !/[艰晦涩僻藁癩癪]/.test(content) && content.length > 50;
    case "example_provided": return (content.match(/例如|比如|举例|比方|示例|譬如/g) || []).length >= 1;
    case "learning_objective_clear": return content.includes("目标") || content.includes("学会") || content.includes("掌握") || content.length > 500;
    case "citation_format": return (content.match(/\[\d+\]|\(.*\d{4}.*\)/g) || []).length >= 1 || content.length > 2000;
    case "structure_complete": return content.includes("# ") || content.includes("摘要") || content.includes("引言") || content.length > 2000;
    case "data_or_evidence": return content.match(/\d+%|\d+倍|\d+万|\d+亿/) !== null || content.match(/据.*统计|数据显示|研究表明/) !== null;
    case "key_message_clear": return content.length > 150;
    case "call_to_action": return content.includes("立即") || content.includes("点击") || content.includes("扫码") || content.includes("下单") || content.includes("关注");
    default: return undefined;
  }
}

export function passP1(check, content) {
  switch (check) {
    case "hook_present": return content.length > 300 && !content.startsWith(" ");
    case "satisfaction_moment_exists": return hasSatisfactionMoment(content);
    case "call_to_action": return content.includes("立即") || content.includes("点击") || content.includes("扫码") || content.includes("下单") || content.includes("关注");
    case "key_message_clear": return content.length > 200;
    case "data_or_evidence": return content.match(/\d+%|\d+倍|\d+万|\d+亿/) !== null || content.match(/据.*统计|数据显示|研究表明/) !== null;
    case "sensory_anchors_min_3": return countSensoryAnchors(content) >= 3;
    case "dialogue_exists": return (content.match(/[""「」『』【】]/g) || []).length >= 4;
    case "ai_cliche_free": return countAICliches(content) === 0;
    case "paragraph_breathing": return content.split("\n\n").length > 3;
    case "cliffhanger_or_forward_momentum": return content.length > 500;
    case "example_provided": return passP0("example_provided", content);
    case "structure_complete": return passP0("structure_complete", content);
    default: return undefined;
  }
}

export function passP2(check, content) {
  switch (check) {
    case "ai_cliche_free": return countAICliches(content) === 0;
    case "paragraph_breathing": return content.split("\n\n").length > 3;
    case "cliffhanger_or_forward_momentum": return content.length > 500;
    case "dialogue_natural": return (content.match(/[""「」『』【】]/g) || []).length >= 2;
    case "sensory_richness": return countSensoryAnchors(content) >= 2;
    case "no_repetitive_opening": return !content.startsWith(" ") && content.length > 100;
    default: return undefined;
  }
}

export function hasSatisfactionMoment(content) {
  const indicators = ["轰", "震", "碎", "跪", "惊", "突破", "碾压", "秒杀", "震撼全场", "沸腾"];
  return indicators.some(i => content.includes(i));
}

export function countSensoryAnchors(text) {
  const visual = (text.match(/[眼眼看]前|金光|黑暗|光芒|血色|身影|景象/g) || []).length;
  const auditory = (text.match(/轰隆|咔嚓|风声|脚步|呼吸声|低吼|尖啸/g) || []).length;
  const tactile = (text.match(/冰冷|灼热|刺痛|麻木|颤抖|僵硬/g) || []).length;
  return visual + auditory + tactile;
}

export function clamp(val, min, max) { return Math.max(min, Math.min(max, Math.round(val * 10) / 10)); }
