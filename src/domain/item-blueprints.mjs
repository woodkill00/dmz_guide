import { assert, ID } from "../content/limits.mjs";
// Optional additive profile field. Missing/unchecked is not a claim about a game's recipe gate.
export function validateItemBlueprints(value) {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    "Invalid item blueprint checklist",
  );
  assert(
    Object.keys(value).length <= 10000,
    "Too many item blueprint references",
  );
  for (const [id, owned] of Object.entries(value))
    assert(
      id.length <= 100 && ID.test(id) && owned === true,
      "Invalid item blueprint ownership",
    );
}
export const itemBlueprintOwned = (profile, id) =>
  profile.itemBlueprints?.[id] === true;
export const itemBlueprintLabel = (profile, id) =>
  itemBlueprintOwned(profile, id)
    ? "Blueprint owned (your record)"
    : "Blueprint not marked owned";
