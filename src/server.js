/**
 * content-studio — HTTP API 服务器
 *
 * 零依赖，纯 Node 原生 http 模块
 * 提供 REST API + 层级分类引导
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCraftRules, evaluateOutput, assemblePrompt, listTaxonomy, listSkills, listDesigns, saveSkill, deleteSkill, createCategory, deleteCategory } from "./registry.js";
import { getChildren, getPathLabels, isValidPath, isLeafPath, mergeConstraintsByPath, splitPath } from "../lib/constraint-engine.js";
import { loadSkillByPath, listAvailableSkills } from "../lib/skill-loader.js";
import { readdirSync } from "node:fs";
import * as vault from "./vault-watcher.js";
import { getExample, listExamples } from "./example-registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UI_DIR = join(ROOT, "ui");
const PORT = parseInt(process.env.PORT || "3456", 10);
const HOST = process.env.HOST || "127.0.0.1";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const DEFAULT_MODEL = process.env.MODEL || "huihui_ai/qwen3.5-abliterated:9b";
const LLM_MODE = process.env.LLM_MODE || "ollama"; // ollama | byok | cli
const BYOK_ENDPOINT = process.env.BYOK_ENDPOINT || "http://localhost:11434/v1/chat/completions";
const BYOK_API_KEY = process.env.BYOK_API_KEY || "";
const BYOK_MODEL = process.env.BYOK_MODEL || "gpt-4o-mini";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => body += chunk.toString());
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error("Invalid JSON")); }
    });
  });
}

function serveStatic(req, res) {
  let path = join(UI_DIR, req.url === "/" ? "index.html" : req.url);
  if (!path.startsWith(UI_DIR)) { res.writeHead(403); res.end("Forbidden"); return; }
  if (!existsSync(path)) { res.writeHead(404); res.end("Not Found"); return; }
  const ext = extname(path);
  const mime = MIME[ext] || "application/octet-stream";
  const content = readFileSync(path);
  res.writeHead(200, { "Content-Type": mime, "Content-Length": content.length });
  res.end(content);
}

/* ── POST /api/generate ─────────────────────── */
async function handleGenerate(body) {
  const { skill: skillPath, designs: designsParam, design: designLegacy, inputs = {}, references = [], mode = 'claude', config = {} } = body;
  if (!skillPath) throw new Error("缺少 skill 参数");

  const skill = loadSkillByPath(skillPath);
  if (!skill) throw new Error(`技能 "${skillPath}" 不存在`);

  let designs = designsParam;
  if (!designs || designs.length === 0) {
    if (designLegacy) designs = [{ id: designLegacy, strength: 100 }];
    else designs = [];
  }
  const craftRules = loadCraftRules(skill.meta.craft?.requires);

  // 构建 prompt
  const skillInputs = skill.meta.inputs || [];
  const promptParts = [];

  // 用户想法 — 最重要，放在最前面作为核心驱动力
  const userIdea = inputs.user_idea;
  if (userIdea && userIdea.trim()) {
    promptParts.push(`## 用户创作意图（以下为最高优先级指引，所有输出内容应围绕此展开）\n${userIdea.trim()}\n`);
  }

  for (const field of skillInputs) {
    if (field.name === 'user_idea') continue; // 已在上方单独处理
    const val = inputs[field.name];
    if (field.required && !val) throw new Error(`缺少必填字段: ${field.label || field.name}`);
    if (val) promptParts.push(`${field.label || field.name}: ${val}`);
  }
  // 向后兼容旧字段
  if (inputs.target_audience) promptParts.push(`目标受众: ${inputs.target_audience}`);
  if (inputs.core_purpose) promptParts.push(`核心目的: ${inputs.core_purpose}`);

  if (references && references.length > 0) {
    promptParts.push("\n# 创作参考\n");
    for (const ref of references) {
      if (ref.content && ref.content.trim()) {
        promptParts.push(`\n[参考来源: ${ref.name || ref.type || "未命名"}]`);
        promptParts.push(ref.content.trim());
        promptParts.push("[/参考]");
      }
    }
  }

  const userPrompt = promptParts.join("\n");
  const fullPrompt = assemblePrompt(skill, designs, craftRules, userPrompt);

  const start = Date.now();
  let content, engine;
  if (mode === 'ollama') {
    engine = 'ollama';
    content = await callOllama(fullPrompt, config);
  } else if (mode === 'api') {
    engine = 'api';
    content = await callOpenAI(fullPrompt, config);
  } else {
    engine = config.tool || 'claude';
    content = await callLocalCLI(fullPrompt, config);
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const evaluation = evaluateOutput(content, skill.meta, skill.constraints);

  return {
    skill: skillPath,
    designs: designs.map(d => ({ id: d.id, strength: d.strength })),
    content,
    engine,
    path_labels: getPathLabels(skillPath),
    constraints: skill.constraints || {},
    stats: { chars: content.length, elapsed_seconds: parseFloat(elapsed) },
    evaluation,
    generated_at: new Date().toISOString(),
  };
}

async function callOllama(prompt, config) {
  const endpoint = config.url || 'http://localhost:11434/api/generate';
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model || 'huihui_ai/qwen3.5-abliterated:9b',
      prompt,
      stream: false,
      options: { temperature: parseFloat(config.temperature) || 0.8, top_p: 0.9, max_tokens: parseInt(config.max_tokens) || 8192 }
    })
  });
  if (!res.ok) throw new Error(`Ollama 请求失败 (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.response;
}

async function callOpenAI(prompt, config) {
  const endpoint = config.url || 'https://api.openai.com/v1/chat/completions';
  const apiKey = config.key || '';
  if (!apiKey) throw new Error('API Key 未配置，请在设置面板中填写');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: config.model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: parseFloat(config.temperature) || 0.7,
      max_tokens: parseInt(config.max_tokens) || 4096,
    })
  });
  if (!res.ok) throw new Error(`API 请求失败 (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/* ── Local CLI 调用（Claude Code / Cursor / Codex / Gemini CLI） ── */
async function callLocalCLI(prompt, config) {
  const tool = config.tool || 'claude';
  const extraArgs = config.args ? config.args.split(/\s+/).filter(Boolean) : [];
  const timeout = (parseInt(config.timeout) || 300) * 1000;

  const toolArgs = {
    claude:  ['-p', prompt, '--print', ...extraArgs],
    cursor:  ['ask', prompt, '--no-tool', ...extraArgs],
    codex:   ['exec', prompt, '--output', 'text', ...extraArgs],
    gemini:  ['prompt', prompt, ...extraArgs],
  };
  const args = toolArgs[tool] || toolArgs.claude;

  return new Promise((resolve, reject) => {
    const proc = spawn(tool, args, { stdio: ['pipe', 'pipe', 'pipe'], timeout });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`CLI ${tool} 退出码 ${code}${stderr ? ': ' + stderr.slice(0, 200) : ''}`));
    });
    proc.on('error', err => reject(new Error(`无法启动 ${tool} CLI。请确认已安装并加入 PATH。\n${err.message}`)));
  });
}

