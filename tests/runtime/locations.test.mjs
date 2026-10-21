import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  projectLocation,
  placementReason,
  filterLocations,
  unmetItemIds,
  floorOf,
  safePlanText,
  effectiveScope,
} from "../../src/domain/locations.mjs";
const demo = JSON.parse(
  await readFile(
    new URL("../../content/packs/demo-training.json", import.meta.url),
  ),
);
const real = JSON.parse(
  await readFile(
    new URL("../../content/packs/official-starter.json", import.meta.url),
  ),
);
const map = demo.maps[0];
test("real POIs stay list-only, with no invented placement", () => {
  assert.equal(filterLocations(real, {}).length, 13);
  for (const l of real.locations) {
    assert.equal(projectLocation(real.maps[0], l), null);
    assert.match(placementReason(real.maps[0], l), /unknown/i);
  }
});
test("three non-collinear points preserve x and y without swap", () => {
  assert.deepEqual(
    demo.locations.map((l) => projectLocation(map, l)),
    [
      { x: 20, y: 30 },
      { x: 70, y: 60 },
      { x: 50, y: 20 },
    ],
  );
});
test("extent, inversion, center and coordinate-version replacement are explicit", () => {
  const loc = { coordinates: { x: 30, y: 60, floor: "ground" } };
  const changed = {
    ...map,
    extent: [10, 20, 110, 220],
    assetId: "demo:new-image",
    coordinateVersion: "2",
  };
  assert.deepEqual(projectLocation(changed, loc), { x: 20, y: 20 });
  assert.deepEqual(
    projectLocation(
      { ...changed, origin: "bottom-left", axis: "x-right-y-up" },
      loc,
    ),
    { x: 20, y: 80 },
  );
  for (const axis of ["x-right-y-down", "x-right-y-up"])
    assert.notEqual(
      projectLocation({ ...changed, origin: "center", axis }, loc),
      null,
    );
  assert.equal(
    projectLocation({ ...map, origin: "top-left", axis: "x-right-y-up" }, loc),
    null,
  );
});
test("invalid frames and coordinates never clamp to a misleading marker", () => {
  for (const coordinates of [
    null,
    { x: NaN, y: 30, floor: "ground" },
    { x: 101, y: 30, floor: "ground" },
    { x: 20, y: 30, floor: "removed" },
  ])
    assert.equal(projectLocation(map, { coordinates }), null);
  assert.equal(
    projectLocation({ ...map, extent: [0, 0, 0, 100] }, demo.locations[0]),
    null,
  );
  assert.equal(
    projectLocation({ ...map, axis: "unknown" }, demo.locations[0]),
    null,
  );
  assert.equal(floorOf({ coordinates: null }), "unknown");
});
test("map/list filters share one record set", () => {
  assert.equal(
    filterLocations(demo, { mapId: map.id, floor: "ground" }).length,
    2,
  );
  assert.equal(
    filterLocations(demo, { floor: "upper" })[0].id,
    "demo:upper-cache",
  );
  assert.equal(
    filterLocations(demo, {
      query: "POWER",
      category: "supply",
      sourceId: "source:fixture",
      coordinateVersion: "1",
    }).length,
    1,
  );
  assert.equal(filterLocations(demo, { coordinateVersion: "2" }).length, 0);
  assert.equal(filterLocations(demo, { sourceId: "missing" }).length, 0);
});
test("goal relations require actual unmet items including tools, never currency", () => {
  const ids = unmetItemIds(demo, {
    ledger: [
      { id: "demo:wire", missing: 2 },
      { id: "demo:tool", retainedMissing: 1 },
      { id: "demo:credits", missing: 50 },
      { id: "demo:cell", missing: 0 },
      { id: "demo:missing", missing: 1 },
    ],
  });
  assert.deepEqual(ids, ["demo:wire", "demo:tool"]);
  assert.deepEqual(
    filterLocations(demo, { goalOnly: true }, ids).map((l) => l.id),
    ["demo:supply-shed", "demo:upper-cache"],
  );
  assert.equal(filterLocations(demo, { goalOnly: true }, []).length, 0);
});

test("effective scope and unrevealed spoiler labels are honest", () => {
  assert.equal(
    effectiveScope(demo, {
      scope: { gameId: "other", mode: "story", build: "v2" },
    }),
    "other / story / v2",
  );
  const pack = {
    objectives: [{ id: "demo:secret", name: "Secret ending", spoiler: true }],
  };
  assert.equal(
    safePlanText(
      pack,
      { spoilers: false },
      "Secret ending: demo:secret locked",
    ),
    "Spoiler-protected objective: Spoiler-protected objective locked",
  );
  assert.equal(
    safePlanText(pack, { spoilers: true }, "Secret ending"),
    "Secret ending",
  );
});

import { referenceOnlyMapFixture } from "../browser/maps.mjs";
import { validatePack } from "../../src/content/validate.mjs";
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
test("missing-image browser fixture passes pack validation before testing absent pixels", () => {
  const invalid = structuredClone(demo);
  invalid.maps[0].assetId = "demo:missing-image";
  assert.throws(() => validatePack(invalid, schema), /reference/i);
  const fixture = referenceOnlyMapFixture(demo);
  assert.doesNotThrow(() => validatePack(fixture, schema));
  assert.equal(fixture.maps[0].assetId, fixture.assets[0].id);
  assert.equal(demo.assets.length, 0, "fixture does not mutate seed");
});
