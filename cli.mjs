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
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { saveHistory, listHistory, getHistory } from "./modules/persist/store.js";
import { retrieve } from "./lib/core/rag.js";
import { buildJudgePrompt } from "./lib/core/llm-judge.js";
import { formatMemoryNotes, formatRevisionInstruction, extractKnownProblems, formatKnownProblemsSection } from "./lib/core/memory.js";
import { listSkillPaths } from "./lib/constraint-engine.js";
import { getExample, listExamples } from "./src/example-registry.js";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const DEFAULT_MODEL = "qwen2.5:7b";

/* ═══════════════════════════════════════════════════════════════
   CLI 参数解析
   ═══════════════════════════════════════════════════════════════ */
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { skill: "文学创作/小说/短篇小说", design: "web-novel-cool", prompt: "", mode: "ollama", model: DEFAULT_MODEL, apiKey: "", listSkills: false, listDesigns: false, listExamples: false, readExample: "", listHistory: false, readHistory: "", designs: null, vaultOut: "", vaultDir: "_content-studio", project: "", ragDir: "", ragTopK: 3, useJudge: false, memoryPath: "", autoRevise: false, maxRevisions: 3 };
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
      case "--list-examples": opts.listExamples = true; break;
      case "--read-example": opts.readExample = args[++i]; break;
      case "--history": opts.listHistory = true; break;
      case "--read-history": opts.readHistory = args[++i]; break;
      case "--vault-out": opts.vaultOut = args[++i]; break;
      case "--vault-dir": opts.vaultDir = args[++i]; break;
      case "--project": opts.project = args[++i]; break;
      case "--rag-dir": opts.ragDir = args[++i]; break;
      case "--rag-top-k": opts.ragTopK = parseInt(args[++i]) || 3; break;
      case "--judge": opts.useJudge = true; break;
      case "--memory": opts.memoryPath = args[++i]; break;
      case "--auto-revise": opts.autoRevise = true; break;
      case "--max-revisions": opts.maxRevisions = parseInt(args[++i]) || 3; break;
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
    const skills = listSkillPaths().map(getSkill).filter(Boolean);
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
  if (opts.listExamples) {
    const examples = listExamples();
    console.log(`\n通过实例 (${examples.length}):\n`);
    examples.forEach(item => console.log(`  ${item.id.padEnd(7)} ${item.skill} — ${item.summary}`));
    return;
  }
  if (opts.readExample) {
    const example = getExample(opts.readExample);
    if (!example) { console.error(`❌ 实例 "${opts.readExample}" 不存在`); process.exit(1); }
    console.log(`# ${example.id} · ${example.label}\n`);
    console.log(example.output_content.trim());
    console.log(`\n---\n验收：${example.review_data.verdict} · 返工等级 ${example.review_data.rework}`);
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
    console.log("      --list-examples      列出25类通过实例");
    console.log("      --read-example <id>  读取实例正文与验收摘要");
    console.log("      --read-history <id>  查看历史记录详情");
    console.log("      --vault-out <路径>    额外写入 Obsidian vault 目录");
    console.log("      --vault-dir <名>      vault 子目录名（默认 _content-studio）");
    console.log("      --project <名>        项目名称，自动维护 MOC 索引");
    console.log("      --rag-dir <路径>      知识库目录，基于 vault 笔记做 RAG 检索");
    console.log("      --rag-top-k <n>       RAG 检索条数（默认 3）");
    console.log("      --judge              使用 LLM-as-judge 替代启发式评分");
    console.log("      --memory <路径/文件>   用户偏好笔记（.md 文件或目录）");
    console.log("      --auto-revise          P0 未通过时自动修订（最多 3 轮）");
    console.log("      --max-revisions <n>    最大修订轮数（默认 3）");
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

  // 组装 prompt（预加载 design 对象）
  const loadedDesigns = (opts.designs || [{ id: opts.design, strength: 100 }]).map(d => ({
    ...d,
    design: getDesign(d.id) || design,
  }));
  let fullPrompt = assemblePrompt(skill, loadedDesigns, craftRules, opts.prompt);

  // ── RAG 上下文注入 ──
  let ragContext = "";
  if (opts.ragDir) {
    console.error("📚 正在检索 RAG 参考内容...");
    try {
      const docs = loadRagDocs(opts.ragDir);
      if (docs.length > 0) {
        const results = retrieve(docs, opts.prompt, opts.ragTopK);
        if (results.length > 0) {
          ragContext = results.map(r =>
            `> **参考: ${r.path}** (相关度: ${(r.score * 100).toFixed(0)}%)\n> ${r.content.slice(0, 500).replace(/\n/g, "\n> ")}`
          ).join("\n\n");
          // 注入到 prompt 的"用户需求"之前
          const userReqIdx = fullPrompt.lastIndexOf("# 用户需求");
          if (userReqIdx >= 0) {
            fullPrompt = fullPrompt.slice(0, userReqIdx) +
              "# 参考资料\n\n以下内容来自你的知识库，请在创作中参考但不直接复制：\n\n" + ragContext + "\n\n" +
              fullPrompt.slice(userReqIdx);
          }
          console.error(`✅ 已注入 ${results.length} 条参考内容`);
        } else {
          console.error("⚠️  未找到相关参考内容");
        }
      }
    } catch (err) {
      console.error(`⚠️  RAG 检索失败: ${err.message}`);
    }
  }

  // ── 用户偏好记忆注入 ──
  if (opts.memoryPath) {
    try {
      const stat = statSync(opts.memoryPath);
      const notes = [];
      if (stat.isDirectory()) {
        // 读取目录下所有 .md 文件
        const entries = readdirSync(opts.memoryPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && extname(entry.name) === ".md") {
            const content = readFileSync(join(opts.memoryPath, entry.name), "utf-8");
            notes.push({ label: entry.name.replace(/\.md$/, ""), content });
          }
        }
      } else if (stat.isFile() && extname(opts.memoryPath) === ".md") {
        notes.push({ label: opts.memoryPath.split(/[\\/]/).pop().replace(/\.md$/, ""), content: readFileSync(opts.memoryPath, "utf-8") });
      }
      const memoryBlock = formatMemoryNotes(notes);
      if (memoryBlock) {
        const userReqIdx = fullPrompt.lastIndexOf("# 用户需求");
        if (userReqIdx >= 0) {
          fullPrompt = fullPrompt.slice(0, userReqIdx) + memoryBlock + "\n" + fullPrompt.slice(userReqIdx);
        }
        console.error(`✅ 已加载 ${notes.length} 条偏好笔记`);
      }
    } catch (err) {
      console.error(`⚠️  记忆加载失败: ${err.message}`);
    }
  }

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

  // 自评：启发式默认，LLM-as-judge 可选
  let evaluation;
  if (opts.useJudge) {
    console.error("🧑‍⚖️ LLM-as-judge 评估中...");
    try {
      evaluation = await judgeWithLLM(output, skill, design, opts);
    } catch (err) {
      console.error(`⚠️  LLM judge 失败，回退到启发式: ${err.message}`);
      evaluation = evaluateOutput(output, skill.meta, skill.constraints);
    }
  } else {
    evaluation = evaluateOutput(output, skill.meta, skill.constraints);
  }

  displayEvaluation(evaluation);

  // ── 自动纠偏：P0 未过时自动修订 ──
  let revisionCount = 0;
  while (opts.autoRevise && !evaluation.all_P0_passed && revisionCount < opts.maxRevisions) {
    revisionCount++;
    const failedChecks = Object.entries(evaluation.hard_checks || {})
      .filter(([, passed]) => passed === false)
      .map(([check]) => check);
    console.error(`\n🔄 修订第 ${revisionCount} 轮 (P0 未通过: ${failedChecks.join(", ")})`);
    const reviseInstruction = formatRevisionInstruction(failedChecks);
    if (!reviseInstruction) break;

    // 在 prompt 中注入修订指令
    let revisePrompt = fullPrompt + "\n\n" + reviseInstruction;
    console.error(`⏳ 正在修订...`);

    try {
      switch (opts.mode) {
        case "ollama": output = await callOllama(revisePrompt, opts.model); break;
        case "byok": output = await callByok(revisePrompt, opts.apiKey, opts.model); break;
        case "cli": output = await callCli(revisePrompt); break;
      }
      // 重新评估
      if (opts.useJudge) {
        evaluation = await judgeWithLLM(output, skill, design, opts);
      } else {
        evaluation = evaluateOutput(output, skill.meta, skill.constraints);
      }
      displayEvaluation(evaluation);
    } catch (err) {
      console.error(`⚠️  修订失败: ${err.message}`);
      break;
    }
  }
  if (revisionCount > 0) {
    console.error(`\n📊 修订完成: ${revisionCount} 轮`);
  }

  // ── 经验总结：记录反复失败的问题 ──
  if (opts.autoRevise && !evaluation.all_P0_passed && opts.memoryPath) {
    try {
      const stillFailing = Object.entries(evaluation.hard_checks || {})
        .filter(([, passed]) => passed === false)
        .map(([check]) => check);
      const problems = extractKnownProblems(stillFailing);
      if (problems.length > 0 && existsSync(opts.memoryPath)) {
        const currentContent = readFileSync(opts.memoryPath, "utf-8");
        const knownSection = formatKnownProblemsSection(problems);
        // 如果已有"已知问题"区域则覆盖，否则追加
        const knownIdx = currentContent.indexOf("## 已知问题");
        const updatedContent = knownIdx >= 0
          ? currentContent.slice(0, knownIdx) + knownSection
          : currentContent.trimEnd() + knownSection;
        writeFileSync(opts.memoryPath, updatedContent, "utf-8");
        console.error(`📝 已记录 ${problems.length} 个已知问题到记忆笔记`);
      }
    } catch (err) {
      console.error(`⚠️  经验记录失败: ${err.message}`);
    }
  }

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

  // vault 持久化（可选）
  if (opts.vaultOut) {
    try {
      const vaultNotePath = writeToVault(output, evaluation, opts);
      console.error(`📝 已写入 vault: ${vaultNotePath}`);
    } catch (err) {
      console.error(`⚠️  vault 写入失败: ${err.message}`);
    }
  }
}

