import { ID } from "../content/limits.mjs";

const groups = {
  item: "items",
  recipe: "recipes",
  objective: "objectives",
  guide: "guides",
  map: "maps",
  location: "locations",
};
// Only a matching published identity can expose repository editing from a
// private saved view. Display names and private additions are never targets.
export function repositoryEditTarget(
  catalogs,
  published,
  record,
  { reveal = false } = {},
) {
  const group = groups[record?.recordType];
  if (
    !group ||
    !published ||
    published.id !== record.pack?.id ||
    (record.spoiler && !reveal)
  )
    return null;
  const sources = (published[group] || []).filter((r) => r.id === record.id);
  const entries = catalogs.filter((c) => c.id === published.id);
  if (
    sources.length !== 1 ||
    entries.length !== 1 ||
    (sources[0].spoiler && !reveal)
  )
    return null;
  const match =
    /^\/assets\/content\/packs\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/.exec(
      entries[0].path,
    );
  if (
    !match ||
    match[1].length > 100 ||
    ![published.id, record.id].every(
      (value) =>
        typeof value === "string" && value.length <= 100 && ID.test(value),
    )
  )
    return null;
  return {
    packKey: match[1],
    packId: published.id,
    id: record.id,
    intent: "compose",
  };
}
