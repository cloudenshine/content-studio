/**
 * core/index.js — 内核统一导出
 *
 * 所有纯函数从此导入，供适配层（registry.js / Obsidian 插件）使用。
 * 零依赖，零 I/O。
 */

export { evaluateOutput, avgSentenceLength, countAICliches, measureBurstiness, detectStyleShift, passP0, passP1, passP2, hasSatisfactionMoment, countSensoryAnchors, clamp } from "./scorer.js";
export { assemblePrompt } from "./prompt-assembler.js";
export { findNode, mergeConstraints, splitPath, mergeConstraintsByPathSegments } from "./constraint-engine.js";
export { parseFrontmatter } from "./parse-frontmatter.js";
export { retrieve, buildIndex, search } from "./rag.js";
export { buildJudgePrompt } from "./llm-judge.js";
export { formatMemoryNotes } from "./memory.js";
