import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { startOwnedServer } from "../../scripts/server-readiness.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const expected =
  "<!doctype html><title>Synthetic readiness fixture</title>exact bytes\n";
// Synthetic servers deliberately exercise lifecycle failures, not public game content.
const fixtureSource = `
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
const mode = process.env.READINESS_FIXTURE || 'valid';
writeFileSync('child.pid', String(process.pid));
if (mode === 'exit') { console.error('synthetic early exit'); process.exit(7); }
if (mode === 'never') setInterval(() => {}, 1000);
else {
 const server = createServer((req, res) => {
  if (mode === 'headers') return;
  res.writeHead(mode === 'status' ? 503 : mode === 'redirect' ? 302 : 200, {
   'Content-Type': mode === 'type' ? 'application/json' : 'text/html; charset=utf-8',
   'Location': '/elsewhere'
  });
  if (mode === 'body') { res.write('partial'); return; }
  if (mode === 'oversized') return res.end('x'.repeat(1024 * 1024 + 1));
  if (mode === 'during') { res.write('partial'); process.exit(8); }
  res.end(['wrong', 'verbose-wrong'].includes(mode) ? 'another build' : readFileSync('dist/index.html'));
 });
 if (mode === 'ignore-term') process.on('SIGTERM', () => {});
 server.listen(Number(process.env.PORT), '127.0.0.1', () => {
  if (mode.startsWith('verbose')) {
   process.stdout.write('o'.repeat(200000) + '\\n');
   process.stderr.write('e'.repeat(200000) + '\\n');
  }
  if (mode !== 'missing-marker') {
   const port = mode === 'wrong-marker' ? 1 : process.env.PORT;
   if (mode === 'fragmented') {
    process.stdout.write('DMZ Guide: http://127.0.0.1:');
    setTimeout(() => process.stdout.write(port + '\\n'), 10);
   } else console.log((mode === 'prefixed-marker' ? 'not owned: ' : '') + 'DMZ Guide: http://127.0.0.1:' + port);
  }
 });
}
`;
async function fixture(t, mode = "valid") {
  const cwd = await mkdtemp(join(tmpdir(), "dmz-readiness-"));
  t.after(async () => {
    const started = performance.now();
    try {
      // Retry only test-owned filesystem teardown, never child-death checks.
      await rm(cwd, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });
    } catch (error) {
      t.diagnostic(
        "Owned fixture teardown failed: " +
          JSON.stringify({
            mode,
            cwd,
            elapsedMs: Math.round(performance.now() - started),
            code: error.code,
            syscall: error.syscall,
            path: error.path,
            message: error.message.slice(0, 4096),
          }),
      );
      throw error;
    }
  });
  await mkdir(join(cwd, "scripts"));
  await mkdir(join(cwd, "dist"));
  await writeFile(join(cwd, "scripts/serve.mjs"), fixtureSource);
  await writeFile(join(cwd, "dist/index.html"), expected);
  return {
    cwd,
    entrypoint: join(cwd, "scripts/serve.mjs"),
    expectedFile: join(cwd, "dist/index.html"),
    env: { ...process.env, READINESS_FIXTURE: mode },
    timeoutMs: 700,
    requestTimeoutMs: 100,
    cleanupGraceMs: 100,
  };
}
async function assertGone(cwd) {
  const pid = Number(await readFile(join(cwd, "child.pid"), "utf8"));
  assert.throws(
    () => process.kill(pid, 0),
    { code: "ESRCH" },
    `Owned fixture PID ${pid} must be absent after cleanup`,
  );
}
async function failure(t, mode, pattern) {
  const options = await fixture(t, mode);
  const started = performance.now();
  let rejection;
  try {
    await assert.rejects(async () => {
      try {
        await startOwnedServer(options);
      } catch (error) {
        rejection = error;
        throw error;
      }
    }, pattern);
    assert(
      performance.now() - started < 3000,
      "failure and cleanup are bounded",
    );
    await assertGone(options.cwd);
  } catch (error) {
    // Keep the original startup/cleanup error when a later assertion fails.
    // Its prefix includes phase, elapsed time, PID, exit code and signal.
    t.diagnostic(
      "Owned readiness failure evidence: " +
        JSON.stringify({
          mode,
          elapsedMs: Math.round(performance.now() - started),
          startupError: rejection?.message.slice(0, 4096),
          assertionError: error.message.slice(0, 1024),
        }),
    );
    throw error;
  }
}

