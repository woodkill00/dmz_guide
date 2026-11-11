import reference from "./x01-printer.json" with { type: "json" };
import { assert, boundedWalk, ID } from "./limits.mjs";
export const x01Printer = reference;
const keys = (value, expected) =>
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).sort().join(",") ===
        expected.split(" ").sort().join(","),
    "Invalid X01 reference fields",
  );
export function validateX01Printer(value, pack) {
  boundedWalk(value, { depth: 8, nodes: 3000, string: 500 });
  keys(
    value,
    "format version packId station map location locationHint inventoryContext source recipes",
  );
  assert(
    value.format === "dmz-x01-printer-reference" &&
      value.version === 1 &&
      value.station === "X01 3D Printer" &&
      value.map === "X01" &&
      value.inventoryContext === "carried-backpack",
    "Invalid X01 station context",
  );
  assert(pack?.id === value.packId, "X01 reference catalog unavailable");
  assert(
    [value.location, value.locationHint].every(
      (s) => typeof s === "string" && s.length > 0,
    ),
    "Invalid X01 location text",
  );
  keys(value.source, "id url publishedAt reviewedAt");
  assert(
    [value.source.publishedAt, value.source.reviewedAt].every(
      (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d),
    ),
    "Invalid X01 source date",
  );
  assert(
    value.source.url ===
      "https://gamerant.com/mw4-dmz-legendary-materials-x01-3d-printer-location/",
    "Invalid X01 source",
  );
  assert(
    pack.sources.some(
      (s) => s.id === value.source.id && s.url === value.source.url,
    ),
    "Missing X01 source",
  );
  assert(
    Array.isArray(value.recipes) &&
      value.recipes.length > 0 &&
      value.recipes.length <= 100,
    "Invalid X01 recipe count",
  );
  const ids = new Set(),
    items = new Map(pack.items.map((i) => [i.id, i]));
  const item = (id, name) => {
    const record = items.get(id);
    assert(
      typeof id === "string" &&
        ID.test(id) &&
        record &&
        !record.spoiler &&
        [record.name, ...record.aliases].includes(name),
      "Invalid X01 item reference",
    );
    return record;
  };
  for (const r of value.recipes) {
    keys(r, "itemId name category materials");
    item(r.itemId, r.name);
    assert(!ids.has(r.itemId), "Duplicate X01 output");
    ids.add(r.itemId);
    assert(
      [
        "Plate Carriers",
        "Field Upgrades",
        "Fire Support",
        "Keys",
        "Ingredients",
      ].includes(r.category),
      "Invalid X01 recipe category",
    );
    assert(
      Array.isArray(r.materials) &&
        r.materials.length > 0 &&
        r.materials.length <= 20,
      "Invalid X01 input list",
    );
    const inputs = new Set();
    for (const c of r.materials) {
      keys(c, "itemId name quantity");
      item(c.itemId, c.name);
      assert(
        Number.isSafeInteger(c.quantity) &&
          c.quantity > 0 &&
          c.quantity <= 1000000,
        "Invalid X01 input quantity",
      );
      assert(!inputs.has(c.itemId), "Duplicate X01 input");
      inputs.add(c.itemId);
    }
  }
  return value;
}
export const x01Uses = (id) =>
  reference.recipes.some(
    (r) => r.itemId === id || r.materials.some((c) => c.itemId === id),
  );
