export const LOOT_TYPES_INDEX = "mw4:loot-types";
export const lootTypeId = (name) =>
  "mw4:loot-type-" +
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const isLootType = (id) => id?.startsWith("mw4:loot-type-");
export function ensureLootTypeGuides(pack, { items, mapping, sourceId }) {
  const names = [
    ...new Set(Object.values(items).flatMap((i) => i.lootSources || [])),
  ].sort((a, b) => a.localeCompare(b));
  if (
    names.length > 100 ||
    new Set(names.map(lootTypeId)).size !== names.length
  )
    throw Error("Loot type identity limit or collision");
  const visible = new Set(
    pack.items.filter((i) => !i.spoiler).map((i) => i.id),
  );
  for (const name of names) {
    const id = lootTypeId(name),
      related = [
        ...new Set(
          Object.values(items)
            .filter((i) => i.lootSources?.includes(name))
            .map((i) => mapping[i.id])
            .filter((id) => visible.has(id)),
        ),
      ];
    const existing = pack.guides.find((g) => g.id === id);
    if (existing) {
      existing.relatedIds = [...new Set([...existing.relatedIds, ...related])];
      existing.sourceIds = [...new Set([...existing.sourceIds, sourceId])];
    } else
      pack.guides.push({
        id,
        title: name,
        category: "locations",
        body: `${name} is a loot-source type listed by TroubleChute. The related items below are reported possibilities, not guaranteed drops.\nSpecific map positions are not recorded here. Add identification notes and example photographs through Edit loot type or Add photos.`,
        spoiler: false,
        status: "observed",
        sourceIds: [sourceId],
        relatedIds: related,
      });
  }
  const index = pack.guides.find((g) => g.id === LOOT_TYPES_INDEX);
  if (index)
    index.relatedIds = [
      ...new Set([...index.relatedIds, ...names.map(lootTypeId)]),
    ];
  else
    pack.guides.push({
      id: LOOT_TYPES_INDEX,
      title: "Loot source types",
      category: "locations",
      body: "Browse the reported loot-container and source types. Each page lists associated items and supports identification notes and photographs. These are source types, not calibrated map positions.",
      spoiler: false,
      status: "observed",
      sourceIds: [sourceId],
      relatedIds: names.map(lootTypeId),
    });
  return names;
}
