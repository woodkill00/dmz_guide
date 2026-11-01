import {
  validateProfile,
  validateInventoryForPack,
  stockLimit,
} from "./profile.mjs";
import { requirementFacts, scopeOf } from "../content/validate.mjs";
import { collectionVisibility } from "./collection-visibility.mjs";
import { isObjectiveCompleted } from "./upgrade-progress.mjs";
const known = new Set(["observed", "verified", "fictional"]);
const num = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e12;
const assert = (v, message) => {
  if (!v) throw new Error(message);
};
export function craftContext(
  pack,
  profile,
  visibility = collectionVisibility(pack, profile),
) {
  assert(
    !visibility.limited,
    "Content visibility review reached a safety limit.",
  );
  validateProfile(profile);
  validateInventoryForPack(profile, pack);
  assert(
    profile.packId === pack.id &&
      profile.contentVersion === pack.contentVersion,
    "Content binding changed. Rebind before crafting.",
  );
  assert(
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
    ].reduce((n, k) => n + (pack[k]?.length || 0), 0) <= 20000,
    "Content record limit exceeded.",
  );
  const rawItems = new Map(pack.items.map((r) => [r.id, r]));
  let work = 0;
  const tick = () =>
    assert(
      ++work <= 500000,
      "Craft review work limit reached; narrow the content.",
    );
  function evaluate(recipeId, batches = 1, { materialize = true } = {}) {
    tick();
    assert(
      Number.isSafeInteger(batches) && batches >= 1 && batches <= 1000000,
      "Batches must be a whole number from 1 to 1,000,000.",
    );
    const r = visibility.recipes.get(recipeId);
    assert(r, "Recipe unavailable or protected.");
    assert(
      scopeOf(pack, r) === scopeOf(pack, {}),
      "Recipe scope differs from the selected game/content.",
    );
    const reasons = [],
      warnings = [];
    const costs = new Map();
    const reviewSources = (ids, fictional) => {
      if (!Array.isArray(ids) || (!fictional && ids.length === 0)) {
        reasons.push("Supporting evidence references are missing.");
        return false;
      }
      let supported = true;
      for (const id of ids) {
        tick();
        const source = visibility.sources.get(id);
        if (!source) {
          supported = false;
          reasons.push("Evidence is unavailable or protected.");
        } else if (!fictional && source.provenance?.buildStatus !== "known")
          warnings.push(
            "Current-build applicability is not independently verified.",
          );
      }
      return supported;
    };
    const recipeProof = reviewSources(r.sourceIds, r.status === "fictional");
    if (!known.has(r.status) || r.ingredientsKnown !== true)
      reasons.push("Recipe costs/evidence are not fully known.");
    if (!["stash", "carried", "bank", "resources"].includes(r.eligibility))
      reasons.push("Input-pool eligibility is unknown.");
    const pending = [],
      seen = new Set();
    for (const id of r.prerequisites) {
      tick();
      pending.push(id);
    }
    while (pending.length) {
      tick();
      const id = pending.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      const pre = visibility.objectives.get(id);
      if (!pre) {
        reasons.push("A prerequisite is unavailable or protected.");
        continue;
      }
      reviewSources(pre.sourceIds, pre.status === "fictional");
      if (!known.has(pre.status) || !isObjectiveCompleted(pack, profile, id))
        reasons.push("A declared prerequisite is incomplete or unverified.");
      if (scopeOf(pack, pre) !== scopeOf(pack, r))
        reasons.push(
          "A prerequisite belongs to a different game/content scope.",
        );
      for (const next of pre.prerequisites) {
        tick();
        if (!seen.has(next)) pending.push(next);
      }
    }
    let quantityReady =
      recipeProof && known.has(r.status) && r.ingredientsKnown === true;
    for (const raw of r.inputs) {
      tick();
      const c = requirementFacts(pack, raw),
        item = visibility.items.get(c.itemId);
      const inputProof =
        c.status === "legacy"
          ? recipeProof
          : reviewSources(c.sourceIds, c.status === "fictional");
      if (!inputProof) quantityReady = false;
      assert(
        item && scopeOf(pack, item) === scopeOf(pack, r),
        "Recipe input scope mismatch.",
      );
      if (
        !num(c.quantity) ||
        c.quantity === 0 ||
        !["consumed", "retained"].includes(c.consumption) ||
        !(known.has(c.status) || c.status === "legacy")
      ) {
        reasons.push(
          "An input amount, consumption rule or evidence is unknown.",
        );
        quantityReady = false;
        continue;
      }
      const d = costs.get(c.itemId) || {
        id: c.itemId,
        name: item.name,
        consumed: 0,
        retained: 0,
        held: profile.inventory[c.itemId],
        reserve: profile.reserves[c.itemId] ?? 0,
      };
      if (c.consumption === "consumed") d.consumed += c.quantity * batches;
      else d.retained = Math.max(d.retained, c.quantity);
      assert(num(d.consumed + d.retained), "Craft quantity overflow.");
      costs.set(c.itemId, d);
    }
    for (const d of costs.values()) {
      tick();
      d.missing =
        num(d.held) && num(d.reserve)
          ? Math.max(0, d.consumed + d.retained + d.reserve - d.held)
          : null;
      if (d.missing === null) {
        quantityReady = false;
        reasons.push("Enter every input stock, including explicit zero.");
      } else if (d.missing > 0) {
        quantityReady = false;
        reasons.push("Insufficient stock after reserves and retained tools.");
      }
    }
    const output = visibility.items.get(r.output.itemId),
      held = profile.inventory[r.output.itemId];
    assert(
      output && scopeOf(pack, output) === scopeOf(pack, r),
      "Recipe output scope mismatch.",
    );
    assert(
      num(r.output.quantity) && r.output.quantity > 0,
      "Output yield is unknown.",
    );
    const produced = r.output.quantity * batches;
    assert(num(produced), "Output quantity overflow.");
    if (!num(held))
      reasons.push("Enter current output stock, including explicit zero.");
    const finalOutput = num(held)
      ? held - (costs.get(output.id)?.consumed || 0) + produced
      : null;
    if (
      finalOutput !== null &&
      (!num(finalOutput) || finalOutput > stockLimit(profile, output))
    )
      reasons.push("Output would exceed its stock limit.");
    let candidate = null;
    if (reasons.length === 0 && materialize) {
      candidate = structuredClone(profile);
      for (const d of costs.values())
        candidate.inventory[d.id] = d.held - d.consumed;
      candidate.inventory[output.id] = finalOutput;
    }
    warnings.push(
      "Local bookkeeping only. Check station, access and input-pool eligibility in game. No mission or upgrade is completed automatically.",
    );
    if (candidate) {
      validateProfile(candidate);
      validateInventoryForPack(candidate, pack);
    }
    return {
      recipe: r,
      batches,
      inputs: [...costs.values()],
      output: { id: output.id, name: output.name, produced, held },
      quantityReady,
      reasons: [...new Set(reasons)],
      warnings: [...new Set(warnings)],
      ready: reasons.length === 0,
      candidate: reasons.length === 0 ? candidate : null,
      baseline: materialize ? JSON.stringify(profile) : null,
      identity: materialize
        ? JSON.stringify([
            pack.id,
            pack.contentVersion,
            r,
            ...r.inputs.map((c) => rawItems.get(c.itemId)),
            rawItems.get(output.id),
          ])
        : null,
    };
  }
  return { evaluate, visibility };
}
export function previewCraft(pack, profile, id, batches = 1) {
  return craftContext(pack, profile).evaluate(id, batches);
}
export function craftReceipt(pack, before, after, preview) {
  assert(
    preview.ready && preview.baseline === JSON.stringify(before),
    "Craft receipt does not match its preview.",
  );
  const expected = structuredClone(preview.candidate);
  expected.revision = after.revision;
  assert(
    after.revision === before.revision + 1 &&
      JSON.stringify(expected) === JSON.stringify(after),
    "Saved craft does not match the candidate.",
  );
  return {
    packId: pack.id,
    contentVersion: pack.contentVersion,
    recipeId: preview.recipe.id,
    identity: preview.identity,
    after: JSON.stringify(after),
    inventory: structuredClone(before.inventory),
  };
}
export function reverseCraft(pack, profile, receipt) {
  assert(
    receipt &&
      receipt.packId === pack.id &&
      receipt.contentVersion === pack.contentVersion &&
      receipt.after === JSON.stringify(profile),
    "Undo expired after a profile or content change.",
  );
  const current = previewCraft(
    pack,
    { ...profile, inventory: structuredClone(receipt.inventory) },
    receipt.recipeId,
    1,
  );
  // The receipt identity includes the original recipe, endpoints and output; batches do not alter it.
  assert(
    current.identity === receipt.identity,
    "Recipe or item identity changed; Undo is unavailable.",
  );
  const candidate = structuredClone(profile);
  candidate.inventory = structuredClone(receipt.inventory);
  validateProfile(candidate);
  validateInventoryForPack(candidate, pack);
  return candidate;
}
