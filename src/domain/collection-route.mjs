import { hashBytes } from "../content/portable.mjs";
import { collectionVisibility } from "./collection-visibility.mjs";
import { projectLocation, floorOf } from "./locations.mjs";
const tokenPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assert = (v, message) => {
  if (!v) throw new Error(message);
};
export function collectionRoutePoint(map, location) {
  const e = map?.extent;
  if (
    !Array.isArray(e) ||
    e.length !== 4 ||
    !e.every(Number.isFinite) ||
    !Number.isFinite(e[2] - e[0]) ||
    !Number.isFinite(e[3] - e[1]) ||
    e[2] <= e[0] ||
    e[3] <= e[1]
  )
    return null;
  const p = projectLocation(map, location);
  return p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= 0 &&
    p.x <= 100 &&
    p.y >= 0 &&
    p.y <= 100
    ? p
    : null;
}
export function validateCollectionRoute(pack, profile, ids) {
  assert(
    profile.packId === pack.id &&
      profile.contentVersion === pack.contentVersion,
    "Rebind content before selecting a collection route.",
  );
  assert(
    Array.isArray(ids) &&
      ids.length <= 50 &&
      ids.every((id) => typeof id === "string" && id.length <= 100) &&
      new Set(ids).size === ids.length,
    "Choose up to 50 unique known locations.",
  );
  const visible = collectionVisibility(pack, profile);
  assert(!visible.limited, "Route visibility review is incomplete.");
  const stops = ids.map((id) => visible.locations.get(id));
  assert(stops.every(Boolean), "A route location is unavailable or protected.");
  if (!stops.length) return { stops: [], map: null, floor: "", binding: "" };
  const map = visible.maps.get(stops[0].mapId),
    floor = floorOf(stops[0]);
  assert(
    stops.every(
      (l) =>
        l.mapId === map.id &&
        floorOf(l) === floor &&
        collectionRoutePoint(map, l),
    ),
    "Route stops must have calibrated positions on the same map and floor.",
  );
  return { stops, map, floor };
}
async function routeDigest(pack, route) {
  const raw = JSON.stringify([
    pack.id,
    pack.contentVersion,
    route.map?.id,
    route.map?.coordinateVersion,
    route.map?.extent,
    route.map?.origin,
    route.map?.axis,
    route.stops.map((l) => [l.id, l.coordinates]),
  ]);
  const bytes = new TextEncoder().encode(raw);
  assert(bytes.length <= 65536, "Route calibration input exceeds its limit.");
  return hashBytes(bytes);
}

export async function saveCollectionRoute(
  pack,
  profile,
  ids,
  storage = localStorage,
) {
  const route = validateCollectionRoute(pack, profile, ids);
  const raw = JSON.stringify({ ids, binding: await routeDigest(pack, route) });
  assert(
    new TextEncoder().encode(raw).length <= 16384,
    "Route preference is too large.",
  );
  storage.setItem(
    `dmz-collection-route:${pack.id}:${pack.contentVersion}`,
    raw,
  );
  return route;
}
export async function loadCollectionRoute(
  pack,
  profile,
  storage = localStorage,
) {
  const raw = storage.getItem(
    `dmz-collection-route:${pack.id}:${pack.contentVersion}`,
  );
  if (!raw) return [];
  assert(
    new TextEncoder().encode(raw).length <= 16384,
    "Saved route exceeds its limit.",
  );
  const data = JSON.parse(raw);
  assert(
    data && Object.keys(data).sort().join(",") === "binding,ids",
    "Invalid saved route.",
  );
  const checked = validateCollectionRoute(pack, profile, data.ids);
  assert(
    (await routeDigest(pack, checked)) === data.binding,
    "Saved route calibration changed. Clear it and select locations again.",
  );
  return data.ids;
}
export async function createCollectionRouteContext(
  pack,
  profile,
  ids,
  storage = sessionStorage,
  { now = Date.now(), token = crypto.randomUUID() } = {},
) {
  assert(tokenPattern.test(token), "Invalid route token.");
  assert(Number.isSafeInteger(now) && now >= 0, "Invalid route creation time.");
  const route = validateCollectionRoute(pack, profile, ids);
  assert(ids.length > 0, "Add route stops first.");
  const data = {
    version: 1,
    packId: pack.id,
    contentVersion: pack.contentVersion,
    ids: [...ids],
    binding: await routeDigest(pack, route),
    createdAt: now,
  };
  const raw = JSON.stringify(data);
  assert(
    new TextEncoder().encode(raw).length <= 16384,
    "Route context exceeds 16 KiB.",
  );
  storage.setItem(`dmz-collection-context:${token}`, raw);
  return `/maps/?pack=${encodeURIComponent(pack.id)}&collectionRoute=${encodeURIComponent(token)}`;
}
export async function readCollectionRouteContext(
  pack,
  profile,
  token,
  storage = sessionStorage,
  { now = Date.now() } = {},
) {
  assert(
    typeof token === "string" && tokenPattern.test(token),
    "Invalid collection route token.",
  );
  const raw = storage.getItem(`dmz-collection-context:${token}`);
  assert(
    typeof raw === "string" && new TextEncoder().encode(raw).length <= 16384,
    "Collection route is missing or too large. Reopen it from Collection.",
  );
  const data = JSON.parse(raw);
  assert(
    data &&
      Object.keys(data).sort().join(",") ===
        "binding,contentVersion,createdAt,ids,packId,version" &&
      data.version === 1,
    "Invalid collection route context.",
  );
  assert(
    data.packId === pack.id &&
      data.contentVersion === pack.contentVersion &&
      Number.isSafeInteger(data.createdAt) &&
      data.createdAt <= now &&
      now - data.createdAt <= 2 * 60 * 60 * 1000,
    "Collection route expired or belongs to different content.",
  );
  assert(Array.isArray(data.ids) && data.ids.length > 0, "Route has no stops.");
  const route = validateCollectionRoute(pack, profile, data.ids);
  assert(
    (await routeDigest(pack, route)) === data.binding,
    "Collection route coordinates changed. Select locations again.",
  );
  return route;
}
