// Synthetic source/profile shapes; no browser database or private capture reads.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSnapshot } from "../src/map/source-snapshot.ts";
import { adaptOfficial } from "../src/workspace/import.ts";
import { explorerRecords } from "../src/workspace/explorer-index.ts";
import { emptyWorkspace } from "../src/workspace/model.ts";
import { isQuarantinedHajinRecord } from "../src/map/source-scope.ts";
const source = {
  id: "codcentral",
  name: "SYNTHETIC source",
  page: "https://codcentral.net/blog/mw4-dmz-map/",
  website: "codcentral.net",
  snapshot: "/synthetic/markers.json",
  iconDirectory: "/synthetic/icons/",
  labelCategories: {},
  recordLink: () => "",
};
const raw = () => ({
  schemaVersion: 1,
  sourcePage: source.page,
  capturedAt: "2026-11-28T00:00:00Z",
  categories: [
    {
      id: "safe",
      name: "Synthetic safe",
      group: "Synthetic",
      icon: "/synthetic/icons/safe.svg",
    },
  ],
  records: ["hajin-safe", "x01-entrance", "x01-deep-vault"].map((id) => ({
    id,
    name: "SYNTHETIC " + id,
    category: "safe",
    mapId: "hajin",
    coordinateSpaceVersion: "hajin-official-v1-4096",
    x: 0.5,
    y: 0.5,
  })),
});
test("112 old source captures exclude only evidence-bound X01 interiors without mutating input", () => {
  const input = raw(),
    before = JSON.stringify(input);
  const clean = parseSnapshot(input, source);
  assert.deepEqual(
    clean.records.map((r) => r.id),
    ["hajin-safe", "x01-entrance"],
  );
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(
    adaptOfficial(input, "codcentral").records.map((r) => r.id),
    ["hajin-safe", "x01-entrance"],
  );
  assert.equal(JSON.stringify(input), before);
  assert.equal(isQuarantinedHajinRecord("wzstats", "x01-deep-vault"), false);
  assert.equal(isQuarantinedHajinRecord("codcentral", "x01-entrance"), false);
  assert.equal(
    isQuarantinedHajinRecord("codcentral", "x01-deep-vault", "custom"),
    false,
  );
  assert.equal(
    isQuarantinedHajinRecord("codcentral", "x01-deep-vault", "reviewed"),
    false,
  );
});
test("112 saved and legacy source views cannot restore known wrong-map markers", () => {
  const state = emptyWorkspace();
  const legacy = {
    id: "codcentral",
    getSnapshot: () => raw(),
    getSnapshotDigest: () => "a".repeat(64),
  };
  assert.deepEqual(
    explorerRecords(state, [legacy]).map((r) => r.id),
    ["hajin-safe", "x01-entrance"],
  );
  const snapshot = structuredClone(adaptOfficial(raw(), "codcentral"));
  snapshot.records.push({ ...snapshot.records[0], id: "x01-deep-vault" });
  state.snapshots.push({
    key: "synthetic",
    snapshot,
    digest: "a".repeat(64),
    legacy: false,
  } as any);
  const before = JSON.stringify(state);
  const rows = explorerRecords(state, []);
  assert.deepEqual(
    rows.map((r) => r.id),
    ["hajin-safe", "x01-entrance"],
  );
  assert.equal(JSON.stringify(state), before);
});