/* ── MOC 索引文件路径 ───────────────────────── */
function mocFilePath(vaultDir, project) {
  return join(vaultDir, `_MOC-${project}.md`);
}

/* ── 获取已有 MOC 内容 ──────────────────────── */
function readMocIfExists(filePath) {
  try { return { content: readFileSync(filePath, "utf-8"), exists: true }; }
  catch { return { content: "", exists: false }; }
}

/* ── 更新 MOC ────────────────────────────────── */
function writeMocEntry(vaultDir, opts, fileName) {
  if (!opts.project) return;
  const mocPath = mocFilePath(vaultDir, opts.project);
  const { content, exists } = readMocIfExists(mocPath);

  const link = `[[${opts.vaultDir}/${fileName.replace(/\.md$/, "")}]]`;
  const entryLine = `- ${new Date().toISOString().slice(0, 10)} ${link} — ${opts.skill} / ${opts.design}`;

  if (exists) {
    // 追加到已存在的 MOC
    writeFileSync(mocPath, content.trimEnd() + "\n" + entryLine + "\n", "utf-8");
  } else {
    // 创建新 MOC
    const header = `# 项目：${opts.project}\n\n> Content Studio 自动管理的项目索引\n\n## 内容清单\n\n${entryLine}\n`;
    writeFileSync(mocPath, header, "utf-8");
  }
  console.error(`📇 已更新项目 MOC: /${opts.vaultDir}/_MOC-${opts.project}.md`);
}

