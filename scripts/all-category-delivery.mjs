#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { listSkillPaths } from "../lib/constraint-engine.js";
import { loadSkillByPath } from "../lib/skill-loader.js";
import { evaluateOutput } from "../lib/core/scorer.js";
import { assemblePrompt, getDesign, listDesigns, loadCraftRules } from "../src/registry.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CASES_PATH = join(ROOT, "benchmarks", "all-categories", "cases.json");
const DEFAULT_RUN_DIR = join(ROOT, ".content-studio", "deliveries", "all-categories");
const DEFAULT_GENERATOR = "huihui_ai/qwen3.5-abliterated:9b";
const DEFAULT_REVIEWER = "gemma-4-31B-it-The-DECKAR:latest";
const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const SCORE_FIELDS = ["task_completion", "information_accuracy", "structure_usability", "language_naturalness", "genre_fit"];
const DELIVERY_SCHEMA_VERSION = 2;

export function loadCases(path = CASES_PATH) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeForMatch(value) {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[一两二三四五六七八九]/g, char => ({ 一: "1", 两: "2", 二: "2", 三: "3", 四: "4", 五: "5", 六: "6", 七: "7", 八: "8", 九: "9" })[char])
    .replace(/\s+/g, "");
}

export function containsRequiredTerm(content, term) {
  return normalizeForMatch(content).includes(normalizeForMatch(term));
}

export function containsForbiddenTerm(content, term) {
  const normalizedContent = normalizeForMatch(content);
  const normalizedTerm = normalizeForMatch(term);
  let index = normalizedContent.indexOf(normalizedTerm);
  while (index >= 0) {
    const before = normalizedContent.slice(Math.max(0, index - 12), index);
    const after = normalizedContent.slice(index + normalizedTerm.length, index + normalizedTerm.length + 10);
    const negatedBefore = /(?:不是|并非|不涉及|不碰|不用|无需|无须|避免|禁止|别)[^,，。;；!！?？]{0,12}$/.test(before);
    const negatedAfter = /^(?:并不存在|不存在|无关|除外)/.test(after);
    if (!negatedBefore && !negatedAfter) return true;
    index = normalizedContent.indexOf(normalizedTerm, index + normalizedTerm.length);
  }
  return false;
}

function unsupportedForSkill(skill) {
  const result = evaluateOutput("契约探测文本", skill.meta, skill.constraints);
  return unique([
    ...result.unsupported_checks.P0,
    ...result.unsupported_checks.P1,
    ...result.unsupported_checks.P2,
  ]);
}

export function validateCases(cases = loadCases()) {
  const errors = [];
  const authoritative = listSkillPaths();
  const authoritativeSet = new Set(authoritative);
  const designSet = new Set(listDesigns().map(item => item.id));
  const seenIds = new Set();
  const seenSkills = new Set();

  for (const item of cases) {
    if (!item.id || seenIds.has(item.id)) errors.push(`重复或缺失 id: ${item.id || "<empty>"}`);
    seenIds.add(item.id);
    if (!authoritativeSet.has(item.skill)) errors.push(`${item.id}: skill 不存在: ${item.skill}`);
    if (seenSkills.has(item.skill)) errors.push(`${item.id}: skill 重复覆盖: ${item.skill}`);
    seenSkills.add(item.skill);
    if (!designSet.has(item.design)) errors.push(`${item.id}: design 不存在: ${item.design}`);
    if (!Number.isInteger(item.min_chars) || !Number.isInteger(item.max_chars) || item.min_chars <= 0 || item.max_chars <= item.min_chars) {
      errors.push(`${item.id}: 字符范围无效`);
    }
    if (!Array.isArray(item.required_terms) || item.required_terms.length === 0) errors.push(`${item.id}: required_terms 不能为空`);
    if (item.required_any !== undefined && (!Array.isArray(item.required_any) || item.required_any.some(group => !Array.isArray(group) || group.length < 2))) {
      errors.push(`${item.id}: required_any 必须是至少含两个候选词的数组组`);
    }
    if (!Array.isArray(item.forbidden_terms)) errors.push(`${item.id}: forbidden_terms 必须是数组`);
    if (!Array.isArray(item.manual_checks)) errors.push(`${item.id}: manual_checks 必须是数组`);
    if (!item.review_focus?.trim()) errors.push(`${item.id}: review_focus 不能为空`);

    if (authoritativeSet.has(item.skill)) {
      const skill = loadSkillByPath(item.skill);
      const inputNames = new Set(skill.inputs.map(input => input.name));
      for (const input of skill.inputs.filter(input => input.required)) {
        if (item.inputs?.[input.name] === undefined || item.inputs[input.name] === "") errors.push(`${item.id}: 缺少必填输入 ${input.name}`);
      }
      for (const name of Object.keys(item.inputs || {})) {
        if (!inputNames.has(name)) errors.push(`${item.id}: 未知输入 ${name}`);
      }
      const unsupported = unsupportedForSkill(skill);
      const missingCoverage = unsupported.filter(check => !item.manual_checks.includes(check));
      const staleCoverage = item.manual_checks.filter(check => !unsupported.includes(check));
      if (missingCoverage.length) errors.push(`${item.id}: 未覆盖 unsupported checks: ${missingCoverage.join(", ")}`);
      if (staleCoverage.length) errors.push(`${item.id}: 多余 manual_checks: ${staleCoverage.join(", ")}`);
    }
  }

  for (const path of authoritative) {
    if (!seenSkills.has(path)) errors.push(`缺少分类实例: ${path}`);
  }
  if (cases.length !== authoritative.length) errors.push(`实例数 ${cases.length} 与权威分类数 ${authoritative.length} 不一致`);
  return { valid: errors.length === 0, errors, case_count: cases.length, authoritative_count: authoritative.length };
}

