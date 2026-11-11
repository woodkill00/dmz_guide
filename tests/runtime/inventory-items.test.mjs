import {
  inventoryFamily,
  inventoryTypeLabel,
  inventoryFamilyLabel,
  compareInventorySections,
  compareInventoryFamilies,
  INVENTORY_SECTION_ORDER,
} from "../../src/domain/inventory-items.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile, validateProfile } from "../../src/domain/profile.mjs";
import {
  cashFormatSave,
  itemSection,
  compareItems,
  itemRarity,
  rarityKey,
} from "../../src/domain/inventory-items.mjs";
import { createInventoryDraft } from "../../src/client/inventory-window.mjs";
import {
  parseItemCreateTarget,
  resolveItemCreateTarget,
  itemCreatePath,
} from "../../src/content/author-target.mjs";
const legacyProfile = () => newProfile({ ...pack, schemaVersion: 1 });
const pack = loadFixturePack("official-starter"),
  cash = "mw4:dmz-cash";
test("legacy cash 1333601 previews format update and content rebind without mutating drafts", () => {
  const profile = legacyProfile();
  profile.contentVersion = "older";
  profile.inventory[cash] = 1333601;
  profile.reserves[cash] = 20;
  profile.inventory["retired:keep"] = 3;
  profile.inventory["mw4:metals"] = 47;
  profile.completion["mw4:printer-access"] = "completed";
  const snapshot = structuredClone(profile);
  assert.throws(() => validateProfile(profile));
  const result = cashFormatSave(profile, pack);
  assert.equal(result.needsUpgrade, true);
  assert.equal(result.rebound, true);
  assert.equal(result.candidate.schemaVersion, 3);
  assert.equal(result.candidate.contentVersion, pack.contentVersion);
  assert.deepEqual(result.candidate.inventory, snapshot.inventory);
  assert.deepEqual(result.candidate.reserves, snapshot.reserves);
  assert.deepEqual(result.candidate.completion, snapshot.completion);
  assert.deepEqual(profile, snapshot);
  validateProfile(result.candidate);
});
test("prospective currency draft accepts 2m but preserves legacy saved validators and material cap", () => {
  const profile = legacyProfile();
  const legacy = createInventoryDraft(pack.items, profile),
    draft = createInventoryDraft(pack.items, profile, {
      allowCurrencyUpgrade: true,
    });
  draft.set("inventory", cash, "2000000", profile);
  assert.equal(draft.firstInvalid(), null);
  assert.equal(
    cashFormatSave(profile, pack).candidate.inventory[cash],
    2000000,
  );
  legacy.set("inventory", cash, "1333601", profile);
  assert.equal(legacy.firstInvalid().id, cash);
  draft.set("inventory", cash, "2000001", profile);
  assert.equal(draft.firstInvalid().id, cash);
  assert.throws(() => cashFormatSave(profile, pack));
  draft.set("inventory", cash, "1333601", profile);
  draft.set("inventory", "mw4:metals", "1000001", profile);
  assert.equal(draft.firstInvalid().id, "mw4:metals");
  assert.throws(() => cashFormatSave(profile, pack));
});
test("ordinary save does not silently migrate a format or rebind", () => {
  const p = legacyProfile();
  p.contentVersion = "older";
  assert.equal(cashFormatSave(p, pack).candidate, p);
  assert.equal(cashFormatSave(p, pack).needsUpgrade, false);
});
test("sections use metadata; names sort naturally, unknown rarity last", () => {
  assert.equal(itemSection({ category: "printer-resource" }), "Resources");
  assert.equal(itemSection({ category: "", kind: "weapon" }), "Weapons");
  assert.equal(itemRarity({}), "Not recorded");
  assert(rarityKey({ rarity: "Ultra" }) < rarityKey({}));
  const items = [
    { id: "test:b", name: "B", category: "Ingredients", rarity: "Rare" },
    { id: "test:a", name: "A", category: "Ingredients", rarity: "Ultra" },
  ];
  assert.equal(items.sort(compareItems)[0].name, "A");
  assert.equal(items.sort((a, b) => compareItems(a, b, "rarity"))[0].name, "B");
});
const names = [
  "Biomaterials",
  "Control Unit",
  "Detonators",
  "Electronic Sensors",
  "Reactive Metals",
  "Rigid Synthetics",
  "Binding Catalyst",
  "CPU",
  "High-Tenacity Fibers",
  "Nitro Compounds",
  "Nylon Cloth",
  "Printed Circuit Board",
  "Stock Rod",
  "Structural Alloy",
  "Alloyed Plating",
  "Ballistic Fabric",
  "Comms Module",
  "Nylon Laminate",
  "Power Regulator",
  "Stabilized Reagents",
  "Turned Components",
  "Volatile Explosives",
  "Experimental Compounds",
  "Military Composites",
  "Nano-Structured Alloy",
  "Prototype RF Module",
  "Sanctioned Assassination List",
  "Gold Bar",
  "Gold Skull",
];
for (const key of ["official-starter", "upgrade-observations"])
  test(
    key +
      ": all 29 source-listed ingredients, no duplicate names, no fabricated executable uses",
    () => {
      const p = loadFixturePack(key);
      const source = p.sources.find(
        (s) => s.id === "source:gamerant-ingredients-20261028",
      );
      assert.equal(
        source.url,
        "https://gamerant.com/mw4-dmz-all-ingredients-locations/",
      );
      let i = 0;
      for (const name of names) {
        const matches = p.items.filter((item) => item.name === name);
        assert.equal(matches.length, 1, name);
        const item = matches[0];
        assert.equal(item.category, "Ingredients");
        assert.equal(
          item.rarity,
          i < 6
            ? "Uncommon"
            : i < 14
              ? "Rare"
              : i < 22
                ? "Epic"
                : i < 27
                  ? "Legendary"
                  : "Ultra",
        );
        assert(item.sourceIds.includes(source.id));
        i++;
      }
      assert.equal(
        p.recipes.filter((r) => r.sourceIds.includes(source.id)).length,
        0,
      );
      assert.equal(
        p.objectives.filter((r) => r.sourceIds.includes(source.id)).length,
        0,
      );
    },
  );
