import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { publishBuild } from "../../scripts/build-output.mjs";

// Unlike synthetic EPERM injection, this exercises native Windows file-sharing
// semantics. Linux cannot supply evidence for this platform-specific operation.
test(
  "native Windows exclusive open file preserves OLD on blocked promotion",
  { skip: process.platform !== "win32", timeout: 15000 },
  async (t) => {
    const root = await mkdtemp(join(tmpdir(), "dmz-windows-promotion-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, "dist"));
    const old = join(root, "dist/index.html");
    await writeFile(old, "OLD reader held by native Windows handle");
    // Hosted Windows already runs its steps with this installed host. Keep the
    // existing Windows PowerShell dependency when PowerShell 7 is not installed.
    const pwsh = join(
      process.env.ProgramFiles || "C:\\Program Files",
      "PowerShell",
      "7",
      "pwsh.exe",
    );
    const executable = existsSync(pwsh) ? pwsh : "powershell.exe";
    const command = `$ErrorActionPreference='Stop'; [Console]::WriteLine('SCRIPT_STARTED ' + $PSVersionTable.PSVersion); $f=[System.IO.File]::Open('${old.replaceAll("'", "''")}', [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::None); try { [Console]::WriteLine('READY'); [Console]::ReadLine() | Out-Null } finally { $f.Dispose() }`;
    const started = performance.now();
    const elapsed = () => Math.round(performance.now() - started);
    const state = {
      executable,
      spawnedMs: null,
      scriptStartedMs: null,
      readyMs: null,
      forcedAtMs: null,
      exited: null,
      launchError: null,
      stdinError: null,
      stdout: "",
      stderr: "",
    };
    const child = spawn(
      executable,
      ["-NoProfile", "-NonInteractive", "-Command", command],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const describe = () => JSON.stringify({ pid: child.pid, ...state });
    child.once("spawn", () => (state.spawnedMs = elapsed()));
    child.once("error", (error) => (state.launchError = error.message));
    child.once("exit", (code, signal) => {
      state.exited = { atMs: elapsed(), code, signal };
    });
    child.stdin.on("error", (error) => (state.stdinError = error.message));
    child.stderr.on("data", (bytes) => {
      state.stderr = (state.stderr + bytes).slice(-4096);
    });
    child.stdout.on("data", (bytes) => {
      state.stdout = (state.stdout + bytes).slice(-4096);
      if (/(?:^|\n)SCRIPT_STARTED /.test(state.stdout))
        state.scriptStartedMs ??= elapsed();
      if (/(?:^|\n)READY\r?\n/.test(state.stdout)) state.readyMs ??= elapsed();
    });
    const waitForExit = (milliseconds) => {
      if (state.exited || (state.launchError && !child.pid))
        return Promise.resolve(true);
      return new Promise((resolve) => {
        const finish = (observed) => {
          clearTimeout(timer);
          child.off("exit", onExit);
          resolve(observed);
        };
        const onExit = () => finish(true);
        const timer = setTimeout(() => finish(false), milliseconds);
        child.once("exit", onExit);
      });
    };
    const assertHolding = () => {
      assert.equal(
        child.exitCode,
        null,
        "Fixture exited while holding: " + describe(),
      );
      assert.equal(
        child.signalCode,
        null,
        "Fixture terminated while holding: " + describe(),
      );
    };
    let failure, published;
    try {
      await new Promise((resolve, reject) => {
        const finish = (error) => {
          clearTimeout(timer);
          child.off("error", onError);
          child.off("exit", onExit);
          child.stdout.off("data", onData);
          error ? reject(error) : resolve();
        };
        const onError = (error) =>
          finish(new Error(error.message + ": " + describe()));
        const onExit = () =>
          finish(
            new Error(
              "Windows handle fixture exited before READY: " + describe(),
            ),
          );
        const onData = () => {
          if (state.readyMs !== null) finish();
        };
        const timer = setTimeout(
          () =>
            finish(
              new Error(
                "Windows handle fixture did not become ready: " + describe(),
              ),
            ),
          5000,
        );
        child.once("error", onError);
        child.once("exit", onExit);
        child.stdout.on("data", onData);
      });
      assertHolding();
      try {
        published = await publishBuild({
          root,
          generate: (dist) => writeFile(join(dist, "index.html"), "NEW reader"),
          validate: async () => {},
        });
      } catch (error) {
        failure = error;
      }
      assertHolding();
    } finally {
      child.stdin.end("\n");
      try {
        if (!(await waitForExit(2000))) {
          state.forcedAtMs = elapsed();
          child.kill();
          if (!(await waitForExit(1000)))
            throw new Error(
              "Windows handle fixture cleanup exit unconfirmed: " + describe(),
            );
        }
      } finally {
        t.diagnostic("Windows handle fixture lifecycle: " + describe());
      }
    }
    assert.equal(
      state.exited?.code,
      0,
      "Fixture did not exit normally: " + describe(),
    );
    assert.equal(
      state.forcedAtMs,
      null,
      "Fixture required forced cleanup: " + describe(),
    );
    if (published) {
      t.skip(
        "This Windows filesystem allowed directory promotion despite an exclusive child file handle; synthetic rename/rollback tests remain required evidence.",
      );
      return;
    }
    assert(failure, "expected native rename refusal");
    assert.match(failure.message, /OLD build retained at/);
    assert.equal(
      await readFile(old, "utf8"),
      "OLD reader held by native Windows handle",
    );
    t.diagnostic(
      "Native Windows file-sharing denial exercised the actual directory rename failure path.",
    );
  },
);
