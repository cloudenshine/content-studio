import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { setVaultPath, writeNote } from "../src/vault-watcher.js";

test("writes inside the configured vault and rejects sibling traversal", () => {
  const vault = mkdtempSync(join(tmpdir(), "content-studio-vault-"));
  try {
    setVaultPath(vault);
    writeNote("drafts/example.md", "draft");
    assert.equal(existsSync(join(vault, "drafts", "example.md")), true);

    const siblingPath = join("..", `${basename(vault)}-sibling`, "escaped.md");
    assert.throws(() => writeNote(siblingPath, "escaped"), /路径越界/);
    assert.equal(existsSync(join(dirname(vault), `${basename(vault)}-sibling`, "escaped.md")), false);
  } finally {
    setVaultPath("");
    rmSync(vault, { recursive: true, force: true });
  }
});
