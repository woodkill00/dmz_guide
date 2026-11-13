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
