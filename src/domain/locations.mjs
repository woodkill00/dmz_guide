import { projectMapPack, spoilerGuard } from "./progression.mjs";
/** Map display is deliberately independent of game mechanics and image dimensions. */
export const floorOf = (location) => location?.coordinates?.floor || "unknown";
export function placementReason(map, location) {
  const c = location?.coordinates;
  if (!c) return "Precise coordinates unknown; list only.";
  if (!Number.isFinite(c.x) || !Number.isFinite(c.y))
    return "Invalid coordinates; list only.";
  const e = map?.extent;
  if (
    !Array.isArray(e) ||
    e.length !== 4 ||
    !e.every(Number.isFinite) ||
    e[0] >= e[2] ||
    e[1] >= e[3]
  )
    return "Map bounds unknown or invalid; list only.";
  const allowed =
    (map.origin === "center" &&
      ["x-right-y-down", "x-right-y-up"].includes(map.axis)) ||
    (map.origin === "top-left" && map.axis === "x-right-y-down") ||
    (map.origin === "bottom-left" && map.axis === "x-right-y-up");
  if (!allowed) return "Map origin or axes unknown/inconsistent; list only.";
  if (!map.floors?.includes(c.floor))
    return "Floor is not in this map version; list only.";
  if (c.x < e[0] || c.x > e[2] || c.y < e[1] || c.y > e[3])
    return "Coordinates outside current map bounds; list only.";
  return "";
}
export function projectLocation(map, location) {
  if (placementReason(map, location)) return null;
  const [x0, y0, x1, y1] = map.extent,
    { x, y } = location.coordinates;
  return {
    x: (100 * (x - x0)) / (x1 - x0),
    y: (100 * (map.axis === "x-right-y-up" ? y1 - y : y - y0)) / (y1 - y0),
  };
}
export function unmetItemIds(pack, plan) {
  const eligible = new Set(
    pack.items.filter((i) => i.kind !== "currency").map((i) => i.id),
  );
  return [
    ...new Set(
      (plan.ledger || [])
        .filter(
          (r) => eligible.has(r.id) && (r.missing > 0 || r.retainedMissing > 0),
        )
        .map((r) => r.id),
    ),
  ];
}
export function filterLocations(pack, filters = {}, neededItemIds = []) {
  pack = projectMapPack(pack, Boolean(filters.reveal));
  const needed = new Set(neededItemIds),
    query = (filters.query || "").trim().toLocaleLowerCase();
  return (pack.locations || []).filter((l) => {
    const map = pack.maps.find((m) => m.id === l.mapId);
    return (
      (!filters.mapId || filters.mapId === l.mapId) &&
      (!filters.floor || filters.floor === floorOf(l)) &&
      (!filters.category ||
        filters.category === (l.category || "uncategorized")) &&
      (!filters.sourceId || l.sourceIds.includes(filters.sourceId)) &&
      (!filters.coordinateVersion ||
        map?.coordinateVersion === filters.coordinateVersion) &&
      (!query ||
        [l.name, l.description, l.grid, floorOf(l), l.category]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)) &&
      (!filters.goalOnly || l.itemIds.some((id) => needed.has(id)))
    );
  });
}

export function effectiveScope(pack, record) {
  const scope = record?.scope;
  return scope
    ? `${scope.gameId} / ${scope.mode} / ${scope.build}`
    : `${pack.game.id} / ${pack.game.mode} / ${pack.game.build}`;
}
export function safePlanText(pack, profile, text) {
  return spoilerGuard(pack, profile.spoilers).text(String(text));
}
