/**
 * skill-loader.js — 懒加载技能加载器（I/O 适配层）
 *
 * 只加载当前路径对应的 SKILL.md，不预加载全部。
 * 委托核心模块做 frontmatter 解析和约束合并。
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { splitPath, mergeConstraintsByPath, skillPathToFsPath } from "./constraint-engine.js";
import { parseFrontmatter } from "./core/parse-frontmatter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/* ── LRU 缓存（最多 3 个技能） ──────────────── */
const _cache = new Map();
const MAX_CACHE = 3;

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