test("readiness accepts exact content from a live owned child and awaits idempotent cleanup", async (t) => {
  const options = await fixture(t);
  const server = await startOwnedServer(options);
  assert.match(server.base, /^http:\/\/127\.0\.0\.1:\d+$/);
  server.assertAlive();
  assert.equal(await (await fetch(server.base)).text(), expected);
  await Promise.all([server.stop(), server.stop()]);
  await assertGone(options.cwd);
});

test("occupied port cannot borrow unrelated HTTP 200 or stop its owner", async (t) => {
  let probes = 0;
  const unrelated = createServer((req, res) => {
    probes++;
    res.end(expected);
  });
  unrelated.listen(0, "127.0.0.1");
  await once(unrelated, "listening");
  t.after(() => new Promise((r) => unrelated.close(r)));
  const options = await fixture(t);
  options.port = unrelated.address().port;
  await assert.rejects(startOwnedServer(options), /EADDRINUSE/);
  await assertGone(options.cwd);
  assert.equal(probes, 0, "no probe before owned successful-bind marker");
  assert.equal(
    await (await fetch(`http://127.0.0.1:${options.port}`)).text(),
    expected,
  );
});

for (const [mode, pattern] of [
  ["exit", /synthetic early exit/],
  ["wrong", /content mismatch/],
  ["type", /content.type/i],
  ["never", /deadline/i],
  ["missing-marker", /deadline/i],
  ["wrong-marker", /deadline/i],
  ["prefixed-marker", /deadline/i],
  ["status", /503/],
  ["redirect", /302/],
  ["headers", /request.*timeout/i],
  ["body", /request.*timeout/i],
  ["oversized", /body.*limit/i],
  ["during", /child|exited/i],
]) {
  test(`readiness rejects ${mode} before continuation and cleans only its child`, (t) =>
    failure(t, mode, pattern));
}

test("output is continuously drained but each diagnostic tail is at most 64 KiB", async (t) => {
  const options = await fixture(t, "verbose");
  const server = await startOwnedServer(options);
  const diagnostics = server.diagnostics();
  assert.equal(Buffer.byteLength(diagnostics.stdout), 65536);
  assert.equal(Buffer.byteLength(diagnostics.stderr), 65536);
  assert.equal(diagnostics.stdoutTruncated, true);
  assert.equal(diagnostics.stderrTruncated, true);
  assert.match(diagnostics.stdout, /DMZ Guide: http:\/\/127\.0\.0\.1:/);
  await server.stop();
  await assertGone(options.cwd);
});

test("cleanup escalates only its SIGTERM-resistant child within its bound", async (t) => {
  const options = await fixture(t, "ignore-term");
  const server = await startOwnedServer(options);
  const started = performance.now();
  await server.stop();
  assert(performance.now() - started < 3000);
  await assertGone(options.cwd);
});

test("child failure after readiness remains fatal at completion", async (t) => {
  const options = await fixture(t);
  const server = await startOwnedServer(options);
  process.kill(
    Number(await readFile(join(options.cwd, "child.pid"), "utf8")),
    "SIGTERM",
  );
  await new Promise((r) => setTimeout(r, 50));
  assert.throws(() => server.assertAlive(), /child|exited/i);
  await assert.rejects(server.stop(), /child|exited/i);
  await assertGone(options.cwd);
});

test("caller cancellation interrupts startup and still awaits owned cleanup", async (t) => {
  const options = await fixture(t, "never");
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("synthetic cancel")),
    150,
  );
  try {
    await assert.rejects(
      startOwnedServer({ ...options, signal: controller.signal }),
      /synthetic cancel/,
    );
  } finally {
    clearTimeout(timer);
  }
  await assertGone(options.cwd);
});

test("spawn errors fail with diagnostics instead of hanging", async (t) => {
  const options = await fixture(t);
  options.cwd = join(options.cwd, "missing-directory");
  await assert.rejects(startOwnedServer(options), /ENOENT/);
});

