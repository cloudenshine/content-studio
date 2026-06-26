#!/usr/bin/env node
/**
 * content-studio cli.mjs
 *
 * 第 2 步 — 使用 src/registry.js 作为后端
 *
 * 用法:
 *   node cli.mjs --prompt "一个少年在废土上捡到一块能说话的怀表"
 *   node cli.mjs --skill product-copy --design xiaohongshu --prompt "..."
 *   node cli.mjs --mode byok --api-key sk-xxx --prompt "..."
 *   node cli.mjs --list-skills
 *   node cli.mjs --list-designs
 */
import { listSkills, listDesigns, getSkill, getDesign, loadCraftRules, assemblePrompt, evaluateOutput } from "./src/registry.js";
import { spawn } from "node:child_process";
import { saveHistory, listHistory, getHistory } from "./modules/persist/store.js";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const DEFAULT_MODEL = "qwen2.5:7b";

/* ═══════════════════════════════════════════════════════════════
   CLI 参数解析
   ═══════════════════════════════════════════════════════════════ */
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { skill: "novel-chapter", design: "web-novel-cool", prompt: "", mode: "ollama", model: DEFAULT_MODEL, apiKey: "", listSkills: false, listDesigns: false, listHistory: false, readHistory: "", designs: null };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--skill": opts.skill = args[++i]; break;
      case "--design": {
        const raw = args[++i];
        // support: --design id:70,id2:30  or  --design single-id
        if (raw.includes(',')) {
          opts.designs = raw.split(',').map(pair => {
            const [id, str] = pair.split(':');
            return { id, strength: str ? parseInt(str) : 100 };
          });
          opts.design = opts.designs[0].id;
        } else if (raw.includes(':')) {
          const [id, str] = raw.split(':');
          opts.designs = [{ id, strength: parseInt(str) }];
          opts.design = id;
        } else {
          opts.design = raw;
          opts.designs = [{ id: raw, strength: 100 }];
        }
        break;
      }
      case "--prompt": opts.prompt = args[++i]; break;
      case "--mode": opts.mode = args[++i]; break;
      case "--model": opts.model = args[++i]; break;
      case "--api-key": opts.apiKey = args[++i]; break;
      case "--list-skills": opts.listSkills = true; break;
      case "--list-designs": opts.listDesigns = true; break;
      case "--history": opts.listHistory = true; break;
      case "--read-history": opts.readHistory = args[++i]; break;
      default: console.error(`未知参数: ${args[i]}`); process.exit(1);
    }
  }
  return opts;
}

/* ═══════════════════════════════════════════════════════════════
   LLM 适配器 — Ollama 模式
   ═══════════════════════════════════════════════════════════════ */
async function callOllama(prompt, model) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      prompt: prompt,
      stream: false,
      options: { temperature: 0.8, top_p: 0.9, max_tokens: 8192 }
    })
  });
  if (!res.ok) throw new Error(`Ollama 请求失败 (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.response;
}

/* ═══════════════════════════════════════════════════════════════
   LLM 适配器 — BYOK 模式
   ═══════════════════════════════════════════════════════════════ */
async function callByok(prompt, apiKey, model) {
  const parts = prompt.split("\n# 用户需求\n");
  const systemPrompt = parts[0];
  const userPrompt = parts[1] || prompt;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 8192,
    })
  });
  if (!res.ok) throw new Error(`API 请求失败 (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

/* ═══════════════════════════════════════════════════════════════
   LLM 适配器 — CLI 模式
   ═══════════════════════════════════════════════════════════════ */
function callCli(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn("claude", ["-p", prompt], { stdio: ["ignore", "pipe", "pipe"], timeout: 120000 });
    let output = "";
    proc.stdout.on("data", chunk => { output += chunk.toString(); });
    proc.on("close", code => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(`CLI 退出码 ${code}`));
    });
    proc.on("error", reject);
  });
}

/* ═══════════════════════════════════════════════════════════════
   ── 启动 ──
   ═══════════════════════════════════════════════════════════════ */