/* ── 写入 Obsidian Vault ─────────────────────── */
function writeToVault(output, evaluation, opts) {
  const vaultDir = join(opts.vaultOut, opts.vaultDir);
  if (!existsSync(vaultDir)) mkdirSync(vaultDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const skillId = opts.skill.replace(/[\\/]/g, "_");
  const fileName = `${ts}__${skillId}.md`;
  const filePath = join(vaultDir, fileName);

  let content = `---\nskill: ${opts.skill}\ndesign: ${opts.design}\ntimestamp: ${new Date().toISOString()}\n`;
  content += `word_count: ${output.length}\n`;
  if (evaluation) content += `overall_score: ${evaluation.overall?.toFixed(1) || "?"}\n`;
  content += `---\n\n${output}\n`;

  if (evaluation && evaluation.scores) {
    content += `\n---\n\n**✨ 自评**\n\n`;
    for (const [dim, score] of Object.entries(evaluation.scores)) {
      content += `- **${dim}**: ${"★".repeat(Math.min(Math.round(score / 2), 5))}${"☆".repeat(5 - Math.min(Math.round(score / 2), 5))} ${score}/10\n`;
    }
    content += `\n**总体**: ${evaluation.overall?.toFixed(1)}/10\n`;
    content += `**P0 检查**: ${evaluation.all_P0_passed ? "✅" : "❌"}\n`;
  }

  writeFileSync(filePath, content, "utf-8");

  // 项目 MOC
  if (opts.project) {
    const vDir = join(opts.vaultOut, opts.vaultDir);
    if (!existsSync(vDir)) mkdirSync(vDir, { recursive: true });
    writeMocEntry(vDir, opts, fileName);
  }

  return `/${opts.vaultDir}/${fileName}`;
}

/* ── 显示评估结果 ────────────────────────────── */
function displayEvaluation(evaluation) {
  console.error("── 自评 ──────────────────────────────");
  if (evaluation.scores) {
    for (const [dim, score] of Object.entries(evaluation.scores)) {
      console.error(`  ${dim.padEnd(25)} ${"★".repeat(Math.round(score / 2))}${"☆".repeat(5 - Math.round(score / 2))} ${score}/10`);
    }
  }
  if (evaluation.overall !== undefined) {
    console.error(`  ${"overall".padEnd(25)} ${evaluation.overall.toFixed(1)}/10`);
  }
  if (evaluation.all_P0_passed !== undefined) {
    console.error(`\n  硬检查: P0 ${evaluation.all_P0_passed ? "✅ 通过" : "❌ 未通过"}  P1 ${evaluation.all_P1_passed ? "✅ 通过" : "❌ 未通过"}`);
  }
  console.error("────────────────────────────────────\n");
}

/* ── LLM-as-Judge ───────────────────────────── */
async function judgeWithLLM(output, skill, design, opts) {
  const skillMeta = skill.meta || skill;
  const constraints = skill.constraints || null;
  const judgePrompt = buildJudgePrompt(output, skillMeta, constraints);
  let judgeResponse;

  switch (opts.mode) {
    case "ollama": {
      const res = await fetch(`${opts.ollamaUrl || "http://localhost:11434"}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: opts.model,
          prompt: judgePrompt,
          stream: false,
          options: { temperature: 0.3, max_tokens: 1024 },
        }),
      });
      if (!res.ok) throw new Error(`Ollama judge 失败: ${res.status}`);
      const data = await res.json();
      judgeResponse = data.response;
      break;
    }
    case "byok": {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${opts.apiKey}` },
        body: JSON.stringify({
          model: opts.model || "gpt-4o",
          messages: [
            { role: "system", content: "你是一个写作质量评估师。输出严格 JSON。" },
            { role: "user", content: judgePrompt },
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      });
      if (!res.ok) throw new Error(`API judge 失败: ${res.status}`);
      const data = await res.json();
      judgeResponse = data.choices[0].message.content;
      break;
    }
    default:
      throw new Error("LLM judge 仅支持 ollama 和 byok 模式");
  }

  try {
    const parsed = JSON.parse(judgeResponse.replace(/```json|```/g, "").trim());
    const scores = parsed.scores || {};
    const hardChecks = parsed.P0 || {};
    const scoreValues = Object.values(scores).filter(v => typeof v === "number");
    return {
      scores,
      overall: scoreValues.length > 0 ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length : 7.0,
      hard_checks: hardChecks,
      all_P0_passed: Object.values(hardChecks).every(v => v === true),
      all_P1_passed: true,
      all_P2_passed: true,
      word_count: output.length,
      ai_density: 0,
      burstiness: 0,
      style_shift: 0,
      judge: "llm",
    };
  } catch {
    const { evaluateOutput } = await import("./src/registry.js");
    return evaluateOutput(output, skillMeta, constraints);
  }
}

/* ── 加载 RAG 文档 ───────────────────────────── */
function loadRagDocs(dir) {
  const docs = [];
  function walk(currentDir) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        walk(fullPath);
      } else if (entry.isFile() && extname(entry.name) === ".md") {
        try {
          const content = readFileSync(fullPath, "utf-8");
          const body = content.replace(/^---[\s\S]*?---\n/, "").trim();
          if (body.length > 50) {
            docs.push({ path: fullPath, content: body });
          }
        } catch {}
      }
    }
  }
  walk(dir);
  return docs;
}

main().catch(err => {
  console.error("❌ 运行时错误:", err.message);
  process.exit(1);
});
