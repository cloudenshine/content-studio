/**
 * content-studio — Obsidian Templater 集成脚本
 *
 * 功能：选中需求文本 → 选择技能/风格 → 发送到 content-studio API → 回填结果
 *
 * 安装：
 *   1. 安装 Obsidian 社区插件 Templater (https://github.com/SilentVoid13/Templater)
 *   2. 将此文件放在 Templater 的 script 文件夹中
 *   3. 绑定快捷键或添加为模板命令
 *
 * 用法：
 *   1. 在笔记中写下创作需求并选中
 *   2. 运行此脚本（快捷键/命令面板）
 *   3. 在弹出的对话框中选择技能和风格
 *   4. 生成结果自动插入到光标位置
 *
 * 环境变量（在系统环境或 .env 中设置）：
 *   CONTENT_STUDIO_URL — 默认为 http://localhost:3456
 *
 * ⚠️ 此文件在 Obsidian 的 Templater 插件内运行，不是标准 Node.js
 *    Templater API: https://silentvoid13.github.io/Templater/
 */

async function contentStudio(tp) {
  // ── 配置 ─────────────────────────────────
  const BASE_URL = tp.system.env?.CONTENT_STUDIO_URL || "http://localhost:3456";
  const TIMEOUT_MS = 180000; // 3 分钟

  // ── 工具：HTTP 请求 ─────────────────────
  async function apiPost(path, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function apiGet(path) {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  }

  // ── 步骤1：检查服务是否运行 ─────────────
  let skills, designs;
  try {
    const health = await apiGet("/api");
    if (health.status !== "ok") throw new Error("服务状态异常");
    [skills, designs] = await Promise.all([
      apiGet("/api/skills"),
      apiGet("/api/designs"),
    ]);
  } catch (e) {
    new Notice(`❌ content-studio 未运行 (${e.message})`);
    throw e;
  }

  if (!skills || skills.length === 0) {
    new Notice("❌ 未找到任何技能，请先创建 SKILL.md");
    return;
  }

  // ── 步骤2：获取选中文本 ─────────────────
  const selection = tp.file.selection();
  let demandText = (selection || "").trim();

  // 如果未选中文本，弹出输入框
  if (!demandText) {
    demandText = await tp.system.prompt("✏️ 输入创作需求（或先在笔记中选中文本）");
    if (!demandText) {
      new Notice("已取消");
      return;
    }
  }

  // ── 步骤3：选择技能 ─────────────────────
  const skillNames = skills.map(s => s.label);
  const skillChoice = await tp.system.suggester(
    (item) => item,
    skillNames,
    true,
    "📦 选择写作技能"
  );
  if (!skillChoice) { new Notice("已取消"); return; }
  const selectedSkill = skills[skillNames.indexOf(skillChoice)];

  // ── 步骤4：选择风格（可选）───────────────
  let selectedDesign = null;
  if (designs && designs.length > 0) {
    const designNames = ["（不使用风格包）", ...designs.map(d => d.label)];
    const designChoice = await tp.system.suggester(
      (item) => item,
      designNames,
      true,
      "🎨 选择风格包（可选）"
    );
    if (designChoice && designChoice !== "（不使用风格包）") {
      selectedDesign = designs[designNames.indexOf(designChoice) - 1];
    }
  }

  // ── 步骤5：填写技能专属字段 ─────────────
  const inputs = {};
  for (const field of (selectedSkill.inputs || [])) {
    const hint = field.hint ? ` (${field.hint})` : "";
    const required = field.required ? " *" : "";
    const val = await tp.system.prompt(
      `${field.label || field.name}${required}${hint}`,
      field.default?.toString() || ""
    );
    if (val !== null) inputs[field.name] = val;
  }

  // ── 步骤6：需求澄清（简短版）─────────────
  const targetAudience = await tp.system.prompt("📍 目标受众（谁，在什么场景下读？）", "", "");
  if (targetAudience) inputs.target_audience = targetAudience;

  // ── 进度通知 ─────────────────────────
  const progressNotice = new Notice(`⏳ 正在生成${selectedSkill.label}... 这可能耗时 30-60 秒`, 0);

  // ── 步骤7：调用生成 API ─────────────────
  let result;
  try {
    result = await apiPost("/api/generate", {
      skill: selectedSkill.id,
      designs: selectedDesign ? [{ id: selectedDesign.id, strength: 100 }] : [],
      inputs: {
        ...inputs,
        // 如果技能 inputs 里已有 prompt 字段，不再重复
        prompt: selectedSkill.inputs?.some(f => f.name === "prompt") ? undefined : demandText,
      },
    });
  } catch (e) {
    progressNotice.hide();
    new Notice(`❌ 生成失败: ${e.message}`);
    throw e;
  }

  // ── 步骤8：插入结果到笔记 ───────────────
  progressNotice.hide();

  // 构建结果模板
  const scoreEmoji = result.evaluation.overall >= 8 ? "🟢" : result.evaluation.overall >= 6 ? "🟡" : "🔴";
  const p0Status = result.evaluation.all_P0_passed ? "✅" : "❌";
  const p1Status = result.evaluation.all_P1_passed ? "✅" : "❌";

  const output = [
    "",
    "---",
    `> **content-studio 生成结果**`,
    `> 📦 ${selectedSkill.label} ${selectedDesign ? `· 🎨 ${selectedDesign.label}` : ""}`,
    `> ${scoreEmoji} 评分 ${result.evaluation.overall.toFixed(1)}/10 · P0 ${p0Status} P1 ${p1Status} · ${result.stats.chars} 字 · ${result.stats.elapsed_seconds}s`,
    `> 📝 ${demandText.slice(0, 100)}${demandText.length > 100 ? "..." : ""}`,
    ">",
    `> **评分明细**`,
    ...Object.entries(result.evaluation.scores).map(([dim, score]) =>
      `> ${dimLabel(dim)}: ${"★".repeat(Math.round(score / 2))}${"☆".repeat(5 - Math.round(score / 2))} ${score}/10`
    ),
    "---",
    "",
    result.content,
    "",
    "---",
  ].join("\n");

  // 在光标位置插入
  await tp.file.cursor_append(output);

  new Notice(`✅ ${selectedSkill.label} 生成完成 (${result.stats.chars}字, ${result.evaluation.overall.toFixed(1)}分)`);
}

// 中文字段映射
function dimLabel(dim) {
  const map = {
    logical_consistency: "逻辑一致性",
    audience_resonance: "受众共鸣度",
    structural_integrity: "结构完整性",
    language_quality: "语言质量",
    originality: "原创性",
  };
  return map[dim] || dim;
}

module.exports = contentStudio;
