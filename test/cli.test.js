import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("CLI lists taxonomy-backed skills", () => {
  const output = execFileSync(process.execPath, ["cli.mjs", "--list-skills"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf-8",
  });

  assert.match(output, /可用技能 \(25\)/);
  assert.match(output, /文学创作\/小说\/短篇小说/);
});
