import {
  inventoryBlueprintAvailable,
  automaticIngredientBlueprint,
} from "./inventory-presentation.mjs";
import { itemUses } from "./item-uses.mjs";
import { spoilerGuard } from "./progression.mjs";
export function setItemBlueprint(pack, profile, id, owned) {
  if (
    typeof owned !== "boolean" ||
    profile.packId !== pack.id ||
    profile.contentVersion !== pack.contentVersion
  )
    throw Error("Reload the current catalog before changing blueprints.");
  const item = pack.items.find((r) => r.id === id),
    guard = spoilerGuard(pack, profile.spoilers);
  if (
    !item ||
    guard.limited ||
    (!profile.spoilers && item.spoiler) ||
    guard.contains(item.id) ||
    guard.contains(item.name)
  )
    throw Error("Item is unavailable or protected.");
  if (!inventoryBlueprintAvailable(item, itemUses(pack, profile).get(id)))
    throw Error("No blueprint checklist is available for this item.");
  if (automaticIngredientBlueprint(pack, profile, item))
    throw Error("This blueprint is granted by a completed printing upgrade.");
  const candidate = structuredClone(profile);
  candidate.itemBlueprints ??= {};
  if (owned) candidate.itemBlueprints[id] = true;
  else delete candidate.itemBlueprints[id];
  return candidate;
}
