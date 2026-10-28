import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace } from "../src/workspace/model.ts";
import { defaultVisibility } from "../src/workspace/visibility.ts";
import {
  emptyUsability,
  validateUsability,
  captureIdentity,
  keepSeparate,
  savePreset,
  saveFlag,
  reminderStatus,
  readReceipt,
  writeReceipt,
  isMeaningfulMutation,
} from "../src/workspace/usability.ts";
import {
  exportPrivateBackup,
  parsePrivateBackup,
} from "../src/workspace/backup.ts";
const a = captureIdentity("official", "capture-a", "a".repeat(64), "one"),
  b = captureIdentity("codcentral", "capture-b", "b".repeat(64), "two");
test("optional usability metadata preserves old backups and round trips bounded authored work", () => {
  const old = emptyWorkspace();
  assert.deepEqual(
    parsePrivateBackup(JSON.stringify(exportPrivateBackup(old))),
    old,
  );
  const s = emptyWorkspace();
  s.usability = emptyUsability();
  savePreset(s.usability, "My locations", defaultVisibility());
  keepSeparate(s.usability, a, [b]);
  saveFlag(s.usability, b, "My own observation", true);
  validateUsability(s.usability);
  const restored = parsePrivateBackup(JSON.stringify(exportPrivateBackup(s)));
  assert.deepEqual(restored.usability, s.usability);
  assert.equal(restored.omittedDependencies.length, 2);
});
test("usability bounds reject malformed, duplicate, overlong and unsafe metadata", () => {
  const good = emptyUsability();
  for (const patch of [
    { version: 2 },
    { edits: -1 },
    { edits: Infinity },
    { extra: true },
  ])
    assert.throws(() => validateUsability({ ...good, ...patch }));
  assert.throws(() => captureIdentity("official", "same", "bad", "one"));
  const s = emptyUsability();
  for (let i = 0; i < 20; i++) savePreset(s, "View " + i, defaultVisibility());
  assert.throws(() => savePreset(s, "overflow", defaultVisibility()));
  assert.throws(() =>
    savePreset(emptyUsability(), "x".repeat(81), defaultVisibility()),
  );
  assert.throws(() => saveFlag(emptyUsability(), b, "Copied claim", false));
  assert.throws(() =>
    keepSeparate(emptyUsability(), a, [
      captureIdentity("official", "other", "c".repeat(64), "two"),
    ]),
  );
  const bad = emptyUsability();
  bad.separate = [{ a, b: a, at: new Date().toISOString() }];
  assert.throws(() => validateUsability(bad));
});
test("capture identity changes for changed digest even at the same snapshot time", () => {
  assert.notEqual(
    a,
    captureIdentity("official", "capture-a", "c".repeat(64), "one"),
  );
  const s = emptyUsability();
  keepSeparate(s, a, [b]);
  keepSeparate(s, a, [b]);
  assert.equal(s.separate.length, 1);
});
test("backup reminders use counts, first dirty age, last initiation and bounded snooze without blocking storage", () => {
  const now = Date.parse("2026-10-27T12:00:00Z"),
    day = 86400000;
  assert.equal(reminderStatus(19, null, now).due, false);
  assert.equal(reminderStatus(20, null, now).due, true);
  const receipt = {
    version: 1 as const,
    at: null,
    edits: 0,
    firstDirtyAt: new Date(now - 8 * day).toISOString(),
    snoozedUntil: null,
  };
  assert.equal(reminderStatus(1, receipt, now).due, true);
  assert.equal(
    reminderStatus(
      1,
      { ...receipt, snoozedUntil: new Date(now + day).toISOString() },
      now,
    ).due,
    false,
  );
  assert.equal(
    reminderStatus(
      21,
      { ...receipt, at: new Date(now).toISOString(), edits: 21 },
      now,
    ).due,
    false,
  );
  assert.equal(readReceipt({ getItem: () => "{bad" }), null);
  assert.equal(
    readReceipt({
      getItem: () => {
        throw Error("blocked");
      },
    }),
    null,
  );
  assert.equal(
    writeReceipt(
      {
        setItem: () => {
          throw Error("quota");
        },
      },
      receipt,
    ),
    false,
  );
  for (const label of [
    "Search saved",
    "Source visibility saved",
    "All source categories shown",
    "Category visibility saved",
    "All layers hidden",
    "Legacy source masks migrated",
  ])
    assert.equal(isMeaningfulMutation(label), false);
  for (const label of [
    "Private point saved",
    "Source discrepancy saved",
    "Saved view saved",
    "Locations kept separate",
    "Snapshot imported",
  ])
    assert.equal(isMeaningfulMutation(label), true);
});

test("invalid UTC calendar dates do not create backup ages or portable decision dates", () => {
  const receipt = {
    version: 1,
    at: "2026-02-30T00:00:00Z",
    edits: 0,
    firstDirtyAt: null,
    snoozedUntil: null,
  };
  assert.equal(readReceipt({ getItem: () => JSON.stringify(receipt) }), null);
  const s = emptyUsability();
  s.separate = [{ a, b, at: "2026-02-30T00:00:00Z" }];
  assert.throws(() => validateUsability(s));
});

test("same snapshot ID with different digest retains every exact omitted dependency", async () => {
  const { applySnapshot } = await import("../src/workspace/refresh.ts"),
    { parseSnapshot } = await import("../src/workspace/validation.ts"),
    { syntheticSnapshot } = await import("./fixtures/workspace.ts"),
    { snapshotKey } = await import("../src/workspace/model.ts");
  const s = emptyWorkspace();
  s.usability = emptyUsability();
  const identity = captureIdentity(
    "official",
    "fixture-v1",
    "a".repeat(64),
    "synthetic-point",
  );
  saveFlag(
    s.usability,
    identity,
    "My observation of the earlier capture",
    true,
  );
  s.omittedDependencies.push({
    kind: "snapshot",
    id: snapshotKey("official", "fixture-v1"),
    digest: "a".repeat(64),
    reason: "Earlier omitted capture",
  });
  applySnapshot(
    s,
    parseSnapshot(JSON.stringify(syntheticSnapshot("official")), "official"),
    "b".repeat(64),
    null,
  );
  const restored = parsePrivateBackup(JSON.stringify(exportPrivateBackup(s)));
  assert.ok(
    restored.omittedDependencies.some((d) => d.digest === "a".repeat(64)),
  );
  assert.ok(
    restored.omittedDependencies.some((d) => d.digest === "b".repeat(64)),
  );
  assert.equal(restored.usability?.flags[0].recordIdentity, identity);
});

test("reminder receipts cannot silently snooze beyond24hours or claim future backup initiation", () => {
  const now = Date.parse("2026-10-28T00:00:00Z");
  const receipt = {
    version: 1,
    at: null,
    edits: 0,
    firstDirtyAt: null,
    snoozedUntil: new Date(now + 86400000).toISOString(),
  };
  assert.ok(readReceipt({ getItem: () => JSON.stringify(receipt) }, now));
  receipt.snoozedUntil = new Date(now + 2 * 86400000).toISOString();
  assert.equal(
    readReceipt({ getItem: () => JSON.stringify(receipt) }, now),
    null,
  );
  assert.equal(
    readReceipt(
      {
        getItem: () =>
          JSON.stringify({
            ...receipt,
            snoozedUntil: null,
            at: new Date(now + 86400000).toISOString(),
          }),
      },
      now,
    ),
    null,
  );
});
