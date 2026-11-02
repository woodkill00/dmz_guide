import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyKeyWorkspace,
  validateKeyWorkspace,
  changeKeyStock,
  toggleKeyList,
  keyStock,
  keyReadiness,
  keyTripPlan,
  keyBackup,
  parseKeyBackup,
  archivedKeyState,
} from "../../src/domain/key-workspace.mjs";
import {
  keyWorkspaceData,
  gridReferences,
} from "../../src/ui/key-workspace-view.mjs";
import { allKeys, keyAccess } from "../../src/content/key-access.mjs";
import { keyRoomDetails } from "../../src/content/key-room-details.mjs";
const catalog = JSON.parse(keyWorkspaceData().match(/>(.*)<\/script>/s)[1]);
const lab = catalog.uses.find((u) => u.keyId === "hospital-chemical-lab");
const locker = catalog.uses.find(
  (u) => u.keyId === "hospital-chemical-lockers",
);
test("057 stock changes are immutable, bounded, and reset recorded uses", () => {
  const a = emptyKeyWorkspace(),
    b = changeKeyStock(a, "hospital-chemical-lab", 2);
  assert.equal(keyStock(a, "hospital-chemical-lab").quantity, 0);
  b.stock["hospital-chemical-lab"].remainingUses = 4;
  assert.equal(
    changeKeyStock(b, "hospital-chemical-lab", 3).stock["hospital-chemical-lab"]
      .remainingUses,
    null,
  );
  assert.equal(
    changeKeyStock(b, "hospital-chemical-lab", 2).stock["hospital-chemical-lab"]
      .remainingUses,
    4,
  );
  for (const q of [-1, 1000, 0.5, NaN])
    assert.throws(() => changeKeyStock(a, "a", q));
  for (const id of ["__proto__", "constructor", "A", "a/../b"])
    assert.throws(() => changeKeyStock(a, id, 1));
});
test("057 required readiness counts owned/exhausted parents without consuming", () => {
  let s = changeKeyStock(emptyKeyWorkspace(), locker.keyId, 1);
  assert.deepEqual(keyReadiness(s, locker, catalog).missingIds, [lab.keyId]);
  s = changeKeyStock(s, lab.keyId, 1);
  assert.equal(keyReadiness(s, locker, catalog).state, "recorded-ready");
  assert(
    keyReadiness(s, locker, catalog).uncertainties.some((x) =>
      x.includes("unrecorded"),
    ),
  );
  s.stock[lab.keyId].remainingUses = 0;
  assert.deepEqual(keyReadiness(s, locker, catalog).missingIds, [lab.keyId]);
  assert.equal(s.stock[locker.keyId].quantity, 1);
});
test("057 trip is topological, deduplicated, portable and retains unavailable IDs", () => {
  let s = toggleKeyList(emptyKeyWorkspace(), "targetUseIds", locker.id);
  s = toggleKeyList(s, "targetUseIds", lab.id);
  s = toggleKeyList(s, "targetUseIds", "historical-key--old-location-f1");
  s = toggleKeyList(s, "favorites", "historical-key");
  const p = keyTripPlan(s, catalog);
  assert.deepEqual(
    p.ordered.map((u) => u.id),
    [lab.id, locker.id],
  );
  assert.equal(p.keyNeeds.length, 2);
  assert.equal(p.missing.length, 2);
  assert.deepEqual(p.unavailableTargets, ["historical-key--old-location-f1"]);
  assert.deepEqual(parseKeyBackup(keyBackup(s)), s);
  assert.deepEqual(archivedKeyState(s, catalog), {
    keys: ["historical-key"],
    uses: ["historical-key--old-location-f1"],
  });
});
test("057 possible links and reportedly unlocked doors are never required key guarantees", () => {
  const use = {
    id: "test--door-f1",
    keyId: "test",
    requiredUses: [],
    possibleUses: [lab.id],
    status: "unknown",
    lockState: "unlocked-reported",
  };
  const c = { keys: [{ id: "test", name: "Synthetic" }], uses: [use, lab] };
  const s = toggleKeyList(emptyKeyWorkspace(), "targetUseIds", use.id);
  assert.equal(keyReadiness(s, use, c).state, "unverified");
  assert.deepEqual(keyReadiness(s, use, c).missingIds, []);
  assert.equal(keyTripPlan(s, c).missing.length, 0);
  assert.equal(keyTripPlan(s, c).keyNeeds[0].optional, true);
});
test("057 untrusted backup rejects wrong kind, duplicate fields, prototypes, oversize and duplicate IDs", () => {
  for (const raw of [
    '{"kind":"profile","version":1,"workspace":{}}',
    '{"kind":"x","kind":"x"}',
    '{"__proto__":{}}',
    " ".repeat(1048577),
  ])
    assert.throws(() => parseKeyBackup(raw));
  const s = emptyKeyWorkspace();
  s.favorites = ["test", "test"];
  assert.throws(() => validateKeyWorkspace(s));
  s.favorites = [];
  s.targetUseIds = Array.from({ length: 33 }, (_, i) => `test--door-${i}`);
  assert.throws(() => validateKeyWorkspace(s));
});
test("057 source accounting covers every imported row and preserves disagreements", () => {
  assert.equal(allKeys.length, 62);
  assert.equal(keyAccess.uses.length, 71);
  assert.equal(keyAccess.groups.length, 21);
  const counts = {};
  for (const c of keyRoomDetails.comparisons)
    counts[c.status] = (counts[c.status] || 0) + 1;
  assert.deepEqual(counts, {
    "new-record": 42,
    "name-match": 15,
    "grid-conflict": 2,
    "unresolved-identity": 1,
  });
  assert.equal(Object.keys(keyRoomDetails.records).length, 62);
  const mill = Object.entries(keyRoomDetails.records).find(([id]) =>
    id.includes("mill-explosives"),
  )[1];
  assert.equal(mill.lockState, "unlocked-reported");
  assert(keyRoomDetails.records["netshin-it-room"].floor.includes("14"));
  assert.deepEqual(locker.requiredUses, [lab.id]);
});
test("057 map links bound actual grid areas and never invent unknown coordinates", () => {
  assert.deepEqual(gridReferences("F5"), ["F5"]);
  assert.deepEqual(gridReferences("B–C3"), ["B3", "C3"]);
  for (const v of ["Unknown", "Z1", "F0", "F10", "<script>"])
    assert.deepEqual(gridReferences(v), []);
});
