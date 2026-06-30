import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { loadCases, prepareRun, summarizeRun, validateCases } from "../scripts/draft-benchmark.mjs";

test("benchmark contains 20 valid cases across four task families", () => {
  const result = validateCases(loadCases());
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.count, 20);
  assert.deepEqual(result.family_counts, { fiction: 5, knowledge: 5, social: 5, business: 5 });
});

test("prepare creates 60 reproducible blind-review slots", () => {
  const runDir = mkdtempSync(join(tmpdir(), "draft-benchmark-"));
  try {
    const first = prepareRun({ outDir: runDir, seed: 42 });
    assert.equal(first.manifest.slot_count, 60);
    assert.equal(first.manifest.slots.filter(slot => slot.condition === "baseline").length, 20);
    assert.equal(first.manifest.slots.filter(slot => slot.condition === "guided").length, 20);
    assert.equal(first.manifest.slots.filter(slot => slot.condition === "revised").length, 20);

    const blindMap = JSON.parse(readFileSync(join(runDir, "blind-map.json"), "utf-8"));
    assert.equal(blindMap.length, 60);
    assert.deepEqual(new Set(blindMap.filter(item => item.case_id === "FIC-01").map(item => item.label)), new Set(["A", "B", "C"]));
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("summarize aggregates completed reviews by condition and family", () => {
  const runDir = mkdtempSync(join(tmpdir(), "draft-benchmark-"));
  try {
    prepareRun({ outDir: runDir, seed: 7 });
    const map = JSON.parse(readFileSync(join(runDir, "blind-map.json"), "utf-8"));
    const reworkByCondition = { baseline: 3, guided: 2, revised: 1 };
    const reviews = map.map(item => ({
      case_id: item.case_id,
      label: item.label,
      rework: reworkByCondition[item.condition],
      scores: {
        task_completion: 4,
        information_accuracy: 5,
        structure_usability: 4,
        language_naturalness: 3,
        genre_fit: 4,
      },
      notes: "",
    }));
    writeFileSync(join(runDir, "reviews.json"), JSON.stringify(reviews), "utf-8");

    const summary = summarizeRun(runDir);
    assert.equal(summary.complete, true);
    assert.equal(summary.by_condition.baseline.mean_rework, 3);
    assert.equal(summary.by_condition.guided.mean_rework, 2);
    assert.equal(summary.by_condition.revised.mean_rework, 1);
    assert.equal(summary.by_family.fiction.guided.count, 5);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});
