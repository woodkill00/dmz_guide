import { itemSection } from "../../src/domain/inventory-items.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { itemUses } from "../../src/domain/item-uses.mjs";
import {
  inventoryBlueprintAvailable,
  inventoryBlueprintOwnershipLabel,
} from "../../src/domain/inventory-presentation.mjs";
import { setItemBlueprint } from "../../src/domain/blueprint-tracking.mjs";
import { projectDashboard } from "../../src/domain/dashboard.mjs";
import { dashboardBlueprintCards } from "../../src/ui/blueprint-cards.mjs";
import {
  createBlueprintOperation,
  commitFoundOperation,
  verifyFoundOperation,
} from "../../src/client/collection-action.mjs";
const pack = loadFixturePack("official-starter");
test("rare items have no blueprint tracker; historical flags and recipes stay intact", () => {
  const profile = newProfile(pack);
  const rare = pack.items.find(
    (r) => r.rarity?.toLowerCase() === "rare" && !r.spoiler,
  );
  assert(rare);
  profile.itemBlueprints = { [rare.id]: true };
  const uses = itemUses(pack, profile).get(rare.id);
  assert.equal(inventoryBlueprintAvailable(rare, uses), false);
  assert.equal(
    inventoryBlueprintOwnershipLabel(pack, profile, rare.id),
    "No blueprint",
  );
  assert.throws(() => setItemBlueprint(pack, profile, rare.id, true));
  assert.equal(profile.itemBlueprints[rare.id], true);
  assert(
    !projectDashboard(pack, profile).recipes.some((r) => r.id === rare.id),
  );
});
test("manual blueprint edits preserve all stock/progress and current grouping/automatic grants", () => {
  const profile = newProfile(pack);
  profile.inventory["mw4:bandage"] = 7;
  const before = structuredClone(profile),
    next = setItemBlueprint(pack, profile, "mw4:bandage", true);
  assert.equal(next.itemBlueprints["mw4:bandage"], true);
  assert.deepEqual(next.inventory, profile.inventory);
  assert.deepEqual(next.completion, profile.completion);
  assert.deepEqual(profile, before);
  const cleared = setItemBlueprint(pack, next, "mw4:bandage", false);
  assert.equal(cleared.itemBlueprints["mw4:bandage"], undefined);
  assert.throws(() =>
    setItemBlueprint(
      { ...pack, contentVersion: "different" },
      profile,
      "mw4:bandage",
      true,
    ),
  );
  const model = projectDashboard(pack, next);
  assert(
    model.recipes.find((r) => r.id === "mw4:bandage").section === "Consumables",
  );
  const html = dashboardBlueprintCards(model.recipes, pack);
  assert(html.includes('data-blueprint-group="Consumables"'));
  assert(html.includes("Owned ("));
  assert(html.includes('data-dash-blueprint-owned="mw4:bandage"'));
});
test("blueprint status durable acknowledgement verifies without inventory delta or replay", async () => {
  const p = newProfile(pack),
    op = createBlueprintOperation(pack, p, "mw4:bandage", true);
  let writes = 0;
  await commitFoundOperation(op, {
    save: async (candidate) => {
      writes++;
      return { ...candidate, revision: p.revision + 1 };
    },
  });
  assert.equal(op.state, "committed-unverified");
  await assert.rejects(() =>
    commitFoundOperation(op, { save: async () => writes++ }),
  );
  await assert.rejects(() =>
    verifyFoundOperation(op, {
      read: async () => {
        throw Error("Synthetic read failure");
      },
    }),
  );
  assert.equal(writes, 1);
  const latest = { ...op.candidate, revision: op.committedRevision + 1 };
  latest.itemBlueprints = {};
  assert.equal(
    await verifyFoundOperation(op, { read: async () => latest }),
    latest,
  );
  assert.equal(writes, 1);
});

test("Legendary ingredients have no blueprint but keep stock, acquisition recipes and historical flags; other Legendary items still qualify", () => {
  const profile = newProfile(pack),
    uses = itemUses(pack, profile),
    before = structuredClone(pack);
  const ingredients = pack.items.filter(
    (r) =>
      r.rarity?.toLowerCase() === "legendary" &&
      itemSection(r) === "Ingredients" &&
      !r.spoiler,
  );
  assert(ingredients.length > 0);
  for (const item of ingredients) {
    profile.inventory[item.id] = 9;
    profile.itemBlueprints ??= {};
    profile.itemBlueprints[item.id] = true;
    assert.equal(inventoryBlueprintAvailable(item, uses.get(item.id)), false);
    assert.equal(
      inventoryBlueprintOwnershipLabel(pack, profile, item.id),
      "No blueprint",
    );
    assert.throws(() => setItemBlueprint(pack, profile, item.id, true));
    assert.equal(profile.inventory[item.id], 9);
    assert.equal(profile.itemBlueprints[item.id], true);
    assert.deepEqual(
      itemUses(pack, profile).get(item.id)?.acquisition,
      uses.get(item.id)?.acquisition,
    );
  }
  const rows = projectDashboard(pack, profile).recipes;
  for (const item of ingredients) assert(!rows.some((r) => r.id === item.id));
  const bandage = {
    ...pack.items.find((r) => r.id === "mw4:bandage"),
    rarity: "Legendary",
  };
  assert.equal(
    inventoryBlueprintAvailable(bandage, uses.get(bandage.id)),
    true,
  );
  assert.deepEqual(pack, before);
});
