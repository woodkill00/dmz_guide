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
  rename,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ChildProcess, spawn } from "node:child_process";
import { startOwnedServer } from "../../scripts/server-readiness.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const expected =
  "<!doctype html><title>Synthetic readiness fixture</title>exact bytes\n";
// Synthetic servers deliberately exercise lifecycle failures, not public game content.
const fixtureSource = `
import { createServer } from 'node:http';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
const mode = process.env.READINESS_FIXTURE || 'valid';
writeFileSync('child.pid', String(process.pid));
if (process.env.READINESS_HANDSHAKE === '1') {
 writeFileSync('bootstrap.tmp', JSON.stringify({ pid: process.pid }));
 renameSync('bootstrap.tmp', 'bootstrap.json');
 while (!existsSync('release')) await new Promise((r) => setTimeout(r, 10));
}
const reportScenario = (phase) => {
 writeFileSync('scenario.tmp', JSON.stringify({ pid: process.pid, mode, phase }));
 renameSync('scenario.tmp', 'scenario.json');
};
if (mode === 'exit') { reportScenario('exit'); console.error('synthetic early exit'); process.exit(7); }
if (mode === 'never') { reportScenario('idle'); setInterval(() => {}, 1000); }
else {
 const server = createServer((req, res) => {
  reportScenario('request');
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
  reportScenario('listening');
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
async function fixture(t, mode = "valid", bootstrapDelayMs = 0) {
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
  await writeFile(
    join(cwd, "scripts/serve.mjs"),
    (bootstrapDelayMs
      ? `await new Promise((r) => setTimeout(r, ${bootstrapDelayMs}));\n`
      : "") + fixtureSource,
  );
  await writeFile(join(cwd, "dist/index.html"), expected);
  return {
    cwd,
    entrypoint: join(cwd, "scripts/serve.mjs"),
    expectedFile: join(cwd, "dist/index.html"),
    env: { ...process.env, READINESS_FIXTURE: mode },
    timeoutMs: 2500, // Semantic setup and outcome share this total budget.
    requestTimeoutMs: 100,
    cleanupGraceMs: 100,
  };
}
function assertPidGone(pid) {
  assert(Number.isSafeInteger(pid) && pid > 0, "owned PID must be positive");
  assert.throws(
    () => process.kill(pid, 0),
    { code: "ESRCH" },
    `Owned fixture PID ${pid} must be absent after cleanup`,
  );
}
async function assertGone(cwd, ownedPid) {
  const pid = Number(await readFile(join(cwd, "child.pid"), "utf8"));
  if (ownedPid !== undefined)
    assert.equal(pid, ownedPid, "fixture PID ownership");
  assertPidGone(pid);
}
function startupDiagnostics(error) {
  assert(error instanceof Error, "startup must reject with diagnostics");
  const diagnostics = JSON.parse(
    error.message.slice(error.message.indexOf("\n") + 1),
  );
  assert(Number.isSafeInteger(diagnostics.pid) && diagnostics.pid > 0);
  return diagnostics;
}
function diagnosticPid(error) {
  return startupDiagnostics(error).pid;
}

// Two reported semantic cases have 5s setup / 700ms outcome. Generic rejection
// cases keep setup inside their 2500ms total helper / 3s complete-failure budget.
async function withBootstrappedAttempt(
  t,
  options,
  operation,
  budget = { setupMs: 5000, startupMs: 15000, outcomeMs: 700 },
) {
  const controller = new AbortController();
  const started = budget.started ?? performance.now();
  let settled,
    handshake,
    primary,
    ownedPid,
    cleanupConfirmed = false;
  const outcome = startOwnedServer({
    ...options,
    env: { ...options.env, READINESS_HANDSHAKE: "1" },
    timeoutMs: budget.startupMs, // Test allowance never expands production caps.
    signal: controller.signal,
  }).then(
    (server) => (settled = { server }),
    (error) => (settled = { error }),
  );
  const setupError = new Error(
    `Fixture bootstrap deadline exceeded (${budget.setupMs}ms)`,
  );
  let setupExpired = false;
  const setupTimer = setTimeout(() => {
    setupExpired = true;
    controller.abort(setupError);
  }, budget.setupMs);
  try {
    while (!handshake) {
      if (setupExpired) throw setupError;
      if (settled)
        throw settled.error || new Error("Ready before fixture release");
      try {
        handshake = JSON.parse(
          await readFile(join(options.cwd, "bootstrap.json"), "utf8"),
        );
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await new Promise((r) => setTimeout(r, 10));
      }
    }
    clearTimeout(setupTimer);
    assert(
      !setupExpired && performance.now() - started < budget.setupMs,
      "fixture bootstrap is bounded",
    );
    assert(Number.isSafeInteger(handshake.pid) && handshake.pid > 0);
    assert.doesNotThrow(
      () => process.kill(handshake.pid, 0),
      "handshake child must be live",
    );
    const release = async () => {
      await writeFile(join(options.cwd, "release.tmp"), "go");
      await rename(
        join(options.cwd, "release.tmp"),
        join(options.cwd, "release"),
      );
    };
    const afterTrigger = async (trigger) => {
      const outcomeStarted = performance.now();
      const outcomeMs = budget.overallMs
        ? Math.max(0, budget.overallMs - (outcomeStarted - started))
        : budget.outcomeMs;
      const timeoutError = new Error(
        budget.overallMs
          ? `Fixture overall deadline exceeded (${budget.overallMs}ms)`
          : `Fixture adversarial deadline exceeded (${budget.outcomeMs}ms)`,
      );
      let timer;
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort(timeoutError);
          reject(timeoutError);
        }, outcomeMs);
      });
      try {
        const result = await Promise.race([
          Promise.resolve()
            .then(trigger)
            .then(() => outcome),
          deadline,
        ]);
        if (performance.now() - outcomeStarted >= outcomeMs) throw timeoutError;
        return result;
      } finally {
        clearTimeout(timer);
      }
    };
    await operation({ controller, release, afterTrigger, handshake });
  } catch (error) {
    primary = error;
  } finally {
    clearTimeout(setupTimer);
    controller.abort(new Error("Synthetic fixture cleanup"));
    const result = await outcome;
    try {
      if (result.server) await result.server.stop(primary);
      ownedPid = result.server
        ? result.server.diagnostics().pid
        : diagnosticPid(result.error);
      if (handshake) {
        assert.equal(
          handshake.pid,
          ownedPid,
          "handshake must identify helper-owned PID",
        );
        await assertGone(options.cwd, ownedPid);
      } else {
        // No PID file is required to prove death of the helper's actual child.
        assertPidGone(ownedPid);
      }
      cleanupConfirmed = true;
    } catch (error) {
      primary = primary
        ? new AggregateError(
            [primary, error],
            "Fixture assertion and owned cleanup both failed",
          )
        : error;
    }
    if (primary) {
      primary.fixtureCleanup = { pid: ownedPid, confirmed: cleanupConfirmed };
      t.diagnostic(
        "Bootstrap fixture evidence: " +
          JSON.stringify({
            elapsedMs: Math.round(performance.now() - started),
            handshakePid: handshake?.pid,
            ownedPid,
            cleanupConfirmed,
            startupError: result.error?.message.slice(0, 4096),
            assertionError: primary.message.slice(0, 1024),
          }),
      );
    }
  }
  if (primary) throw primary;
}
async function failure(t, mode, pattern, options) {
  options ??= await fixture(t, mode);
  const started = performance.now();
  let rejection;
  try {
    await withBootstrappedAttempt(
      t,
      options,
      async ({ release, afterTrigger, handshake }) => {
        const result = await afterTrigger(release);
        rejection = result.error;
        const diagnostics = startupDiagnostics(rejection);
        const scenario = JSON.parse(
          await readFile(join(options.cwd, "scenario.json"), "utf8"),
        );
        const phase =
          mode === "exit"
            ? "exit"
            : mode === "never"
              ? "idle"
              : mode.endsWith("marker")
                ? "listening"
                : "request";
        assert.deepEqual(scenario, { pid: handshake.pid, mode, phase });
        assert.equal(
          scenario.pid,
          diagnostics.pid,
          "executed scenario ownership",
        );
        assert.match(rejection.message, pattern);
        if (["headers", "body"].includes(mode)) {
          assert.match(diagnostics.lastProbe, /Request timeout after 100ms/);
        }
      },
      { setupMs: 2500, startupMs: options.timeoutMs, overallMs: 3000, started },
    );
    assert(
      performance.now() - started < 3000,
      "failure and cleanup are bounded",
    );
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

for (const bootstrapDelayMs of [0, 1100]) {
  test(
    "occupied port cannot borrow unrelated HTTP 200 or stop its owner" +
      (bootstrapDelayMs ? " with delayed bootstrap" : ""),
    async (t) => {
      let probes = 0;
      const unrelated = createServer((req, res) => {
        probes++;
        res.end(expected);
      });
      unrelated.listen(0, "127.0.0.1");
      await once(unrelated, "listening");
      t.after(() => new Promise((r) => unrelated.close(r)));
      const options = await fixture(t, "valid", bootstrapDelayMs);
      options.port = unrelated.address().port;
      await withBootstrappedAttempt(
        t,
        options,
        async ({ release, afterTrigger }) => {
          const result = await afterTrigger(release);
          assert(result.error instanceof Error);
          assert.match(result.error.message, /EADDRINUSE/);
        },
      );
      assert.equal(probes, 0, "no probe before owned successful-bind marker");
      assert.equal(
        await (await fetch(`http://127.0.0.1:${options.port}`)).text(),
        expected,
      );
    },
  );
}

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

