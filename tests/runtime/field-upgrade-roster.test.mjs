import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import {
  itemSection,
  compareItems,
} from "../../src/domain/inventory-items.mjs";
import { FIELD_UPGRADE_ROSTER } from "../../src/domain/field-upgrade-roster.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { previewContentRebind } from "../../src/domain/profile-preview.mjs";
const expected = [
  "Inflatable Decoy",
  "Ammo Box",
  "Trophy System",
  "Armor Box",
  "Defibrillator",
  "DDOS",
  "Recon Drone",
  "SAM Airburst Turret",
  "Consumable Box",
  "Medical Box",
  "Hazmat Box",
  "Portable Radar",
  "Razor Wire Trap",
  "Rebreather",
  "Riot Shield",
  "Seeker Drone",
  "Smoke Wall",
  "Revive Pistol",
  "Fulton Drop Marker",
  "Utility Box",
  "Survivor Box",
];
for (const [key, idKey] of [
  ["official-starter", "starterId"],
  ["upgrade-observations", "reportedId"],
])
  test(
    key +
      " has the exact 21-item Field upgrades roster in requested default order",
    () => {
      const pack = loadFixturePack(key),
        before = structuredClone(pack);
      const rows = pack.items
        .filter((item) => itemSection(item) === "Field upgrades")
        .sort(compareItems);
      assert.deepEqual(
        rows.map((item) => item.name),
        expected,
      );
      assert.deepEqual(
        rows.map((item) => item.id),
        FIELD_UPGRADE_ROSTER.map((item) => item[idKey]),
      );
      assert.deepEqual(pack, before);
      for (const item of rows)
        assert(
          ![
            "snapshot grenade",
            "smoke grenade",
            "shock stick",
            "stim",
            "combat drone",
          ].includes(item.name.toLowerCase()),
        );
    },
  );
test("new boxes have owner provenance and no invented recipes/rarities; existing recipes retained", () => {
  const starter = loadFixturePack("official-starter"),
    observed = loadFixturePack("upgrade-observations");
  assert.equal(starter.recipes.length, 95);
  assert.equal(observed.recipes.length, 0);
  for (const pack of [starter, observed])
    for (const name of [
      "Consumable Box",
      "Medical Box",
      "Hazmat Box",
      "Utility Box",
    ]) {
      const matches = pack.items.filter((item) => item.name === name);
      assert.equal(matches.length, 1);
      const item = matches[0];
      assert.equal(item.rarity, undefined);
      assert.equal(item.status, "unverified");
      assert(!pack.recipes.some((recipe) => recipe.output.itemId === item.id));
      assert(item.sourceIds.includes("source:owner-field-upgrades-20261109"));
    }
});
test("rebind preserves older quantities, blueprints and completion without spending or guessing new stock", () => {
  const pack = loadFixturePack("official-starter"),
    profile = newProfile(pack);
  profile.contentVersion = "2026.11.06.3";
  profile.inventory["mw4:printer-item-ammo-box"] = 7;
  profile.reserves["mw4:printer-item-ammo-box"] = 2;
  profile.itemBlueprints = { "mw4:printer-item-ammo-box": true };
  profile.completion["mw4:printer-access"] = "completed";
  const original = structuredClone(profile),
    candidate = previewContentRebind(profile, pack).candidate;
  for (const field of [
    "inventory",
    "reserves",
    "itemBlueprints",
    "completion",
    "spendHistory",
  ])
    assert.deepEqual(candidate[field], original[field]);
  assert.equal(candidate.contentVersion, pack.contentVersion);
  assert.deepEqual(profile, original);
  assert.equal(candidate.inventory["mw4:field-upgrade-utility-box"], undefined);
});
test("unknown custom Field upgrades follow the roster without being dropped; explicit rarity mode remains available", () => {
  const entries = FIELD_UPGRADE_ROSTER.map((item) => ({
    id: item.starterId,
    name: item.name,
    category: "equipment",
    rarity: "Rare",
  }));
  entries.push({
    id: "custom:field-upgrade",
    name: "A custom field item",
    category: "Field upgrades",
  });
  assert.equal(entries.sort(compareItems).at(-1).id, "custom:field-upgrade");
  const pair = [
    { ...entries[0], rarity: "Ultra" },
    { ...entries[1], rarity: "Common" },
  ];
  assert.equal(
    pair.sort((a, b) => compareItems(a, b, "rarity"))[0].rarity,
    "Common",
  );
});
