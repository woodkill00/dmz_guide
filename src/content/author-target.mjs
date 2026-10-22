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
  assert(["edit", "images"].includes(target.intent), invalid);
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
