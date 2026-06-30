import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { containsForbiddenTerm, containsRequiredTerm, loadCases, prepareDelivery, publishDelivery, validateCases, verifyDelivery } from "../scripts/all-category-delivery.mjs";

test("contract matching tolerates formatting but not factual changes", () => {
  assert.equal(containsRequiredTerm("测试 6 人，耗时两小时", "6人"), true);
  assert.equal(containsRequiredTerm("测试 6 人，耗时两小时", "2小时"), true);
  assert.equal(containsForbiddenTerm("这不是鬼魂，也不用命令行。", "鬼魂"), false);
  assert.equal(containsForbiddenTerm("这不是鬼魂，也不用命令行。", "命令行"), false);
  assert.equal(containsForbiddenTerm("鬼魂突然出现。", "鬼魂"), true);
  assert.equal(containsRequiredTerm("耐温-80℃到80℃", "0-80℃"), false);
});

test("all-category cases exactly cover the authoritative skill set", () => {
  const result = validateCases(loadCases());
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.case_count, 25);
  assert.equal(result.authoritative_count, 25);
});

test("delivery verifier requires real outputs, contracts, and semantic reviews", () => {
  const runDir = mkdtempSync(join(tmpdir(), "all-category-delivery-"));
  try {
    const cases = loadCases();
    const { manifest } = prepareDelivery({ runDir, cases });
    assert.equal(manifest.delivery, "all-categories-v2");
    assert.equal(manifest.schema_version, 2);
    assert.equal(manifest.provenance.app_version, "0.4.0");
    assert.equal(manifest.provenance.taxonomy_version, "1.1");
    assert.equal(manifest.provenance.skill_files.length, 25);
    assert.match(manifest.provenance.cases_sha256, /^[a-f0-9]{64}$/);
    assert.match(manifest.provenance.skills_sha256, /^[a-f0-9]{64}$/);
    for (const entry of manifest.entries) {
      const item = cases.find(candidate => candidate.id === entry.id);
      const required = [...item.required_terms, ...(item.required_any || []).map(group => group[0])].join("，");
      const fillerLength = Math.max(0, item.min_chars - required.length + 20);
      const output = `${required}\n${"具体内容。".repeat(Math.ceil(fillerLength / 5))}`.slice(0, item.max_chars);
      writeFileSync(join(runDir, entry.output_file), output, "utf-8");
      mkdirSync(join(runDir, "reviews"), { recursive: true });
      writeFileSync(join(runDir, entry.review_file), JSON.stringify({
        rework: 1,
        scores: {
          task_completion: 4,
          information_accuracy: 4,
          structure_usability: 4,
          language_naturalness: 4,
          genre_fit: 4,
        },
        manual_checks: Object.fromEntries(item.manual_checks.map(check => [check, true])),
        blocking_issues: [],
        notes: "测试复核",
        verdict: "pass",
      }), "utf-8");
    }
    const result = verifyDelivery({ runDir, cases });
    assert.equal(result.complete, true, result.results.filter(item => item.status !== "passed").map(item => `${item.id}: ${item.errors.join(",")}`).join("\n"));
    assert.equal(result.passed, 25);

    const verification = JSON.parse(readFileSync(join(runDir, "verification.json"), "utf-8"));
    assert.equal(verification.delivery, "all-categories-v2");
    assert.equal(verification.schema_version, 2);
    assert.equal(verification.total, 25);
    assert.equal(existsSync(join(runDir, "DELIVERY.md")), true);

    const publishDir = join(runDir, "published");
    const published = publishDelivery({ runDir, publishDir });
    assert.equal(published.count, 25);
    const index = JSON.parse(readFileSync(join(publishDir, "index.json"), "utf-8"));
    assert.equal(index.count, 25);
    assert.equal(index.entries[0].summary, cases[0].inputs.user_idea);
    assert.equal(existsSync(join(publishDir, "generation-log.json")), false);
    assert.equal(existsSync(join(publishDir, "versions")), false);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});
