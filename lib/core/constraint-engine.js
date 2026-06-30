/**
 * constraint-engine.js — 纯函数约束引擎（内核）
 *
 * 纯函数，零 I/O，零 Node 内置依赖。
 * 入参 taxonomy tree + path segments，出参合并后的约束对象。
 * 文件加载/缓存由 I/O 适配层（lib/constraint-engine.js）处理。
 */

/* ── 递归查找节点 ───────────────────────────── */
export function findNode(tree, pathSegments) {
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

/* ── 递归合并约束链 ─────────────────────────── */
export function mergeConstraints(parentConstraints, nodeConstraints) {
  if (!nodeConstraints) return { ...parentConstraints } || {};

  const merged = { ...parentConstraints };

  // scope: 子覆盖父
  if (nodeConstraints.scope) merged.scope = nodeConstraints.scope;

  // doctrine: 继承父项 + 追加子项
  merged.doctrine = [
    ...(parentConstraints?.doctrine || []),
    ...(nodeConstraints.doctrine || []),
  ];

  // tone_range: 子收窄父
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

  return merged;
}

/* ── 工具：分割路径 ──────────────────────────── */
export function splitPath(path) {
  if (!path) return [];
  return path.split("/").map(s => s.trim()).filter(Boolean);
}

/* ── 按 segments 合并约束链（纯函数，外部传入 tree） ── */
export function mergeConstraintsByPathSegments(tree, segments) {
  let currentNodes = tree;
  let merged = null;

  for (const seg of segments) {
    const node = currentNodes.find(n => n.id === seg);
    if (!node) return null;
    merged = mergeConstraints(merged, node.constraints || {});
    currentNodes = node.children || [];
  }

  return merged;
}
