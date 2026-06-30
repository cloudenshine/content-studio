import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

test("server defaults to a same-origin loopback API", async t => {
  const port = 36000 + Math.floor(Math.random() * 2000);
  const env = { ...process.env, PORT: String(port) };
  delete env.HOST;
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: new URL("..", import.meta.url),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => child.kill());

  let response;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      response = await fetch(`http://127.0.0.1:${port}/api`);
      break;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  assert.ok(response, "server did not start on the loopback interface");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal((await response.json()).status, "ok");

  const evaluationResponse = await fetch(`http://127.0.0.1:${port}/api/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skill: "文学创作/小说/短篇小说",
      content: "天气很好。一个人走进房间。事情结束了。",
    }),
  });
  const evaluation = await evaluationResponse.json();
  assert.equal(evaluation.all_P0_passed, false);
  assert.ok(evaluation.unsupported_checks.P0.includes("no_factual_errors"));
});
