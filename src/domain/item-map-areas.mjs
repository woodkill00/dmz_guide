import { spoilerGuard, projectSpoilerValue } from "./progression.mjs";
const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
/** Named-area associations only. A text mention is not a coordinate or a spawn claim. */
export function itemMapAreas(
  record,
  pack,
  overview = { summary: record.description, notes: [] },
) {
  if (record.spoiler) return [];
  const text = ` ${normalize([overview.summary, ...overview.notes].join(" "))} `;
  const guard = spoilerGuard(pack);
  return [
    ...new Map(
      (pack.locations || [])
        .filter((location) => !location.spoiler)
        .map((location) => projectSpoilerValue(location, guard))
        .filter((location) => {
          const name = normalize(location.name);
          return (
            location.itemIds?.includes(record.id) ||
            record.relatedIds?.includes(location.id) ||
            (name.length >= 4 && text.includes(` ${name} `))
          );
        })
        .map((location) => [
          location.id,
          {
            id: location.id,
            name: location.name,
            mapId: location.mapId,
            basis:
              location.itemIds?.includes(record.id) ||
              record.relatedIds?.includes(location.id)
                ? "Recorded item/location association"
                : "Area mentioned in item reference text",
            referenceURL: `/maps/?pack=${encodeURIComponent(pack.id)}&location=${encodeURIComponent(location.id)}`,
            mapURL:
              location.mapId === "mw4:hajin"
                ? `http://127.0.0.1:5175/?tool=explore&area=${encodeURIComponent(location.name)}`
                : `/maps/?pack=${encodeURIComponent(pack.id)}&location=${encodeURIComponent(location.id)}`,
          },
        ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
}
