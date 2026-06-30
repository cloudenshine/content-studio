import test from "node:test";
import assert from "node:assert/strict";

import { listSkillPaths } from "../lib/constraint-engine.js";
import { loadSkillByPath } from "../lib/skill-loader.js";
import { getDesign } from "../src/registry.js";

test("all executable skills expose valid named input fields", () => {
  const paths = listSkillPaths();
  assert.equal(paths.length, 25);

  for (const path of paths) {
    const skill = loadSkillByPath(path);
    assert.ok(skill, `${path} must load`);
    const names = skill.inputs.map(input => input.name);
    assert.ok(names.every(Boolean), `${path} contains an unnamed input`);
    assert.equal(new Set(names).size, names.length, `${path} contains duplicate inputs`);
    const userIdea = skill.inputs.find(input => input.name === "user_idea");
    assert.ok(userIdea, `${path} must expose user_idea`);
    assert.equal(userIdea.required, true, `${path} user_idea must be required`);
    assert.ok(skill.meta.evaluation && typeof skill.meta.evaluation === "object", `${path} evaluation must be an object`);
    assert.ok(skill.meta.evaluation.hard_checks && typeof skill.meta.evaluation.hard_checks === "object", `${path} hard_checks must be an object`);
  }
});

test("nested arrays and mappings remain attached to their parent", () => {
  const fairyTale = loadSkillByPath("文学创作/儿童文学/童话");
  assert.deepEqual(fairyTale.inputs.find(input => input.name === "core_conflict").options.slice(0, 3), ["友谊考验", "战胜恐惧", "解决谜题"]);
  assert.equal(fairyTale.inputs.find(input => input.name === "word_count").default, 800);
  assert.deepEqual(fairyTale.meta.evaluation.hard_checks.P0, ["positive_theme", "age_appropriate_language"]);

  const productPage = loadSkillByPath("商业写作/营销文案/产品页");
  assert.deepEqual(productPage.inputs.find(input => input.name === "product_type").options.slice(0, 2), ["SaaS/软件", "实物商品"]);

  const design = getDesign("web-novel-cool");
  assert.deepEqual(design.meta.compatibility.genres.slice(0, 3), ["玄幻", "仙侠", "都市"]);
});
