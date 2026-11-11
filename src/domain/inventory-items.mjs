import { inventoryGameEntry } from "./inventory-game-order.mjs";
import { fieldUpgradeRank } from "./field-upgrade-roster.mjs";
import {
  stockLimit,
  previewUpgradeMigration,
  validateProfile,
  validateInventoryForPack,
} from "./profile.mjs";
import { previewContentRebind } from "./profile-preview.mjs";
export const inventoryInputLimit = (profile, item) =>
  item?.kind === "currency" ? 2000000 : stockLimit(profile, item);
export function cashFormatSave(profile, pack, previousPack = null) {
  const needsUpgrade =
    profile.schemaVersion < 3 &&
    pack.items.some(
      (i) =>
        i.kind === "currency" &&
        ["inventory", "reserves"].some((k) => profile[k][i.id] > 1000000),
    );
  if (!needsUpgrade) return { candidate: profile, needsUpgrade: false };
  let basis = { ...structuredClone(profile), inventory: {}, reserves: {} };
  const rebound = basis.contentVersion !== pack.contentVersion;
  if (rebound)
    basis = previewContentRebind(basis, pack, previousPack).candidate;
  const migration = previewUpgradeMigration(basis, pack),
    candidate = migration.candidate;
  candidate.inventory = structuredClone(profile.inventory);
  candidate.reserves = structuredClone(profile.reserves);
  validateProfile(candidate);
  validateInventoryForPack(candidate, pack);
  return { ...migration, candidate, needsUpgrade: true, rebound };
}
// Player-requested display correction, including older cached reference snapshots.
// Keep canonical item identities and saved quantities/blueprints unchanged.
const TACTICAL_ITEM_IDS = new Set([
  "mw4:printer-item-snapshot-grenade",
  "mw4:printer-item-smoke-grenade",
  "mw4:printer-item-shock-stick",
  "mw4:printer-item-stim",
  "reported:snapshot-grenade",
  "reported:smoke-grenade",
  "reported:shock-stick",
  "reported:stim",
]);
const MISC_ITEM_IDS = new Set([
  "mw4:ingredient-gold-skull",
  "mw4:ingredient-gold-bar",
  "reported:gold-skull",
  "reported:gold-bar",
  ...[
    "ballistic-flight-logs",
    "regional-combat-notes",
    "w-m-d-manifest",
    "foreign-intelligence-targets",
    "infantry-invasion-plans",
    "degraded-execution-footage",
    "nuclear-program-files",
    "encrypted-archive",
  ].map((slug) => "mw4:printer-item-" + slug),
  ...[
    "ballistic-flight-logs",
    "regional-combat-notes",
    "wmd-manifest",
    "foreign-intelligence-targets",
  ].map((slug) => "observed:" + slug),
  ...[
    "infantry-invasion-plans",
    "degraded-execution-footage",
    "nuclear-program-files",
    "encrypted-archive",
  ].map((slug) => "reported:" + slug),
]);
const RESOURCE_ORDER = [
  "mw4:synthetics",
  "mw4:electronics",
  "mw4:chemicals",
  "mw4:metals",
];
export function itemSection(item) {
  if (MISC_ITEM_IDS.has(item.id)) return "Misc items";
  if (fieldUpgradeRank(item.id) !== null) return "Field upgrades";
  const gameEntry = inventoryGameEntry(item.id);
  if (gameEntry) return gameEntry.section;
  if (TACTICAL_ITEM_IDS.has(item.id)) return "Tacticals";
  const value = item.category?.trim();
  const labels = {
    currency: "Currency",
    cash: "Currency",
    resource: "Resources",
    resources: "Resources",
    "printer-resource": "Resources",
    "printer-ingredient": "Ingredients",
    "upgrade material": "Upgrade materials",
    consumable: "Consumables",
    backpack: "Backpacks",
    "plate-carrier": "Plate carriers",
    weapon: "Weapons",
    weapons: "Weapons",
    item: "Equipment",
    equipment: "Equipment",
    gear: "Equipment",
  };
  return (
    (Object.hasOwn(labels, value?.toLowerCase())
      ? labels[value.toLowerCase()]
      : undefined) ??
    (value ||
      (Object.hasOwn(labels, item.kind) ? labels[item.kind] : undefined)) ??
    "Uncategorized"
  );
}
export const itemRarity = (item) => item.rarity?.trim() || "Not recorded";
const ranks = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  ultra: 5,
  unique: 6,
};
export const rarityKey = (item) => {
  const r = itemRarity(item).toLowerCase();
  return (
    String(
      r === "not recorded" || r === "unknown"
        ? 99
        : Object.hasOwn(ranks, r)
          ? ranks[r]
          : 98,
    ).padStart(2, "0") +
    ":" +
    r
  );
};
const compare = (a, b) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
export const INVENTORY_SECTION_ORDER = Object.freeze([
  "Consumables",
  "Plate carriers",
  "Backpacks",
  "Tacticals",
  "Lethals",
  "Field upgrades",
  "Fire support",
  "Gear",
  "Ingredients",
]);
const sectionRank = (value) => {
  const label = inventoryTypeLabel(value).toLowerCase();
  const index = INVENTORY_SECTION_ORDER.findIndex(
    (name) => name.toLowerCase() === label,
  );
  return index < 0 ? INVENTORY_SECTION_ORDER.length : index;
};
export function compareInventorySections(a, b) {
  return (
    sectionRank(a) - sectionRank(b) ||
    compare(inventoryTypeLabel(a), inventoryTypeLabel(b))
  );
}
export function compareInventoryFamilies(a, b) {
  const families = [
    "Consumables",
    "Equipment",
    "Materials",
    "Weapons",
    "Currency",
    "Other items",
  ];
  const rank = (name) => {
    const index = families.indexOf(name);
    return index < 0 ? families.length : index;
  };
  return rank(a) - rank(b) || compare(a, b);
}
const materialSortRank = (item) => {
  const n = Number(rarityKey(item).slice(0, 2));
  return n < 90 ? -n : n;
};
export function compareItems(a, b, mode = "name") {
  return (
    compareInventorySections(itemSection(a), itemSection(b)) ||
    (itemSection(a) === "Misc items" && itemSection(b) === "Misc items"
      ? materialSortRank(a) - materialSortRank(b)
      : 0) ||
    (mode === "name" &&
    itemSection(a) === "Resources" &&
    itemSection(b) === "Resources"
      ? (RESOURCE_ORDER.includes(a.id) ? RESOURCE_ORDER.indexOf(a.id) : 10000) -
        (RESOURCE_ORDER.includes(b.id) ? RESOURCE_ORDER.indexOf(b.id) : 10000)
      : 0) ||
    (mode === "name" && itemSection(a) === itemSection(b)
      ? (fieldUpgradeRank(a.id) ?? inventoryGameEntry(a.id)?.rank ?? 10000) -
        (fieldUpgradeRank(b.id) ?? inventoryGameEntry(b.id)?.rank ?? 10000)
      : 0) ||
    (mode === "rarity"
      ? compare(rarityKey(a), rarityKey(b)) || compare(a.name, b.name)
      : compare(a.name, b.name) || compare(rarityKey(a), rarityKey(b))) ||
    compare(a.id, b.id)
  );
}

