import test from "node:test";
import assert from "node:assert/strict";
import { connectedPreparation } from "../../src/domain/connected-preparation.mjs";

test("connected preparation prioritizes known shortages without inventing unknown counts", () => {
  const row = (id, state, tracked, next, missing) => ({
    id,
    state,
    tracked,
    next,
    missing,
    knownMissing: 0,
    rootIds: ["objective:one"],
    item: { name: id, unit: "each" },
    craft: false,
  });
  const model = {
    limited: true,
    shopping: [
      row("covered", "covered", true, true, 0),
      row("review", "review", true, false, null),
      row("next", "short", false, true, 2),
      row("mission", "short", true, false, 1),
    ],
  };
  const result = connectedPreparation(model, 3);
  assert.deepEqual(
    result.actions.map((action) => action.id),
    ["mission", "next", "review"],
  );
  assert.equal(result.actions[2].missing, null);
  assert.equal(result.partial, true);
  assert.equal(result.total, 3);
});

test("preparation adds recorded recipe and map options without changing shortage math", () => {
  const item = {
    id: "fixture:key",
    name: "Test key",
    kind: "item",
    category: "Keys",
    unit: "each",
    description: "",
  };
  const model = {
    limited: false,
    pack: {
      id: "fixture:pack",
      items: [item],
      objectives: [],
      recipes: [],
      locations: [
        {
          id: "fixture:room",
          name: "Test room",
          mapId: "fixture:map",
          itemIds: [item.id],
        },
      ],
    },
    crafts: [
      {
        recipe: {
          id: "fixture:print-key",
          name: "Print key",
          output: { itemId: item.id },
        },
        ready: false,
        reasons: ["Needs materials"],
      },
    ],
    shopping: [
      {
        id: item.id,
        item,
        state: "short",
        tracked: true,
        next: false,
        missing: 2,
        knownMissing: 2,
        rootIds: ["fixture:goal"],
        craft: false,
      },
    ],
  };
  const [action] = connectedPreparation(model).actions;
  assert.equal(action.missing, 2);
  assert.equal(action.key, true);
  assert.deepEqual(
    action.recipes.map((recipe) => [recipe.id, recipe.ready]),
    [["fixture:print-key", false]],
  );
  assert.deepEqual(
    action.areas.map((area) => area.id),
    ["fixture:room"],
  );
  model.pack.locations = [];
  assert.deepEqual(connectedPreparation(model).actions[0].areas, []);
});