/* ── 检测本地 CLI 工具可用性 ── */
async function detectCLITools() {
  const tools = ['claude', 'cursor', 'codex', 'gemini'];
  const results = {};
  for (const tool of tools) {
    try {
      const proc = spawn(tool, ['--version'], { stdio: 'pipe', timeout: 5000 });
      let out = '';
      proc.stdout.on('data', d => { out += d.toString(); });
      await new Promise((resolve, reject) => {
        proc.on('close', code => code === 0 ? resolve() : reject());
        proc.on('error', reject);
      });
      results[tool] = { available: true, version: out.trim().split('\n')[0] };
    } catch { results[tool] = { available: false }; }
  }
  return results;
}

/* ── AI 自动补全表单字段 ── */
async function enrichFields(skillPath, userIdea, mode, config) {
  const skill = loadSkillByPath(skillPath);
  if (!skill) throw new Error(`技能 "${skillPath}" 不存在`);
  if (!userIdea || !userIdea.trim()) throw new Error("用户想法不能为空");

  const fields = (skill.meta.inputs || []).filter(f => f.name !== 'user_idea');
  if (fields.length === 0) return { fields: {} };

  const fieldDesc = fields.map(f => {
    const opts = f.options && f.options.length > 0 ? `（可选项：${f.options.join('、')}）` : '';
    const req = f.required ? '[必填]' : '[选填]';
    return `${f.name} (${f.label || f.name}) ${req}${opts}`;
  }).join('\n');

  const prompt = `你是一个创作需求分析助手。用户正在使用"${skill.label}"技能创作内容。

## 用户想法
${userIdea.trim()}

## 需要你填充的表单字段
${fieldDesc}

请根据用户想法，智能推断每个字段的合理值，以 JSON 格式返回（只返回 JSON，不要任何解释）：
{
  "field_name": "建议值",
  ...
}

规则：
- 只返回你有把握的字段，不确定的字段不要填
- 值必须匹配可选项（如果有的话），或给出合理的自由文本
- 值应该具体、有创意，不要空泛`;

  let content;
  if (mode === 'ollama') {
    content = await callOllama(prompt, config);
  } else if (mode === 'api') {
    content = await callOpenAI(prompt, config);
  } else {
    content = await callLocalCLI(prompt, config);
  }

  // 解析 JSON 响应
  const jsonStr = content.replace(/```json\s?|```/g, '').trim();
  let fields_parsed = {};
  try {
    fields_parsed = JSON.parse(jsonStr);
  } catch {
    // 尝试提取 JSON 子串
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      try { fields_parsed = JSON.parse(match[0]); } catch {}
    }
  }

  return { fields: fields_parsed };
}

