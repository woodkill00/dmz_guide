import { test } from "node:test";
import assert from "node:assert/strict";
import { suggest } from "../src/workspace/compare.ts";
const point = (
  id: string,
  source = "official",
  floor: string | null = null,
) => ({
  key: id,
  sourceId: source,
  snapshotId: "s",
  recordId: id,
  title: id,
  category: "Cache",
  x: 100,
  y: 100,
  applicability: {
    mapId: "hajin",
    coordinateVersion: "hajin-official-v1-4096",
    gameBuild: null,
    floor,
  },
  lineages: [],
  registrationId: "r",
  mappingVersion: 1,
  activity: "unknown",
});
test("candidate suggestions are manual, bounded and exclude conflicting floors and same snapshots", () => {
  const a = point("a"),
    b = point("b", "codcentral"),
    c = point("c", "codcentral", "upper"),
    d = point("d", "official", "lower");
  assert.equal(suggest([a, b] as any).pairs.length, 1);
  assert.equal(suggest([a, point("z")] as any).pairs.length, 0);
  assert.equal(suggest([c, d] as any).pairs.length, 0);
  assert.equal(suggest([a, b] as any).pairs[0].uncertain, true);
  assert.equal(suggest([a, { ...b, x: 125 }] as any).pairs.length, 0);
  const dense = Array.from({ length: 300 }, (_, i) =>
    point(`p${i}`, i % 2 ? "official" : "codcentral"),
  );
  assert.equal(suggest(dense as any).truncated, true);
  assert.equal(suggest(dense as any).pairs.length, 10000);
});
test("dense incompatible categories and floors bound work instead of scanning every pair", () => {
  const dense = Array.from({ length: 20000 }, (_, i) => ({
    ...point(
      `point-${String(i).padStart(5, "0")}`,
      `source-${i % 4}`,
      `floor-${i}`,
    ),
    category: `category-${i % 4}`,
  }));
  const start = performance.now(),
    result = suggest(dense as any);
  assert.equal(result.pairs.length, 0);
  assert.ok(result.examined <= 250000);
  assert.ok(performance.now() - start < 2000);
});
