/** Reversible display grouping only: never merges or modifies source evidence. */
export interface DisplayRecord {
  key: string;
  sourceId: string;
  category: string;
  title: string;
  x: number;
  y: number;
  floor: string | null;
  build: string | null;
  visible: boolean;
}
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const aliases: Record<string, string[]> = {
  police: ["dmz_policeStation", "police"],
  clinic: ["dmz_clinic", "clinic"],
  fire: ["dmz_fireStation", "fire", "fire-station"],
  gas: ["dmz_gasStation", "gas", "gas-station"],
  marine: ["dmz_marineGasStation", "marine", "marine-gas"],
  cache: ["dmz_ammoCache", "ammo", "cache"],
  uav: ["dmz_uavTower", "uav", "uav-tower"],
  hunt: ["dmz_lieutenantHunt", "hunt", "lt-tower", "lttower"],
  sam: ["dmz_samSite", "sam"],
  compound: ["dmz_compound", "compound"],
  exfil: ["dmz_exfil", "exfil"],
  poi: ["poiLabel", "poi"],
  fortress: ["fort", "fortress"],
};
const kinds = new Map(
  Object.entries(aliases).flatMap(([kind, ids]) =>
    ids.map((id) => [normalize(id), kind] as const),
  ),
);
function kind(category: string) {
  return category.startsWith("dmz_fortress_")
    ? "fortress"
    : (kinds.get(normalize(category)) ?? normalize(category));
}
const title = (s: string) =>
  normalize(s)
    .split(" ")
    .map((w) => (w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .join(" ");
const priority = (a: DisplayRecord, b: DisplayRecord) =>
  Number(b.sourceId === "official") - Number(a.sourceId === "official") ||
  a.sourceId.localeCompare(b.sourceId, "en") ||
  a.key.localeCompare(b.key, "en");
export function displayDuplicates(input: DisplayRecord[], showAll = false) {
  if (input.length > 20000)
    throw new Error("Display source record limit exceeded.");
  if (new Set(input.map((r) => r.sourceId)).size < 2)
    return {
      suppressed: new Set<string>(),
      matches: new Map<string, string>(),
      truncated: false,
    };
  const grid = new Map<string, number[]>(),
    groups: {
      anchor: DisplayRecord;
      members: DisplayRecord[];
      floors: Set<string>;
      builds: Set<string>;
      sources: Set<string>;
    }[] = [];
  let examined = 0,
    truncated = false;
  for (const r of [...input].sort(priority)) {
    const k = kind(r.category),
      gx = Math.floor(r.x / 24),
      gy = Math.floor(r.y / 24);
    let match = -1,
      best = Infinity;
    if (!truncated)
      for (let x = gx - 1; x <= gx + 1; x++)
        for (let y = gy - 1; y <= gy + 1; y++)
          for (const index of grid.get(`${k}:${x},${y}`) ?? []) {
            if (++examined > 250000) {
              truncated = true;
              break;
            }
            const g = groups[index],
              distance = Math.hypot(r.x - g.anchor.x, r.y - g.anchor.y);
            if (g.sources.has(r.sourceId)) continue;
            if (
              distance > 24 ||
              (r.floor !== null && g.floors.size && !g.floors.has(r.floor)) ||
              (r.build !== null && g.builds.size && !g.builds.has(r.build))
            )
              continue;
            const sameName = title(r.title) === title(g.anchor.title),
              facility = [
                "police",
                "clinic",
                "fire",
                "gas",
                "marine",
                "cache",
                "uav",
                "hunt",
                "sam",
                "compound",
                "exfil",
              ].includes(k);
            if (!sameName && !(facility && distance <= 8)) continue;
            if (distance < best) {
              match = index;
              best = distance;
            }
          }
    if (match < 0) {
      match = groups.length;
      groups.push({
        anchor: r,
        members: [],
        floors: new Set(),
        builds: new Set(),
        sources: new Set(),
      });
      const cell = `${k}:${gx},${gy}`,
        ids = grid.get(cell) ?? [];
      ids.push(match);
      grid.set(cell, ids);
    }
    const g = groups[match];
    g.sources.add(r.sourceId);
    g.members.push(r);
    if (r.floor !== null) g.floors.add(r.floor);
    if (r.build !== null) g.builds.add(r.build);
  }
  const suppressed = new Set<string>(),
    matches = new Map<string, string>();
  for (const g of groups) {
    if (g.members.length < 2) continue;
    const visible = g.members.filter((r) => r.visible),
      representative = visible[0] ?? g.anchor;
    for (const r of g.members) {
      if (r.key !== g.anchor.key)
        matches.set(r.key, `${g.anchor.sourceId}: ${g.anchor.title}`);
      if (!showAll && r.visible && r.key !== representative.key)
        suppressed.add(r.key);
    }
  }
  return { suppressed, matches, truncated };
}