/* ── 路由 ────────────────────────────────────── */
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;

    if (method === "GET" && path === "/api") {
      return jsonResponse(res, { status: "ok", version: "0.4.0" });
    }

    // CLI 诊断
    if (method === "GET" && path === "/api/cli-detect") {
      const tools = await detectCLITools();
      return jsonResponse(res, tools);
    }

    // 通过实例只读 API
    if (method === "GET" && path === "/api/examples") {
      return jsonResponse(res, listExamples());
    }
    if (method === "GET" && path.startsWith("/api/examples/")) {
      const id = decodeURIComponent(path.slice("/api/examples/".length));
      const example = getExample(id);
      if (!example) return jsonResponse(res, { error: "实例不存在" }, 404);
      return jsonResponse(res, example);
    }

    // 分类树导航
    if (method === "GET" && path === "/api/taxonomy") {
      const parent = url.searchParams.get("parent") || "";
      return jsonResponse(res, { parent, children: listTaxonomy(parent) });
    }
    if (method === "GET" && path === "/api/taxonomy/validate") {
      const p = url.searchParams.get("path") || "";
      return jsonResponse(res, { path: p, valid: isValidPath(p), leaf: isLeafPath(p) });
    }
    if (method === "GET" && path.startsWith("/api/taxonomy/")) {
      const p = decodeURIComponent(path.replace("/api/taxonomy/", ""));
      if (!isValidPath(p)) return jsonResponse(res, { error: "路径不存在" }, 404);
      return jsonResponse(res, {
        path: p,
        labels: getPathLabels(p),
        constraints: mergeConstraintsByPath(p),
        skills: listAvailableSkills(p),
      });
    }

    // 技能查询（按分类路径）
    if (method === "GET" && path === "/api/skills") {
      const parent = url.searchParams.get("parent") || "";
      return jsonResponse(res, listSkills(parent));
    }
    if (method === "GET" && path.startsWith("/api/skills/")) {
      const rawId = path.replace("/api/skills/", "");
      const p = decodeURIComponent(rawId);
      console.log(`[skills/:path] raw=${rawId} → decoded=${p}`);

      // 诊断：检查文件是否存在
      const fsPath = join(ROOT, "skills", ...p.split("/").filter(Boolean));
      const sf = join(fsPath, "SKILL.md");
      console.log(`[skills/:path] fsPath=${fsPath}  skillFile=${sf}  exists=${existsSync(sf)}`);

      const skill = loadSkillByPath(p);
      if (!skill) {
        console.error(`[skills/:path] ❌ loadSkillByPath 返回 null，路径: ${p}`);
        return jsonResponse(res, { error: `技能不存在: ${p}` }, 404);
      }
      return jsonResponse(res, {
        id: skill.id,
        path: skill.path,
        label: skill.label,
        description: skill.description,
        inputs: skill.inputs,
        meta: skill.meta,
        body: skill.body,
        constraints: skill.constraints,
      });
    }

    // 风格列表
    if (method === "GET" && path === "/api/designs") {
      return jsonResponse(res, listDesigns().map(d => ({ id: d.id, label: d.label, description: d.description })));
    }

    // ── 管理 API ──────────────────────────────
    if (method === "POST" && path === "/api/taxonomy") {
      const body = await parseBody(req);
      const result = createCategory(body.path, body.label);
      if (result.error) return jsonResponse(res, result, 400);
      return jsonResponse(res, result);
    }
    if (method === "DELETE" && path.startsWith("/api/taxonomy/")) {
      const p = decodeURIComponent(path.replace("/api/taxonomy/", ""));
      const result = deleteCategory(p);
      if (result.error) return jsonResponse(res, result, 400);
      return jsonResponse(res, result);
    }
    if (method === "POST" && path === "/api/skills") {
      const body = await parseBody(req);
      const result = saveSkill(body.path, body);
      if (result.error) return jsonResponse(res, result, 400);
      return jsonResponse(res, result);
    }
    if (method === "PUT" && path.startsWith("/api/skills/")) {
      const p = decodeURIComponent(path.replace("/api/skills/", ""));
      const body = await parseBody(req);
      const result = saveSkill(p, body);
      if (result.error) return jsonResponse(res, result, 400);
      return jsonResponse(res, result);
    }
    if (method === "DELETE" && path.startsWith("/api/skills/")) {
      const p = decodeURIComponent(path.replace("/api/skills/", ""));
      const result = deleteSkill(p);
      if (result.error) return jsonResponse(res, result, 400);
      return jsonResponse(res, result);
    }

    if (method === "POST" && path === "/api/fetch-url") {
      const body = await parseBody(req);
      if (!body.url) throw new Error("缺少 url 参数");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const res2 = await fetch(body.url, { signal: controller.signal });
        const text = await res2.text();
        clearTimeout(timeout);
        const maxLen = body.max_length || 50000;
        return jsonResponse(res, { url: body.url, content: text.slice(0, maxLen), length: Math.min(text.length, maxLen), truncated: text.length > maxLen });
      } catch (e) {
        clearTimeout(timeout);
        throw new Error(`URL 抓取失败: ${e.message}`);
      }
    }

    if (method === "POST" && path === "/api/generate") {
      const body = await parseBody(req);
      const result = await handleGenerate(body);
      // 自动保存到历史
      try {
        const { saveHistory } = await import("../modules/persist/store.js");
        result.history_id = saveHistory({
          skill: body.skill,
          design: body.design,
          prompt: body.prompt,
          output: result.output || result.content || "",
          evaluation: result.evaluation || {},
          mode: "ollama",
          model: DEFAULT_MODEL,
          elapsed: result.elapsed || "0",
        });
      } catch {}
      return jsonResponse(res, result);
    }

    // AI 自动补全表单字段
    if (method === "POST" && path === "/api/enrich") {
      const body = await parseBody(req);
      const { skill: skillPath, user_idea, mode = 'claude', config = {} } = body;
      if (!skillPath || !user_idea) throw new Error("缺少 skill 或 user_idea 参数");
      const result = await enrichFields(skillPath, user_idea, mode, config);
      return jsonResponse(res, result);
    }

    // ── 历史记录 ──
    if (method === "GET" && path === "/api/history") {
      const { listHistory, getHistory } = await import("../modules/persist/store.js");
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const id = urlObj.searchParams.get("id");
      if (id) {
        const entry = getHistory(id);
        if (!entry) return jsonResponse(res, { error: "记录不存在" }, 404);
        return jsonResponse(res, entry);
      }
      const entries = listHistory(parseInt(urlObj.searchParams.get("limit") || "50"));
      return jsonResponse(res, entries);
    }
    if (method === "DELETE" && path === "/api/history") {
      const { listHistory, getHistory } = await import("../modules/persist/store.js");
      const body = await parseBody(req);
      if (!body.id) return jsonResponse(res, { error: "缺少 id 参数" }, 400);
      const { rmSync, existsSync } = await import("fs");
      const { join } = await import("path");
      const { dirname } = await import("path");
      import("url").then(async ({ fileURLToPath }) => {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const historyPath = join(__dirname, "..", ".content-studio", "history", `${body.id}.json`);
        if (existsSync(historyPath)) rmSync(historyPath);
      });
      return jsonResponse(res, { deleted: body.id });
    }

    if (method === "POST" && path === "/api/evaluate") {
      const body = await parseBody(req);
      if (!body.skill || !body.content) throw new Error("缺少 skill 或 content 参数");
      const skill = loadSkillByPath(body.skill);
      if (!skill) throw new Error(`技能 "${body.skill}" 不存在`);
      return jsonResponse(res, evaluateOutput(body.content, skill.meta, skill.constraints));
    }

    // Obsidian Vault 路由
    if (method === "GET" && path === "/api/vault") {
      return jsonResponse(res, vault.getVaultStatus());
    }
    if (method === "POST" && path === "/api/vault/config") {
      const body = await parseBody(req);
      try { vault.setVaultPath(body.path || ""); return jsonResponse(res, vault.getVaultStatus()); }
      catch (e) { return jsonResponse(res, { error: e.message }, 400); }
    }
    if (method === "GET" && path === "/api/vault/notes") {
      return jsonResponse(res, vault.listNotes());
    }
    if (method === "POST" && path === "/api/vault/read") {
      const body = await parseBody(req);
      if (!body.path) throw new Error("缺少 path 参数");
      return jsonResponse(res, vault.readNote(body.path));
    }
    if (method === "POST" && path === "/api/vault/write") {
      const body = await parseBody(req);
      if (!body.path || !body.content) throw new Error("缺少 path 或 content 参数");
      return jsonResponse(res, vault.writeNote(body.path, body.content, body.frontmatter || {}));
    }

    // 静态文件
    serveStatic(req, res);
  } catch (err) {
    console.error("❌", err.message);
    jsonResponse(res, { error: err.message }, 500);
  }
});

server.listen(PORT, HOST, () => {
  const vs = vault.getVaultStatus();
  const totalSkills = listAvailableSkills("").length;
  console.log(`\n  🖥  Content Studio（层级版）已启动`);
  console.log(`  ─────────────────────────────`);
  console.log(`  🌐  UI:   http://${HOST}:${PORT}`);
  console.log(`  📡  Tax:  http://${HOST}:${PORT}/api/taxonomy`);
  console.log(`  🖥️  Local CLI:  自动检测 Claude Code / Cursor / Codex / Gemini`);
  console.log(`  🦙  Ollama:     http://localhost:11434/api/generate`);
  console.log(`  ☁️  API:       兼容 OpenAI 接口`);
  console.log(`  📦  技能: ${totalSkills}+ | Vault: ${vs.connected ? `✅ ${vs.noteCount}篇笔记` : '未连接'}\n`);
});
