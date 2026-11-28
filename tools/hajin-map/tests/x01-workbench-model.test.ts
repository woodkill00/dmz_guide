import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateHubSnapshot } from "../src/x01/dmzhub-model.ts";
import { validateSnapshot } from "../src/x01/model.ts";
import {
  alignPoint,
  candidateMatches,
  deriveAlignment,
  crossValidateAlignment,
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
test("112 leave-one-out diagnostics independently predict omitted landmarks and preserve floors/inputs", () => {
  const h = structuredClone(hub),
    c = structuredClone(cod);
  const points = Array.from({ length: 9 }, (_, i) => ({
    x: 0.1 + (i % 3) * 0.4,
    y: 0.1 + Math.floor(i / 3) * 0.4,
  }));
  h.markers = [
    ...h.markers.filter((r) => r.floor === 2),
    ...points.map((p, i) => ({
      ...h.markers[0],
      id: `syn-h-${i}`,
      floor: 1 as const,
      title: `SYNTHETIC anchor ${i}`,
      x: 0.15 + 0.6 * p.x,
      y: 0.12 + 0.7 * p.y,
    })),
  ];
  c.markers = [
    ...c.markers.filter((r) => r.floor === 2),
    ...points.map((p, i) => ({
      ...c.markers[0],
      id: `x01-syn-${i}`,
      floor: 1 as const,
      name: `SYNTHETIC anchor ${i}`,
      ...p,
    })),
  ];
  const before = JSON.stringify([h, c]);
  const result = crossValidateAlignment(h, c, 1);
  assert.equal(result.method, "leave-one-out");
  assert.equal(result.landmarks, 9);
  assert.equal(result.evaluated, 9);
  assert.equal(result.accepted, true);
  assert.ok(result.maxError !== null && result.maxError < 1e-10);
  assert.deepEqual(result.failures, []);
  assert.equal(JSON.stringify([h, c]), before);
  assert.deepEqual(
    crossValidateAlignment(
      { ...h, markers: [...h.markers].reverse() },
      { ...c, markers: [...c.markers].reverse() },
      1,
    ),
    result,
  );
  const moved = structuredClone(h);
  moved.markers.find((r) => r.id === "syn-h-0")!.x += 0.12;
  const outlier = crossValidateAlignment(moved, c, 1);
  assert.equal(outlier.accepted, false);
  assert.ok(outlier.maxError !== null && outlier.maxError > 0.035);
  assert.deepEqual(
    crossValidateAlignment(moved, c, 2),
    crossValidateAlignment(h, c, 2),
  );
  assert.equal(
    crossValidateAlignment(
      {
        ...h,
        markers: h.markers.filter(
          (r) => r.floor === 2 || Number(r.id.at(-1)) < 6,
        ),
      },
      c,
      1,
    ).accepted,
    false,
  );
  assert.equal(
    crossValidateAlignment(
      {
        ...h,
        markers: h.markers.map((r) =>
          r.floor === 1 ? { ...r, x: 1 - r.x } : r,
        ),
      },
      c,
      1,
    ).accepted,
    false,
  );
  assert.equal(
    crossValidateAlignment(
      h,
      {
        ...c,
        markers: c.markers.map((r) => (r.floor === 1 ? { ...r, x: 0.5 } : r)),
      },
      1,
    ).accepted,
    false,
  );
});

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
test("X01 update diff exposes changed marker meaning without a moved point", () => {
  const before = [
    {
      id: "a",
      x: 0.2,
      y: 0.3,
      floor: 1,
      name: "Safe",
      categoryId: 1,
      description: "Old",
    },
  ];
  const after = [{ ...before[0], categoryId: 2, description: "New" }];
  const [change] = sourceDiff(before, after, (row) => row.name);
  assert.equal(change.kind, "metadata");
  assert.match(change.before!, /"categoryId":1/);
  assert.match(change.after!, /"categoryId":2/);
});
test("X01 candidate review stays bounded with clustered valid markers", () => {
  const crowdedHub = structuredClone(hub),
    crowdedCod = structuredClone(cod);
  const baseHub = crowdedHub.markers.find((row) =>
    crowdedHub.categories.some(
      (category) =>
        category.id === row.categoryId && category.slug === "exfiltration",
    ),
  )!;
  const baseCod = crowdedCod.markers.find((row) => row.layer === "exfil")!;
  const fit = deriveAlignment(hub, cod, 1),
    mapped = alignPoint({ x: 0.5, y: 0.5 }, fit);
  for (let index = 0; index < 300; index++) {
    crowdedHub.markers.push({
      ...baseHub,
      id: `dmzhub-${10000 + index}`,
      sourceId: 10000 + index,
      floor: 1,
      title: null,
      x: mapped.x,
      y: mapped.y,
    });
    crowdedCod.markers.push({
      ...baseCod,
      id: `x01-cluster-${index}`,
      name: `Synthetic exfil ${index}`,
      floor: 1,
      x: 0.5,
      y: 0.5,
    });
  }
  assert.equal(candidateMatches(crowdedHub, crowdedCod, fit).length, 100);
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
  assert.match(routeLegs([a, b], [])[0].warning, /No nearby/);
});
