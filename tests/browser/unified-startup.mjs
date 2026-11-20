// Explicit local integration test. Port 4173 must be free; never stops an existing service.
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
const run = () =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/local.mjs", "--skip-build"],
      { windowsHide: true },
    );
    let output = "";
    child.stdout.on("data", (s) => (output += s));
    child.stderr.on("data", (s) => (output += s));
    const timer = setTimeout(() => {
      child.kill();
      reject(Error("Owned startup test timed out"));
    }, 20000);
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
const fake = createServer((socket) => {
  socket.on("error", (error) => {
    if (error.code !== "ECONNRESET") throw error;
  });
  socket.destroy();
});
fake.listen(4173, "127.0.0.1");
await once(fake, "listening");
try {
  const result = await run();
  assert.equal(result.code, 1);
  assert.match(result.output, /occupied/);
  assert.equal(fake.listening, true);
  console.log("Unrelated occupied port refused; listener untouched.");
} finally {
  await new Promise((r) => fake.close(r));
}
const first = await run();
assert.equal(first.code, 0, first.output);
assert.match(first.output, /Unified site:/);
const second = await run();
assert.equal(second.code, 0, second.output);
assert.match(second.output, /already running/);
console.log(
  "Fresh startup and idempotent restart passed; unified service left running.",
);