async function runEntry(entry, cwd, env) {
  const child = spawn(
    process.execPath,
    ["--import", pathToFileURL(join(cwd, "register.mjs")).href, entry],
    {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  const timer = setTimeout(() => child.kill("SIGKILL"), 19000);
  const [code] = await once(child, "exit");
  clearTimeout(timer);
  return { code, output };
}

for (const entry of ["run.mjs", "engines.mjs"]) {
  for (const mode of ["exit", "wrong", "valid"]) {
    test(`actual browser ${entry} ${mode} readiness gates browser launch`, async (t) => {
      const options = await fixture(t, mode);
      // Intercept only Playwright: the actual entrypoint, lifecycle adapter and
      // existing imported assertions remain intact. No real browser is launched.
      await writeFile(
        join(options.cwd, "register.mjs"),
        `
        import { register } from 'node:module';
        register('./loader.mjs', import.meta.url);
      `,
      );
      await writeFile(
        join(options.cwd, "loader.mjs"),
        `
        export async function resolve(specifier, context, next) {
          if (specifier === 'playwright') return { url: new URL('./playwright.mjs', import.meta.url).href, shortCircuit: true };
          return next(specifier, context);
        }
      `,
      );
      await writeFile(
        join(options.cwd, "playwright.mjs"),
        `
        const engine = { launch() { console.error('SYNTHETIC_BROWSER_LAUNCH'); throw new Error('synthetic launch boundary'); } };
        export const chromium = engine, firefox = engine, webkit = engine;
      `,
      );
      delete options.env.TEST_PORT;
      const result = await runEntry(
        resolve(root, "tests/browser", entry),
        options.cwd,
        options.env,
      );
      assert.notEqual(result.code, 0);
      assert.equal(
        result.output.includes("SYNTHETIC_BROWSER_LAUNCH"),
        mode === "valid",
        result.output,
      );
      assert(!result.output.includes("Browser acceptance passed"));
      assert(!result.output.includes("local-network tests passed"));
      await assertGone(options.cwd);
    });
  }
}

test("actual serve.mjs exact-listen marker and bytes satisfy the production contract", async (t) => {
  const options = await fixture(t);
  await copyFile(resolve(root, "scripts/serve.mjs"), options.entrypoint);
  const server = await startOwnedServer(options);
  server.assertAlive();
  await server.stop();
});

test("split stdout chunks retain only an exact complete bind marker", async (t) => {
  const options = await fixture(t, "fragmented");
  const server = await startOwnedServer(options);
  await server.stop();
  await assertGone(options.cwd);
});

test("failure diagnostics retain bounded tails and their truncation flags", async (t) => {
  const options = await fixture(t, "verbose-wrong");
  await assert.rejects(startOwnedServer(options), (error) => {
    assert.match(error.message, /content mismatch/);
    const diagnostics = JSON.parse(
      error.message.slice(error.message.indexOf("\n") + 1),
    );
    for (const stream of ["stdout", "stderr"]) {
      assert.equal(Buffer.byteLength(diagnostics[stream]), 65536);
      assert.equal(diagnostics[stream + "Truncated"], true);
    }
    assert(error.message.length < 140000);
    return true;
  });
  await assertGone(options.cwd);
});

test("oversized expected file fails before any child launch", async (t) => {
  const options = await fixture(t);
  await writeFile(options.expectedFile, Buffer.alloc(1024 * 1024 + 1));
  await assert.rejects(startOwnedServer(options), /Expected body.*limit/);
  await assert.rejects(readFile(join(options.cwd, "child.pid")), {
    code: "ENOENT",
  });
});

test("configuration cannot expand readiness or cleanup limits or leave loopback", async (t) => {
  const options = await fixture(t);
  for (const invalid of [
    { timeoutMs: 15001 },
    { requestTimeoutMs: 1001 },
    { cleanupGraceMs: 2001 },
    { port: 0 },
    { route: "//example.com/" },
    { route: "/\\example.com/" },
  ]) {
    await assert.rejects(startOwnedServer({ ...options, ...invalid }));
  }
  await assert.rejects(readFile(join(options.cwd, "child.pid")), {
    code: "ENOENT",
  });
});
