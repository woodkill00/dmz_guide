import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { itemUses } from "../../src/domain/item-uses.mjs";
import {
  itemSection,
  compareItems,
} from "../../src/domain/inventory-items.mjs";
import {
  automaticIngredientBlueprint,
  inventoryBlueprintOwnershipLabel,
  inventoryBlueprintAvailable,
  inventoryUpgradeUse,
  compareInventoryMaterialItems,
  currencyQuantityText,
  currencyQuantityRaw,
} from "../../src/domain/inventory-presentation.mjs";
for (const key of ["official-starter", "upgrade-observations"])
  test(
    "derived ingredient blueprint grants reversible without profile mutation: " +
      key,
    () => {
      const pack = loadFixturePack(key),
        p = newProfile(pack),
        before = structuredClone(p);
      const epic = pack.objectives.find(
          (o) => o.name === "Epic Ingredient Printing",
        ),
        uncommon = pack.objectives.find(
          (o) => o.name === "Uncommon Ingredient Printing",
        );
      for (const o of [epic, uncommon])
        p.upgradeProgress[o.id] = {
          completion: "completed",
          availability: "unknown",
          reviewRequired: false,
        };
      const completed = structuredClone(p);
      const epicItem = pack.items.find(
        (i) => i.rarity === "Epic" && itemSection(i) === "Ingredients",
      );
      assert.match(
        inventoryBlueprintOwnershipLabel(pack, p, epicItem.id),
        /Epic Ingredient Printing/,
      );
      for (const item of pack.items.filter(
        (i) => itemSection(i) === "Ingredients",
      ))
        assert.equal(
          !!automaticIngredientBlueprint(pack, p, item),
          ["Uncommon", "Epic"].includes(item.rarity),
        );
      assert.deepEqual(p, completed);
      assert.equal(before.itemBlueprints, undefined);
      const target = pack.items.find(
        (i) => i.rarity === "Epic" && itemSection(i) === "Ingredients",
      );
      p.itemBlueprints = { [target.id]: true };
      p.upgradeProgress[epic.id].completion = "incomplete";
      assert.equal(automaticIngredientBlueprint(pack, p, target), null);
      assert.equal(p.itemBlueprints[target.id], true);
      p.upgradeProgress[epic.id].completion = "completed";
      p.upgradeProgress[epic.id].reviewRequired = true;
      assert.equal(automaticIngredientBlueprint(pack, p, target), null);
      p.upgradeProgress[epic.id].reviewRequired = false;
      p.contentVersion = "stale";
      assert.equal(automaticIngredientBlueprint(pack, p, target), null);
    },
  );
test("all 21 field upgrades plus staff keycard can record blueprint without invented recipes", () => {
  const pack = loadFixturePack("official-starter"),
    before = structuredClone(pack),
    uses = itemUses(pack, newProfile(pack));
  const field = pack.items.filter((i) => itemSection(i) === "Field upgrades");
  assert.equal(field.length, 21);
  for (const i of [
    ...field,
    pack.items.find((i) => i.id === "mw4:x01-staff-emergency-exfil-keycard"),
  ])
    assert(inventoryBlueprintAvailable(i, uses.get(i.id)));
  assert.deepEqual(pack, before);
});
test("misc source identities retain IDs and upgrade-use status until every relevant upgrade completed", () => {
  const pack = loadFixturePack("official-starter"),
    p = newProfile(pack);
  for (const id of [
    "mw4:ingredient-gold-skull",
    "mw4:printer-item-ballistic-flight-logs",
    "mw4:printer-item-w-m-d-manifest",
  ])
    assert.equal(
      itemSection(pack.items.find((i) => i.id === id)),
      "Misc items",
    );
  const uses = {
    upgrades: [
      { id: "test:a", completed: true },
      { id: "test:b", completed: false },
    ],
  };
  assert.deepEqual(inventoryUpgradeUse(uses), {
    used: true,
    completed: false,
    remaining: 1,
  });
  uses.upgrades[1].completed = true;
  assert.deepEqual(inventoryUpgradeUse(uses), {
    used: true,
    completed: true,
    remaining: 0,
  });
  assert.equal(inventoryUpgradeUse({ upgrades: [] }).completed, false);
});
test("resources exact default order and material rarity descending with alphabetical ties", () => {
  const pack = loadFixturePack("official-starter");
  assert.deepEqual(
    pack.items
      .filter((i) => itemSection(i) === "Resources")
      .sort(compareItems)
      .map((i) => i.name),
    ["Synthetics", "Electronics", "Chemicals", "Metals"],
  );
  const items = [
    { id: "test:z", name: "Z", rarity: "Epic" },
    { id: "test:a", name: "A", rarity: "Epic" },
    { id: "test:b", name: "B", rarity: "Legendary" },
    { id: "test:c", name: "C", rarity: "Common" },
    { id: "test:u", name: "Unknown" },
  ];
  assert.deepEqual(
    items.sort(compareInventoryMaterialItems).map((i) => i.name),
    ["B", "A", "Z", "C", "Unknown"],
  );
  assert.deepEqual(
    items
      .map((i) => ({ ...i, category: "Misc items" }))
      .sort(compareItems)
      .map((i) => i.name),
    ["B", "A", "Z", "C", "Unknown"],
  );
});
test("currency grouping roundtrips integers while malformed amounts remain invalid", () => {
  for (const n of ["0", "1307735", "2000000"])
    assert.equal(currencyQuantityRaw(currencyQuantityText(n)), n);
  assert.equal(currencyQuantityText("1307735"), "1,307,735");
  for (const raw of ["1,2", "1,307,73", "-1", "1.2", "1e6", "a"])
    assert.equal(currencyQuantityRaw(raw), raw);
  assert.equal(currencyQuantityRaw(""), "");
});
