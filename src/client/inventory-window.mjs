import { inventoryInputLimit } from "../domain/inventory-items.mjs";
import { stockLimit } from "../domain/profile.mjs";
export const INVENTORY_PAGE_SIZE = 50;
// Number controls intentionally hide partial exponent/sign text from input.value.
// Retain an explicit invalid draft instead of converting that browser state to unknown stock.
export const INVALID_NUMBER_DRAFT = "incomplete-numeric-entry";
const fields = [
  ["inventory", "owned"],
  ["reserves", "reserve"],
];

export function createInventoryDraft(
  items,
  profile,
  { allowCurrencyUpgrade = false } = {},
) {
  const raw = new Map();
  for (const item of items)
    for (const [field, prefix] of fields)
      raw.set(
        `${prefix}:${item.id}`,
        Object.hasOwn(profile[field], item.id)
          ? String(profile[field][item.id])
          : field === "inventory"
            ? ""
            : "0",
      );
  let saved = new Map(raw);
  const blueprintIds = new Set(items.map((item) => item.id));
  const blueprints = new Set(Object.keys(profile.itemBlueprints || {}));
  let savedBlueprints = new Set(blueprints),
    hadBlueprintField = Object.hasOwn(profile, "itemBlueprints");
  const builds = new Map(
    Object.entries(profile.buildTargets || {}).map(([id, q]) => [
      id,
      String(q),
    ]),
  );
  let savedBuilds = new Map(builds),
    hadBuildField = Object.hasOwn(profile, "buildTargets");
  return {
    raw,
    buildSelected: (id) => builds.has(id),
    buildQuantity: (id) => builds.get(id) ?? "1",
    setBuild(id, value, model) {
      if (!blueprintIds.has(id)) return;
      if (value == null) {
        builds.delete(id);
        if (model.buildTargets) delete model.buildTargets[id];
        if (
          !hadBuildField &&
          Object.keys(model.buildTargets || {}).length === 0
        )
          delete model.buildTargets;
      } else {
        if (!builds.has(id) && builds.size >= 100)
          throw new Error("Maximum100 build targets. Remove a target first.");
        builds.set(id, String(value));
        model.buildTargets ??= {};
        model.buildTargets[id] = /^\d+$/.test(String(value))
          ? Number(value)
          : NaN;
      }
    },
    set(field, id, value, model, { badInput = false } = {}) {
      if (badInput) value = INVALID_NUMBER_DRAFT;
      const prefix = fields.find(([name]) => name === field)?.[1];
      const key = `${prefix}:${id}`;
      if (!prefix || !raw.has(key)) return;
      raw.set(key, value);
      if (field === "inventory" && value === "") delete model[field][id];
      else model[field][id] = value === "" ? NaN : Number(value);
    },
    blueprintOwned: (id) => blueprints.has(id),
    setBlueprint(id, owned, model) {
      if (!blueprintIds.has(id) || typeof owned !== "boolean") return;
      if (owned) {
        blueprints.add(id);
        model.itemBlueprints ??= {};
        model.itemBlueprints[id] = true;
      } else {
        blueprints.delete(id);
        if (model.itemBlueprints) delete model.itemBlueprints[id];
        if (
          !hadBlueprintField &&
          Object.keys(model.itemBlueprints || {}).length === 0
        )
          delete model.itemBlueprints;
      }
    },
    isDirty: () =>
      [...raw].some(([key, value]) => saved.get(key) !== value) ||
      blueprints.size !== savedBlueprints.size ||
      [...blueprints].some((id) => !savedBlueprints.has(id)) ||
      builds.size !== savedBuilds.size ||
      [...builds].some(([id, q]) => savedBuilds.get(id) !== q),
    checkpoint() {
      saved = new Map(raw);
      savedBlueprints = new Set(blueprints);
      hadBlueprintField = Object.hasOwn(profile, "itemBlueprints");
      savedBuilds = new Map(builds);
      hadBuildField = Object.hasOwn(profile, "buildTargets");
    },
    firstInvalid() {
      for (let index = 0; index < items.length; index++)
        for (const [field, prefix] of fields) {
          const id = items[index].id,
            name = `${prefix}:${id}`,
            value = raw.get(name),
            quantity = Number(value);
          if (
            (value === "" && field !== "inventory") ||
            !Number.isInteger(quantity) ||
            quantity < 0 ||
            quantity >
              (allowCurrencyUpgrade
                ? inventoryInputLimit(profile, items[index])
                : stockLimit(profile, items[index]))
          )
            return { id, field, name, index };
        }
      for (const [id, value] of builds)
        if (
          !/^\d+$/.test(value) ||
          Number(value) < 1 ||
          Number(value) > 1000000
        )
          return {
            id,
            field: "buildTargets",
            name: `build:${id}`,
            index: items.findIndex((i) => i.id === id),
          };
      return null;
    },
  };
}

export function filterInventoryIds(
  index,
  profile,
  query,
  mode,
  needed = new Set(),
) {
  const q = query.trim().toLowerCase(),
    result = [];
  for (const id of index.keys()) {
    const item = index.get(id);
    if (
      ![item.name, item.category, item.rarity || "", id]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
      continue;
    if (mode === "owned" && !profile.inventory[id] && !profile.reserves[id])
      continue;
    if (mode === "needed" && !needed.has(id)) continue;
    result.push(id);
  }
  return result;
}

export function inventoryPage(ids, requested) {
  const pages = Math.max(1, Math.ceil(ids.length / INVENTORY_PAGE_SIZE));
  const page = Math.max(0, Math.min(pages - 1, requested));
  return {
    ids: ids.slice(
      page * INVENTORY_PAGE_SIZE,
      (page + 1) * INVENTORY_PAGE_SIZE,
    ),
    page,
    pages,
    first: ids.length ? page * INVENTORY_PAGE_SIZE + 1 : 0,
    last: Math.min(ids.length, (page + 1) * INVENTORY_PAGE_SIZE),
  };
}