async function main() {
  const opts = parseArgs();

  if (opts.listSkills) {
    const skills = listSkills();
    console.log(`\n可用技能 (${skills.length}):\n`);
    skills.forEach(s => console.log(`  ${s.id.padEnd(20)} ${s.label} — ${s.description}`));
    return;
  }
  if (opts.listDesigns) {
    const designs = listDesigns();
    console.log(`\n可用风格包 (${designs.length}):\n`);
    designs.forEach(d => console.log(`  ${d.id.padEnd(20)} ${d.label} — ${d.description}`));
    return;
  }
  if (opts.listHistory) {
    const entries = listHistory(20);
    if (entries.length === 0) { console.log("\n暂无历史记录。\n"); return; }
    console.log(`\n历史记录 (最近 ${entries.length} 条):\n`);
    for (const e of entries) {
      const date = e.timestamp.slice(0, 19).replace("T", " ");
      console.log(`  ${e.id.slice(0, 30).padEnd(32)} ${date}  技能:${e.skill}  风格:${e.design}  ${e.output_len}字  评分:${e.overall?.toFixed(1)||"?"}`);
    }
    console.log("\n查看详情: node cli.mjs --read-history <id>\n");
    return;
  }
  if (opts.readHistory) {
    const entry = getHistory(opts.readHistory);
    if (!entry) { console.error(`❌ 历史记录 "${opts.readHistory}" 不存在`); process.exit(1); }
    console.log(`\n📋 ${entry.timestamp.slice(0,19).replace("T"," ")}  技能:${entry.skill}  风格:${entry.design}\n`);
    console.log(entry.output);
    return;
  }

  if (!opts.prompt) {
    console.error("❌ 请提供 --prompt 参数");
    console.log("\n用法: node cli.mjs --prompt \"你的创作需求\"");
    console.log("可选: --skill <技能名> --design <风格名> --mode ollama|byok|cli");
    console.log("      --history            列出最近的历史记录");
    console.log("      --read-history <id>  查看历史记录详情");
    process.exit(1);
  }

  console.error(`\n📦 技能: ${opts.skill}`);
  console.error(`🎨 风格: ${opts.design}`);
  console.error(`⚙️  模式: ${opts.mode}`);
  console.error(`📝 提示: ${opts.prompt.slice(0, 60)}...\n`);

  // 从注册表加载
  const skill = getSkill(opts.skill);
  if (!skill) { console.error(`❌ 技能 "${opts.skill}" 不存在`); process.exit(1); }
  const design = getDesign(opts.design);
  if (!design) { console.error(`❌ 风格 "${opts.design}" 不存在`); process.exit(1); }
  const craftRules = loadCraftRules(skill.meta.craft?.requires, skill.constraints);

  console.error(`📖 已加载: SKILL.md (${skill.body.length}B) + DESIGN.md (${design.body.length}B) + ${craftRules.length} craft 规则\n`);

  // 组装 prompt
  const fullPrompt = assemblePrompt(skill, opts.designs || [{ id: opts.design, strength: 100 }], craftRules, opts.prompt);

  console.error("⏳ 正在生成...\n");

  // 调 LLM
  let output;
  const start = Date.now();
  try {
    switch (opts.mode) {
      case "ollama": output = await callOllama(fullPrompt, opts.model); break;
      case "byok":
        if (!opts.apiKey) { console.error("❌ BYOK 模式需要 --api-key"); process.exit(1); }
        output = await callByok(fullPrompt, opts.apiKey, opts.model);
        break;
      case "cli": output = await callCli(fullPrompt); break;
      default: console.error(`❌ 未知模式: ${opts.mode}`); process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ 生成失败: ${err.message}`);
    if (opts.mode === "ollama" && err.message.includes("fetch")) {
      console.error("\n💡 Ollama 未运行？请执行:\n   ollama serve\n   ollama pull qwen2.5:7b");
    }
    process.exit(1);
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.error(`✅ 生成完成 (${elapsed}s, ${output.length} 字符)\n`);

  // 自评
  const evaluation = evaluateOutput(output, skill.meta, skill.constraints);
  console.error("── 自评 ──────────────────────────────");
  for (const [dim, score] of Object.entries(evaluation.scores)) {
    console.error(`  ${dim.padEnd(25)} ${"★".repeat(Math.round(score / 2))}${"☆".repeat(5 - Math.round(score / 2))} ${score}/10`);
  }
  console.error(`  ${"overall".padEnd(25)} ${evaluation.overall.toFixed(1)}/10`);
  console.error(`\n  硬检查: P0 ${evaluation.all_P0_passed ? "✅ 通过" : "❌ 未通过"}  P1 ${evaluation.all_P1_passed ? "✅ 通过" : "❌ 未通过"}`);
  console.error("────────────────────────────────────\n");

  // 输出正文
  console.log(output);

  // 自动保存到历史
  try {
    const historyId = saveHistory({
      skill: opts.skill,
      design: opts.design,
      prompt: opts.prompt,
      output,
      evaluation,
      mode: opts.mode,
      model: opts.model,
      elapsed,
    });
    console.error(`\n💾 已保存历史: ${historyId}`);
  } catch (err) {
    console.error(`\n⚠️  历史保存失败: ${err.message}`);
  }
}

main().catch(err => {
  console.error("❌ 运行时错误:", err.message);
  process.exit(1);
});
