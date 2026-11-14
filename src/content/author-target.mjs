import { ID, assert } from "./limits.mjs";

export const PUBLIC_GROUPS = [
  "items",
  "recipes",
  "objectives",
  "guides",
  "maps",
  "locations",
];
const GROUPS = [...PUBLIC_GROUPS, "sources", "claims", "assets"];
const invalid =
  "Invalid editor target. Use the record's Edit action again, or open Content Studio without a query to choose a record manually.";

export function parseAuthorTarget(params) {
  if (![...params].length) return null;
  assert(
    [...params.keys()].sort().join(",") === "id,intent,packId,packKey",
    invalid,
  );
  const target = Object.fromEntries(params);
  assert(
    target.packKey.length <= 100 &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target.packKey),
    invalid,
  );
  assert(
    [target.packId, target.id].every(
      (value) => value.length <= 100 && ID.test(value),
    ),
    invalid,
  );
  assert(["edit", "images", "remove"].includes(target.intent), invalid);
  return target;
}
export function resolveAuthorTarget(entries, target) {
  const matches = entries.filter(
    (entry) => entry.key === target.packKey && entry.pack.id === target.packId,
  );
  assert(
    matches.length === 1,
    "This catalog is missing or its identity changed. Update your source checkout or choose the record manually in Content Studio.",
  );
  const entry = matches[0];
  const records = GROUPS.flatMap((group) =>
    (entry.pack[group] || []).flatMap((record, index) =>
      record.id === target.id ? [{ group, index, record }] : [],
    ),
  );
  assert(
    records.length === 1,
    "This record no longer exists in the selected catalog. Open Content Studio without a query to choose a record manually.",
  );
  const selection = records[0];
  assert(
    target.intent !== "images" || PUBLIC_GROUPS.includes(selection.group),
    "This supporting record does not support picture attachments. Open it with Edit instead.",
  );
  return { entry, ...selection };
}
export function authorPath({ packKey, packId, id, intent = "edit" }) {
  const params = new URLSearchParams({ packKey, packId, id, intent });
  parseAuthorTarget(params);
  return `/?${params}`;
}
export function previewPath({ packKey, id }) {
  return `/preview?packKey=${encodeURIComponent(packKey)}&id=${encodeURIComponent(id)}`;
}

// A create destination selects a catalog and the existing Add item form only.
// It never creates a record or falls back to another catalog.
export function parseItemCreateTarget(params) {
  const target = parseCreateTarget(params);
  assert(target.create === "items", invalid);
  return target;
}
export function parseCreateTarget(params) {
  assert(
    [...params.keys()].sort().join(",") === "create,packId,packKey",
    invalid,
  );
  const target = Object.fromEntries(params);
  assert(["items", "objectives"].includes(target.create), invalid);
  parseAuthorTarget(
    new URLSearchParams({
      packKey: target.packKey,
      packId: target.packId,
      id: "create:item",
      intent: "edit",
    }),
  );
  return target;
}
export function resolveItemCreateTarget(entries, target) {
  parseItemCreateTarget(new URLSearchParams(target));
  return resolveCreateTarget(entries, target);
}
export function resolveCreateTarget(entries, target) {
  parseCreateTarget(new URLSearchParams(target));
  const matches = entries.filter(
    (entry) => entry.key === target.packKey && entry.pack.id === target.packId,
  );
  assert(
    matches.length === 1,
    "This catalog is missing or its identity changed. No substitute catalog was selected.",
  );
  return { entry: matches[0] };
}
export function itemCreatePath({ packKey, packId }) {
  return createPath({ create: "items", packKey, packId });
}
export function createPath({ create, packKey, packId }) {
  const params = new URLSearchParams({ create, packKey, packId });
  parseCreateTarget(params);
  return "/?" + params;
}
