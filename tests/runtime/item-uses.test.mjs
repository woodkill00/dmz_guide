import test from "node:test";
import assert from "node:assert/strict";
import { itemUses } from "../../src/domain/item-uses.mjs";
const item = (id, extra = {}) => ({ id, name: id, unit: "units", ...extra });
function fixture() {
  return {
    id: "fixture:pack",
    contentVersion: "1",
    items: [item("a"), item("b"), item("c")],
    recipes: [
      {
        id: "r1",
        name: "Recipe one",
        inputs: [
          { itemId: "a", consumed: true },
          { itemId: "b", consumed: false },
        ],
        output: { itemId: "c" },
      },
      {
        id: "r2",
        name: "Recipe two",
        inputs: [{ itemId: "a" }],
        output: { itemId: "c" },
      },
    ],
    objectives: [
      {
        id: "u",
        name: "Upgrade",
        track: "dmz-upgrade",
        requirements: [{ itemId: "a", consumption: "unknown" }],
      },
      {
        id: "m",
        name: "Mission",
        track: "dmz-order",
        requirements: [{ itemId: "a", consumption: "consumed" }],
      },
      {
        id: "c",
        name: "Campaign",
        track: "campaign",
        requirements: [{ itemId: "a" }],
      },
      {
        id: "unlock",
        name: "Unlock only",
        track: "progression",
        requirements: [{ itemId: "a" }],
      },
    ],
  };
}
const profile = () => ({
  schemaVersion: 3,
  inventory: {},
  reserves: {},
  completion: {},
  upgradeProgress: {},
  spoilers: false,
});
test("direct use directions, explicit tracks, roles and independent output dedup", () => {
  const p = fixture(),
    result = itemUses(p, profile());
  assert.deepEqual(
    result.get("a").recipes.map((r) => r.id),
    ["r1", "r2"],
  );
  assert.deepEqual(
    result.get("a").crafts.map((r) => r.id),
    ["c"],
  );
  assert.deepEqual(
    result.get("c").acquisition.map((r) => r.id),
    ["r1", "r2"],
  );
  assert.equal(result.get("b").recipes[0].role, "retained");
  assert.equal(result.get("a").recipes[1].role, "unknown");
  assert.deepEqual(
    result.get("a").missions.map((r) => r.track),
    ["dmz-order", "campaign"],
  );
  assert.deepEqual(
    result.get("a").upgrades.map((r) => r.id),
    ["u"],
  );
  assert.match(result.get("a").recipes[0].url, /pack=fixture%3Apack&id=r1/);
});
test("spoiler endpoints are removed before references and count; visibility reprojects cached content", () => {
  const p = fixture();
  p.items[1].spoiler = true;
  assert.deepEqual(
    itemUses(p, profile())
      .get("a")
      .recipes.map((r) => r.id),
    ["r2"],
  );
  p.recipes[1].spoiler = true;
  // A new admitted snapshot, not mutation of cached immutable content.
  const snapshot = structuredClone(p);
  assert.equal(itemUses(snapshot, profile()).get("a").recipes.length, 0);
  assert.equal(
    itemUses(snapshot, { ...profile(), spoilers: true }).get("a").recipes
      .length,
    2,
  );
});
test("hidden names embedded in otherwise visible records fail closed", () => {
  const p = fixture();
  p.items.push(item("secret", { spoiler: true, name: "Secret place" }));
  p.recipes[0].name = "Recipe Secret place";
  assert.deepEqual(
    itemUses(p, profile())
      .get("a")
      .recipes.map((r) => r.id),
    ["r2"],
  );
});
test("completion reprojects independently, versions and same named packs never cross join", () => {
  const p = fixture(),
    state = profile();
  assert.equal(itemUses(p, state).get("a").upgrades[0].completed, false);
  state.upgradeProgress.u = { completion: "completed" };
  assert.equal(itemUses(p, state).get("a").upgrades[0].completed, true);
  const other = { ...fixture(), id: "other", recipes: [] };
  assert.equal(itemUses(other, state).get("a").recipes.length, 0);
  p.contentVersion = "2";
  p.recipes = [];
  assert.equal(itemUses(p, state).get("a").recipes.length, 0);
});
test("broken recipe endpoints omitted, cycles/self links finite, category fallback explicit", () => {
  const p = fixture();
  p.recipes.push(
    {
      id: "broken",
      name: "Broken",
      inputs: [{ itemId: "a" }],
      output: { itemId: "missing" },
    },
    {
      id: "self",
      name: "Self",
      inputs: [{ itemId: "a", consumed: false }],
      output: { itemId: "a" },
    },
  );
  const result = itemUses(p, profile()).get("a");
  assert.deepEqual(
    result.crafts.map((r) => r.id),
    ["c", "a"],
  );
  assert.equal(result.item.category, "Other");
  assert(!result.recipes.some((r) => r.id === "broken"));
});

test("hidden other objective inputs suppress relationship before counts; unlocked uses canonical completion", () => {
  const pack = fixture();
  pack.items[1].spoiler = true;
  pack.objectives[0].requirements.push({ itemId: "b" });
  assert.equal(itemUses(pack, profile()).get("a").upgrades.length, 0);
  const state = profile();
  state.completion.m = "unlocked";
  assert.equal(itemUses(pack, state).get("a").missions[0].completed, true);
});

test("legacy admitted objective booleans use canonical consumption facts", () => {
  const pack = fixture();
  pack.schemaVersion = 1;
  for (const objective of pack.objectives)
    objective.requirements = objective.requirements.map((row) => ({
      itemId: row.itemId,
      quantity: 1,
      consumed: objective.track !== "dmz-upgrade",
    }));
  const result = itemUses(pack, profile()).get("a");
  assert.equal(result.upgrades[0].role, "retained");
  assert.equal(result.missions[0].role, "consumed");
});
