/**
 * skill-loader.js — 懒加载技能加载器
 *
 * 只加载当前路径对应的 SKILL.md，不预加载全部。
 * 内存只保留当前使用的 1-2 个技能。
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { splitPath, mergeConstraintsByPath, skillPathToFsPath } from "./constraint-engine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/* ── LRU 缓存（最多 3 个技能） ──────────────── */
const _cache = new Map();
const MAX_CACHE = 3;

/* ── YAML frontmatter 解析 ─────────────────── */
export function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { meta: {}, body: text };
  const raw = match[1];
  const meta = {};
  const lines = raw.split("\n");
  let currentKey = null, currentParent = null, currentArray = null, inArray = false;
  let arrayItemIndent = 0, currentObjItem = null, _savedArray = null, _savedObjItem = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const indentLevel = line.search(/\S/);

    if (inArray && currentObjItem && indentLevel > arrayItemIndent + 1) {
      const kvMatch = trimmed.match(/^\s*(\w[\w_]*):\s*(.*)/);
      if (kvMatch) {
        const val = kvMatch[2].trim();
        if (val === "") {
          // 空值 → 检查下一行是否为数组
          const idx = lines.indexOf(line);
          const rest = lines.slice(idx + 1);
          const nxt = rest.find(l => l.trim());
          if (nxt && nxt.trim().startsWith("- ")) {
            const arr = [];
            currentObjItem[kvMatch[1]] = arr;
            // 保存父上下文，以便恢复
            _savedArray = currentArray;
            _savedObjItem = currentObjItem;
            currentArray = arr;
            inArray = true;
            continue;
          }
          currentObjItem[kvMatch[1]] = null;
          continue;
        }
        let parsedVal = val;
        if (val === "true") parsedVal = true;
        else if (val === "false") parsedVal = false;
        else if (/^\d+$/.test(val)) parsedVal = parseInt(val, 10);
        else if (val.startsWith("[") && val.endsWith("]")) {
          parsedVal = val.slice(1, -1).split(",").map(i => i.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
        } else parsedVal = val.replace(/^['"]|['"]$/g, "");
        currentObjItem[kvMatch[1]] = parsedVal;
        continue;
      }
      currentObjItem = null;
    }

    const arrayMatch = trimmed.match(/^(\s*)- (.+)/);
    if (arrayMatch && inArray && currentArray) {
      // 检查是否离开了嵌套数组（缩进回到父级别）
      if (_savedArray && indentLevel <= arrayItemIndent) {
        currentArray = _savedArray;
        currentObjItem = _savedObjItem;
        _savedArray = null;
        _savedObjItem = null;
      }
      const itemText = arrayMatch[2];
      const nextIdx = lines.indexOf(line);
      const nextLine = nextIdx < lines.length - 1 ? lines[nextIdx + 1] : "";
      const nextIndent = nextLine ? nextLine.search(/\S/) : 0;
      if (nextLine && nextIndent > indentLevel + 1) {
        const obj = {};
        const firstKv = itemText.match(/^(\w[\w_]*):\s*(.*)/);
        if (firstKv) obj[firstKv[1]] = firstKv[2].trim().replace(/^['"]|['"]$/g, "");
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

    if (indentLevel > 0 && currentParent) {
      if (typeof meta[currentParent] !== "object" || meta[currentParent] === null) {
        meta[currentParent] = {};
      }
    } else {
      currentParent = key;
    }

    if (val === "") {
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
    } else if (val.startsWith("[")) {
      const items = val.slice(1, -1).split(",").map(i => i.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      if (indentLevel > 0 && currentParent) meta[currentParent][key] = items;
      else meta[key] = items;
      inArray = false;
    } else if (val === "true") { meta[indentLevel > 0 && currentParent ? currentParent : key] = true; inArray = false; }
    else if (val === "false") { meta[indentLevel > 0 && currentParent ? currentParent : key] = false; inArray = false; }
    else if (/^\d+$/.test(val)) { meta[indentLevel > 0 && currentParent ? currentParent : key] = parseInt(val, 10); inArray = false; }
    else { meta[indentLevel > 0 && currentParent ? currentParent : key] = val.replace(/^['"]|['"]$/g, ""); inArray = false; }
  }

  return { meta, body: text.slice(match[0].length).trim() };
}

/* ── 按分类路径加载技能 ──────────────────────── */
export function loadSkillByPath(skillPath) {
  const cacheKey = skillPath;
  if (_cache.has(cacheKey)) return _cache.get(cacheKey);

  const fsPath = skillPathToFsPath(skillPath);
  const skillFile = join(fsPath, "SKILL.md");

  if (!existsSync(skillFile)) {
    console.error(`[skill-loader] 文件不存在: ${skillFile}`);
    return null;
  }

  const raw = readFileSync(skillFile, "utf-8");
  const { meta, body } = parseFrontmatter(raw);

  if (!meta.label && Object.keys(meta).length <= 1) {
    console.warn(`[skill-loader] frontmatter 可能为空: ${skillFile}, meta keys: ${Object.keys(meta).join(',')}`);
  }

  // 合并约束链
  const constraints = mergeConstraintsByPath(skillPath);

  // 构建技能对象
  const skill = {
    id: skillPath,
    path: skillPath,
    label: meta.label || skillPath.split("/").pop(),
    description: meta.description || "",
    mode: meta.mode || "content-generate",
    inputs: meta.inputs || [],
    meta,
    body,
    constraints,
    craft: meta.craft || {},
    evaluation: meta.evaluation || {},
  };

  // LRU 缓存
  if (_cache.size >= MAX_CACHE) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(cacheKey, skill);

  return skill;
}

/* ── 列出某路径下的可用子技能 ──────────────────── */
export function listAvailableSkills(parentPath) {
  const basePath = parentPath ? join(ROOT, "skills", ...splitPath(parentPath)) : join(ROOT, "skills");
  if (!existsSync(basePath)) return [];

  const items = [];
  try {
    const entries = readdirSync(basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
        const skillFile = join(basePath, entry.name, "SKILL.md");
        if (existsSync(skillFile)) {
          try {
            const raw = readFileSync(skillFile, "utf-8");
            const { meta } = parseFrontmatter(raw);
            items.push({
              path: subPath,
              label: meta.label || entry.name,
              description: meta.description || "",
              hasChildren: existsSync(join(basePath, entry.name)) && readdirSync(join(basePath, entry.name)).some(e => e !== "SKILL.md"),
            });
          } catch {}
        }
      }
    }
  } catch {}

  return items;
}

/* ── 清空缓存（技能热更新时用） ──────────────── */
export function clearSkillCache() {
  _cache.clear();
}
