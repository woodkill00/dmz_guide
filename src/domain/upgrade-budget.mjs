import { upgradeAdvice } from "./upgrade-advice.mjs";
import { validateProfile, validateInventoryForPack } from "./profile.mjs";
import { requirementFacts, scopeOf } from "../content/validate.mjs";
import { spoilerGuard } from "./progression.mjs";
import {
  isObjectiveCompleted,
  upgradeProgressFor,
} from "./upgrade-progress.mjs";
const number = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e12;
const known = new Set(["verified", "observed", "fictional"]);
// Read-only collection forecast. Independent upgrade rows and one shared print budget
// are deliberately separate from actual craft/purchase transactions.
export function upgradeBudget(pack, profile) {
  const blocked = (message) => ({
    status: "blocked",
    message,
    rows: new Map(),
    items: [],
    printInputs: [],
    completed: 0,
    total: 0,
    partial: true,
  });
  try {
    validateProfile(profile);
    validateInventoryForPack(profile, pack);
    if (
      profile.packId !== pack.id ||
      profile.contentVersion !== pack.contentVersion
    )
      return blocked(
        "Review and bind this profile to the current catalog before calculating remaining items.",
      );
    if (
      ["items", "objectives", "recipes", "sources"].reduce(
        (n, k) => n + (pack[k]?.length || 0),
        0,
      ) > 20000
    )
      return blocked("Catalog exceeds the budget review limit.");
    const identityAdvice = upgradeAdvice(pack, profile, {
      includeIdentityState: true,
      strictVisibility: true,
    });
    if (identityAdvice.status !== "ok")
      return blocked(identityAdvice.reasons.join(" "));
    const completedIds = new Set(identityAdvice.completedUpgradeIds || []);
    const countedIds = new Set(
      identityAdvice.rows.flatMap((row) => row.contributors.map((c) => c.id)),
    );
    const guard = spoilerGuard(pack, profile.spoilers),
      safe = (r) =>
        r &&
        (profile.spoilers || !r.spoiler) &&
        !guard.limited &&
        !guard.contains(r.id) &&
        !guard.contains(r.name);
    const items = new Map(pack.items.filter(safe).map((i) => [i.id, i])),
      objectives = new Map(pack.objectives.filter(safe).map((o) => [o.id, o]));
    const stock = (id) => {
      const held = profile.inventory[id];
      return {
        held: held ?? null,
        reserve: profile.reserves[id] ?? 0,
        available:
          held === undefined
            ? null
            : Math.max(0, held - (profile.reserves[id] ?? 0)),
      };
    };
    const rows = new Map(),
      totals = new Map();
    let work = 0,
      partial = false;
    const tick = () => {
      if (++work > 500000) throw Error("Budget work limit exceeded.");
    };
    const add = (map, item, raw, root) => {
      tick();
      const row = map.get(item.id) || {
        id: item.id,
        name: guard.text(item.name),
        unit: guard.text(item.unit),
        kind: item.kind,
        consumed: 0,
        retained: 0,
        provisional: 0,
        partial: false,
        unknown: false,
        contributors: new Set(),
        ...stock(item.id),
      };
      row.contributors.add(guard.text(root.name));
      if (raw.quantity === null || !number(raw.quantity)) {
        row.unknown = true;
        row.partial = true;
      } else if (raw.consumption === "retained")
        row.retained = Math.max(row.retained, raw.quantity);
      else if (raw.consumption === "consumed") row.consumed += raw.quantity;
      else {
        row.provisional += raw.quantity;
        row.partial = true;
      }
      row.partial ||= !known.has(raw.status) && raw.status !== "legacy";
      row.partial ||=
        root.requirementsKnown !== true || !known.has(root.status);
      if (!number(row.consumed + row.retained + row.provisional))
        throw Error("Budget quantity overflow.");
      map.set(item.id, row);
    };
    const finish = (r) => {
      const required = r.consumed + r.retained + r.provisional;
      return {
        ...r,
        required: r.unknown && required === 0 ? null : required,
        missing:
          r.available === null || (r.unknown && required === 0)
            ? null
            : Math.max(0, required + r.reserve - r.held),
        contributors: [...r.contributors],
      };
    };
    let completed = 0;
    for (const o of objectives.values()) {
      tick();
      if (o.track !== "dmz-upgrade") continue;
      const done =
        completedIds.has(o.id) || isObjectiveCompleted(pack, profile, o.id);
      if (done) completed++;
      const lines = new Map();
      let uncertain =
        o.requirementsKnown !== true ||
        !known.has(o.status) ||
        o.requirements.length === 0;
      for (const raw of o.requirements) {
        const fact = requirementFacts(pack, raw),
          item = items.get(fact.itemId);
        if (!item || scopeOf(pack, item) !== scopeOf(pack, o)) {
          uncertain = true;
          continue;
        }
        add(lines, item, fact, o);
        if (!done && countedIds.has(o.id)) add(totals, item, fact, o);
      }
      const materials = [...lines.values()]
        .map(finish)
        .sort((a, b) => a.name.localeCompare(b.name));
      uncertain ||= materials.some(
        (m) => m.partial || m.unknown || m.held === null,
      );
      rows.set(o.id, {
        id: o.id,
        name: guard.text(o.name),
        completed: done,
        unknown: uncertain,
        materials,
      });
      if (!done) partial ||= uncertain;
    }
    const list = [...totals.values()]
        .map(finish)
        .sort((a, b) => a.name.localeCompare(b.name)),
      pool = new Map(),
      initial = new Map();
    // Direct upgrade demand and reserves are protected before forecasting any prints.
    for (const [id, item] of items) {
      const s = stock(id),
        d = totals.get(id),
        demand = d ? d.consumed + d.retained + d.provisional : 0;
      const free =
        s.available === null || d?.unknown
          ? null
          : Math.max(0, s.available - demand);
      pool.set(id, free);
      initial.set(id, free);
    }
    const inputs = new Map();
    function gate(id, seen = new Set()) {
      tick();
      if (seen.has(id)) return false;
      seen.add(id);
      const o = objectives.get(id);
      if (
        !o ||
        !known.has(o.status) ||
        !isObjectiveCompleted(pack, profile, id)
      )
        return false;
      if (
        o.track === "dmz-upgrade" &&
        upgradeProgressFor(pack, profile, id).reviewRequired
      )
        return false;
      return o.prerequisites.every((pre) => gate(pre, new Set(seen)));
    }
    for (const row of list) {
      tick();
      row.printable = 0;
      row.afterPrint = row.missing;
      row.printReason = "No supported FOB printer recipe";
      row.printCosts = [];
      const routes = pack.recipes.filter(
        (r) =>
          safe(r) && r.output.itemId === row.id && r.station === "3D Printer",
      );
      if (routes.length !== 1) {
        if (routes.length > 1)
          row.printReason = "Multiple recipes; choose a route in Collection";
        continue;
      }
      const r = routes[0];
      row.recipeId = r.id;
      const valid =
        r.ingredientsKnown === true &&
        known.has(r.status) &&
        number(r.output.quantity) &&
        r.output.quantity > 0 &&
        r.inputs.length > 0 &&
        r.inputs.every((c) => {
          tick();
          const f = requirementFacts(pack, c);
          return (
            items.has(f.itemId) &&
            scopeOf(pack, items.get(f.itemId)) === scopeOf(pack, r) &&
            number(f.quantity) &&
            f.quantity > 0 &&
            f.consumption === "consumed" &&
            (known.has(f.status) || f.status === "legacy")
          );
        });
      if (!valid) {
        row.printReason = "Recipe costs require review";
        continue;
      }
      if (!r.prerequisites.every((id) => gate(id))) {
        row.printReason =
          "Required printer upgrade / recipe access not completed";
        continue;
      }
      row.printUnlocked = true;
      row.printCosts = r.inputs.map((c) => ({
        id: c.itemId,
        name: guard.text(items.get(c.itemId).name),
        quantity: c.quantity,
      }));
      if (row.missing === null || row.unknown) {
        row.printable = null;
        row.printReason = "Enter stock / review unknown requirements";
        continue;
      }
      const batches = Math.ceil(row.missing / r.output.quantity),
        costs = new Map();
      for (const c of r.inputs)
        costs.set(c.itemId, (costs.get(c.itemId) || 0) + c.quantity);
      for (const [id, q] of costs) {
        const input = items.get(id),
          entry = inputs.get(id) || {
            id,
            name: guard.text(input.name),
            unit: guard.text(input.unit),
            required: 0,
            available: initial.get(id),
          };
        entry.required += q * batches;
        if (!number(entry.required)) throw Error("Print-input overflow.");
        inputs.set(id, entry);
      }
      if ([...costs].some(([id]) => pool.get(id) === null)) {
        row.printable = null;
        row.printReason = "Input stock not entered or direct demand unknown";
        continue;
      }
      let possible = batches;
      for (const [id, q] of costs)
        possible = Math.min(possible, Math.floor(pool.get(id) / q));
      for (const [id, q] of costs) pool.set(id, pool.get(id) - possible * q);
      row.printable = Math.min(row.missing, possible * r.output.quantity);
      row.afterPrint = row.missing - row.printable;
      row.printReason =
        row.missing === 0
          ? "Already covered"
          : row.printable === row.missing
            ? "Can print the shortage (saved-stock forecast)"
            : row.printable > 0
              ? "Can print part; inputs are shared"
              : "More print inputs needed";
    }
    return {
      status: "ok",
      rows,
      items: list,
      printInputs: [...inputs.values()]
        .map((r) => ({
          ...r,
          missing:
            r.available === null ? null : Math.max(0, r.required - r.available),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      completed,
      total: rows.size,
      partial,
      message: partial
        ? "Known listed amounts only. Unlisted costs, unknown stock and uncertain consumption keep this budget provisional."
        : "",
    };
  } catch (error) {
    return blocked(error.message);
  }
}
