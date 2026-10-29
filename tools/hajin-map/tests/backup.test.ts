import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace } from "../src/workspace/model.ts";
import { makeAnnotation } from "../src/workspace/annotations.ts";
import {
  exportPrivateBackup,
  parsePrivateBackup,
  validateWorkspace,
} from "../src/workspace/backup.ts";
import { applySnapshot } from "../src/workspace/refresh.ts";
import { syntheticSnapshot } from "./fixtures/workspace.ts";
import { parseSnapshot } from "../src/workspace/validation.ts";
import { registerFrame } from "../src/workspace/registration.ts";
import { placedRecords } from "../src/workspace/backup.ts";
import { acceptReview } from "../src/workspace/review.ts";
import { undoReview } from "../src/workspace/review.ts";
test("private backup round-trips all custom data and manifests omitted restricted source resources", () => {
  const s = emptyWorkspace();
  s.annotations.push(makeAnnotation({ title: "My point", x: 1, y: 2 }));
  applySnapshot(
    s,
    parseSnapshot(JSON.stringify(syntheticSnapshot("official")), "official"),
    "a".repeat(64),
    null,
  );
  const backup = exportPrivateBackup(s);
  assert.equal(backup.workspace.snapshots.length, 0);
  assert.equal(backup.workspace.omittedDependencies[0].kind, "snapshot");
  const restored = parsePrivateBackup(JSON.stringify(backup));
  assert.deepEqual(restored.annotations, s.annotations);
  assert.equal(restored.omittedDependencies.length, 1);
});
test("an exported backup at the exact20MiB counted boundary can be restored", () => {
  const s = emptyWorkspace();
  for (let i = 0; i < 5000; i++)
    s.annotations.push(makeAnnotation({ title: `SYNTHETIC ${i}`, x: 1, y: 2 }));
  const limit = 20 * 1024 * 1024;
  let remaining =
    limit -
    new TextEncoder().encode(JSON.stringify(exportPrivateBackup(s))).length;
  for (const a of s.annotations) {
    const n = Math.min(4000, remaining);
    a.notes = "x".repeat(n);
    remaining -= n;
  }
  assert.equal(remaining, 0);
  const json = JSON.stringify(exportPrivateBackup(s));
  assert.equal(new TextEncoder().encode(json).length, limit);
  assert.equal(parsePrivateBackup(json).annotations.length, 5000);
  const partial = s.annotations.find((a) => a.notes.length < 4000)!;
  partial.notes += "x";
  assert.throws(() => exportPrivateBackup(s), /20MiB/);
});
test("export admission also validates projected manifest counts", () => {
  const s = emptyWorkspace();
  s.omittedDependencies = Array.from({ length: 20000 }, (_, i) => ({
    kind: "snapshot" as const,
    id: `old-${i}`,
    digest: null,
    reason: "Explicit omitted fixture",
  }));
  applySnapshot(
    s,
    parseSnapshot(JSON.stringify(syntheticSnapshot("official")), "official"),
    "a".repeat(64),
    null,
  );
  validateWorkspace(s);
  assert.throws(() => exportPrivateBackup(s), /manifest limit/i);
});
test("undo after a refresh preserves staleness and reconfirmation observes latest source heads", () => {
  const s = emptyWorkspace(),
    raw = syntheticSnapshot("official");
  raw.frame.imageDigest = "a".repeat(64) as any;
  const fit = [
      [0, 0],
      [100, 0],
      [0, 80],
    ].map(([x, y]) => ({
      x,
      y,
      targetX: x * 40,
      targetY: y * 40,
      evidence: "Synthetic fit",
    })),
    holdout = [
      [90, 70],
      [10, 10],
    ].map(([x, y]) => ({
      x,
      y,
      targetX: x * 40,
      targetY: y * 40,
      evidence: "Synthetic held-out",
    }));
  const snap = parseSnapshot(JSON.stringify(raw), "official"),
    reg = registerFrame(snap.frame, fit, holdout, "Me", true);
  applySnapshot(s, snap, "b".repeat(64), reg);
  const records = placedRecords(s),
    key = records[0].key;
  const entity = acceptReview(s, records, {
    titleKey: key,
    positionKey: key,
    categoryKey: key,
    reviewer: "Me",
  });
  acceptReview(s, records, {
    titleKey: key,
    positionKey: key,
    categoryKey: key,
    reviewer: "Me",
    entityId: entity.id,
    notes: "Reconfirmed before refresh",
  });
  const changed = structuredClone(raw);
  changed.snapshotId = "new-head";
  changed.records[0].title = "Changed source";
  applySnapshot(
    s,
    parseSnapshot(JSON.stringify(changed), "official"),
    "c".repeat(64),
    reg,
  );
  assert.equal(s.entities[0].freshness, "stale");
  undoReview(s, "Me");
  assert.equal(s.entities[0].freshness, "stale");
  const all = placedRecords(s);
  acceptReview(s, all, {
    titleKey: key,
    positionKey: key,
    categoryKey: key,
    reviewer: "Me",
    entityId: entity.id,
  });
  assert.equal(s.entities[0].freshness, "current");
  const unchanged = structuredClone(changed);
  unchanged.snapshotId = "unchanged-head";
  applySnapshot(
    s,
    parseSnapshot(JSON.stringify(unchanged), "official"),
    "d".repeat(64),
    reg,
  );
  assert.equal(s.entities[0].freshness, "current");
});
test("registered noncanonical source frames produce canonical review coordinates and portable owned corrections", () => {
  const s = emptyWorkspace(),
    raw = syntheticSnapshot("official");
  raw.frame.imageDigest = "a".repeat(64) as any;
  const fit = [
      [0, 0],
      [100, 0],
      [0, 80],
    ].map(([x, y]) => ({
      x,
      y,
      targetX: x * 40,
      targetY: y * 40,
      evidence: "Synthetic fit",
    })),
    holdout = [
      [90, 70],
      [10, 10],
    ].map(([x, y]) => ({
      x,
      y,
      targetX: x * 40,
      targetY: y * 40,
      evidence: "Synthetic held-out",
    }));
  const snap = parseSnapshot(JSON.stringify(raw), "official"),
    reg = registerFrame(snap.frame, fit, holdout, "Me", true);
  applySnapshot(s, snap, "b".repeat(64), reg);
  const placed = placedRecords(s);
  assert.equal(
    placed[0].applicability.coordinateVersion,
    "hajin-official-v1-4096",
  );
  assert.equal(
    s.snapshots[0].snapshot.records[0].applicability.coordinateVersion,
    "synthetic-v1",
  );
  acceptReview(s, placed, {
    titleKey: "authored",
    positionKey: placed[0].key,
    categoryKey: placed[0].key,
    reviewer: "Me",
    authored: {
      title: "My authored correction",
      evidence: "My observation",
      declaration: "I own this correction",
    },
  });
  validateWorkspace(s);
  const b = exportPrivateBackup(s);
  assert.equal(b.workspace.entities.length, 0);
  assert.equal(b.workspace.ownedCorrections[0].title, "My authored correction");
  assert.equal(b.workspace.decisions[0].redacted, true);
  assert.equal(b.workspace.decisions[0].after.length, 0);
  assert.deepEqual(
    parsePrivateBackup(JSON.stringify(b)).ownedCorrections,
    b.workspace.ownedCorrections,
  );
});
test("rejects unsafe restore shape, invalid graph and unbounded records before replacement", () => {
  const s = emptyWorkspace();
  const b = exportPrivateBackup(s);
  assert.throws(() =>
    parsePrivateBackup(JSON.stringify({ ...b, schemaVersion: 2 })),
  );
  const a = makeAnnotation({ title: "point", x: 2, y: 3 });
  a.iconId = "a".repeat(64);
  s.annotations.push(a);
  assert.throws(() => validateWorkspace(s));
});
