const groups = [
  "items",
  "recipes",
  "objectives",
  "guides",
  "maps",
  "locations",
];
const references = (record) =>
  [
    ...(record.inputs || []).map((row) => row.itemId),
    ...(record.requirements || []).map((row) => row.itemId),
    ...(record.prerequisites || []),
    ...(record.relatedIds || []),
    ...(record.itemIds || []),
    record.output?.itemId,
    record.mapId,
  ].filter(Boolean);

/** Direct, declared references within a single catalog. No name-based inference. */
export function recordRelations(pack, id) {
  const records = groups.flatMap((group) => pack[group] || []);
  if (records.length > 20000) throw Error("Catalog relation limit exceeded");
  const byId = new Map(records.map((record) => [record.id, record]));
  if (byId.size !== records.length)
    throw Error("Duplicate catalog record identity");
  const target = byId.get(id);
  if (!target) return { incoming: [], outgoing: [], unresolved: [] };
  const outbound = [...new Set(references(target))];
  return {
    outgoing: outbound.map((ref) => byId.get(ref)).filter(Boolean),
    unresolved: outbound.filter((ref) => !byId.has(ref)),
    incoming: records.filter(
      (record) => record.id !== id && references(record).includes(id),
    ),
  };
}
