import test from "node:test";
import assert from "node:assert/strict";

import { getExample, listExamples } from "../src/example-registry.js";

test("example registry exposes exactly 25 verified read-only examples", () => {
  const examples = listExamples();
  assert.equal(examples.length, 25);
  assert.equal(examples[0].id, "AC-01");
  assert.equal(examples.some(item => "prompt" in item), false);

  const detail = getExample("AC-01");
  assert.ok(detail.output_content.length > 0);
  assert.equal(detail.review_data.verdict, "pass");
  assert.equal(getExample("../manifest.json"), null);
  assert.equal(getExample("AC-99"), null);
});
