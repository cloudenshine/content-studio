import test from "node:test";
import assert from "node:assert/strict";

import { evaluateOutput, normalizeHardChecks, passP0 } from "../lib/core/scorer.js";
import { loadSkillByPath } from "../lib/skill-loader.js";

test("normalizes the hard-check shape produced by current skill metadata", () => {
  assert.deepEqual(normalizeHardChecks({ hard_checks: null, P0: ["a"], P1: ["b"] }), {
    P0: ["a"],
    P1: ["b"],
    P2: [],
  });
});

test("does not silently pass unsupported checks", () => {
  assert.equal(passP0("not_implemented"), undefined);

  const skill = loadSkillByPath("文学创作/小说/短篇小说");
  const result = evaluateOutput("天气很好。一个人走进房间。事情结束了。", skill.meta, skill.constraints);

  assert.equal(result.all_P0_passed, false);
  assert.equal(result.hard_checks.no_factual_errors, null);
  assert.ok(result.unsupported_checks.P0.includes("no_factual_errors"));
  assert.equal(result.hard_checks_by_priority.P0.plot_driven_by_causality, false);
});

test("keeps standard nested hard-check metadata compatible", () => {
  const result = evaluateOutput("立即点击关注，查看完整内容。", {
    evaluation: { hard_checks: { P0: ["call_to_action"] } },
  });

  assert.equal(result.hard_checks_by_priority.P0.call_to_action, true);
  assert.equal(result.all_P0_passed, true);
});
