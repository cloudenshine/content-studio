/**
 * content-studio — 技能/风格注册表
 *
 * 扫描 skills/ 和 designs/ 目录，解析 YAML frontmatter，提供查询接口
 * 零依赖，纯 Node ESM
 */
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeConstraintsByPath } from "../lib/constraint-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/* ═══════════════════════════════════════════════════════════════
   YAML Frontmatter 解析器
   ═══════════════════════════════════════════════════════════════ */
export function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { meta: {}, body: text };
  const raw = match[1];
  const meta = {};
  const lines = raw.split("\n");
  let currentKey = null, currentParent = null, currentArray = null, inArray = false, arrayItemIndent = 0, currentObjItem = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const indentLevel = line.search(/\S/);

    // 如果正在处理数组中的对象项，收集其子键
    if (inArray && currentObjItem && indentLevel > arrayItemIndent + 1) {
      const kvMatch = trimmed.match(/^\s*(\w[\w_]*):\s*(.*)/);
      if (kvMatch) {
        const val = kvMatch[2].trim();
        let parsedVal = val;
        if (val === "true") parsedVal = true;
        else if (val === "false") parsedVal = false;
        else if (/^\d+$/.test(val)) parsedVal = parseInt(val, 10);
        else if (/^\d+\.\d+$/.test(val)) parsedVal = parseFloat(val);
        else if (val.startsWith("[") && val.endsWith("]")) {
          parsedVal = val.slice(1, -1).split(",").map(i => i.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
        } else parsedVal = val.replace(/^['"]|['"]$/g, "");
        currentObjItem[kvMatch[1]] = parsedVal;
        continue;
      }
      // 键值对不匹配则退出对象模式
      currentObjItem = null;
    }

    // 数组项
    const arrayMatch = trimmed.match(/^(\s*)- (.+)/);
    if (arrayMatch && inArray && currentArray) {
      const itemText = arrayMatch[2];
      // 检查下一行是否有更深入的键值对(对象项)
      const nextIdx = lines.indexOf(line);
      const nextLine = nextIdx < lines.length - 1 ? lines[nextIdx + 1] : "";
      const nextIndent = nextLine ? nextLine.search(/\S/) : 0;
      if (nextLine && nextIndent > indentLevel + 1) {
        // 解析对象项的第一个键值对
        const obj = {};
        const firstKv = itemText.match(/^(\w[\w_]*):\s*(.*)/);
        if (firstKv) {
          obj[firstKv[1]] = firstKv[2].trim().replace(/^['"]|['"]$/g, "");
        }
        currentObjItem = obj;
        arrayItemIndent = indentLevel;
        currentArray.push(obj);
        continue;
      }
      currentArray.push(itemText.replace(/^['"]|['"]$/g, ""));
      continue;
    }

    const kvMatch = trimmed.match(/^\s*(\w[\w_]*):\s*(.*)/);

    if (!kvMatch) { inArray = false; continue; }

    const key = kvMatch[1];
    let val = kvMatch[2].trim();

    // 缩进嵌套：当前行有缩进且存在父级
    if (indentLevel > 0 && currentParent) {
      if (typeof meta[currentParent] !== "object" || meta[currentParent] === null) {
        meta[currentParent] = {};
      }
    } else {
      currentParent = key;
    }

    if (val === "") {
      // 检查下一行是否是数组
      const idx = lines.indexOf(line);
      const rest = lines.slice(idx + 1);
      const nxt = rest.find(l => l.trim());
      if (nxt && nxt.trim().startsWith("- ")) {
        const target = indentLevel > 0 && currentParent
          ? (meta[currentParent][key] = [])
          : (meta[key] = []);
        currentArray = target;
        inArray = true;
        continue;
      }
      if (indentLevel > 0 && currentParent) meta[currentParent][key] = null;
      else meta[key] = null;
      inArray = false;
    } else if (val.startsWith("[") && val.endsWith("]")) {
      // 行内数组: [a, b, c]
      const items = val.slice(1, -1).split(",").map(i => i.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      if (indentLevel > 0 && currentParent) {
        if (!meta[currentParent]) meta[currentParent] = {};
        meta[currentParent][key] = items;
      } else {
        meta[key] = items;
      }
      inArray = false;
    } else if (val === "true") {
      if (indentLevel > 0 && currentParent) meta[currentParent][key] = true;
      else meta[key] = true;
      inArray = false;
    } else if (val === "false") {
      if (indentLevel > 0 && currentParent) meta[currentParent][key] = false;
      else meta[key] = false;
      inArray = false;
    } else if (/^\d+$/.test(val)) {
      if (indentLevel > 0 && currentParent) meta[currentParent][key] = parseInt(val, 10);
      else meta[key] = parseInt(val, 10);
      inArray = false;
    } else {
      if (indentLevel > 0 && currentParent) meta[currentParent][key] = val.replace(/^['"]|['"]$/g, "");
      else meta[key] = val.replace(/^['"]|['"]$/g, "");
      inArray = false;
    }
  }

  const body = text.slice(match[0].length);
  return { meta, body: body.trimStart() };
}

/* ═══════════════════════════════════════════════════════════════
   注册表：技能 — 支持嵌套分类路径
   ═══════════════════════════════════════════════════════════════ */

const CATEGORY_ICONS = {
  "文学创作": "📖", "小说": "📚", "剧本": "🎬", "诗歌": "🎭", "散文": "✍️", "儿童文学": "🧒",
  "商业写作": "💼", "产品文档": "📋", "汇报报告": "📊", "营销文案": "📢",
  "知识输出": "🎓", "课程脚本": "🎯", "深度分析": "🔍",
  "媒体社交": "📱", "新闻通讯": "📰", "社媒帖子": "💬",
  "学术专业": "🔬", "技术文档": "⚙️", "研究笔记": "📓", "论文": "📝",
};

export function listSkills(parentPath) {
  const basePath = parentPath
    ? join(ROOT, "skills", ...parentPath.split("/").filter(Boolean))
    : join(ROOT, "skills");
  if (!existsSync(basePath)) return [];
  // 检查 basePath 本身就是一个技能（有 SKILL.md）
  if (existsSync(join(basePath, "SKILL.md"))) {
    const { meta, body } = parseFrontmatter(readFileSync(join(basePath, "SKILL.md"), "utf-8"));
    return [{ id: parentPath, path: parentPath, label: meta.label || parentPath.split("/").pop(), description: meta.description || "", meta, body }];
  }
  return readdirSync(basePath)
    .filter(d => existsSync(join(basePath, d, "SKILL.md")))
    .map(d => {
      const { meta, body } = parseFrontmatter(readFileSync(join(basePath, d, "SKILL.md"), "utf-8"));
      const id = parentPath ? `${parentPath}/${d}` : d;
      return { id, path: id, label: meta.label || d, description: meta.description || "", meta, body };
    });
}

export function getSkill(id) {
  const path = join(ROOT, "skills", ...id.split("/").filter(Boolean));
  const skillFile = join(path, "SKILL.md");
  if (!existsSync(skillFile)) return null;
  const { meta, body } = parseFrontmatter(readFileSync(skillFile, "utf-8"));
  // 从 taxonomy.json 合并层级约束链（大类→中类→小类）
  let constraints = null;
  try { constraints = mergeConstraintsByPath(id); } catch {}
  return { id, path: id, label: meta.label || id.split("/").pop(), description: meta.description || "", meta, body, constraints };
}

export function listTaxonomy(parentPath) {
  const basePath = parentPath
    ? join(ROOT, "skills", ...parentPath.split("/").filter(Boolean))
    : join(ROOT, "skills");
  if (!existsSync(basePath)) return [];
  const entries = readdirSync(basePath, { withFileTypes: true }).filter(e => e.isDirectory());
  return entries.map(e => {
    const dirPath = join(basePath, e.name);
    const hasSkillFile = existsSync(join(dirPath, "SKILL.md"));
    const hasSubDirs = readdirSync(dirPath).some(f => {
      try { return existsSync(join(dirPath, f)) && !f.endsWith(".md"); }
      catch { return false; }
    });
    // Read label from SKILL.md if available
    let label = e.name;
    if (hasSkillFile) {
      try {
        const { meta } = parseFrontmatter(readFileSync(join(dirPath, "SKILL.md"), "utf-8"));
        if (meta.label) label = meta.label;
      } catch {}
    }
    return {
      id: e.name,
      label,
      icon: CATEGORY_ICONS[e.name] || "📄",
      hasChildren: hasSubDirs || (!hasSkillFile && e.name !== "SKILL.md"),
      hasSkill: hasSkillFile,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════
   管理 API：技能/分类 CRUD
   ═══════════════════════════════════════════════════════════════ */

function formatScalar(val) {
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (val === "") return "''";
  const str = String(val);
  if (/[:\-#\[\]]/.test(str) || /\s/.test(str)) return str.includes("'") ? `"${str}"` : `'${str}'`;
  return str;
}

function frontmatterStringify(meta) {
  const lines = [];
  function writeObj(obj, indent) {
    for (const [key, val] of Object.entries(obj)) {
      if (val === null || val === undefined) continue;
      const pad = " ".repeat(indent);
      if (Array.isArray(val)) {
        if (val.length === 0) { lines.push(`${pad}${key}: []`); continue; }
        // 检测是否是简单字符串数组
        if (typeof val[0] === "string") {
          lines.push(`${pad}${key}:`);
          for (const item of val) lines.push(`${pad}  - ${item.replace(/^['"]|['"]$/g, "")}`);
        } else if (typeof val[0] === "object") {
          lines.push(`${pad}${key}:`);
          for (const item of val) {
            // inline object syntax: - key: value
            const entries = Object.entries(item);
            if (entries.length > 0) {
              const [firstKey, firstVal] = entries[0];
              const firstLine = formatScalar(firstVal);
              lines.push(`${pad}  - ${firstKey}: ${firstLine}`);
              for (let i = 1; i < entries.length; i++) {
                const [k, v] = entries[i];
                if (v === null || v === undefined) continue;
                if (typeof v === "boolean") { lines.push(`${pad}    ${k}: ${v}`); }
                else if (Array.isArray(v)) {
                  if (v.length === 0) { lines.push(`${pad}    ${k}: []`); }
                  else {
                    lines.push(`${pad}    ${k}:`);
                    for (const item of v) lines.push(`${pad}      - ${item}`);
                  }
                }
                else if (typeof v === "number") { lines.push(`${pad}    ${k}: ${v}`); }
                else if (v === "") { lines.push(`${pad}    ${k}: ''`); }
                else { lines.push(`${pad}    ${k}: ${v}`); }
              }
            }
          }
        }
      } else if (typeof val === "object") {
        lines.push(`${pad}${key}:`);
        writeObj(val, indent + 2);
      } else if (typeof val === "boolean") {
        lines.push(`${pad}${key}: ${val}`);
      } else if (typeof val === "number") {
        lines.push(`${pad}${key}: ${val}`);
      } else {
        const str = String(val);
        if (/[:\-#\[\]]/.test(str) || /\s/.test(str) || str === "") {
          lines.push(`${pad}${key}: ${str.includes("'") ? `"${str}"` : `'${str}'`}`);
        } else {
          lines.push(`${pad}${key}: ${str}`);
        }
      }
    }
  }
  writeObj(meta, 0);
  return lines.join("\n");
}

export function saveSkill(skillPath, data) {
  const { label, description, body, inputs } = data;
  const dirPath = join(ROOT, "skills", ...skillPath.split("/").filter(Boolean));
  // 创建目录如不存在
  const parentDir = dirname(dirPath);
  if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

  // 构建 meta
  const meta = {
    name: skillPath.split("/").pop(),
    label: label || skillPath.split("/").pop(),
    description: description || "",
    mode: "content-generate",
    inputs: inputs.map(f => ({
      name: f.name,
      type: f.type || "text",
      required: f.required || false,
      label: f.label || f.name,
      hint: f.hint || "",
      ui: f.ui || (f.options && f.options.length > 0 ? "multiselect" : "text"),
      ...(f.options && f.options.length > 0 ? { options: f.options } : {}),
    })),
  };

  // 写入 SKILL.md
  const frontmatter = frontmatterStringify(meta);
  const content = `---\n${frontmatter}\n---\n\n${body || `# ${label}\n\n请输入技能正文内容。`}`;
  writeFileSync(join(dirPath, "SKILL.md"), content, "utf-8");
  return { id: skillPath, path: skillPath, label: meta.label, description: meta.description, inputs: meta.inputs };
}

export function deleteSkill(skillPath) {
  const dirPath = join(ROOT, "skills", ...skillPath.split("/").filter(Boolean));
  if (!existsSync(dirPath)) return { error: "技能不存在" };
  const skillFile = join(dirPath, "SKILL.md");
  if (!existsSync(skillFile)) return { error: "技能不存在" };
  // 只删除 SKILL.md，保留目录（可能是中间分类）
  rmSync(skillFile);
  // 如果目录已空则清理
  try {
    const remaining = readdirSync(dirPath);
    if (remaining.length === 0) rmSync(dirPath, { recursive: true });
  } catch {}
  return { deleted: skillPath };
}

export function createCategory(catPath, label) {
  const dirPath = join(ROOT, "skills", ...catPath.split("/").filter(Boolean));
  mkdirSync(dirPath, { recursive: true });
  return { created: catPath, label: label || catPath.split("/").pop() };
}

export function deleteCategory(catPath) {
  const dirPath = join(ROOT, "skills", ...catPath.split("/").filter(Boolean));
  if (!existsSync(dirPath)) return { error: "分类不存在" };
  // 只删除空目录
  const remaining = readdirSync(dirPath);
  if (remaining.length > 0) return { error: "分类不为空，请先删除子技能或子分类" };
  rmSync(dirPath, { recursive: true });
  return { deleted: catPath };
}

/* ═══════════════════════════════════════════════════════════════
   注册表：风格
   ═══════════════════════════════════════════════════════════════ */
export function listDesigns() {
  const dir = join(ROOT, "designs");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(d => existsSync(join(dir, d, "DESIGN.md")))
    .map(d => {
      const { meta, body } = parseFrontmatter(readFileSync(join(dir, d, "DESIGN.md"), "utf-8"));
      return { id: d, label: meta.label || d, description: meta.description || "", meta, body };
    });
}

export function getDesign(id) {
  const path = join(ROOT, "designs", id, "DESIGN.md");
  if (!existsSync(path)) return null;
  const { meta, body } = parseFrontmatter(readFileSync(path, "utf-8"));
  return { id, label: meta.label || id, description: meta.description || "", meta, body };
}

/* ═══════════════════════════════════════════════════════════════
   工艺规则加载
   ═══════════════════════════════════════════════════════════════ */
export function loadCraftRules(required, constraints) {
  if (!required && !constraints?.allowed_craft) return [];
  const craftDir = join(ROOT, "craft");
  // 合并 SKILL.md 的 craft.requires + taxonomy 的 allowed_craft
  const names = new Set([
    ...(required || []),
    ...(constraints?.allowed_craft || []),
  ]);
  return [...names].map(name => {
    const path = join(craftDir, `${name}.md`);
    if (existsSync(path)) return { name, content: readFileSync(path, "utf-8") };
    return null;
  }).filter(Boolean);
}

/* ═══════════════════════════════════════════════════════════════
   提示组装器
   ═══════════════════════════════════════════════════════════════ */
export function assemblePrompt(skill, designs, craftRules, userPrompt) {
  const parts = [];

  parts.push("# 角色与任务\n");
  parts.push(`你是根据"${skill.meta.label || skill.meta.name}"技能模板工作的写作专家。`);
  if (skill.meta.description) parts.push(`\n${skill.meta.description}`);
  parts.push("");

  // ── taxonomy 约束注入（如果存在） ────
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

  // 多风格混合：按 strength 语义分层
  if (designs && designs.length > 0) {
    // 按 strength 从高到低排序
    const sorted = designs
      .map(d => ({ ...d, design: typeof d === "string" ? getDesign(d) : getDesign(d.id) }))
      .filter(d => d.design && d.design.body && (d.strength ?? 100) > 0)
      .sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));

    if (sorted.length > 0) {
      parts.push("# 语言风格与规则 — 混合策略\n");
      parts.push("本内容需要融合以下风格：\n");

      if (sorted.length === 1) {
        // 单一风格
        const d = sorted[0];
        parts.push(`单一风格: ${d.design.meta.label || d.id}`);
        if (d.strength < 100) parts.push(`（按 ${d.strength}% 强度应用）`);
        parts.push("");
        parts.push(d.design.body);
      } else {
        // 多风格 — 生成混合策略
        const primary = sorted[0];
        const secondary = sorted.slice(1);

        parts.push(`- **主要风格**：${primary.design.meta.label || primary.id} — 主导内容的主体结构、叙事骨架和基本节奏\n`);
        parts.push(`- **辅助风格**：`);
        parts.push(secondary.map(s => `${s.design.meta.label || s.id}（影响 ${s.strength}% 的区域）`).join("、"));
        parts.push(" — 在特定部分注入其特征\n");

        // 生成混合指令
        parts.push("### 混合策略\n");
        parts.push("1. **主体结构**：主要风格的规则覆盖全文骨架");
        if (secondary.length >= 1) {
          const s = secondary[0];
          parts.push(`2. **开头/钩子**：参考 ${s.design.meta.label || s.id} 的风格特征`);
        }
        if (secondary.length >= 2) {
          const s = secondary[1];
          parts.push(`3. **结尾/互动**：参考 ${s.design.meta.label || s.id} 的风格特征`);
        }
        parts.push("4. **冲突时**：以主要风格为准，辅风格只影响对应区域");
        parts.push("");

        // 完整注入各风格规则
        parts.push("### 各风格详细规则\n");
        for (const d of sorted) {
          parts.push(`---\n【${d.design.meta.label || d.id}】—— ${d === primary ? "主要" : `辅助 (${d.strength}%)`}\n`);
          parts.push(d.design.body);
          parts.push("");
        }
      }
    }
  }

  if (craftRules.length > 0) {
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

/* ═══════════════════════════════════════════════════════════════
   自评引擎
   ═══════════════════════════════════════════════════════════════ */
export function evaluateOutput(content, skillMeta, constraints) {
  const ev = skillMeta.evaluation || {};
  const dimensions = ev.dimensions || ["logical_consistency", "audience_resonance", "structural_integrity", "language_quality", "originality"];
  let hardChecks = ev.hard_checks || {};

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
  if (hardChecks.P0) {
    for (const check of hardChecks.P0) {
      checks[check] = passP0(check, content);
    }
  }
  if (hardChecks.P1) {
    for (const check of hardChecks.P1) {
      checks[check] = passP1(check, content);
    }
  }
  if (hardChecks.P2) {
    for (const check of hardChecks.P2) {
      checks[check] = passP2(check, content);
    }
  }

  const scoreValues = Object.values(scores);
  const allP0Passed = hardChecks.P0 ? hardChecks.P0.every(c => checks[c]) : true;
  const allP1Passed = hardChecks.P1 ? hardChecks.P1.every(c => checks[c]) : true;
  const allP2Passed = hardChecks.P2 ? hardChecks.P2.every(c => checks[c]) : true;

  return {
    scores,
    overall: scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length,
    hard_checks: checks,
    all_P0_passed: allP0Passed,
    all_P1_passed: allP1Passed,
    all_P2_passed: allP2Passed,
    word_count: wordCount,
    ai_density: aiDensity,
    burstiness: Math.round(burstiness * 100) / 100,
    style_shift: styleShiftScore,
  };
}

function avgSentenceLength(text) {
  const sentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 5);
  if (sentences.length === 0) return 0;
  return sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
}

function countAICliches(text) {
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
  // 硬性匹配
  let count = cliches.reduce((c, phrase) => c + (text.includes(phrase) ? 1 : 0), 0);
  // 结构模式检测：「不仅XX，更XX」反预期结构
  const fanYuanQi = (text.match(/不仅[^，。]*，更[^，。]*/g) || []).length;
  // 「XX的同时，YY」抽象总结模式
  const tongShi = (text.match(/[^，。]*的同时[，。]/g) || []).length;
  // 连续「然而/但是/不过/但」开头的段落或句子
  const ranEr = (text.match(/[。！？\n][然而但是不过但]/g) || []).length;
  return count + Math.max(0, fanYuanQi - 1) + Math.max(0, tongShi - 2) + Math.max(0, ranEr - 2);
}

function measureBurstiness(text) {
  const sentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 5);
  if (sentences.length < 4) return 0.5;
  const lengths = sentences.map(s => s.trim().length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean < 1) return 0.5;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length;
  return Math.min(Math.sqrt(variance) / mean, 1.5);
}

function detectStyleShift(text) {
  const sentences = text.split(/[。！？\n]+/).filter(s => s.trim().length > 8);
  if (sentences.length < 6) return 0;
  // 检测正式/口语风格的突变
  let shifts = 0;
  for (let i = 1; i < sentences.length; i++) {
    const prev = sentences[i - 1];
    const curr = sentences[i];
    const prevFormal = (prev.match(/的[^，。]*之|与否|及其|以及|所谓|而言/g) || []).length;
    const currFormal = (curr.match(/的[^，。]*之|与否|及其|以及|所谓|而言/g) || []).length;
    const prevCasual = (prev.match(/吧|嘛|啦|哦|嗯|哈|呀/g) || []).length;
    const currCasual = (curr.match(/吧|嘛|啦|哦|嗯|哈|呀/g) || []).length;
    // 正式→口语 或 口语→正式的突变
    if ((prevFormal > 0 && currCasual > 0) || (prevCasual > 0 && currFormal > 0)) {
      shifts++;
    }
  }
  return Math.min(shifts / Math.max(1, sentences.length / 5), 1);
}

function passP0(check, content) {
  switch (check) {
    case "no_factual_errors": return true;
    case "no_character_ooc": return content.length > 100;
    case "no_world_rule_break": return true;
    default: return true;
  }
}

function passP1(check, content) {
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
    default: return true;
  }
}

function passP2(check, content) {
  switch (check) {
    case "ai_cliche_free": return countAICliches(content) === 0;
    case "paragraph_breathing": return content.split("\n\n").length > 3;
    case "cliffhanger_or_forward_momentum": return content.length > 500;
    case "dialogue_natural": return (content.match(/[""「」『』【】]/g) || []).length >= 2;
    case "sensory_richness": return countSensoryAnchors(content) >= 2;
    case "no_repetitive_opening": return !content.startsWith(" ") && content.length > 100;
    default: return true;
  }
}

function hasSatisfactionMoment(content) {
  const indicators = ["轰", "震", "碎", "跪", "惊", "突破", "碾压", "秒杀", "震撼全场", "沸腾"];
  return indicators.some(i => content.includes(i));
}

function countSensoryAnchors(text) {
  const visual = (text.match(/[眼眼看]前|金光|黑暗|光芒|血色|身影|景象/g) || []).length;
  const auditory = (text.match(/轰隆|咔嚓|风声|脚步|呼吸声|低吼|尖啸/g) || []).length;
  const tactile = (text.match(/冰冷|灼热|刺痛|麻木|颤抖|僵硬/g) || []).length;
  return visual + auditory + tactile;
}

function clamp(val, min, max) { return Math.max(min, Math.min(max, Math.round(val * 10) / 10)); }
