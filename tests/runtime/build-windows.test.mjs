import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
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
    const command = `$ErrorActionPreference='Stop'; $f=[System.IO.File]::Open('${old.replaceAll("'", "''")}', [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::None); try { [Console]::WriteLine('READY'); [Console]::ReadLine() | Out-Null } finally { $f.Dispose() }`;
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", command],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let diagnostics = "",
      failure,
      published;
    child.stderr.on("data", (bytes) => {
      diagnostics = (diagnostics + bytes).slice(-4096);
    });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new Error(
                "Windows handle fixture did not become ready: " + diagnostics,
              ),
            ),
          5000,
        );
        let output = "";
        const finish = (error) => {
          clearTimeout(timer);
          error ? reject(error) : resolve();
        };
        child.once("error", finish);
        child.once("exit", (code) =>
          finish(
            new Error(`Windows handle fixture exited ${code}: ${diagnostics}`),
          ),
        );
        child.stdout.on("data", (bytes) => {
          output = (output + bytes).slice(-4096);
          if (output.includes("READY")) finish();
        });
      });
      try {
        published = await publishBuild({
          root,
          generate: (dist) => writeFile(join(dist, "index.html"), "NEW reader"),
          validate: async () => {},
        });
      } catch (error) {
        failure = error;
      }
    } finally {
      child.stdin.end("\n");
      if (child.exitCode === null) {
        await new Promise((resolve) => {
          const timer = setTimeout(() => {
            child.kill();
            resolve();
          }, 2000);
          child.once("exit", () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
    }
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
