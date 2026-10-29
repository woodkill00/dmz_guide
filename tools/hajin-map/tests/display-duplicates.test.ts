import { test } from "node:test";
import assert from "node:assert/strict";
import { captureIdentity } from "../src/workspace/usability.ts";
import {
  displayDuplicates,
  type DisplayRecord,
} from "../src/map/display-duplicates.ts";
const record = (
  key: string,
  sourceId: string,
  extra: Partial<DisplayRecord> = {},
): DisplayRecord => ({
  key,
  sourceId,
  category: "police",
  title: "Police Station",
  x: 100,
  y: 100,
  floor: null,
  build: null,
  visible: true,
  ...extra,
});
test("nearby objects from the same website stay separate and cannot be bridged by another source", () => {
  const official = [
    record("o1", "official"),
    record("o2", "official", { x: 108 }),
  ];
  assert.equal(displayDuplicates(official).suppressed.size, 0);
  const result = displayDuplicates([
    ...official,
    record("c", "codcentral", { x: 104 }),
  ]);
  assert.equal(result.suppressed.has("o1"), false);
  assert.equal(result.suppressed.has("o2"), false);
  assert.equal(result.suppressed.size, 1);
});
test("display duplicates prefer visible official records, preserve evidence and permit inspection", () => {
  const input = [
      record("z", "wzstats"),
      record("o", "official", { category: "dmz_policeStation" }),
      record("c", "codcentral"),
    ],
    before = structuredClone(input);
  assert.deepEqual([...displayDuplicates(input).suppressed], ["c", "z"]);
  assert.equal(
    displayDuplicates(input).matches.get("c"),
    "official: Police Station",
  );
  assert.equal(displayDuplicates(input, true).suppressed.size, 0);
  assert.deepEqual(input, before);
  input[1].visible = false;
  assert.deepEqual([...displayDuplicates(input).suppressed], ["z"]);
});
test("different categories, known floors/builds and distinct named nearby POIs remain separate", () => {
  const a = record("o", "official", {
    category: "poiLabel",
    title: "North building",
  });
  for (const b of [
    record("x", "codcentral", { category: "key" }),
    record("x", "codcentral", { category: "poi", title: "South building" }),
    record("x", "codcentral", { x: 125 }),
  ])
    assert.equal(displayDuplicates([a, b]).suppressed.size, 0);
  const floors = [
    record("a", "official", { floor: "1" }),
    record("b", "codcentral"),
    record("c", "wzstats", { floor: "2" }),
  ];
  assert.equal(displayDuplicates(floors).suppressed.has("c"), false);
  assert.equal(
    displayDuplicates([
      record("a", "official", { build: "1" }),
      record("b", "codcentral", { build: "2" }),
    ]).suppressed.size,
    0,
  );
});
test("matching is representative-based rather than transitive and arrival-order independent", () => {
  const input = [
    record("o", "official"),
    record("b", "codcentral", { x: 120 }),
    record("c", "wzstats", { x: 140 }),
  ];
  assert.deepEqual([...displayDuplicates(input).suppressed], ["b"]);
  assert.deepEqual([...displayDuplicates(input.reverse()).suppressed], ["b"]);
});
test("dense ambiguous input stops matching at a bounded work cap without dropping evidence", () => {
  const input = Array.from({ length: 20000 }, (_, i) =>
    record(String(i), i % 2 ? "codcentral" : "official", {
      category: "synthetic",
      title: "Distinct " + i,
    }),
  );
  const result = displayDuplicates(input);
  assert.equal(result.truncated, true);
  assert.equal(result.suppressed.size, 0);
  assert.equal(input.length, 20000);
});
test("both marker name and map location must match, including facilities at identical coordinates", () => {
  const a = record("o", "official", { title: "Police Station" });
  for (const b of [
    record("x", "codcentral", { title: "District Police Station" }),
    record("x", "codcentral", { title: "Police Stations" }),
    record("x", "codcentral", { title: "Police Station", x: 125 }),
  ])
    assert.equal(displayDuplicates([a, b]).suppressed.size, 0);
  assert.equal(
    displayDuplicates([
      a,
      record("x", "codcentral", { title: "  POLICE   STATION ", x: 105 }),
    ]).suppressed.size,
    1,
  );
  assert.equal(
    displayDuplicates([
      record("o", "official", { title: "北站" }),
      record("x", "codcentral", { title: "南站" }),
    ]).suppressed.size,
    0,
  );
});
test("capture-bound keep-separate rules survive grouping and become inactive for changed capture digests", () => {
  const a = record("a", "official", {
      identity: captureIdentity("official", "same-time", "a".repeat(64), "a"),
    }),
    b = record("b", "codcentral", {
      identity: captureIdentity("codcentral", "same-time", "b".repeat(64), "b"),
    }),
    c = record("c", "wzstats", {
      identity: captureIdentity("wzstats", "same-time", "c".repeat(64), "c"),
    });
  const separate = [{ a: a.identity!, b: b.identity! }];
  assert.equal(displayDuplicates([a, b], false, separate).suppressed.size, 0);
  const grouped = displayDuplicates([a, b, c], false, separate);
  assert.ok(
    grouped.groups.every(
      (g) => !(g.members.includes(a) && g.members.includes(b)),
    ),
  );
  b.identity = captureIdentity("codcentral", "same-time", "d".repeat(64), "b");
  assert.equal(displayDuplicates([a, b], false, separate).suppressed.size, 1);
});
