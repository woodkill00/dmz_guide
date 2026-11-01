import { spoilerGuard } from "./progression.mjs";
import { scopeOf } from "../content/validate.mjs";
export function collectionVisibility(pack, profile) {
  const guard = spoilerGuard(pack, profile.spoilers);
  const safe = (r) =>
    Boolean(
      r &&
        !guard.limited &&
        (profile.spoilers || !r.spoiler) &&
        !guard.contains(r.id) &&
        !guard.contains(r.name || r.title || ""),
    );
  const result = {
    guard,
    safe,
    limited: guard.limited,
    items: new Map(),
    objectives: new Map(),
    recipes: new Map(),
    maps: new Map(),
    locations: new Map(),
    sources: new Map(),
  };
  let work = 0;
  const tick = () => {
    if (++work > 500000) throw Error("Visibility work limit");
  };
  try {
    if (
      [
        "items",
        "recipes",
        "objectives",
        "sources",
        "maps",
        "locations",
        "guides",
        "claims",
        "assets",
      ].reduce((n, k) => n + (pack[k]?.length || 0), 0) > 20000
    )
      throw Error("Record limit");
    for (const r of pack.items) {
      tick();
      if (safe(r)) result.items.set(r.id, { ...r, unit: guard.text(r.unit) });
    }
    for (const r of pack.objectives) {
      tick();
      if (!safe(r)) continue;
      let valid = true;
      for (const c of r.requirements || []) {
        tick();
        if (
          !result.items.has(c.itemId) ||
          scopeOf(pack, r) !== scopeOf(pack, result.items.get(c.itemId))
        )
          valid = false;
      }
      if (valid) result.objectives.set(r.id, r);
    }
    for (const r of pack.recipes) {
      tick();
      if (
        !safe(r) ||
        !result.items.has(r.output.itemId) ||
        scopeOf(pack, r) !== scopeOf(pack, result.items.get(r.output.itemId))
      )
        continue;
      let valid = true;
      for (const c of r.inputs) {
        tick();
        if (
          !result.items.has(c.itemId) ||
          scopeOf(pack, r) !== scopeOf(pack, result.items.get(c.itemId))
        )
          valid = false;
      }
      if (valid) result.recipes.set(r.id, r);
    }
    for (const r of pack.maps) {
      tick();
      if (
        safe(r) &&
        !(r.floors || []).some((f) => {
          tick();
          return guard.contains(f);
        })
      )
        result.maps.set(r.id, r);
    }
    for (const r of pack.locations) {
      tick();
      if (
        !safe(r) ||
        !result.maps.has(r.mapId) ||
        scopeOf(pack, r) !== scopeOf(pack, result.maps.get(r.mapId))
      )
        continue;
      let valid = true;
      for (const id of r.itemIds) {
        tick();
        if (!result.items.has(id)) valid = false;
      }
      if (valid && !guard.contains(r.coordinates?.floor || ""))
        result.locations.set(r.id, { ...r, grid: guard.text(r.grid || "") });
    }
    for (const r of pack.sources) {
      tick();
      if (safe(r)) result.sources.set(r.id, r);
    }
  } catch {
    result.limited = true;
  }
  return result;
}
