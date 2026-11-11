import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateHubSnapshot } from "../src/x01/dmzhub-model.ts";
import { validateSnapshot } from "../src/x01/model.ts";
import {
  alignPoint,
  candidateMatches,
  deriveAlignment,
  pairedConnectors,
  routeLegs,
  sourceDiff,
} from "../src/x01/workbench-model.ts";
const hub = validateHubSnapshot(
    JSON.parse(
      readFileSync(
        new URL("../src/x01/dmzhub-snapshot.json", import.meta.url),
        "utf8",
      ),
    ),
  ),
  cod = validateSnapshot(
    JSON.parse(
      readFileSync(
        new URL("../src/x01/codcentral-snapshot.json", import.meta.url),
        "utf8",
      ),
    ),
  );
test("X01 source calibration uses unique named landmarks with bounded residuals on both floors", () => {
  for (const floor of [1, 2] as const) {
    const result = deriveAlignment(hub, cod, floor);
    assert.ok(result.anchors.length >= 10);
    assert.ok(result.accepted);
    assert.ok(result.rmse < 0.015);
    assert.ok(result.maxError < 0.035);
    assert.ok(candidateMatches(hub, cod, result).length >= 8);
    const point = alignPoint({ x: 0.5, y: 0.5 }, result);
    assert.ok(point.x > 0.4 && point.x < 0.6 && point.y > 0.4 && point.y < 0.6);
  }
});
test("X01 calibration refuses sparse or inconsistent landmarks rather than inventing overlay positions", () => {
  const sparse = structuredClone(hub);
  sparse.markers = sparse.markers.filter(
    (row) => row.floor === 2 || !row.title,
  );
  assert.throws(() => deriveAlignment(sparse, cod, 1));
  const distorted = structuredClone(hub);
  for (const row of distorted.markers)
    if (row.floor === 1 && row.title) row.x = 1 - row.x;
  const fit = deriveAlignment(distorted, cod, 1);
  assert.equal(fit.accepted, false);
  assert.throws(() => alignPoint({ x: 0.5, y: 0.5 }, fit));
});
test("X01 update diff preserves identity and reports all material changes", () => {
  const before = [
      { id: "a", x: 0.1, y: 0.2, name: "Old" },
      { id: "b", x: 0.3, y: 0.4, name: "Stay" },
    ],
    after = [
      { id: "a", x: 0.2, y: 0.2, name: "New" },
      { id: "c", x: 0.5, y: 0.5, name: "Added" },
    ];
  const diff = sourceDiff(before, after, (row) => row.name);
  assert.deepEqual(
    diff.map((row) => row.kind),
    ["renamed", "moved", "added", "removed"],
  );
  assert.throws(() =>
    sourceDiff(before, [after[0], after[0]], (row) => row.name),
  );
});
test("X01 update diff exposes a source marker moved to another floor", () => {
  const before = [{ id: "a", x: 0.1, y: 0.2, floor: 1, name: "A" }],
    after = [{ id: "a", x: 0.1, y: 0.2, floor: 2, name: "A" }];
  assert.deepEqual(
    sourceDiff(before, after, (row) => row.name).map((row) => row.kind),
    ["floor"],
  );
});
test("X01 floor changes use only paired source connectors and expose schematic uncertainty", () => {
  const connectors = pairedConnectors(hub);
  assert.ok(connectors.length >= 10);
  const a = { id: "a", floor: 1 as const, x: 0.4, y: 0.5, name: "A" },
    b = {
      id: "b",
      floor: 2 as const,
      x: 0.5,
      y: 0.6,
      name: "B",
      keyRoom: true,
    };
  const [leg] = routeLegs([a, b], connectors);
  assert.ok(leg.connector);
  assert.match(leg.warning, /unverified/);
  assert.match(routeLegs([a, b], [])[0].warning, /No paired/);
});
