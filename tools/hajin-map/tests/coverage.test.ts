import { test } from "node:test";
import assert from "node:assert/strict";
import { scopedMapCoverage } from "../src/workspace/coverage.ts";

test("073 map coverage separates positioned and unlocated source entries from Guide grids", () => {
  const base = { kind: "source", sourceId: "fixture", sourceName: "Synthetic source", categoryId: "safe", category: "Safes", x: 2, y: 3 };
  const result = scopedMapCoverage([base, { ...base, x: null, y: null }, { ...base, kind: "custom", x: 1, y: 1 }] as any, [{ grid: "F5" }, { grid: "unknown" }]);
  assert.deepEqual(result.rows, [{ source: "Synthetic source", category: "Safes", positioned: 1, unlocated: 1 }]);
  assert.equal(result.guideKeyGridOnly, 1);
});
