import { missionAuditTargets } from "./mission-audit.mjs";

/** Coverage of records actually listed in this pack; never a complete-game denominator. */
export function contentHealth(pack, audit = null) {
  const items = pack.items || [];
  const recipes = pack.recipes || [];
  const locations = pack.locations || [];
  const weapons = items.filter((item) => item.kind === "weapon");
  const keys = items.filter(
    (item) => String(item.category || "").toLowerCase() === "keys",
  );
  const targets = missionAuditTargets(pack);
  const sections = targets.filter((target) => target.kind === "mission");
  const saved = new Map(
    (audit?.packId === pack.id ? audit.entries : []).map((entry) => [
      entry.id,
      entry,
    ]),
  );
  const rows = [
    {
      id: "orders",
      label: "Scoped Orders pages with a recorded roster",
      listed: 24,
      covered: targets.filter(
        (target) => target.kind === "page" && target.recorded,
      ).length,
    },
    {
      id: "missions",
      label: "Recorded mission sections checked",
      listed: sections.length,
      covered: sections.filter(
        (target) =>
          saved.get(target.id)?.state === "checked" &&
          saved.get(target.id)?.sourceFingerprint === target.sourceFingerprint,
      ).length,
    },
    {
      id: "recipes",
      label: "Listed recipes with known ingredients",
      listed: recipes.length,
      covered: recipes.filter((recipe) => recipe.ingredientsKnown === true)
        .length,
    },
    {
      id: "icons",
      label: "Listed items with a catalog image reference",
      listed: items.length,
      covered: items.filter((item) => item.assetId || item.assetIds?.length)
        .length,
    },
    {
      id: "weapons",
      label: "Listed weapons with numeric stats",
      listed: weapons.length,
      covered: weapons.filter((weapon) =>
        weapon.stats?.some(
          (stat) => stat.value !== null && stat.value !== undefined,
        ),
      ).length,
    },
    {
      id: "keys",
      label: "Listed keys with a description and source",
      listed: keys.length,
      covered: keys.filter((key) => key.description && key.sourceIds?.length)
        .length,
    },
    {
      id: "locations",
      label: "Listed locations with grid or coordinates",
      listed: locations.length,
      covered: locations.filter(
        (location) => location.grid || location.coordinates,
      ).length,
    },
  ];
  return rows.map((row) => ({
    ...row,
    missing: row.listed - row.covered,
    scope: "listed records only",
  }));
}
