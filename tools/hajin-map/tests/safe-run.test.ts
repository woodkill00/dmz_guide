import test from "node:test";
import assert from "node:assert/strict";
import {
  extractStops,
  parsePreference,
  reconcile,
  solveRun,
  type Preference,
  type Stop,
} from "../src/safe-run/domain.ts";
import { parseSnapshot } from "../src/map/source-snapshot.ts";
import { emptyRoadGraph } from "../src/workspace/roads.ts";
import type { MarkerSource } from "../src/map/marker-sources.ts";
const source = (id = "official"): MarkerSource => ({
  id,
  name: id,
  website: "example.test",
  page: "https://example.test/map",
  snapshot: "/local.json",
  iconDirectory: "/icons/",
  recordLink: () => "",
  labelCategories: {},
});
const snapshot = (name = "Safe", x = 0.1) => ({
  schemaVersion: 1,
  sourcePage: source().page,
  capturedAt: "2026-11-04T00:00:00Z",
  categories: [
    { id: "safe", name: "Safes", group: "Loot", icon: "/icons/safe.png" },
    {
      id: "spawn",
      name: "Spawn Point",
      group: "Start",
      icon: "/icons/spawn.png",
    },
  ],
  records: [
    {
      id: "safe-1",
      name,
      category: "safe",
      mapId: "hajin",
      coordinateSpaceVersion: "hajin-official-v1-4096",
      x,
      y: 0.1,
    },
  ],
});
const stop = (key: string): Stop => ({
  key,
  name: key,
  point: [100, 100],
  sourceId: "s",
  sourceName: "Synthetic",
  sourcePage: "https://example.test",
  capturedAt: "2026-11-04",
  notes: "",
  floor: null,
  matches: [],
  nearby: 0,
});
const dataset = (n: number) => ({
  safes: Array.from({ length: n }, (_, i) => stop("s:" + i)),
  spawns: [],
  referenceOnly: 0,
});
const pref = (n = 3) => reconcile(null, dataset(n)).preference;
test("063 shared parser rejects invalid frames, unsafe categories and reference-only non-MapGenie", () => {
  for (const mutate of [
    (d: any) => (d.records[0].mapId = "bad"),
    (d: any) => (d.categories[0].icon = "https://evil.test/icon.png"),
    (d: any) => d.records.push({ ...d.records[0] }),
    (d: any) => {
      d.records[0].x = null;
      d.records[0].placement = "reference";
    },
  ]) {
    const d = snapshot();
    mutate(d);
    assert.throws(() => parseSnapshot(d, source()));
  }
});
test("063 safe extraction reuses name/coordinate/floor grouping and retains nearby uncertainty", () => {
  const a = snapshot(),
    b = snapshot("SAFE", 0.101);
  const data = extractStops([
    { source: source(), snapshot: parseSnapshot(a, source()) },
    { source: source("other"), snapshot: parseSnapshot(b, source("other")) },
  ]);
  assert.equal(data.safes.length, 1);
  assert.equal(data.safes[0].matches.length, 1);
  b.records[0].name = "Safe: Hospital";
  const separate = extractStops([
    { source: source(), snapshot: parseSnapshot(a, source()) },
    { source: source("other"), snapshot: parseSnapshot(b, source("other")) },
  ]);
  assert.equal(separate.safes.length, 2);
  assert.equal(separate.safes[0].nearby, 1);
});
test("063 no same-source merge, wrong-floor merge or distant merge", () => {
  const a = snapshot(),
    b = snapshot("Safe", 0.2);
  assert.equal(
    extractStops([
      { source: source(), snapshot: parseSnapshot(a, source()) },
      { source: source("other"), snapshot: parseSnapshot(b, source("other")) },
    ]).safes.length,
    2,
  );
  b.records[0].x = 0.1;
  (a.records[0] as any).floor = 1;
  (b.records[0] as any).floor = 2;
  assert.equal(
    extractStops([
      { source: source(), snapshot: parseSnapshot(a, source()) },
      { source: source("other"), snapshot: parseSnapshot(b, source("other")) },
    ]).safes.length,
    2,
  );
  a.records.push({ ...a.records[0], id: "safe-2" });
  assert.equal(
    extractStops([{ source: source(), snapshot: parseSnapshot(a, source()) }])
      .safes.length,
    2,
  );
});
test("063 MapGenie unpositioned safes omitted, source spawns retained and candidate bounds reject overflow", () => {
  const d: any = snapshot();
  d.records.push({
    ...d.records[0],
    id: "spawn-1",
    category: "spawn",
    name: "Spawn Point",
  });
  d.records[0] = {
    ...d.records[0],
    placement: "reference",
    x: null,
    y: null,
    sourceX: 1,
    sourceY: 2,
  };
  const data = extractStops([
    {
      source: source("mapgenie"),
      snapshot: parseSnapshot(d, source("mapgenie")),
    },
  ]);
  assert.equal(data.safes.length, 0);
  assert.equal(data.referenceOnly, 1);
  assert.equal(data.spawns.length, 1);
  const many = snapshot();
  many.records = Array.from({ length: 201 }, (_, i) => ({
    ...many.records[0],
    id: String(i),
  }));
  assert.throws(
    () =>
      extractStops([
        { source: source(), snapshot: parseSnapshot(many, source()) },
      ]),
    /200/,
  );
});
test("063 preference strict validation includes byte/frame/ID/count/start/unknown-field guards", () => {
  const p = pref();
  assert.deepEqual(parsePreference(JSON.stringify(p)), p);
  for (const mutate of [
    (p: any) => (p.extra = 1),
    (p: any) => (p.frame = "wrong"),
    (p: any) => p.known.push(p.known[0]),
    (p: any) => p.order.push("missing"),
    (p: any) => (p.start = [NaN, 2]),
    (p: any) => (p.start = [-1, 2]),
    (p: any) => (p.known = ["<script>"]),
    (p: any) => (p.spawnKey = "spawn:1"),
  ]) {
    const bad = structuredClone(p);
    mutate(bad);
    assert.throws(() => parsePreference(JSON.stringify(bad)));
  }
  assert.throws(() => parsePreference(" ".repeat(32769)));
});
test("063 reconcile preserves exclusions/manual order and adopts genuinely new candidates", () => {
  const p = pref();
  p.order = ["s:2", "s:0"];
  p.manual = true;
  const r = reconcile(p, dataset(4));
  assert.deepEqual(r.preference.order, ["s:2", "s:0", "s:3"]);
  assert.equal(r.preference.manual, true);
  assert.deepEqual(p.order, ["s:2", "s:0"]);
  assert.deepEqual(
    reconcile(r.preference, dataset(4)).preference,
    r.preference,
  );
});
test("063 fresh >64 selects none; 50selected+30new retains all50 and excludes all30new", () => {
  const fresh = reconcile(null, dataset(80));
  assert.equal(fresh.preference.order.length, 0);
  assert.match(fresh.notices.join(), /80 new/);
  const p = pref(50),
    r = reconcile(p, dataset(80));
  assert.deepEqual(r.preference.order, p.order);
  assert.equal(r.preference.known.length, 80);
  assert.match(r.notices.join(), /30 new/);
});
test("063 removed safes and removed/relocated spawns reconcile against current capture", () => {
  const p = pref();
  p.spawnKey = "spawn:1";
  p.start = [1, 2];
  const data = {
    ...dataset(2),
    spawns: [{ ...stop("spawn:1"), point: [3, 4] as [number, number] }],
  };
  const r = reconcile(p, data);
  assert.deepEqual(r.preference.order, ["s:0", "s:1"]);
  assert.deepEqual(r.preference.start, [3, 4]);
  assert.equal(r.notices.length, 2);
  const removed = reconcile(r.preference, dataset(2));
  assert.equal(removed.preference.start, null);
  assert.equal(removed.preference.spawnKey, null);
});
test("063 manual canonical starts retained and empty selections stay empty", () => {
  const p = pref();
  p.order = [];
  p.start = [20, 30];
  assert.deepEqual(reconcile(p, dataset(3)).preference, p);
});
test("063 direct optimization is deterministic open nearest-neighbor route with unique stops", () => {
  const input = {
    start: [0, 0] as [number, number],
    stops: [
      { key: "s:c", point: [300, 0] as [number, number] },
      { key: "s:a", point: [100, 0] as [number, number] },
      { key: "s:b", point: [200, 0] as [number, number] },
    ],
    mode: "direct" as const,
    optimize: true,
    graph: null,
  };
  const result = solveRun(input);
  assert.deepEqual(result.order, ["s:a", "s:b", "s:c"]);
  assert.equal(result.total, 300);
  assert.equal(result.legs.length, 3);
  assert.deepEqual(solveRun(input), result);
  const manual = solveRun({ ...input, optimize: false });
  assert.deepEqual(manual.order, ["s:c", "s:a", "s:b"]);
  assert.equal(manual.total, 600);
});
test("063 road optimization respects directed coverage, reports disconnected legs without direct fallback", () => {
  const graph = emptyRoadGraph();
  graph.nodes = [
    { id: "a", x: 100, y: 100 },
    { id: "b", x: 500, y: 100 },
  ];
  graph.edges = [
    {
      id: "ab",
      from: "a",
      to: "b",
      direction: "forward",
      blocked: false,
      points: [
        [100, 100],
        [500, 100],
      ],
    },
  ];
  const result = solveRun({
    start: [100, 100],
    stops: [
      { key: "s:far", point: [3000, 3000] },
      { key: "s:b", point: [400, 100] },
    ],
    mode: "roads",
    optimize: true,
    graph,
  });
  assert.deepEqual(result.order, ["s:b", "s:far"]);
  assert.equal(result.missing, 1);
  assert.equal(result.legs[1].road.length, 0);
  const reverse = solveRun({
    start: [400, 100],
    stops: [{ key: "s:a", point: [100, 100] }],
    mode: "roads",
    optimize: false,
    graph,
  });
  assert.equal(reverse.missing, 1);
  assert.throws(() =>
    solveRun({
      start: [0, 0],
      stops: [],
      mode: "roads",
      optimize: true,
      graph: null,
    }),
  );
});
test("063 solver validates caps and unique finite stops, graph version and mode", () => {
  const input = {
    start: [0, 0] as [number, number],
    stops: [],
    mode: "direct" as const,
    optimize: true,
    graph: null,
  };
  assert.equal(solveRun(input).total, 0);
  assert.throws(() =>
    solveRun({
      ...input,
      stops: Array.from({ length: 65 }, (_, i) => ({
        key: "s:" + i,
        point: [1, 1] as [number, number],
      })),
    }),
  );
  assert.throws(() =>
    solveRun({
      ...input,
      stops: [
        { key: "x", point: [1, 1] },
        { key: "x", point: [2, 2] },
      ],
    }),
  );
  assert.throws(() => solveRun({ ...input, start: [Infinity, 2] }));
  assert.throws(() => solveRun({ ...input, mode: "bad" as any }));
});
