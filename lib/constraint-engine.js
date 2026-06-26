/**
 * constraint-engine.js — 层级约束引擎（总引擎）
 *
 * 职责：
 * 1. 加载 taxonomy.json 分类树
 * 2. 按分类路径合并约束链（大类→中类→小类）
 * 3. 返回当前路径的完整约束 + 工艺规则 + 技能路径
 *
 * 始终加载，不做懒加载。
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TAXONOMY_PATH = join(ROOT, "taxonomy.json");

/* ── 缓存 ──────────────────────────────────── */
let _taxonomy = null; // 只在进程生命周期内缓存

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

/* ── 递归查找节点 ───────────────────────────── */
function findNode(tree, pathSegments) {
  if (!pathSegments || pathSegments.length === 0) return null;
  const first = pathSegments[0];
  for (const node of tree) {
    if (node.id === first) {
      if (pathSegments.length === 1) return node;
      if (node.children) return findNode(node.children, pathSegments.slice(1));
      return null;
    }
  }
  return null;
}

/* ── 按路径取节点 ───────────────────────────── */
export function getNodeByPath(path) {
  const tax = loadTaxonomy();
  const segments = splitPath(path);
  return findNode(tax.tree, segments);
}

/* ── 递归合并约束链 ─────────────────────────── */
function mergeConstraints(parentConstraints, nodeConstraints) {
  if (!nodeConstraints) return { ...parentConstraints } || {};

  const merged = { ...parentConstraints };

  // scope: 子覆盖父
  if (nodeConstraints.scope) merged.scope = nodeConstraints.scope;

  // doctrine: 继承父项 + 追加子项
  merged.doctrine = [
    ...(parentConstraints?.doctrine || []),
    ...(nodeConstraints.doctrine || []),
  ];

  // tone_range: 子收窄父（字符串 ∩ 字符串or数组）
  if (nodeConstraints.tone_range) {
    merged.tone_range = nodeConstraints.tone_range;
  }

  // allowed_craft: 子收窄父（取交集）
  if (nodeConstraints.allowed_craft) {
    merged.allowed_craft = nodeConstraints.allowed_craft;
  } else if (parentConstraints?.allowed_craft) {
    merged.allowed_craft = [...parentConstraints.allowed_craft];
  }

  // forbidden_patterns: 合并父+子
  merged.forbidden_patterns = [
    ...(parentConstraints?.forbidden_patterns || []),
    ...(nodeConstraints.forbidden_patterns || []),
  ];

  // p0_checks: 继承+追加
  merged.p0_checks = [
    ...(parentConstraints?.p0_checks || []),
    ...(nodeConstraints.p0_checks || []),
  ];

  // word_range: 子覆盖父
  if (nodeConstraints.word_range) merged.word_range = nodeConstraints.word_range;

  // scope: 子覆盖父
  if (nodeConstraints.scope) merged.scope = nodeConstraints.scope;

  return merged;
}

/* ── 合并完整路径的约束链 ──────────────────────── */
export function mergeConstraintsByPath(path) {
  const tax = loadTaxonomy();
  const segments = splitPath(path);
  let currentNodes = tax.tree;
  let merged = null;

  for (const seg of segments) {
    const node = currentNodes.find(n => n.id === seg);
    if (!node) return null; // 路径无效

    merged = mergeConstraints(merged, node.constraints || {});
    currentNodes = node.children || [];
  }

  return merged;
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

/* ── 工具：分割路径 ──────────────────────────── */
export function splitPath(path) {
  if (!path) return [];
  return path.split("/").map(s => s.trim()).filter(Boolean);
}

/* ── 构建技能文件系统路径 ────────────────────── */
export function skillPathToFsPath(skillPath) {
  return join(ROOT, "skills", ...splitPath(skillPath));
}

/* ── 列出某个节点下所有可用的技能路径 ──────────── */
export function listSkillPaths(parentPath) {
  const tax = loadTaxonomy();
  const results = [];

  function walk(nodes, prefix, skillDirs) {
    for (const node of nodes) {
      const currentPath = prefix ? `${prefix}/${node.id}` : node.id;
      if (!node.children || node.children.length === 0) {
        // 叶子节点 → 确认 skills/ 下有对应目录
        const fsPath = join(ROOT, "skills", ...splitPath(currentPath));
        if (existsSync(fsPath)) {
          results.push(currentPath);
        }
      } else {
        // 有子节点 → 检查是否同时有 SKILL.md（父节点也可生成）
        const fsPath = join(ROOT, "skills", ...splitPath(currentPath));
        if (existsSync(join(fsPath, "SKILL.md"))) {
          results.push(currentPath);
        }
        walk(node.children, currentPath, skillDirs);
      }
    }
  }

  if (parentPath) {
    const node = getNodeByPath(parentPath);
    if (node && node.children) walk(node.children, parentPath, null);
  } else {
    walk(tax.tree, "", null);
  }

  return results;
}
