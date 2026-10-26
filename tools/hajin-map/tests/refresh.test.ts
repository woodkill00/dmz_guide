import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, snapshotKey } from "../src/workspace/model.ts";
import { refreshPreview, applySnapshot } from "../src/workspace/refresh.ts";
import { parseSnapshot } from "../src/workspace/validation.ts";
import { syntheticSnapshot } from "./fixtures/workspace.ts";
test("refresh retains old immutable evidence and reports changed/missing records without changing authored data", () => {
  const s = emptyWorkspace(),
    one = parseSnapshot(
      JSON.stringify(syntheticSnapshot("official")),
      "official",
    );
  applySnapshot(s, one, "a".repeat(64), null);
  const changed = syntheticSnapshot("official");
  changed.snapshotId = "new";
  changed.records[0].title = "Changed source claim";
  const two = parseSnapshot(JSON.stringify(changed), "official");
  assert.equal(refreshPreview(s, two).changed.length, 1);
  applySnapshot(s, two, "b".repeat(64), null);
  assert.equal(s.snapshots.length, 2);
  assert.equal(
    s.snapshots[0].snapshot.records[0].title,
    "SYNTHETIC TEST POINT",
  );
  assert.equal(s.snapshots[1].key, snapshotKey("official", "new"));
  assert.throws(() => applySnapshot(s, two, "c".repeat(64), null));
});
test("changed third snapshot marks entities referencing the first snapshot stale", () => {
  const s = emptyWorkspace(),
    first = syntheticSnapshot("official");
  applySnapshot(
    s,
    parseSnapshot(JSON.stringify(first), "official"),
    "a".repeat(64),
    null,
  );
  const ref = JSON.stringify([
    "official",
    first.snapshotId,
    first.records[0].id,
  ]);
  s.entities.push({
    id: "synthetic-entity",
    refs: [ref],
    freshness: "current",
  } as any);
  applySnapshot(
    s,
    parseSnapshot(
      JSON.stringify({ ...first, snapshotId: "unchanged-second" }),
      "official",
    ),
    "b".repeat(64),
    null,
  );
  assert.equal(s.entities[0].freshness, "current");
  const third = structuredClone(first);
  third.snapshotId = "changed-third";
  third.records[0].title = "Changed third claim";
  applySnapshot(
    s,
    parseSnapshot(JSON.stringify(third), "official"),
    "c".repeat(64),
    null,
  );
  assert.equal(s.entities[0].freshness, "stale");
});