test("allowed delayed close preserves semantic error within the overall failure bound", async (t) => {
  const options = await fixture(t, "headers");
  const emit = ChildProcess.prototype.emit;
  let delayed = 0;
  t.mock.method(ChildProcess.prototype, "emit", function (event, ...args) {
    if (event === "close" && this.spawnargs?.[1] === options.entrypoint) {
      delayed++;
      setTimeout(() => emit.call(this, event, ...args), 150);
      return true;
    }
    return emit.call(this, event, ...args);
  });
  await failure(t, "headers", /request.*timeout/i, options);
  assert.equal(delayed, 1, "only the owned real close event is delayed");
  t.diagnostic(
    "Simulated 150ms owned-child close delay retained exact request-timeout evidence and real ESRCH cleanup proof",
  );
});

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

for (const bootstrapDelayMs of [0, 1100]) {
  test(
    "caller cancellation interrupts startup and still awaits owned cleanup" +
      (bootstrapDelayMs ? " with delayed bootstrap" : ""),
    async (t) => {
      const options = await fixture(t, "never", bootstrapDelayMs);
      await withBootstrappedAttempt(
        t,
        options,
        async ({ controller, afterTrigger }) => {
          const result = await afterTrigger(() =>
            controller.abort(new Error("synthetic cancel")),
          );
          assert(result.error instanceof Error);
          assert.match(result.error.message, /synthetic cancel/);
        },
      );
    },
  );
}

