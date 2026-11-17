import { validateProfile, validateInventoryForPack } from "./profile.mjs";
import { quickCollect } from "./quick-collect.mjs";
import { buildTargetNeeds } from "./build-targets.mjs";
import { upgradeFamilies } from "./upgrade-families.mjs";
import { upgradeBudget } from "./upgrade-budget.mjs";
import { spoilerGuard } from "./progression.mjs";
import { itemUses } from "./item-uses.mjs";
import {
  automaticIngredientBlueprint,
  inventoryBlueprintAvailable,
} from "./inventory-presentation.mjs";
import { hajinOrderSequence } from "../content/hajin-order-sequence.mjs";

export const dashboardSections = [
  "builds",
  "needed",
  "upgrades",
  "orders",
  "weapons",
  "recipes",
];
export const dashboardTitles = {
  builds: "Want to build · ingredients",
  needed: "Other outstanding items",
  upgrades: "Upgrades",
  orders: "Orders · Hajin & X01",
  weapons: "Weapon blueprints & acquisition",
  recipes: "Item recipes & blueprints",
};
export const dashboardLink = (path, packId) =>
  `${path}?pack=${encodeURIComponent(packId)}`;
export const dashboardItemLink = (packId, id) =>
  `${dashboardLink("/local/", packId)}&id=${encodeURIComponent(id)}`;
export function dashboardPreferences(value) {
  const fallback = {
    version: 1,
    catalogId: "official:mw4-dmz-starter",
    order: [...dashboardSections],
    collapsed: {},
  };
  if (
    !value ||
    JSON.stringify(value).length > 8192 ||
    value.version !== 1 ||
    Object.keys(value).some(
      (k) => !["version", "catalogId", "order", "collapsed"].includes(k),
    ) ||
    typeof value.catalogId !== "string" ||
    value.catalogId.length > 100 ||
    !Array.isArray(value.order) ||
    value.order.length !== 6 ||
    new Set(value.order).size !== 6 ||
    value.order.some((k) => !dashboardSections.includes(k)) ||
    !value.collapsed ||
    typeof value.collapsed !== "object" ||
    Array.isArray(value.collapsed) ||
    Object.entries(value.collapsed).some(
      ([k, v]) => !dashboardSections.includes(k) || typeof v !== "boolean",
    )
  )
    return fallback;
  return structuredClone(value);
}
export function projectDashboard(pack, profile, { crafting = false } = {}) {
  if (!profile) return { status: "absent" };
  validateProfile(profile);
  if (
    profile.packId !== pack.id ||
    profile.contentVersion !== pack.contentVersion
  )
    return { status: "stale" };
  validateInventoryForPack(profile, pack);
  const guard = spoilerGuard(pack, profile.spoilers);
  const safe = (r) =>
    r &&
    !guard.limited &&
    (profile.spoilers || !r.spoiler) &&
    !guard.contains(r.id) &&
    !guard.contains(r.name || "");
  const builds = buildTargetNeeds(pack, profile),
    needs = quickCollect(pack, profile, { crafting });
  const budget = upgradeBudget(pack, profile),
    families = upgradeFamilies(pack, profile).families;
  const upgrades = families.map((f) => ({
    id: f.current.id,
    name: f.name,
    tier: f.current.tier,
    complete: f.complete,
    done: f.members.filter((m) => m.completed).length,
    total: f.members.length,
    requirements: budget.rows?.get(f.current.id)?.materials || [],
  }));
  const missions = pack.objectives.filter(
    (r) => ["dmz-order", "dmz-story"].includes(r.track) && safe(r),
  );
  const roster = (page, set, ids, label, variable = false) => {
    const rows = missions.filter((r) => ids.includes(r.id));
    return {
      page,
      set,
      label,
      variable,
      total: rows.length,
      done: rows.filter((r) => profile.completion[r.id] === "completed").length,
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        done: profile.completion[r.id] === "completed",
      })),
    };
  };
  const orders =
    pack.id === "official:mw4-dmz-starter"
      ? [
          ...hajinOrderSequence.pages.map((p) =>
            roster(
              p.page,
              "hajin",
              p.objectiveIds,
              p.label,
              p.placement !== "fixed",
            ),
          ),
          ...Array.from({ length: 5 }, (_, i) =>
            roster(
              i + 1,
              "x01",
              missions
                .filter((r) => r.orderSet === "x01" && r.orderPage === i + 1)
                .map((r) => r.id),
              `X01 ${i + 1}/5`,
            ),
          ),
        ]
      : [
          roster(
            null,
            "other",
            missions.map((r) => r.id),
            "Listed missions",
          ),
        ];
  const uses = itemUses(pack, profile);
  const recipes = pack.items
    .filter((r) => safe(r) && inventoryBlueprintAvailable(r, uses.get(r.id)))
    .map((r) => ({
      id: r.id,
      name: r.name,
      rarity: r.rarity || "unknown",
      owned:
        !!profile.itemBlueprints?.[r.id] ||
        !!automaticIngredientBlueprint(pack, profile, r),
      automatic: !!automaticIngredientBlueprint(pack, profile, r),
    }));
  recipes.sort(
    (a, b) => Number(a.owned) - Number(b.owned) || a.name.localeCompare(b.name),
  );
  return {
    status: "ready",
    revision: profile.revision,
    builds,
    needed: { ...needs, items: needs.items.filter((r) => r.remaining !== 0) },
    upgrades,
    orders,
    recipes,
  };
}

export function buildWindow(model, { expanded = false, page = 0 } = {}) {
  const count = expanded ? 5 : 3,
    cap = expanded ? 50 : 12;
  const groups = [];
  let used = 0;
  // Shared totals consume the same global tile budget as individual groups.
  const directIds = new Set(
    model.groups.flatMap((g) =>
      g.noRecipe ? [g.id] : g.direct.map((r) => r.id),
    ),
  );
  const all =
    model.groups.length > 1
      ? [
          {
            id: "shared",
            name: "Shared ingredient totals",
            direct: model.combined.filter((r) => directIds.has(r.id)),
            shared: true,
          },
          ...model.groups,
        ]
      : model.groups;
  const maxPage = Math.max(0, Math.ceil(all.length / count) - 1);
  const offset = Math.min(Math.max(0, page), maxPage) * count;
  for (const group of all.slice(offset, offset + count)) {
    const rows = group.noRecipe ? [group.root].filter(Boolean) : group.direct;
    const tiles = rows.slice(0, Math.min(12, cap - used));
    used += tiles.length;
    groups.push({ ...group, tiles, total: rows.length });
  }
  return {
    groups,
    total: all.length,
    page: Math.floor(offset / count),
    pages: maxPage + 1,
    truncated:
      all.length > groups.length ||
      groups.some((g) => g.total > g.tiles.length),
  };
}

export function weaponDashboard(acquisition, weapons) {
  const known = new Map(weapons.map((w) => [w.id, w]));
  return Object.entries(acquisition || {}).map(([id, record]) => ({
    id,
    name: known.get(id)?.name || "Unresolved weapon reference",
    resolved: known.has(id),
    manual: record.manual,
    manualExtractions: record.manualExtractions ?? null,
    blueprints: [...record.blueprints],
    attachments: record.attachments.length,
  }));
}
