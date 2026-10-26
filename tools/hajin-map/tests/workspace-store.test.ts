import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareDocument } from "../src/workspace/store.ts";
import {
  planLegacyMaskMigration,
  stageMaskMigration,
} from "../src/workspace/migration.ts";

test("storage preflight clones input and measures exact UTF-8 backup bytes", () => {
  const original = { note: "界" };
  const prepared = prepareDocument(original, (value) => value);
  original.note = "changed";
  assert.equal(prepared.data.note, "界");
  assert.equal(
    prepared.backupBytes,
    new TextEncoder().encode('{"note":"界"}').byteLength,
  );
  assert.throws(() => prepareDocument({ n: Infinity }, (value) => value));
  assert.throws(
    () =>
      prepareDocument({ note: "界".repeat(8 * 1024 * 1024) }, (value) => value),
    /byte/i,
  );
});

test("source-mask migration preserves disabled master and mixed masks, retaining unknown categories visibly", () => {
  const storage = {
    getItem: (key) =>
      key.endsWith("official")
        ? JSON.stringify({
            version: 1,
            master: false,
            selection: "mixed",
            enabled: ["one"],
          })
        : null,
  };
  const planned = planLegacyMaskMigration(
    storage,
    { official: ["one", "two", "new"] },
    ["official"],
    { official: ["one", "two"] },
  );
  assert.equal(planned.visibility.sourceEnabled.official, false);
  assert.deepEqual(planned.visibility.categoryMask.official, {
    one: true,
    two: false,
    new: true,
  });
  assert.equal(planned.marker, "source-masks-v1");
});

test("migration treats malformed or unavailable localStorage as default state without writing to it", () => {
  for (const storage of [
    { getItem: () => "{broken" },
    {
      getItem: () => {
        throw new Error("disabled");
      },
    },
  ]) {
    const plan = planLegacyMaskMigration(storage, { official: ["one"] }, [
      "official",
    ]);
    assert.equal(plan.visibility.sourceEnabled.official, true);
    assert.equal(plan.visibility.categoryMask.official.one, true);
    assert.equal(plan.warnings.length, 1);
  }
});

test("staged mask migration binds the revision and does not repeat an already committed migration", () => {
  const plan = planLegacyMaskMigration(
    { getItem: () => null },
    { official: ["one"] },
    ["official"],
  );
  const staged = stageMaskMigration({ current: null, previous: null }, plan);
  assert.equal(staged.expectedRevision, 0);
  assert.equal(staged.alreadyApplied, false);
  const history = {
    current: {
      schemaVersion: 1 as const,
      revision: 1,
      data: staged.data,
      savedAt: "2026-10-26T00:00:00Z",
    },
    previous: null,
  };
  const repeated = stageMaskMigration(history, plan);
  assert.equal(repeated.alreadyApplied, true);
  assert.deepEqual(repeated.data, staged.data);
});
