import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import * as store from "../../scripts/author-store.mjs";
import { diagnose } from "../../scripts/diagnose.mjs";
const hash = (b) => createHash("sha256").update(b).digest("hex");
test("read-only retained inventory verifies receipts, bytes and pending blockers", async () => {
  const root = await mkdtemp(join(tmpdir(), "dmz-inventory-"));
  try {
    const tx = "a".repeat(32),
      base = join(root, ".author-state/transactions", tx),
      bytes = Buffer.from("synthetic");
    await mkdir(join(base, "after"), { recursive: true });
    await writeFile(join(base, "after/0.bin"), bytes);
    const receipt = JSON.stringify({
      state: "committed",
      transactionId: tx,
      paths: [
        {
          path: "content/catalog/manifest.json",
          beforeHash: null,
          afterHash: hash(bytes),
        },
      ],
    });
    await writeFile(join(base, "outcome.json"), receipt);
    assert.equal(typeof store.inspectRecoveryStorage, "function");
    const result = await store.inspectRecoveryStorage({ root });
    assert.equal(result.complete, true);
    assert.equal(result.transactionCount, 1);
    assert.equal(result.fileCount, 2);
    assert.equal(result.bytes, bytes.length + Buffer.byteLength(receipt));
    assert.equal(result.transactions[0].archiveEligible, true);
    const report = await diagnose({ root, role: "author" });
    assert(
      report.some(({ message }) => message.includes("1 transactions, 2 files")),
    );
    assert(
      report.some(({ message }) =>
        message.includes("manual archival review only (not deletion)"),
      ),
    );
    assert.equal(
      await readFile(join(base, "after/0.bin"), "utf8"),
      "synthetic",
    );
    assert.equal(await readFile(join(base, "outcome.json"), "utf8"), receipt);
    await writeFile(join(root, ".author-state/journal.json"), "pending");
    assert.equal(
      (await store.inspectRecoveryStorage({ root })).transactions[0]
        .archiveEligible,
      false,
    );
    await rm(join(root, ".author-state/journal.json"));
    await writeFile(join(root, ".author-state/current.lock"), "unknown owner");
    assert.equal(
      (await store.inspectRecoveryStorage({ root })).transactions[0]
        .archiveEligible,
      false,
    );
    await rm(join(root, ".author-state/current.lock"));
    await writeFile(join(base, "after/0.bin"), "tampered");
    assert.equal(
      (await store.inspectRecoveryStorage({ root })).transactions[0]
        .archiveEligible,
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("unknown retained paths and bounded excessive transactions never claim complete", async () => {
  const root = await mkdtemp(join(tmpdir(), "dmz-inventory-limit-"));
  try {
    await mkdir(join(root, ".author-state/transactions/not-a-transaction"), {
      recursive: true,
    });
    const result = await store.inspectRecoveryStorage({ root });
    assert.equal(result.complete, false);
    assert.match(result.warnings.join(" "), /Unsupported/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("empty repository inspection does not create state", async () => {
  const root = await mkdtemp(join(tmpdir(), "dmz-inventory-empty-"));
  try {
    const result = await store.inspectRecoveryStorage({ root });
    assert.equal(result.complete, true);
    assert.equal(result.bytes, 0);
    await assert.rejects(readFile(join(root, ".author-state/journal.json")), {
      code: "ENOENT",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("inventory rejects symlinks, oversized backups, and deterministic read races", async (t) => {
  const fs = await import("node:fs/promises");
  const { syncBuiltinESMExports } = await import("node:module");
  const root = await mkdtemp(join(tmpdir(), "dmz-inventory-negative-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tx = "b".repeat(32),
    base = join(root, ".author-state/transactions", tx),
    backup = join(base, "after/0.bin");
  await mkdir(join(base, "after"), { recursive: true });
  await writeFile(backup, "original");
  const receipt = {
    state: "committed",
    transactionId: tx,
    paths: [
      {
        path: "content/catalog/manifest.json",
        beforeHash: null,
        afterHash: hash("original"),
      },
    ],
  };
  await writeFile(join(base, "outcome.json"), JSON.stringify(receipt));
  const originalLstat = fs.default.lstat;
  let calls = 0;
  fs.default.lstat = async function (path, ...args) {
    if (String(path) === backup && ++calls === 2)
      await writeFile(backup, "changed-size");
    return originalLstat.call(this, path, ...args);
  };
  syncBuiltinESMExports();
  try {
    const result = await store.inspectRecoveryStorage({ root });
    assert.equal(result.complete, false);
    assert.equal(result.transactions[0].archiveEligible, false);
  } finally {
    fs.default.lstat = originalLstat;
    syncBuiltinESMExports();
  }
  await writeFile(backup, "original");
  const handle = await fs.open(backup, "w");
  await handle.truncate(64 * 1024 * 1024 + 1);
  await handle.close();
  const large = await store.inspectRecoveryStorage({ root });
  assert.equal(large.complete, false);
  assert.equal(large.transactions[0].archiveEligible, false);
  await writeFile(backup, "original");
  try {
    await fs.symlink(backup, join(base, "link.bin"));
  } catch (error) {
    if (["EPERM", "EACCES"].includes(error.code)) {
      t.diagnostic(
        "Symlink creation unavailable; other negative cases executed",
      );
      return;
    }
    throw error;
  }
  const linked = await store.inspectRecoveryStorage({ root });
  assert.equal(linked.complete, false);
  assert.equal(linked.transactions[0].archiveEligible, false);
});
test("excess transaction inventory is explicitly partial", async () => {
  const root = await mkdtemp(join(tmpdir(), "dmz-inventory-count-"));
  try {
    const base = join(root, ".author-state/transactions");
    await mkdir(base, { recursive: true });
    for (let i = 0; i < 1001; i++)
      await mkdir(join(base, i.toString(16).padStart(32, "0")));
    const result = await store.inspectRecoveryStorage({ root });
    assert.equal(result.complete, false);
    assert.match(result.warnings.join(" "), /transaction limit/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