test("new item destination selects exact existing catalog, rejects stale/hostile/duplicate parameters, does not mutate it", () => {
  const entries = [{ key: "official-starter", pack }];
  const before = structuredClone(entries);
  const path = itemCreatePath({ packKey: entries[0].key, packId: pack.id });
  const target = parseItemCreateTarget(
    new URL(path, "http://localhost").searchParams,
  );
  assert.equal(resolveItemCreateTarget(entries, target).entry, entries[0]);
  assert.deepEqual(entries, before);
  for (const query of [
    "create=weapons&packKey=official-starter&packId=" + pack.id,
    "create=items&packKey=../bad&packId=" + pack.id,
    "create=items&packKey=official-starter&packId=" + pack.id + "&create=items",
    "create=items&packKey=official-starter&packId=" + pack.id + "&id=evil",
  ])
    assert.throws(() => parseItemCreateTarget(new URLSearchParams(query)));
  assert.throws(() =>
    resolveItemCreateTarget(entries, { ...target, packId: "missing:pack" }),
  );
});

test("inventory families preserve kind boundaries and unknown custom types", () => {
  for (const [item, family] of [
    [{ kind: "weapon", category: "Equipment" }, "Weapons"],
    [{ kind: "currency", category: "cash" }, "Currency"],
    [{ kind: "resource", category: "printer-resource" }, "Materials"],
    [{ kind: "item", category: "Ingredients" }, "Materials"],
    [{ kind: "item", category: "upgrade material" }, "Materials"],
    [{ kind: "item", category: "consumable" }, "Consumables"],
    [{ kind: "item", category: "backpack" }, "Equipment"],
    [{ kind: "item", category: "Unknown source category" }, "Other items"],
  ])
    assert.equal(inventoryFamily(item), family);
  assert.equal(inventoryTypeLabel("assault-rifle"), "Assault rifles");
  assert.equal(
    inventoryTypeLabel("Unknown source category"),
    "Unknown source category",
  );
});

test("custom category labels never resolve inherited object members", () => {
  for (const type of ["constructor", "toString", "__proto__"]) {
    assert.equal(itemSection({ kind: "item", category: type }), type);
    assert.equal(inventoryTypeLabel(type), type);
    assert.equal(
      inventoryFamily({ kind: "item", category: type }),
      "Other items",
    );
    assert.equal(typeof rarityKey({ rarity: type }), "string");
  }
});

test("item sections follow the requested in-game order without dropping extra categories", () => {
  const requested = [
    "Consumables",
    "Plate carriers",
    "Backpacks",
    "Tacticals",
    "Lethals",
    "Field upgrades",
    "Fire support",
    "Gear",
    "Ingredients",
  ];
  assert.deepEqual(INVENTORY_SECTION_ORDER, requested);
  const shuffled = [
    "Resources",
    "Currency",
    ...requested.slice().reverse(),
    "Keys",
    "Weapons",
  ];
  const sorted = shuffled.sort(compareInventorySections);
  assert.deepEqual(sorted.slice(0, 9), requested);
  assert.equal(sorted.length, 13);
  assert.equal(inventoryTypeLabel("Equipment"), "Gear");
  assert.equal(inventoryFamilyLabel("Equipment"), "Equipment");
  assert.equal(inventoryTypeLabel("Gear"), "Gear");
  assert.equal(
    itemSection({ kind: "item", category: "equipment" }),
    "Equipment",
  );
  assert.equal(
    inventoryFamily({ kind: "item", category: "gear" }),
    "Equipment",
  );
  const items = [
    { id: "test:b", name: "B", category: "backpack" },
    { id: "test:z", name: "Z", category: "plate-carrier" },
    { id: "test:a", name: "A", category: "backpack" },
  ];
  assert.deepEqual(
    items.sort(compareItems).map((item) => item.id),
    ["test:z", "test:a", "test:b"],
  );
  assert.deepEqual(
    ["Currency", "Materials", "Equipment", "Consumables"].sort(
      compareInventoryFamilies,
    ),
    ["Consumables", "Equipment", "Materials", "Currency"],
  );
});

test("four corrected tactical identities stay tactical in both catalogs and stale generic snapshots", () => {
  for (const id of [
    "mw4:printer-item-snapshot-grenade",
    "mw4:printer-item-smoke-grenade",
    "mw4:printer-item-shock-stick",
    "mw4:printer-item-stim",
    "reported:snapshot-grenade",
    "reported:smoke-grenade",
    "reported:shock-stick",
    "reported:stim",
  ]) {
    const item = {
      id,
      kind: "item",
      category: "equipment",
      name: "Fixture existing tactical",
    };
    const before = structuredClone(item);
    assert.equal(itemSection(item), "Tacticals");
    assert.equal(inventoryFamily(item), "Equipment");
    assert.deepEqual(item, before);
  }
  assert.equal(
    itemSection({
      id: "custom:stim",
      name: "Stim",
      kind: "item",
      category: "equipment",
    }),
    "Equipment",
    "Never recategorize unrelated records by a fuzzy name match",
  );
});