function inputBlock(skill, item) {
  const labels = new Map(skill.inputs.map(input => [input.name, input.label || input.name]));
  return Object.entries(item.inputs).map(([name, value]) => `${labels.get(name) || name}: ${value}`).join("\n");
}

function buildExecutionPrompt(item) {
  const skill = loadSkillByPath(item.skill);
  const design = getDesign(item.design);
  const craftRules = loadCraftRules(skill.meta.craft?.requires, skill.constraints);
  const task = [
    inputBlock(skill, item),
    "",
    "# 本次执行稿合同",
    `- 输出长度控制在 ${item.min_chars}-${item.max_chars} 个中文字符。`,
    `- 正文必须原样包含这些信息：${item.required_terms.join("、")}`,
    ...(item.required_any || []).map(group => `- 以下同义信息至少原样包含一项：${group.join(" / ")}`),
    `- 禁止出现：${item.forbidden_terms.join("、") || "无"}`,
    `- 复核重点：${item.review_focus}`,
    "- 不得补充用户没有提供的数字、认证、研究结果或事实。",
  ].join("\n");
  return assemblePrompt(skill, [{ id: item.design, strength: 100, design }], craftRules, task);
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function deliveryProvenance() {
  const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  const taxonomyPath = join(ROOT, "taxonomy.json");
  const taxonomy = JSON.parse(readFileSync(taxonomyPath, "utf-8"));
  const skillFiles = listSkillPaths().map(path => ({
    path,
    sha256: sha256File(join(ROOT, "skills", ...path.split("/"), "SKILL.md")),
  }));
  const skillsSha256 = createHash("sha256")
    .update(skillFiles.map(item => `${item.path}:${item.sha256}`).join("\n"))
    .digest("hex");
  return {
    app_version: packageJson.version,
    taxonomy_version: taxonomy.version,
    taxonomy_sha256: sha256File(taxonomyPath),
    cases_sha256: sha256File(CASES_PATH),
    skills_sha256: skillsSha256,
    skill_files: skillFiles,
  };
}

export function prepareDelivery({ runDir = DEFAULT_RUN_DIR, cases = loadCases(), generator = DEFAULT_GENERATOR, reviewer = DEFAULT_REVIEWER } = {}) {
  const validation = validateCases(cases);
  if (!validation.valid) throw new Error(validation.errors.join("\n"));
  const resolved = resolve(runDir);
  const promptsDir = join(resolved, "prompts");
  const outputsDir = join(resolved, "outputs");
  const reviewsDir = join(resolved, "reviews");
  for (const dir of [promptsDir, outputsDir, reviewsDir]) mkdirSync(dir, { recursive: true });

  const entries = cases.map(item => {
    const promptPath = join(promptsDir, `${item.id}.md`);
    const outputPath = join(outputsDir, `${item.id}.md`);
    const reviewPath = join(reviewsDir, `${item.id}.json`);
    writeFileSync(promptPath, `${buildExecutionPrompt(item)}\n`, "utf-8");
    return {
      id: item.id,
      skill: item.skill,
      design: item.design,
      prompt_file: relative(resolved, promptPath).replace(/\\/g, "/"),
      output_file: relative(resolved, outputPath).replace(/\\/g, "/"),
      review_file: relative(resolved, reviewPath).replace(/\\/g, "/"),
    };
  });
  const manifest = {
    delivery: "all-categories-v2",
    schema_version: DELIVERY_SCHEMA_VERSION,
    created_at: new Date().toISOString(),
    generator,
    reviewer,
    case_count: cases.length,
    provenance: deliveryProvenance(),
    entries,
  };
  writeJson(join(resolved, "manifest.json"), manifest);
  return { run_dir: resolved, manifest, validation };
}

async function callOllama({ prompt, model, json = false, maxTokens = 4096 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10 * 60 * 1000);
  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        think: false,
        ...(json ? { format: "json" } : {}),
        options: { temperature: json ? 0.2 : 0.7, top_p: 0.9, num_predict: maxTokens },
      }),
    });
    if (!response.ok) throw new Error(`Ollama ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return { content: data.response?.trim() || "", duration_ns: data.total_duration || null };
  } finally {
    clearTimeout(timer);
  }
}

function readManifest(runDir) {
  const path = join(resolve(runDir), "manifest.json");
  if (!existsSync(path)) throw new Error(`缺少 manifest: ${path}`);
  return JSON.parse(readFileSync(path, "utf-8"));
}

export async function runDelivery({ runDir = DEFAULT_RUN_DIR, model, only } = {}) {
  const resolved = resolve(runDir);
  const manifest = readManifest(resolved);
  const cases = new Map(loadCases().map(item => [item.id, item]));
  const selected = only ? new Set(only.split(",").map(value => value.trim()).filter(Boolean)) : null;
  const results = [];
  for (const entry of manifest.entries) {
    if (selected && !selected.has(entry.id)) continue;
    const outputPath = join(resolved, entry.output_file);
    if (existsSync(outputPath) && readFileSync(outputPath, "utf-8").trim()) {
      results.push({ id: entry.id, status: "skipped_existing" });
      continue;
    }
    const item = cases.get(entry.id);
    const prompt = readFileSync(join(resolved, entry.prompt_file), "utf-8");
    const started = Date.now();
    try {
      const generated = await callOllama({
        prompt,
        model: model || manifest.generator,
        maxTokens: Math.max(1024, Math.ceil(item.max_chars * 1.5)),
      });
      if (!generated.content) throw new Error("模型返回空内容");
      writeFileSync(outputPath, `${generated.content}\n`, "utf-8");
      results.push({ id: entry.id, status: "generated", chars: generated.content.length, elapsed_ms: Date.now() - started });
    } catch (error) {
      results.push({ id: entry.id, status: "failed", error: error.message, elapsed_ms: Date.now() - started });
    }
    writeJson(join(resolved, "generation-log.json"), results);
  }
  return results;
}

function nextVersionPath(runDir, id) {
  const versionsDir = join(runDir, "versions");
  mkdirSync(versionsDir, { recursive: true });
  let version = 1;
  while (existsSync(join(versionsDir, `${id}.v${version}.md`))) version++;
  return join(versionsDir, `${id}.v${version}.md`);
}

function nextReviewVersionPath(runDir, id) {
  const versionsDir = join(runDir, "review-versions");
  mkdirSync(versionsDir, { recursive: true });
  let version = 1;
  while (existsSync(join(versionsDir, `${id}.v${version}.json`))) version++;
  return join(versionsDir, `${id}.v${version}.json`);
}

export function snapshotDelivery({ runDir = DEFAULT_RUN_DIR, only } = {}) {
  const resolved = resolve(runDir);
  const manifest = readManifest(resolved);
  const selected = only ? new Set(only.split(",").map(value => value.trim()).filter(Boolean)) : null;
  const results = [];
  for (const entry of manifest.entries) {
    if (selected && !selected.has(entry.id)) continue;
    const outputPath = join(resolved, entry.output_file);
    const reviewPath = join(resolved, entry.review_file);
    if (!existsSync(outputPath)) {
      results.push({ id: entry.id, status: "missing_output" });
      continue;
    }
    const outputVersion = nextVersionPath(resolved, entry.id);
    writeFileSync(outputVersion, readFileSync(outputPath, "utf-8"), "utf-8");
    let reviewVersion = null;
    if (existsSync(reviewPath)) {
      reviewVersion = nextReviewVersionPath(resolved, entry.id);
      writeFileSync(reviewVersion, readFileSync(reviewPath, "utf-8"), "utf-8");
      rmSync(reviewPath);
    }
    results.push({ id: entry.id, status: "snapshotted", output_version: relative(resolved, outputVersion), review_version: reviewVersion ? relative(resolved, reviewVersion) : null });
  }
  return results;
}

export async function reviseDelivery({ runDir = DEFAULT_RUN_DIR, model, only } = {}) {
  const resolved = resolve(runDir);
  const manifest = readManifest(resolved);
  const cases = new Map(loadCases().map(item => [item.id, item]));
  const selected = only ? new Set(only.split(",").map(value => value.trim()).filter(Boolean)) : null;
  const verification = verifyDelivery({ runDir: resolved });
  const resultById = new Map(verification.results.map(item => [item.id, item]));
  const results = [];

  for (const entry of manifest.entries) {
    if (selected && !selected.has(entry.id)) continue;
    const outputPath = join(resolved, entry.output_file);
    if (!existsSync(outputPath)) {
      results.push({ id: entry.id, status: "missing_output" });
      continue;
    }
    const current = readFileSync(outputPath, "utf-8").trim();
    const verificationItem = resultById.get(entry.id);
    const actionableErrors = (verificationItem?.errors || []).filter(error => error !== "缺少语义复核");
    if (actionableErrors.length === 0) {
      results.push({ id: entry.id, status: "no_contract_errors" });
      continue;
    }
    const item = cases.get(entry.id);
    const targetChars = Math.floor((item.min_chars + item.max_chars) / 2);
    const prompt = [
      "你是严格的中文编辑。请修订现有草稿，不重新扩写，不解释过程。",
      `分类：${item.skill}`,
      `任务输入：${JSON.stringify(item.inputs)}`,
      `长度硬限制：${item.min_chars}-${item.max_chars} 个中文字符，目标约 ${targetChars} 字符。`,
      `必须原样包含：${item.required_terms.join("、")}`,
      ...(item.required_any || []).map(group => `同义信息至少包含一项：${group.join(" / ")}`),
      `禁止出现：${item.forbidden_terms.join("、") || "无"}`,
      `复核重点：${item.review_focus}`,
      "输出语言必须为简体中文；只有专有代码或格式标记可以使用英文。",
      "",
      "# 当前草稿",
      current,
      "",
      "# 必须修复的问题",
      ...actionableErrors.map(error => `- ${error}`),
      "",
      "请在保留正确内容和体裁的前提下修订。严格满足字符范围、必须信息和禁止内容。只输出修订后正文。",
    ].join("\n");
    try {
      const revised = await callOllama({
        prompt,
        model: model || manifest.generator,
        // Chinese output is usually longer than one character per token for the
        // local models used here. Keep the generation ceiling below the hard
        // character limit so compression requests cannot expand indefinitely.
        maxTokens: Math.max(300, Math.ceil(item.max_chars * 0.55)),
      });
      if (!revised.content) throw new Error("模型返回空内容");
      writeFileSync(nextVersionPath(resolved, entry.id), `${current}\n`, "utf-8");
      writeFileSync(outputPath, `${revised.content}\n`, "utf-8");
      const reviewPath = join(resolved, entry.review_file);
      if (existsSync(reviewPath)) rmSync(reviewPath);
      results.push({ id: entry.id, status: "revised", chars: revised.content.length, fixed: actionableErrors });
    } catch (error) {
      results.push({ id: entry.id, status: "failed", error: error.message });
    }
    writeJson(join(resolved, "revision-log.json"), results);
  }
  return results;
}

function reviewPrompt(item, output) {
  return [
    "你是严格的中文草稿验收员。只根据任务合同和正文评审，不因文风华丽而放宽事实与任务要求。",
    "请输出严格 JSON，不附加解释。",
    "",
    "# 分类", item.skill,
    "# 输入", JSON.stringify(item.inputs, null, 2),
    "# 必须保留", item.required_terms.join("、"),
    "# 可接受的同义信息组", JSON.stringify(item.required_any || []),
    "# 禁止内容", item.forbidden_terms.join("、") || "无",
    "# 复核重点", item.review_focus,
    "# 需要人工语义判断的检查", item.manual_checks.join("、") || "无",
    "# 正文", output,
    "",
    "# JSON Schema",
    JSON.stringify({
      rework: "0-4整数；0直接可用，1轻改，2局部重写，3大改，4不可用",
      scores: Object.fromEntries(SCORE_FIELDS.map(field => [field, "1-5整数"])),
      manual_checks: Object.fromEntries(item.manual_checks.map(check => [check, "true或false"])),
      blocking_issues: ["阻断问题；没有则空数组"],
      notes: "一句具体意见",
      verdict: "pass或fail",
    }, null, 2),
    "只有 rework<=2、所有分数>=3、manual_checks 全 true 且无阻断问题时 verdict 才能是 pass。",
  ].join("\n");
}

function parseJsonResponse(content) {
  const cleaned = content.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("评审未返回 JSON 对象");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function reviewDelivery({ runDir = DEFAULT_RUN_DIR, model, only } = {}) {
  const resolved = resolve(runDir);
  const manifest = readManifest(resolved);
  const cases = new Map(loadCases().map(item => [item.id, item]));
  const selected = only ? new Set(only.split(",").map(value => value.trim()).filter(Boolean)) : null;
  const results = [];
  for (const entry of manifest.entries) {
    if (selected && !selected.has(entry.id)) continue;
    const outputPath = join(resolved, entry.output_file);
    const reviewPath = join(resolved, entry.review_file);
    if (!existsSync(outputPath)) {
      results.push({ id: entry.id, status: "missing_output" });
      continue;
    }
    if (existsSync(reviewPath) && readFileSync(reviewPath, "utf-8").trim()) {
      results.push({ id: entry.id, status: "skipped_existing" });
      continue;
    }
    const output = readFileSync(outputPath, "utf-8").trim();
    try {
      const reviewed = await callOllama({ prompt: reviewPrompt(cases.get(entry.id), output), model: model || manifest.reviewer, json: true, maxTokens: 1200 });
      const parsed = parseJsonResponse(reviewed.content);
      writeJson(reviewPath, parsed);
      results.push({ id: entry.id, status: "reviewed", verdict: parsed.verdict });
    } catch (error) {
      results.push({ id: entry.id, status: "failed", error: error.message });
    }
    writeJson(join(resolved, "review-log.json"), results);
  }
  return results;
}

function validateReview(review, item) {
  const errors = [];
  if (!Number.isInteger(review.rework) || review.rework < 0 || review.rework > 4) errors.push("rework 必须为 0-4 整数");
  for (const field of SCORE_FIELDS) {
    const value = review.scores?.[field];
    if (!Number.isInteger(value) || value < 1 || value > 5) errors.push(`${field} 必须为 1-5 整数`);
    else if (value < 3) errors.push(`${field} 低于 3`);
  }
  for (const check of item.manual_checks) {
    if (review.manual_checks?.[check] !== true) errors.push(`manual check 未通过: ${check}`);
  }
  if (review.rework > 2) errors.push(`返工等级 ${review.rework} 高于 2`);
  if (Array.isArray(review.blocking_issues) && review.blocking_issues.length) errors.push(...review.blocking_issues.map(issue => `阻断: ${issue}`));
  if (review.verdict !== "pass") errors.push("review verdict 不是 pass");
  return errors;
}

function writeDeliveryIndex(runDir, manifest, summary) {
  const lines = [
    "# 全分类执行稿交付索引",
    "",
    `- 分类总数：${summary.total}`,
    `- 通过：${summary.passed}`,
    `- 失败：${summary.failed}`,
    `- 生成模型：${manifest.generator}`,
    `- 复核模型：${manifest.reviewer}`,
    `- 最终状态：${summary.complete ? "全部通过" : "未完成"}`,
    "",
    "| ID | 分类 | 字符数 | 返工级别 | 状态 | 执行稿 | 复核证据 |",
    "|---|---|---:|---:|---|---|---|",
  ];
  const entries = new Map(manifest.entries.map(entry => [entry.id, entry]));
  for (const item of summary.results) {
    const entry = entries.get(item.id);
    lines.push(`| ${item.id} | ${item.skill} | ${item.chars} | ${item.review?.rework ?? "-"} | ${item.status} | [正文](${entry.output_file}) | [JSON](${entry.review_file}) |`);
  }
  lines.push("", "机器评分只作诊断；最终状态同时要求实例合同、unsupported 覆盖和语义复核通过。", "");
  writeFileSync(join(runDir, "DELIVERY.md"), lines.join("\n"), "utf-8");
}

export function verifyDelivery({ runDir = DEFAULT_RUN_DIR, cases = loadCases() } = {}) {
  const resolved = resolve(runDir);
  const manifest = readManifest(resolved);
  const casesById = new Map(cases.map(item => [item.id, item]));
  const results = [];
  for (const entry of manifest.entries) {
    const item = casesById.get(entry.id);
    const errors = [];
    const outputPath = join(resolved, entry.output_file);
    const reviewPath = join(resolved, entry.review_file);
    let output = "";
    if (!existsSync(outputPath)) errors.push("缺少实际输出");
    else output = readFileSync(outputPath, "utf-8").trim();
    if (!output) errors.push("输出为空");
    if (output && output.length < item.min_chars) errors.push(`字符数 ${output.length} 少于 ${item.min_chars}`);
    if (output && output.length > item.max_chars) errors.push(`字符数 ${output.length} 多于 ${item.max_chars}`);
    for (const term of item.required_terms) if (output && !containsRequiredTerm(output, term)) errors.push(`缺少必须信息: ${term}`);
    for (const group of item.required_any || []) {
      if (output && !group.some(term => containsRequiredTerm(output, term))) errors.push(`缺少同义信息组: ${group.join(" / ")}`);
    }
    for (const term of item.forbidden_terms) if (output && containsForbiddenTerm(output, term)) errors.push(`出现禁止内容: ${term}`);

    const skill = loadSkillByPath(item.skill);
    const evaluation = output ? evaluateOutput(output, skill.meta, skill.constraints) : null;
    const unsupported = evaluation ? unique([...evaluation.unsupported_checks.P0, ...evaluation.unsupported_checks.P1, ...evaluation.unsupported_checks.P2]) : [];
    for (const check of unsupported) if (!item.manual_checks.includes(check)) errors.push(`unsupported check 未覆盖: ${check}`);

    let review = null;
    if (!existsSync(reviewPath)) errors.push("缺少语义复核");
    else {
      try {
        review = JSON.parse(readFileSync(reviewPath, "utf-8"));
        errors.push(...validateReview(review, item));
      } catch (error) {
        errors.push(`复核文件无效: ${error.message}`);
      }
    }
    results.push({
      id: item.id,
      skill: item.skill,
      chars: output.length,
      status: errors.length ? "failed" : "passed",
      errors,
      heuristic: evaluation ? { overall: evaluation.overall, all_P0_passed: evaluation.all_P0_passed, unsupported } : null,
      review,
    });
  }
  const summary = {
    delivery: "all-categories-v2",
    schema_version: DELIVERY_SCHEMA_VERSION,
    total: results.length,
    passed: results.filter(item => item.status === "passed").length,
    failed: results.filter(item => item.status === "failed").length,
    complete: results.length === cases.length && results.every(item => item.status === "passed"),
    results,
  };
  writeJson(join(resolved, "verification.json"), summary);
  writeDeliveryIndex(resolved, manifest, summary);
  return summary;
}

export function publishDelivery({ runDir = DEFAULT_RUN_DIR, publishDir } = {}) {
  if (!publishDir) throw new Error("publishDir 不能为空");
  const resolvedRun = resolve(runDir);
  const resolvedPublish = resolve(publishDir);
  if (existsSync(resolvedPublish)) throw new Error(`发布目录已存在: ${resolvedPublish}`);
  const manifest = readManifest(resolvedRun);
  const verification = verifyDelivery({ runDir: resolvedRun });
  if (!verification.complete) throw new Error(`交付未通过，禁止发布: ${verification.passed}/${verification.total}`);
  const cases = new Map(loadCases().map(item => [item.id, item]));
  const results = new Map(verification.results.map(item => [item.id, item]));
  for (const dir of ["prompts", "outputs", "reviews"]) mkdirSync(join(resolvedPublish, dir), { recursive: true });

  const entries = manifest.entries.map(entry => {
    const item = cases.get(entry.id);
    const skill = loadSkillByPath(entry.skill);
    for (const field of ["prompt_file", "output_file", "review_file"]) {
      const source = join(resolvedRun, entry[field]);
      const target = join(resolvedPublish, entry[field]);
      if (!existsSync(source)) throw new Error(`${entry.id}: 缺少发布文件 ${entry[field]}`);
      copyFileSync(source, target);
    }
    return {
      id: entry.id,
      skill: entry.skill,
      label: skill.meta.label,
      design: entry.design,
      summary: item.inputs.user_idea,
      output: entry.output_file,
      review: entry.review_file,
      prompt: entry.prompt_file,
      chars: results.get(entry.id).chars,
    };
  });

  for (const name of ["manifest.json", "verification.json", "DELIVERY.md"]) {
    copyFileSync(join(resolvedRun, name), join(resolvedPublish, name));
  }
  writeJson(join(resolvedPublish, "index.json"), {
    schema_version: 1,
    delivery: manifest.delivery,
    count: entries.length,
    entries,
  });
  writeFileSync(join(resolvedPublish, "README.md"), [
    "# 全分类通过实例",
    "",
    "本目录包含当前合同下通过硬规则和语义复核的25类合成实例。",
    "",
    "- `index.json`：CLI/API/UI统一读取索引",
    "- `prompts/`：执行提示",
    "- `outputs/`：最终正文",
    "- `reviews/`：语义复核证据",
    "- `manifest.json`：模型、版本和源文件摘要",
    "- `verification.json`：逐项验收结果",
    "",
    "运行过程、个人历史和中间版本不属于本目录。",
    "",
  ].join("\n"), "utf-8");
  return { publish_dir: resolvedPublish, count: entries.length };
}

function arg(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main() {
  const [command = "validate", ...args] = process.argv.slice(2);
  const runDir = arg(args, "--run") || DEFAULT_RUN_DIR;
  if (command === "validate") {
    const result = validateCases();
    if (!result.valid) {
      console.error(result.errors.join("\n"));
      process.exitCode = 1;
      return;
    }
    console.log(`all-category cases valid: ${result.case_count}/${result.authoritative_count}`);
  } else if (command === "prepare") {
    const result = prepareDelivery({ runDir, generator: arg(args, "--model") || DEFAULT_GENERATOR, reviewer: arg(args, "--reviewer") || DEFAULT_REVIEWER });
    console.log(`prepared ${result.manifest.case_count} categories in ${result.run_dir}`);
  } else if (command === "run") {
    const result = await runDelivery({ runDir, model: arg(args, "--model"), only: arg(args, "--only") });
    console.log(JSON.stringify(result, null, 2));
    if (result.some(item => item.status === "failed")) process.exitCode = 1;
  } else if (command === "review") {
    const result = await reviewDelivery({ runDir, model: arg(args, "--model"), only: arg(args, "--only") });
    console.log(JSON.stringify(result, null, 2));
    if (result.some(item => item.status === "failed" || item.status === "missing_output")) process.exitCode = 1;
  } else if (command === "revise") {
    const result = await reviseDelivery({ runDir, model: arg(args, "--model"), only: arg(args, "--only") });
    console.log(JSON.stringify(result, null, 2));
    if (result.some(item => item.status === "failed" || item.status === "missing_output")) process.exitCode = 1;
  } else if (command === "snapshot") {
    const result = snapshotDelivery({ runDir, only: arg(args, "--only") });
    console.log(JSON.stringify(result, null, 2));
    if (result.some(item => item.status === "missing_output")) process.exitCode = 1;
  } else if (command === "verify") {
    const result = verifyDelivery({ runDir });
    console.log(`verified: ${result.passed}/${result.total} passed`);
    for (const item of result.results.filter(item => item.status !== "passed")) console.log(`- ${item.id}: ${item.errors.join("; ")}`);
    if (!result.complete) process.exitCode = 1;
  } else if (command === "publish") {
    const publishDir = arg(args, "--out");
    const result = publishDelivery({ runDir, publishDir });
    console.log(`published ${result.count} examples to ${result.publish_dir}`);
  } else {
    throw new Error(`未知命令: ${command}`);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  main().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
