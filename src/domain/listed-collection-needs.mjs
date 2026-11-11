import { collectionNeeds } from "./collection-needs.mjs";
import { upgradeBudget } from "./upgrade-budget.mjs";
import { requirementFacts, scopeOf } from "../content/validate.mjs";
const amount = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e12;
// Presentation of reported amounts only. Strict accounting and spending remain unchanged.
export function listedCollectionNeeds(pack, profile, strict, advice) {
  if (strict.blocked || strict.limited) return strict;
  const budget = upgradeBudget(pack, profile);
  if (budget.status !== "ok") return strict;
  const reported = new Map(budget.items.map((r) => [r.id, r])),
    objectives = new Map(pack.objectives.map((o) => [o.id, o])),
    items = new Map(pack.items.map((i) => [i.id, i]));
  const result = new Map(strict);
  result.blocked = false;
  result.limited = false;
  let work = 0;
  for (const [id, base] of strict) {
    if (++work > 500000) return strict;
    if (!base.direct || base.required != null) continue;
    const source = reported.get(id),
      facts = advice.rows.get(id);
    if (
      facts?.contributors?.some(
        (c) =>
          advice.excludedNumericIds?.has(c.id) ||
          objectives
            .get(c.id)
            ?.requirements?.some(
              (raw) =>
                raw.itemId === id && ["disputed", "stale"].includes(raw.status),
            ),
      )
    )
      continue;
    let consumed = source ? source.consumed + source.provisional : 0,
      retained = source?.retained || 0,
      hasAmount = source?.required != null && source.required > 0,
      excluded = false;
    const included = new Set((facts?.contributors || []).map((c) => c.id));
    for (const rootId of base.rootIds) {
      const o = objectives.get(rootId);
      if (
        !o ||
        !["dmz-order", "dmz-story", "mission", "campaign"].includes(o.track) ||
        included.has(rootId) ||
        ["completed", "unlocked"].includes(profile.completion[rootId])
      )
        continue;
      if (["disputed", "stale"].includes(o.status)) {
        excluded = true;
        continue;
      }
      for (const raw of o.requirements || []) {
        if (++work > 500000) return strict;
        const line = requirementFacts(pack, raw);
        if (
          line.itemId !== id ||
          scopeOf(pack, items.get(id)) !== scopeOf(pack, o)
        )
          continue;
        if (
          !amount(line.quantity) ||
          line.quantity === 0 ||
          ["disputed", "stale"].includes(line.status)
        ) {
          excluded = true;
          continue;
        }
        hasAmount = true;
        if (line.consumption === "retained")
          retained = Math.max(retained, line.quantity);
        else consumed += line.quantity;
      }
    }
    // Preserve any known, already expanded recipe contributions to this same item.
    for (const cause of base.causes || [])
      if (cause.kind === "recipe" && amount(cause.quantity)) {
        if (cause.consumption === "retained")
          retained = Math.max(retained, cause.quantity);
        else if (cause.consumption === "consumed") consumed += cause.quantity;
      }
    const required = consumed + retained;
    if (!hasAmount || excluded || !amount(required)) continue;
    const held = profile.inventory[id],
      reserve = profile.reserves[id] ?? 0,
      missing =
        amount(held) && amount(reserve)
          ? Math.max(0, required + reserve - held)
          : null;
    result.set(id, {
      ...base,
      consumed,
      retained,
      required,
      missing,
      knownMissing: missing,
      listed: true,
      quantityUnknown: !!source?.unknown,
      unknown: true,
      state: missing > 0 ? "short" : "review",
      label:
        "Listed amount; provisional until costs and consumption are verified",
    });
  }
  const seedRows = new Map();
  for (const row of budget.items) {
    const facts = advice.rows.get(row.id);
    if (facts?.contributors?.some((c) => advice.excludedNumericIds?.has(c.id)))
      continue;
    seedRows.set(row.id, {
      knownConsumed: row.consumed + row.provisional,
      knownRetained: row.retained,
      required: row.required,
      quantityUnknown: row.unknown,
      contributors: facts?.contributors || [],
    });
  }
  const projected = collectionNeeds(
    pack,
    profile,
    { all: { status: "ok", used: new Set(seedRows.keys()), rows: seedRows } },
    { reported: true },
  );
  if (!projected.blocked && !projected.limited)
    for (const [id, row] of projected) {
      const existing = result.get(id);
      if (
        !existing?.direct &&
        existing?.required == null &&
        row.required != null
      ) {
        result.set(id, {
          ...row,
          listed: true,
          craftEstimate: true,
          label:
            "Listed crafting estimate; alternative to finding the missing outputs",
        });
      }
    }
  for (const [id, row] of result)
    if (row.required != null && profile.inventory[id] === undefined)
      result.set(id, { ...row, stockMissing: true });
  return result;
}