test("fixture bootstrap timeout is fatal and proves the actual owned PID is gone", async (t) => {
  const options = await fixture(t, "never", 6000);
  await assert.rejects(
    withBootstrappedAttempt(t, options, () => {
      assert.fail("timed-out bootstrap must not continue");
    }),
    (error) => {
      assert.match(error.message, /Fixture bootstrap deadline exceeded/);
      assert.equal(error.fixtureCleanup.confirmed, true);
      return true;
    },
  );
  // This absence is scenario evidence, not the process-death proof above.
  await assert.rejects(readFile(join(options.cwd, "child.pid")), {
    code: "ENOENT",
  });
});

test("fixture outcome timeout is fatal and still proves owned cleanup", async (t) => {
  const options = await fixture(t, "never");
  await assert.rejects(
    withBootstrappedAttempt(t, options, async ({ release, afterTrigger }) => {
      await afterTrigger(release);
      assert.fail("timed-out outcome must not continue");
    }),
    (error) => {
      assert.match(error.message, /Fixture adversarial deadline exceeded/);
      assert.equal(error.fixtureCleanup.confirmed, true);
      return true;
    },
  );
});

test("generic overall deadline remains fatal when a fixture trigger never settles", async (t) => {
  const options = await fixture(t, "never");
  const started = performance.now();
  await assert.rejects(
    withBootstrappedAttempt(
      t,
      options,
      async ({ afterTrigger }) => {
        await afterTrigger(() => new Promise(() => {}));
        assert.fail("an unresolved trigger must not pass");
      },
      { setupMs: 2500, startupMs: 2500, overallMs: 3000, started },
    ),
    (error) => {
      assert.match(
        error.message,
        /Fixture overall deadline exceeded \(3000ms\)/,
      );
      assert.equal(error.fixtureCleanup.confirmed, true);
      return true;
    },
  );
  assert(
    performance.now() - started < 4000,
    "expired outer deadline still awaits bounded cleanup",
  );
});

test("cold bootstrap retains the 700ms startup deadline and actual owned PID death proof", async (t) => {
  const options = await fixture(t, "never", 1100);
  const started = performance.now();
  let ownedPid;
  await assert.rejects(
    startOwnedServer({ ...options, timeoutMs: 700 }),
    (error) => {
      assert.match(error.message, /Startup deadline exceeded \(700ms\)/);
      const diagnostics = startupDiagnostics(error);
      assert.equal(diagnostics.phase, "bind");
      assert.equal(diagnostics.stdout, "");
      assert.equal(diagnostics.stderr, "");
      ownedPid = diagnostics.pid;
      return true;
    },
  );
  assertPidGone(ownedPid);
  assert(
    performance.now() - started < 3000,
    "cold failure and cleanup are bounded",
  );
  // Absence proves this scenario did not execute, never that the child died.
  await assert.rejects(readFile(join(options.cwd, "child.pid")), {
    code: "ENOENT",
  });
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
