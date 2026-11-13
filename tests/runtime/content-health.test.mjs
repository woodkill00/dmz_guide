import test from "node:test";
import assert from "node:assert/strict";
import { contentHealth } from "../../src/domain/content-health.mjs";

test("content health reports only listed-scope denominators and no invented missions", () => {
  const pack = {
    id: "synthetic:health",
    items: [
      { id: "item:weapon", kind: "weapon", stats: [{ value: null }] },
      {
        id: "item:key",
        kind: "item",
        category: "Keys",
        description: "Synthetic key",
        sourceIds: ["source:test"],
      },
    ],
    recipes: [{ ingredientsKnown: true }, { ingredientsKnown: false }],
    objectives: [],
    locations: [{ grid: "A1" }, {}],
  };
  const rows = Object.fromEntries(
    contentHealth(pack).map((row) => [row.id, row]),
  );
  assert.deepEqual([rows.orders.covered, rows.orders.listed], [0, 24]);
  assert.deepEqual([rows.missions.covered, rows.missions.listed], [0, 0]);
  assert.deepEqual([rows.recipes.covered, rows.recipes.listed], [1, 2]);
  assert.deepEqual([rows.weapons.covered, rows.weapons.listed], [0, 1]);
  assert.deepEqual([rows.locations.covered, rows.locations.listed], [1, 2]);
  assert.ok(
    contentHealth(pack).every((row) => row.scope === "listed records only"),
  );
});
