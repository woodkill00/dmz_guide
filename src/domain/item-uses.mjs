import { requirementFacts } from "../content/validate.mjs";
import { spoilerGuard } from "./progression.mjs";
import { isObjectiveCompleted } from "./upgrade-progress.mjs";
const cache = new WeakMap();
const missionTracks = new Set([
  "dmz-order",
  "dmz-story",
  "mission",
  "campaign",
]);
// Admitted pack objects are immutable snapshots. A replacement snapshot or version
// gets a separate index; personal visibility and completion are never cached here.
function indexFor(pack) {
  const saved = cache.get(pack);
  if (saved && saved.version === pack.contentVersion) return saved.index;
  const items = new Map((pack.items || []).map((r) => [r.id, r]));
  const index = new Map(
    [...items.keys()].map((id) => [
      id,
      { recipes: [], upgrades: [], missions: [], crafts: [], acquisition: [] },
    ]),
  );
  for (const recipe of pack.recipes || []) {
    const output = items.get(recipe.output?.itemId);
    const endpoints = (recipe.inputs || []).map((i) => items.get(i.itemId));
    if (!output || endpoints.some((r) => !r)) continue;
    const dependencies = [recipe, output, ...endpoints];
    index.get(output.id).acquisition.push({ record: recipe, dependencies });
    for (const input of recipe.inputs || []) {
      const role =
        input.consumed === true
          ? "consumed"
          : input.consumed === false
            ? "retained"
            : "unknown";
      index
        .get(input.itemId)
        .recipes.push({ record: recipe, role, dependencies });
      index.get(input.itemId).crafts.push({ record: output, dependencies });
    }
  }
  for (const objective of pack.objectives || []) {
    const kind =
      objective.track === "dmz-upgrade"
        ? "upgrades"
        : missionTracks.has(objective.track)
          ? "missions"
          : null;
    if (!kind) continue;
    const dependencies = [
      objective,
      ...(objective.requirements || []).map((row) => items.get(row.itemId)),
    ];
    for (const requirement of objective.requirements || []) {
      const item = items.get(requirement.itemId);
      if (!item) continue;
      const edges = index.get(item.id)[kind];
      edges.push({
        record: objective,
        role: requirementFacts(pack, requirement).consumption || "unknown",
        dependencies,
      });
    }
  }
  cache.set(pack, { version: pack.contentVersion, index });
  return index;
}
export function itemUses(pack, profile) {
  const guard = spoilerGuard(pack, !!profile.spoilers);
  const visibility = new WeakMap(),
    dependencyVisibility = new WeakMap(),
    completion = new Map();
  const safe = (r) => {
    if (!r) return false;
    if (!visibility.has(r))
      visibility.set(
        r,
        !!(
          (profile.spoilers || !r.spoiler) &&
          !guard.contains(r.id) &&
          !guard.contains(r.name || "") &&
          !guard.limited
        ),
      );
    return visibility.get(r);
  };
  const result = new Map();
  for (const item of pack.items || []) {
    if (!safe(item)) continue;
    const groups = {};
    for (const [kind, edges] of Object.entries(indexFor(pack).get(item.id))) {
      const unique = new Map();
      for (const edge of edges) {
        if (!dependencyVisibility.has(edge.dependencies))
          dependencyVisibility.set(
            edge.dependencies,
            edge.dependencies.every(safe),
          );
        if (!dependencyVisibility.get(edge.dependencies)) continue;
        const r = edge.record;
        if (r.track && !completion.has(r.id))
          completion.set(r.id, isObjectiveCompleted(pack, profile, r.id));
        const completed = completion.get(r.id) || false;
        const previous = unique.get(r.id);
        const role =
          previous && previous.role !== edge.role ? "unknown" : edge.role;
        unique.set(r.id, {
          id: r.id,
          name: guard.text(r.name),
          role,
          track: r.track,
          completed,
          url: `/local/?pack=${encodeURIComponent(pack.id)}&id=${encodeURIComponent(r.id)}`,
        });
      }
      groups[kind] = [...unique.values()];
    }
    result.set(item.id, {
      item: {
        ...item,
        name: guard.text(item.name),
        description: guard.text(item.description || ""),
        category: guard.text(item.category || item.kind || "Other"),
        unit: guard.text(item.unit || ""),
        ...(item.rarity ? { rarity: guard.text(item.rarity) } : {}),
      },
      ...groups,
    });
  }
  return result;
}
