/**
 * content-studio — 技能/风格注册表（I/O 适配层）
 *
 * 扫描 skills/ 和 designs/ 目录，提供查询接口。
 * 纯函数逻辑委托给 lib/core/ 内核。
 * 零依赖，纯 Node ESM
 */
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeConstraintsByPath } from "../lib/constraint-engine.js";
import { parseFrontmatter } from "../lib/core/parse-frontmatter.js";
import { assemblePrompt } from "../lib/core/prompt-assembler.js";
import { evaluateOutput } from "../lib/core/scorer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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
        if (typeof val[0] === "string") {
          lines.push(`${pad}${key}:`);
          for (const item of val) lines.push(`${pad}  - ${item.replace(/^['"]|['"]$/g, "")}`);
        } else if (typeof val[0] === "object") {
          lines.push(`${pad}${key}:`);
          for (const item of val) {
            const entries = Object.entries(item);
            if (entries.length > 0) {
              const [firstKey, firstVal] = entries[0];
              lines.push(`${pad}  - ${firstKey}: ${formatScalar(firstVal)}`);
              for (let i = 1; i < entries.length; i++) {
                const [k, v] = entries[i];
                if (v === null || v === undefined) continue;
                if (typeof v === "boolean") lines.push(`${pad}    ${k}: ${v}`);
                else if (Array.isArray(v)) {
                  if (v.length === 0) lines.push(`${pad}    ${k}: []`);
                  else { lines.push(`${pad}    ${k}:`); for (const item of v) lines.push(`${pad}      - ${item}`); }
                } else if (typeof v === "number") lines.push(`${pad}    ${k}: ${v}`);
                else if (v === "") lines.push(`${pad}    ${k}: ''`);
                else lines.push(`${pad}    ${k}: ${v}`);
              }
            }
          }
        }
      } else if (typeof val === "object") {
        lines.push(`${pad}${key}:`);
        writeObj(val, indent + 2);
      } else if (typeof val === "boolean") lines.push(`${pad}${key}: ${val}`);
      else if (typeof val === "number") lines.push(`${pad}${key}: ${val}`);
      else {
        const str = String(val);
        if (/[:\-#\[\]]/.test(str) || /\s/.test(str) || str === "") {
          lines.push(`${pad}${key}: ${str.includes("'") ? `"${str}"` : `'${str}'`}`);
        } else lines.push(`${pad}${key}: ${str}`);
      }
    }
  }
  writeObj(meta, 0);
  return lines.join("\n");
}

export function saveSkill(skillPath, data) {
  const { label, description, body, inputs } = data;
  const dirPath = join(ROOT, "skills", ...skillPath.split("/").filter(Boolean));
  const parentDir = dirname(dirPath);
  if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });

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
  rmSync(skillFile);
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
  try {
    const remaining = readdirSync(dirPath);
    if (remaining.length === 0 || (remaining.length === 1 && remaining[0] === "SKILL.md")) {
      rmSync(dirPath, { recursive: true });
    } else {
      return { error: "目录非空" };
    }
  } catch {}
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
   提示组装器（适配层：预加载 design 对象后委托内核）
   ═══════════════════════════════════════════════════════════════ */
export { assemblePrompt } from "../lib/core/prompt-assembler.js";

/* ═══════════════════════════════════════════════════════════════
   自评引擎（直接委托内核）
   ═══════════════════════════════════════════════════════════════ */
export { evaluateOutput } from "../lib/core/scorer.js";
