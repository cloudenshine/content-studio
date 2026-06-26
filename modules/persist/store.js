/**
 * store.js — 内容持久化模块
 *
 * 每个生成结果保存为一个 JSON 文件到 .content-studio/history/
 * 零依赖，文件即数据库。
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const HISTORY_DIR = join(ROOT, ".content-studio", "history");

function ensureDir() {
  if (!existsSync(HISTORY_DIR)) mkdirSync(HISTORY_DIR, { recursive: true });
}

/* ── 保存一次生成记录 ───────────────────────── */
export function saveHistory({ skill, design, prompt, output, evaluation, mode, model, elapsed }) {
  ensureDir();
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const id = `${ts}__${skill.replace(/[\\/]/g, "_")}`;
  const entry = {
    id,
    timestamp: new Date().toISOString(),
    skill, design, prompt, mode, model,
    output,  // 全量内容
    output_len: output?.length || 0,
    elapsed, evaluation,
  };
  writeFileSync(join(HISTORY_DIR, `${id}.json`), JSON.stringify(entry, null, 2), "utf-8");
  return id;
}

/* ── 列出历史记录（摘要） ───────────────────── */
export function listHistory(limit = 20) {
  ensureDir();
  const files = readdirSync(HISTORY_DIR)
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, limit);

  return files.map(f => {
    try {
      const data = JSON.parse(readFileSync(join(HISTORY_DIR, f), "utf-8"));
      return {
        id: data.id,
        timestamp: data.timestamp,
        skill: data.skill,
        design: data.design,
        output_len: data.output_len,
        elapsed: data.elapsed,
        overall: data.evaluation?.overall,
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

/* ── 读取单条历史 ───────────────────────────── */
export function getHistory(id) {
  const path = join(HISTORY_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}
