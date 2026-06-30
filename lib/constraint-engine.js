/**
 * constraint-engine.js — 层级约束引擎（I/O 适配层）
 *
 * 职责：
 * 1. 加载 taxonomy.json 分类树（文件 I/O）
 * 2. 委托纯函数内核做约束合并
 * 3. 提供查询接口（getNodeByPath, getChildren, 等）
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findNode, mergeConstraints, splitPath, mergeConstraintsByPathSegments } from "./core/constraint-engine.js";
// re-export for skill-loader.js and other consumers
export { splitPath };

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TAXONOMY_PATH = join(ROOT, "taxonomy.json");

/* ── 缓存 ──────────────────────────────────── */
let _taxonomy = null;

/* ── 加载分类树 ─────────────────────────────── */
export function loadTaxonomy() {
  if (_taxonomy) return _taxonomy;
  try {
    const raw = readFileSync(TAXONOMY_PATH, "utf-8");
    _taxonomy = JSON.parse(raw);
    return _taxonomy;
  } catch (e) {
    console.error("❌ taxonomy.json 加载失败:", e.message);
    return { version: "0", tree: [] };
  }
}

/* ── 清空缓存 ───────────────────────────────── */
export function clearTaxonomyCache() {
  _taxonomy = null;
}

/* ── 按路径取节点 ───────────────────────────── */
export function getNodeByPath(path) {
  const tax = loadTaxonomy();
  const segments = splitPath(path);
  return findNode(tax.tree, segments);
}

/* ── 合并完整路径的约束链 ──────────────────────── */
export function mergeConstraintsByPath(path) {
  const tax = loadTaxonomy();
  const segments = splitPath(path);
  return mergeConstraintsByPathSegments(tax.tree, segments);
}

/* ── 获取子节点列表 ─────────────────────────── */
export function getChildren(path) {
  const tax = loadTaxonomy();
  if (!path || path === "") {
    return (tax.tree || []).map(n => ({
      id: n.id,
      label: n.label,
      icon: n.icon || null,
      hasChildren: !!n.children && n.children.length > 0,
    }));
  }
  const node = getNodeByPath(path);
  if (!node || !node.children) return [];
  return node.children.map(n => ({
    id: n.id,
    label: n.label,
    icon: n.icon || null,
    hasChildren: !!n.children && n.children.length > 0,
  }));
}

/* ── 获取完整路径标签（用于面包屑） ──────────── */
export function getPathLabels(path) {
  const tax = loadTaxonomy();
  const segments = splitPath(path);
  const labels = [];
  let currentNodes = tax.tree;

  for (const seg of segments) {
    const node = currentNodes.find(n => n.id === seg);
    if (!node) return labels;
    labels.push(node.label || seg);
    currentNodes = node.children || [];
  }

  return labels;
}

/* ── 判断路径是否完整（叶子节点） ────────────── */
export function isLeafPath(path) {
  const node = getNodeByPath(path);
  return node && (!node.children || node.children.length === 0);
}

/* ── 验证路径是否存在 ───────────────────────── */
export function isValidPath(path) {
  return getNodeByPath(path) !== null;
}

/* ── 构建技能文件系统路径 ────────────────────── */
export function skillPathToFsPath(skillPath) {
  return join(ROOT, "skills", ...splitPath(skillPath));
}

/* ── 列出某个节点下所有可用的技能路径 ──────────── */
export function listSkillPaths(parentPath) {
  const tax = loadTaxonomy();
  const results = [];

  function walk(nodes, prefix) {
    for (const node of nodes) {
      const currentPath = prefix ? `${prefix}/${node.id}` : node.id;
      if (!node.children || node.children.length === 0) {
        const fsPath = join(ROOT, "skills", ...splitPath(currentPath));
        if (existsSync(fsPath)) {
          results.push(currentPath);
        }
      } else {
        const fsPath = join(ROOT, "skills", ...splitPath(currentPath));
        if (existsSync(join(fsPath, "SKILL.md"))) {
          results.push(currentPath);
        }
        walk(node.children, currentPath);
      }
    }
  }

  if (parentPath) {
    const node = getNodeByPath(parentPath);
    if (node && node.children) walk(node.children, parentPath);
  } else {
    walk(tax.tree, "");
  }

  return results;
}
