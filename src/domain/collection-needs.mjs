import { scopeOf, requirementFacts } from "../content/validate.mjs";
import { spoilerGuard } from "./progression.mjs";
const unsafe = new Set(["unknown", "unverified", "disputed", "stale"]);
const amount = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e12;
// Collection advice only. Never executes a craft or changes profile/goals/routes.
export function collectionNeeds(pack, profile, upgrades) {
  const guard = spoilerGuard(pack, profile.spoilers);
  const safe = (r) =>
    r &&
    (profile.spoilers || !r.spoiler) &&
    !guard.limited &&
    !guard.contains(r.id) &&
    !guard.contains(r.name);
  const items = new Map(pack.items.filter(safe).map((r) => [r.id, r]));
  const rows = new Map();
  const objectives = new Map(pack.objectives.map((r) => [r.id, r]));
  let work = 0;
  const tick = () => {
    if (++work > 500000) throw new Error("Collection work limit");
  };
  const ensure = (id) => {
    if (!rows.has(id))
      rows.set(id, {
        id,
        consumed: 0,
        retained: 0,
        unknown: false,
        direct: false,
        craft: false,
        names: new Set(),
        rootIds: new Set(),
        causes: [],
        used: false,
      });
    return rows.get(id);
  };
  const add = (id, q, consumption, unknown, name, craft = false) => {
    tick();
    if (!items.has(id)) return;
    const d = ensure(id);
    d.used = true;
    d.craft ||= craft;
    d.direct ||= !craft;
    d.unknown ||=
      unknown || !amount(q) || !["consumed", "retained"].includes(consumption);
    if (name && d.names.size < 50) d.names.add(name);
    if (amount(q) && ["consumed", "retained"].includes(consumption)) {
      if (consumption === "consumed") d.consumed += q;
      else d.retained = Math.max(d.retained, q);
      if (!amount(d.consumed + d.retained)) d.unknown = true;
    }
  };
  try {
    if (
      [
        "sources",
        "items",
        "recipes",
        "objectives",
        "guides",
        "maps",
        "locations",
        "claims",
        "assets",
      ].reduce((n, k) => n + (pack[k]?.length || 0), 0) > 20000
    )
      throw new Error("Collection record limit");
    const included = new Set();
    for (const id of upgrades.all.used) {
      tick();
      const r = upgrades.all.rows.get(id);
      if (!items.has(id)) continue;
      add(
        id,
        r?.knownConsumed ?? 0,
        "consumed",
        upgrades.all.status !== "ok" || r?.required == null,
        null,
      );
      add(id, r?.knownRetained ?? 0, "retained", false, null);
      for (const c of r?.contributors || []) {
        tick();
        included.add(c.id);
        ensure(id).rootIds.add(c.id);
        ensure(id).causes.push({
          id: c.id,
          kind: "objective",
          name: c.name,
          quantity: c.quantity,
          consumption: c.consumption,
        });
        ensure(id).unknown ||= c.partial;
        if (ensure(id).names.size < 50)
          ensure(id).names.add(
            objectives.get(c.id)?.track === "campaign"
              ? `Campaign: ${c.name}`
              : c.name,
          );
      }
    }
    for (const r of pack.objectives) {
      tick();
      if (
        !safe(r) ||
        !["dmz-order", "dmz-story", "mission", "campaign"].includes(r.track) ||
        included.has(r.id) ||
        ["completed", "unlocked"].includes(profile.completion[r.id])
      )
        continue;
      if ((r.requirements || []).some((c) => !items.has(c.itemId))) continue;
      for (const raw of r.requirements || []) {
        const c = requirementFacts(pack, raw),
          item = items.get(c.itemId);
        tick();
        if (item && scopeOf(pack, item) === scopeOf(pack, r)) {
          add(
            c.itemId,
            unsafe.has(r.status) || unsafe.has(c.status) ? null : c.quantity,
            c.consumption,
            r.requirementsKnown !== true ||
              unsafe.has(r.status) ||
              unsafe.has(c.status),
            r.track === "campaign" ? `Campaign: ${r.name}` : r.name,
          );
          const d = ensure(c.itemId);
          d.rootIds.add(r.id);
          d.causes.push({
            id: r.id,
            kind: "objective",
            name: r.track === "campaign" ? `Campaign: ${r.name}` : r.name,
            quantity:
              unsafe.has(r.status) || unsafe.has(c.status) ? null : c.quantity,
            consumption: c.consumption,
          });
        }
      }
    }
    const producers = new Map();
    const recipeVisible = (r) => {
      tick();
      return (
        safe(r) &&
        items.has(r.output?.itemId) &&
        scopeOf(pack, r) === scopeOf(pack, items.get(r.output.itemId)) &&
        (r.inputs || []).every((c) => {
          tick();
          return (
            items.has(c.itemId) &&
            scopeOf(pack, r) === scopeOf(pack, items.get(c.itemId))
          );
        })
      );
    };
    const automaticRoutes = (pack.recipes || []).every(recipeVisible);
    for (const r of pack.recipes || []) {
      tick();
      if (!safe(r) || !items.has(r.output?.itemId)) continue;
      const output = items.get(r.output.itemId);
      if (scopeOf(pack, r) !== scopeOf(pack, output)) continue;
      let valid = true;
      for (const c of r.inputs || []) {
        tick();
        const i = items.get(c.itemId);
        if (!i || scopeOf(pack, i) !== scopeOf(pack, r)) valid = false;
      }
      if (!valid) continue;
      const list = producers.get(r.output.itemId) || [];
      list.push(r);
      producers.set(r.output.itemId, list);
    }
    const graph = new Map(),
      pending = [...rows.keys()];
    while (pending.length) {
      tick();
      const id = pending.pop();
      if (graph.has(id)) continue;
      const candidates = producers.get(id) || [],
        route = profile.routes?.[id];
      const chosen = route
        ? candidates.find((r) => r.id === route)
        : automaticRoutes && candidates.length === 1
          ? candidates[0]
          : null;
      const list = chosen ? [chosen] : candidates;
      const edges = [];
      for (const r of list)
        for (const raw of r.inputs || []) {
          tick();
          const c = requirementFacts(pack, raw);
          edges.push({
            recipe: r,
            c,
            uncertain:
              !chosen ||
              r.ingredientsKnown !== true ||
              unsafe.has(r.status) ||
              unsafe.has(c.status),
          });
          pending.push(c.itemId);
        }
      graph.set(id, edges);
    }
    const degree = new Map([...graph.keys()].map((id) => [id, 0]));
    for (const edges of graph.values())
      for (const e of edges) {
        tick();
        degree.set(e.c.itemId, degree.get(e.c.itemId) + 1);
      }
    const ready = [...degree].filter(([, n]) => n === 0).map(([id]) => id);
    let visited = 0;
    for (let cursor = 0; cursor < ready.length; cursor++) {
      tick();
      const id = ready[cursor],
        d = rows.get(id);
      visited++;
      let deficit = 0;
      if (d?.used) {
        const held = profile.inventory[id],
          reserve = profile.reserves[id] ?? 0;
        d.required = d.unknown ? null : d.consumed + d.retained;
        d.knownMissing =
          !amount(d.consumed + d.retained) || !amount(held) || !amount(reserve)
            ? null
            : Math.max(0, d.consumed + d.retained + reserve - held);
        d.missing = d.required === null ? null : d.knownMissing;
        deficit = d.missing;
      }
      for (const { recipe: r, c, uncertain } of graph.get(id)) {
        tick();
        if (d?.used && (deficit === null || deficit > 0)) {
          const yieldCount = r.output.quantity;
          const batches =
            deficit === null || !amount(yieldCount) || yieldCount === 0
              ? null
              : Math.ceil(deficit / yieldCount);
          const q =
            uncertain || batches === null || !amount(c.quantity)
              ? null
              : c.consumption === "retained"
                ? c.quantity
                : c.quantity * batches;
          add(
            c.itemId,
            q,
            c.consumption,
            uncertain || d.unknown || batches === null,
            r.name,
            true,
          );
          const child = ensure(c.itemId);
          child.causes.push({
            id: r.id,
            kind: "recipe",
            name: r.name,
            parentItemId: id,
            quantity: q,
            consumption: c.consumption,
          });
          for (const rootId of d.rootIds) {
            tick();
            child.rootIds.add(rootId);
          }
        }
        degree.set(c.itemId, degree.get(c.itemId) - 1);
        if (degree.get(c.itemId) === 0) ready.push(c.itemId);
      }
    }
    if (visited !== graph.size) {
      const blocked = [...degree].filter(([, n]) => n > 0).map(([id]) => id);
      const active = new Set();
      const unresolved = blocked.filter((id) => {
        const d = rows.get(id);
        if (!d?.used) return false;
        const held = profile.inventory[id],
          reserve = profile.reserves[id] ?? 0;
        return (
          d.unknown ||
          !amount(held) ||
          !amount(reserve) ||
          d.consumed + d.retained + reserve > held
        );
      });
      for (let cursor = 0; cursor < unresolved.length; cursor++) {
        tick();
        const id = unresolved[cursor];
        if (active.has(id)) continue;
        active.add(id);
        for (const e of graph.get(id) || []) {
          tick();
          if (degree.get(e.c.itemId) > 0) unresolved.push(e.c.itemId);
        }
      }
      for (const id of blocked) {
        tick();
        if (active.has(id)) {
          const d = ensure(id);
          d.used = true;
          d.unknown = true;
          d.explanationLimited = true;
          d.craft ||= !d.direct;
          d.required = null;
          d.missing = null;
          d.knownMissing = null;
        } else {
          const d = rows.get(id);
          if (d?.used) {
            d.required = d.consumed + d.retained;
            d.missing = 0;
            d.knownMissing = 0;
          }
        }
      }
    }
  } catch {
    // Work/shape failures cannot certify covered stock or hide known safe membership.
    rows.limited = true;
    for (const d of rows.values()) {
      d.used = true;
      d.unknown = true;
      d.required = null;
      d.missing = null;
      d.knownMissing = null;
    }
  }
  for (const d of rows.values()) {
    if (!d.used) continue;
    if (
      upgrades.all.status !== "ok" ||
      profile.packId !== pack.id ||
      profile.contentVersion !== pack.contentVersion
    ) {
      d.unknown = true;
      d.required = null;
      d.missing = null;
      d.knownMissing = null;
    }
    d.state =
      d.knownMissing > 0
        ? "short"
        : d.unknown || d.missing == null
          ? "review"
          : "covered";
    d.label =
      d.state === "short"
        ? "More needed"
        : d.state === "covered"
          ? "Listed amount covered"
          : d.craft
            ? "Crafting need · check details"
            : "Need amount unknown";
  }
  return rows;
}
