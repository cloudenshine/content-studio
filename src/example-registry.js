import { readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLES_ROOT = join(ROOT, "examples", "all-categories");
const INDEX_PATH = join(EXAMPLES_ROOT, "index.json");

function loadIndex() {
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
  if (!Array.isArray(index.entries)) throw new Error("实例索引无效");
  return index;
}

function readExampleFile(relativePath) {
  const path = resolve(EXAMPLES_ROOT, relativePath);
  const rootPrefix = `${resolve(EXAMPLES_ROOT)}${sep}`;
  if (!path.startsWith(rootPrefix)) throw new Error("实例路径越界");
  return readFileSync(path, "utf-8");
}

export function listExamples() {
  return loadIndex().entries.map(({ prompt, ...entry }) => entry);
}

export function getExample(id) {
  const entry = loadIndex().entries.find(item => item.id === id);
  if (!entry) return null;
  return {
    ...entry,
    output_content: readExampleFile(entry.output),
    review_data: JSON.parse(readExampleFile(entry.review)),
  };
}
