import test from "node:test";
import assert from "node:assert/strict";
import { recordRelations } from "../../src/domain/record-relations.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { allRecords, renderDetail } from "../../src/ui/render.mjs";

test("record relations only use declared IDs in the selected catalog", () => {
  const pack = {
    items: [{ id: "item:a" }, { id: "item:b" }],
    recipes: [
      {
        id: "recipe:one",
        inputs: [{ itemId: "item:a" }],
        output: { itemId: "item:b" },
      },
    ],
    objectives: [
      {
        id: "objective:one",
        requirements: [{ itemId: "item:b" }],
        prerequisites: ["objective:missing"],
      },
    ],
  };
  assert.deepEqual(
    recordRelations(pack, "item:a").incoming.map((record) => record.id),
    ["recipe:one"],
  );
  assert.deepEqual(
    recordRelations(pack, "recipe:one").outgoing.map((record) => record.id),
    ["item:a", "item:b"],
  );
  assert.deepEqual(recordRelations(pack, "objective:one").unresolved, [
    "objective:missing",
  ]);
  assert.deepEqual(recordRelations(pack, "item:absent").incoming, []);
});

test("record detail shows same-catalog reverse links without another catalog's record", () => {
  const pack = loadFixturePack("demo-training");
  const recipe = pack.recipes[0];
  pack.guides.push({
    id: "demo:reverse-guide",
    title: "Reverse Guide",
    relatedIds: [recipe.id],
  });
  const other = {
    ...pack,
    id: "demo:other",
    guides: [
      {
        id: "demo:other-guide",
        title: "Wrong catalog",
        relatedIds: [recipe.id],
      },
    ],
  };
  const record = allRecords([pack]).find((row) => row.id === recipe.id);
  const html = renderDetail(record, [pack, other]);
  assert.match(html, /Records linking here/);
  assert.match(html, /Reverse Guide/);
  assert.doesNotMatch(html, /Wrong catalog/);
});

test("declared relations connect key, weapon, recipe, mission, upgrade and location without name matching", () => {
  const pack = {
    items: [
      { id: "item:key", name: "Access key" },
      { id: "item:weapon", name: "Rifle" },
    ],
    recipes: [
      {
        id: "recipe:one",
        inputs: [{ itemId: "item:key" }],
        output: { itemId: "item:weapon" },
      },
    ],
    objectives: [
      {
        id: "mission:one",
        track: "dmz-order",
        requirements: [{ itemId: "item:key" }],
        prerequisites: ["upgrade:one"],
      },
      {
        id: "upgrade:one",
        track: "dmz-upgrade",
        requirements: [{ itemId: "item:weapon" }],
      },
    ],
    guides: [],
    maps: [{ id: "map:one" }],
    locations: [
      { id: "location:one", mapId: "map:one", itemIds: ["item:key"] },
    ],
  };
  assert.deepEqual(
    recordRelations(pack, "item:key").incoming.map((row) => row.id),
    ["recipe:one", "mission:one", "location:one"],
  );
  assert.deepEqual(
    recordRelations(pack, "item:weapon").incoming.map((row) => row.id),
    ["recipe:one", "upgrade:one"],
  );
  assert.deepEqual(
    recordRelations(pack, "upgrade:one").incoming.map((row) => row.id),
    ["mission:one"],
  );
  assert.deepEqual(
    recordRelations(pack, "map:one").incoming.map((row) => row.id),
    ["location:one"],
  );
  assert.deepEqual(
    recordRelations(pack, "mission:one").outgoing.map((row) => row.id),
    ["item:key", "upgrade:one"],
  );
});

test("public details do not expose protected or missing reference IDs", () => {
  const pack = loadFixturePack("demo-training");
  pack.items.push({
    ...structuredClone(pack.items[0]),
    id: "demo:secret-key",
    name: "Hidden key name",
    spoiler: true,
  });
  pack.guides.push({
    ...structuredClone(pack.guides[0]),
    id: "demo:reference-guard",
    title: "Reference guard",
    relatedIds: ["demo:secret-key", "demo:missing-secret"],
  });
  const record = allRecords([pack]).find(
    (row) => row.id === "demo:reference-guard",
  );
  const html = renderDetail(record, [pack]);
  assert.match(html, /Spoiler-protected record/);
  assert.match(html, /Unresolved reference/);
  assert.doesNotMatch(
    html,
    /demo:secret-key|Hidden key name|demo:missing-secret/,
  );
});
