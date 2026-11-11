import { itemSection, itemRarity, rarityKey } from "./inventory-items.mjs";
import { upgradeProgressFor } from "./upgrade-progress.mjs";
export function inventoryUpgradeUse(uses) {
  const upgrades = uses?.upgrades || [];
  return {
    used: upgrades.length > 0,
    completed: upgrades.length > 0 && upgrades.every((u) => u.completed),
    remaining: upgrades.filter((u) => !u.completed).length,
  };
}
export function automaticIngredientBlueprint(pack, profile, item) {
  if (
    profile.contentVersion !== pack.contentVersion ||
    itemSection(item) !== "Ingredients"
  )
    return null;
  const tier = itemRarity(item).toLowerCase();
  const ids =
    tier === "epic"
      ? [
          "mw4:upgrade-epic-ingredient-printing",
          "reported:epic-ingredient-printing",
        ]
      : tier === "uncommon"
        ? [
            "mw4:upgrade-uncommon-ingredient-printing",
            "reported:uncommon-ingredient-printing",
          ]
        : [];
  const upgrade = pack.objectives.find(
    (o) => ids.includes(o.id) && o.track === "dmz-upgrade",
  );
  if (!upgrade || (upgrade.spoiler && !profile.spoilers)) return null;
  const progress = upgradeProgressFor(pack, profile, upgrade.id);
  return progress.completion === "completed" && !progress.reviewRequired
    ? upgrade
    : null;
}
export function inventoryBlueprintAvailable(item, uses) {
  return (
    !!uses?.acquisition.length ||
    itemSection(item) === "Field upgrades" ||
    itemSection(item) === "Ingredients" ||
    item.id === "mw4:x01-staff-emergency-exfil-keycard"
  );
}
export function compareInventoryMaterialItems(a, b) {
  const rank = (i) => {
    const n = Number(rarityKey(i).slice(0, 2));
    return n < 90 ? -n : n;
  };
  return (
    rank(a) - rank(b) ||
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }) ||
    a.id.localeCompare(b.id)
  );
}
export function currencyQuantityText(value) {
  const raw = String(value ?? "");
  return /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw))
    ? Number(raw).toLocaleString("en-US")
    : raw;
}
export function currencyQuantityRaw(value) {
  return /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value)
    ? value.replaceAll(",", "")
    : value;
}
export function inventoryBlueprintOwnershipLabel(pack, profile, id) {
  const item = pack.items.find((record) => record.id === id);
  const grant = item && automaticIngredientBlueprint(pack, profile, item);
  return grant
    ? "Blueprint owned (" + grant.name + ")"
    : profile.itemBlueprints?.[id] === true
      ? "Blueprint owned (your record)"
      : "Blueprint not marked owned";
}