export function inventoryFamily(item) {
  if (item.kind === "weapon") return "Weapons";
  if (item.kind === "currency") return "Currency";
  const type = itemSection(item);
  if (
    item.kind === "resource" ||
    ["Resources", "Ingredients", "Upgrade materials", "Misc items"].includes(
      type,
    )
  )
    return "Materials";
  if (type === "Consumables") return "Consumables";
  if (
    [
      "Equipment",
      "Gear",
      "Backpacks",
      "Plate carriers",
      "Tacticals",
      "Lethals",
      "Field upgrades",
      "Fire support",
    ].includes(type)
  )
    return "Equipment";
  return "Other items";
}
export function inventoryTypeLabel(type) {
  const labels = {
    Equipment: "Gear",
    Gear: "Gear",
    "assault-rifle": "Assault rifles",
    smg: "Submachine guns",
    shotgun: "Shotguns",
    lmg: "Light machine guns",
    "marksman-rifle": "Marksman rifles",
    "sniper-rifle": "Sniper rifles",
    pistol: "Pistols",
    launcher: "Launchers",
    melee: "Melee weapons",
  };
  return Object.hasOwn(labels, type) ? labels[type] : type;
}

export function inventoryFamilyLabel(family) {
  return family === "Equipment" ? "Equipment" : inventoryTypeLabel(family);
}
