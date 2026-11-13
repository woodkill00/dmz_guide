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
