import test from "node:test";
import assert from "node:assert/strict";
import { sidebarAllocation, sidebarPair } from "../src/map/sidebar-math.ts";
test("066 two-pane defaults and bounds preserve original map key allocation", () => {
  const full = sidebarAllocation(400, [0.42, 0.58], 120);
  assert.deepEqual(full.sizes, [168, 232]);
  assert.deepEqual(full.minima, [120, 120]);
  assert.deepEqual(sidebarPair(full.sizes, full.minima, 0, 1000), [280, 120]);
  assert.deepEqual(sidebarPair(full.sizes, full.minima, 0, -10), [120, 280]);
  assert.deepEqual(sidebarAllocation(100, [0.42, 0.58], 120), {
    sizes: [45, 55],
    minima: [45, 55],
  });
});
test("066 three-pane drag reallocates only adjacent pair and preserves total/minima", () => {
  const a = sidebarAllocation(300, [0.3, 0.35, 0.35], 80);
  assert.deepEqual(a.sizes, [90, 105, 105]);
  assert.deepEqual(a.minima, [80, 80, 80]);
  assert.deepEqual(sidebarPair(a.sizes, a.minima, 0, 200), [115, 80, 105]);
  assert.deepEqual(sidebarPair(a.sizes, a.minima, 1, 500), [90, 130, 80]);
  assert.deepEqual(a.sizes, [90, 105, 105]);
});
test("066 constrained and growing budgets retain finite bounded panes with exact totals", () => {
  for (const count of [2, 3, 8])
    for (const available of [0, 1, 50, 100, 200, 300, 600, 1200])
      for (const shares of [
        Array(count).fill(1),
        Array.from({ length: count }, (_, i) => (i === 0 ? 1 : 0)),
      ]) {
        const a = sidebarAllocation(available, shares, 120);
        assert.ok(
          Math.abs(a.sizes.reduce((n, v) => n + v, 0) - available) < 1e-6,
        );
        assert.ok(
          a.sizes.every(
            (v, i) => Number.isFinite(v) && v >= a.minima[i] && v >= 0,
          ),
        );
      }
});
test("066 invalid allocations and pair requests fail closed", () => {
  for (const args of [
    [-1, [1, 1], 80],
    [Infinity, [1, 1], 80],
    [100, [0, 0], 80],
    [100, [NaN, 1], 80],
    [100, [1], 80],
    [100, Array(9).fill(1), 80],
    [100, [1, 1], -1],
  ] as [number, number[], number][])
    assert.throws(() => sidebarAllocation(...args));
  assert.throws(() => sidebarPair([100, 100], [80, 80], 1, 90));
  assert.throws(() => sidebarPair([100, 100], [80, 80], 0, NaN));
  assert.throws(() => sidebarPair([50, 100], [80, 80], 0, 90));
});
test("066 repeated fractional-boundary drags conserve allocation without precision failures", () => {
  for (const available of [1, 37.15, 111.6, 299.609375, 521.3, 777.77]) {
    const a = sidebarAllocation(available, [0.3, 0.35, 0.35], 80);
    let sizes = a.sizes;
    for (let pass = 0; pass < 12; pass++)
      for (const index of [0, 1])
        for (const requested of [-1000, 10000, 17.13]) {
          sizes = sidebarPair(sizes, a.minima, index, requested);
          assert.ok(
            Math.abs(sizes.reduce((n, v) => n + v, 0) - available) < 1e-6,
          );
          assert.ok(sizes.every((v, i) => v >= a.minima[i] - 1e-6));
        }
  }
});
