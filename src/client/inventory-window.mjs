import { stockLimit } from "../domain/profile.mjs";
export const INVENTORY_PAGE_SIZE = 50;
const fields = [
  ["inventory", "owned"],
  ["reserves", "reserve"],
];

export function createInventoryDraft(items, profile) {
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
  return {
    raw,
    set(field, id, value, model) {
      const prefix = fields.find(([name]) => name === field)?.[1];
      const key = `${prefix}:${id}`;
      if (!prefix || !raw.has(key)) return;
      raw.set(key, value);
      if (field === "inventory" && value === "") delete model[field][id];
      else model[field][id] = value === "" ? NaN : Number(value);
    },
    isDirty: () => [...raw].some(([key, value]) => saved.get(key) !== value),
    checkpoint() {
      saved = new Map(raw);
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
            quantity > stockLimit(profile, items[index])
          )
            return { id, field, name, index };
        }
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
    if (![item.name, item.category, id].join(" ").toLowerCase().includes(q))
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
