#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { listSkillPaths } from "../lib/constraint-engine.js";
import { loadSkillByPath } from "../lib/skill-loader.js";
import { assemblePrompt, getDesign, listDesigns, loadCraftRules } from "../src/registry.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CASES_PATH = join(ROOT, "benchmarks", "draft-quality", "cases.json");
const CONDITIONS = ["baseline", "guided", "revised"];
const SCORE_FIELDS = [
  "task_completion",
  "information_accuracy",
  "structure_usability",
  "language_naturalness",
  "genre_fit",
];

export function loadCases(path = CASES_PATH) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function validateCases(cases = loadCases()) {
  const errors = [];
  const ids = new Set();
  const skills = new Set(listSkillPaths());
  const designs = new Set(listDesigns().map(item => item.id));
  const familyCounts = {};

  for (const item of cases) {
    if (!item.id || ids.has(item.id)) errors.push(`重复或缺失 id: ${item.id || "<empty>"}`);
    ids.add(item.id);
    familyCounts[item.family] = (familyCounts[item.family] || 0) + 1;
    if (!skills.has(item.skill)) errors.push(`${item.id}: skill 不存在: ${item.skill}`);
    if (!designs.has(item.design)) errors.push(`${item.id}: design 不存在: ${item.design}`);
    for (const field of ["request", "audience", "purpose"]) {
      if (!item[field]?.trim()) errors.push(`${item.id}: 缺少 ${field}`);
    }
    for (const field of ["must_preserve", "failure_signals"]) {
      if (!Array.isArray(item[field]) || item[field].length === 0) errors.push(`${item.id}: ${field} 不能为空`);
    }
  }

  if (cases.length !== 20) errors.push(`样本数应为 20，实际为 ${cases.length}`);
  const expectedFamilies = ["fiction", "knowledge", "social", "business"];
  for (const family of expectedFamilies) {
    if (familyCounts[family] !== 5) errors.push(`${family} 应有 5 个样本，实际为 ${familyCounts[family] || 0}`);
  }
  for (const family of Object.keys(familyCounts)) {
    if (!expectedFamilies.includes(family)) errors.push(`未知任务族: ${family}`);
  }

  return { valid: errors.length === 0, errors, count: cases.length, family_counts: familyCounts };
}

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffled(values, random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function taskBlock(item) {
  return [
    `用户请求：${item.request}`,
    `目标受众：${item.audience}`,
    `核心目的：${item.purpose}`,
    "必须保留：",
    ...item.must_preserve.map(value => `- ${value}`),
  ].join("\n");
}

function buildPrompt(item, condition) {
  const task = taskBlock(item);
  if (condition === "baseline") {
    return [
      "你是一名中文写作助手。请完成以下草稿任务。",
      "正文直接输出，使用 Markdown，不解释写作过程。",
      "",
      task,
    ].join("\n");
  }

  if (condition === "guided") {
    const skill = loadSkillByPath(item.skill);
    const design = getDesign(item.design);
    const craftRules = loadCraftRules(skill.meta.craft?.requires, skill.constraints);
    return assemblePrompt(skill, [{ id: item.design, strength: 100, design }], craftRules, task);
  }

  return [
    "你是一名中文编辑。请修订下面的 guided 草稿，而不是另写一个无关版本。",
    "保留正确内容和原意，只修复明确问题；不要为了通过关键词检查生硬添加句子。",
    "",
    "# 原始任务",
    task,
    "",
    "# 待修订草稿",
    "{{GUIDED_OUTPUT}}",
    "",
    "# 机器反馈",
    "{{MACHINE_FEEDBACK}}",
    "",
    "# 输出要求",
    "只输出修订后的正文。",
  ].join("\n");
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export function prepareRun({ outDir, seed = 20260629, cases = loadCases() }) {
  const validation = validateCases(cases);
  if (!validation.valid) throw new Error(validation.errors.join("\n"));

  const runDir = resolve(outDir);
  const promptsDir = join(runDir, "prompts");
  const outputsDir = join(runDir, "outputs");
  mkdirSync(promptsDir, { recursive: true });
  mkdirSync(outputsDir, { recursive: true });

  const random = makeRandom(Number(seed));
  const slots = [];
  const blindMap = [];
  const blindReview = [];
  const reviews = [];

  for (const item of cases) {
    const randomizedConditions = shuffled(CONDITIONS, random);
    const caseReview = { case_id: item.id, family: item.family, drafts: [] };
    randomizedConditions.forEach((condition, index) => {
      const label = String.fromCharCode(65 + index);
      const promptFile = join(promptsDir, `${item.id}__${condition}.md`);
      const outputFile = join(outputsDir, `${item.id}__${label}.md`);
      writeFileSync(promptFile, `${buildPrompt(item, condition)}\n`, "utf-8");
      const slot = {
        case_id: item.id,
        family: item.family,
        label,
        condition,
        prompt_file: relative(runDir, promptFile).replace(/\\/g, "/"),
        output_file: relative(runDir, outputFile).replace(/\\/g, "/"),
      };
      slots.push(slot);
      blindMap.push({ case_id: item.id, label, condition });
      caseReview.drafts.push({ label, output_file: slot.output_file });
      reviews.push({
        case_id: item.id,
        label,
        rework: null,
        scores: Object.fromEntries(SCORE_FIELDS.map(field => [field, null])),
        notes: "",
      });
    });
    blindReview.push(caseReview);
  }

  const manifest = {
    benchmark: "draft-quality-v1",
    seed: Number(seed),
    created_at: new Date().toISOString(),
    case_count: cases.length,
    slot_count: slots.length,
    conditions: CONDITIONS,
    slots,
  };
  writeJson(join(runDir, "manifest.json"), manifest);
  writeJson(join(runDir, "blind-map.json"), blindMap);
  writeJson(join(runDir, "blind-review.json"), blindReview);
  writeJson(join(runDir, "reviews.json"), reviews);
  return { run_dir: runDir, manifest, validation };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function aggregate(entries) {
  return {
    count: entries.length,
    mean_rework: mean(entries.map(item => item.rework)),
    mean_scores: Object.fromEntries(SCORE_FIELDS.map(field => [field, mean(entries.map(item => item.scores[field]))])),
  };
}

export function summarizeRun(runDir) {
  const resolvedRunDir = resolve(runDir);
  const reviewsPath = join(resolvedRunDir, "reviews.json");
  const mapPath = join(resolvedRunDir, "blind-map.json");
  if (!existsSync(reviewsPath) || !existsSync(mapPath)) throw new Error("缺少 reviews.json 或 blind-map.json");

  const reviews = JSON.parse(readFileSync(reviewsPath, "utf-8"));
  const blindMap = JSON.parse(readFileSync(mapPath, "utf-8"));
  const conditionByKey = new Map(blindMap.map(item => [`${item.case_id}:${item.label}`, item.condition]));
  const casesById = new Map(loadCases().map(item => [item.id, item]));
  const completed = [];

  for (const review of reviews) {
    if (review.rework === null || Object.values(review.scores || {}).some(value => value === null)) continue;
    if (!Number.isInteger(review.rework) || review.rework < 0 || review.rework > 4) throw new Error(`${review.case_id}/${review.label}: rework 必须是 0-4 整数`);
    for (const field of SCORE_FIELDS) {
      const value = review.scores[field];
      if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error(`${review.case_id}/${review.label}: ${field} 必须是 1-5 整数`);
    }
    const condition = conditionByKey.get(`${review.case_id}:${review.label}`);
    const item = casesById.get(review.case_id);
    if (!condition || !item) throw new Error(`${review.case_id}/${review.label}: 无法解盲`);
    completed.push({ ...review, condition, family: item.family });
  }

  const byCondition = Object.fromEntries(CONDITIONS.map(condition => [
    condition,
    aggregate(completed.filter(item => item.condition === condition)),
  ]));
  const byFamily = {};
  for (const family of ["fiction", "knowledge", "social", "business"]) {
    byFamily[family] = Object.fromEntries(CONDITIONS.map(condition => [
      condition,
      aggregate(completed.filter(item => item.family === family && item.condition === condition)),
    ]));
  }

  const summary = {
    benchmark: "draft-quality-v1",
    completed_reviews: completed.length,
    expected_reviews: 60,
    complete: completed.length === 60,
    by_condition: byCondition,
    by_family: byFamily,
  };
  writeJson(join(resolvedRunDir, "summary.json"), summary);
  return summary;
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const [command = "validate", ...args] = process.argv.slice(2);
  if (command === "validate") {
    const result = validateCases();
    if (!result.valid) {
      console.error(result.errors.join("\n"));
      process.exitCode = 1;
      return;
    }
    console.log(`benchmark valid: ${result.count} cases (${Object.entries(result.family_counts).map(([key, value]) => `${key}=${value}`).join(", ")})`);
    return;
  }
  if (command === "prepare") {
    const outDir = argumentValue(args, "--out");
    if (!outDir) throw new Error("prepare 需要 --out <目录>");
    const result = prepareRun({ outDir, seed: Number(argumentValue(args, "--seed") || 20260629) });
    console.log(`prepared: ${result.manifest.slot_count} slots in ${result.run_dir}`);
    return;
  }
  if (command === "summarize") {
    const runDir = argumentValue(args, "--run");
    if (!runDir) throw new Error("summarize 需要 --run <目录>");
    const result = summarizeRun(runDir);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  throw new Error(`未知命令: ${command}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
