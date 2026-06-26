/**
 * content-studio — Obsidian Vault 双向集成模块
 *
 * 读取 Obsidian vault 中的笔记、技能和风格；
 * 写入生成结果回 vault。
 */
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { parseFrontmatter } from "./registry.js";

let vaultPath = "";

/* ═══════════════════════════════════════════════════════════════
   配置
   ═══════════════════════════════════════════════════════════════ */
export function getVaultPath() {
  return vaultPath;
}

export function setVaultPath(path) {
  if (!path) { vaultPath = ""; return; }
  const normalized = path.replace(/\\/g, "/");
  if (!existsSync(normalized)) throw new Error(`路径不存在: ${normalized}`);
  vaultPath = normalized;
}

export function getVaultStatus() {
  if (!vaultPath) return { connected: false, path: "", noteCount: 0, skillCount: 0, designCount: 0 };
  try {
    const notes = listNotes();
    const skills = listVaultSkills();
    const designs = listVaultDesigns();
    return { connected: true, path: vaultPath, noteCount: notes.length, skillCount: skills.length, designCount: designs.length };
  } catch (e) {
    return { connected: false, path: vaultPath, error: e.message, noteCount: 0, skillCount: 0, designCount: 0 };
  }
}

/* ═══════════════════════════════════════════════════════════════
   笔记操作
   ═══════════════════════════════════════════════════════════════ */
export function listNotes(subdir = "") {
  if (!vaultPath) return [];
  const dir = subdir ? join(vaultPath, subdir) : vaultPath;
  if (!existsSync(dir)) return [];
  const result = [];
  function walk(current, prefix) {
    let entries;
    try { entries = readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.name.startsWith(".") || entry.name === "_skills" || entry.name === "_designs") continue;
      if (entry.isDirectory()) {
        walk(fullPath, join(prefix, entry.name));
      } else if (entry.isFile() && /\.(md|txt)$/i.test(entry.name)) {
        result.push({
          name: entry.name.replace(/\.(md|txt)$/i, ""),
          path: join(prefix, entry.name),
          fullPath,
          ext: extname(entry.name),
          size: statSync(fullPath).size,
        });
      }
    }
  }
  walk(dir, "");
  return result;
}

export function readNote(notePath) {
  if (!vaultPath) throw new Error("Vault 未配置");
  const fullPath = join(vaultPath, notePath);
  // 安全检查：防止遍历到 vault 外
  const normalizedFull = fullPath.replace(/\\/g, "/");
  const normalizedVault = vaultPath.replace(/\\/g, "/");
  if (!normalizedFull.startsWith(normalizedVault)) throw new Error("路径越界");
  if (!existsSync(fullPath)) throw new Error(`笔记不存在: ${notePath}`);
  const content = readFileSync(fullPath, "utf-8");
  const { meta, body } = parseFrontmatter(content);
  return { path: notePath, meta, content: body || content, raw: content };
}

export function writeNote(notePath, content, frontmatter = {}) {
  if (!vaultPath) throw new Error("Vault 未配置");
  const fullPath = join(vaultPath, notePath);
  const normalizedFull = fullPath.replace(/\\/g, "/");
  const normalizedVault = vaultPath.replace(/\\/g, "/");
  if (!normalizedFull.startsWith(normalizedVault)) throw new Error("路径越界");
  // 确保目录存在
  const dir = normalizedFull.substring(0, normalizedFull.lastIndexOf("/"));
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  // 构建带 frontmatter 的 Markdown
  let output = "";
  if (Object.keys(frontmatter).length > 0) {
    output += "---\n";
    for (const [key, val] of Object.entries(frontmatter)) {
      output += `${key}: ${typeof val === "string" ? val : JSON.stringify(val)}\n`;
    }
    output += "---\n\n";
  }
  output += content;
  writeFileSync(fullPath, output, "utf-8");
  return { path: notePath, size: output.length };
}

/* ═══════════════════════════════════════════════════════════════
   从 vault 加载技能和风格
   ─ vault 中的 _skills/<name>/SKILL.md 会合并到系统技能中
   ─ vault 中的 _designs/<name>/DESIGN.md 会合并到系统风格中
   ═══════════════════════════════════════════════════════════════ */
export function listVaultSkills() {
  if (!vaultPath) return [];
  const skillsDir = join(vaultPath, "_skills");
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir)
    .filter(d => {
      const skillFile = join(skillsDir, d, "SKILL.md");
      return existsSync(skillFile);
    })
    .map(d => {
      const content = readFileSync(join(skillsDir, d, "SKILL.md"), "utf-8");
      const { meta, body } = parseFrontmatter(content);
      return { id: `vault:${d}`, label: meta.label || d, description: meta.description || "", source: "vault", meta, body };
    });
}

export function listVaultDesigns() {
  if (!vaultPath) return [];
  const designsDir = join(vaultPath, "_designs");
  if (!existsSync(designsDir)) return [];
  return readdirSync(designsDir)
    .filter(d => {
      const designFile = join(designsDir, d, "DESIGN.md");
      return existsSync(designFile);
    })
    .map(d => {
      const content = readFileSync(join(designsDir, d, "DESIGN.md"), "utf-8");
      const { meta, body } = parseFrontmatter(content);
      return { id: `vault:${d}`, label: meta.label || d, description: meta.description || "", source: "vault", meta, body };
    });
}
