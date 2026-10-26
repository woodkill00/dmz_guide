import { assert } from "../content/limits.mjs";
import { scopeOf, requirementFacts } from "../content/validate.mjs";
import { validateProfile, legacyUpgradeState } from "./profile.mjs";
import { allocateDirectStock } from "./shared-plan.mjs";
import { spoilerGuard } from "./progression.mjs";
const groups = [
  "sources",
  "items",
  "recipes",
  "objectives",
  "guides",
  "maps",
  "locations",
  "claims",
  "assets",
];
const unsafeStatus = new Set(["unknown", "unverified", "disputed", "stale"]);
const MAX = 1e12;
/** Pure bounded advisory traversal, separate from the persisted 100-goal execution plan. */
export function upgradeAdvice(
  pack,
  profile,
  { scope = "all-known-incomplete", workLimit = 500000 } = {},
) {
  const identity = {
    packId: pack.id,
    contentVersion: pack.contentVersion,
    profileRevision: profile.revision,
    scope,
    coverageBasis: "known-direct-requirements",
  };
  try {
    validateProfile(profile);
    assert(
      ["all-known-incomplete", "focused"].includes(scope),
      "Unknown advice scope",
    );
    assert(
      profile.packId === pack.id &&
        profile.contentVersion === pack.contentVersion,
      "Content version mismatch. Preview and rebind in Settings.",
    );
    assert(
      Number.isSafeInteger(workLimit) && workLimit > 0 && workLimit <= 500000,
      "Invalid advice work budget",
    );
    let work = 0;
    const tick = (n = 1) =>
      assert(
        (work += n) <= workLimit,
        "Advice work budget exceeded; no partial totals returned",
      );
    const records = new Map();
    for (const group of groups)
      for (const r of pack[group] || []) {
        tick();
        assert(!records.has(r.id), "Duplicate record identity");
        records.set(r.id, r);
        assert(records.size <= 20000, "Advice record limit exceeded");
      }
    const objectives = new Map(pack.objectives.map((r) => [r.id, r])),
      items = new Map(pack.items.map((r) => [r.id, r])),
      sources = new Map(pack.sources.map((r) => [r.id, r]));
    const progress = (id) =>
      profile.schemaVersion === 1
        ? legacyUpgradeState(profile.completion[id])
        : profile.upgradeProgress[id] || {
            completion: "unknown",
            availability: "unknown",
            reviewRequired: false,
          };
    const completed = (r) =>
      r.track === "dmz-upgrade"
        ? progress(r.id).completion === "completed"
        : ["completed", "unlocked"].includes(profile.completion[r.id]);
    const visible = (r) => profile.spoilers || !r.spoiler;
    const guard = spoilerGuard(pack, profile.spoilers);
    let privacyLimited = guard.limited,
      partial = false,
      excluded = 0;
    const recipeIds = new Set(pack.recipes.map((r) => r.id));
    if (scope === "focused")
      for (const goal of profile.goals) {
        tick();
        assert(
          objectives.has(goal.id) || recipeIds.has(goal.id),
          "Unresolved focused goal; review retained references in Settings before calculating this scope",
        );
      }
    const candidates =
      scope === "focused"
        ? profile.goals
            .map((g) => objectives.get(g.id))
            .filter((r) => r?.track === "dmz-upgrade")
        : pack.objectives.filter((r) => r.track === "dmz-upgrade");
    const roots = [];
    for (const r of candidates) {
      tick();
      if (!visible(r)) {
        privacyLimited = true;
        continue;
      }
      if (completed(r)) {
        excluded++;
        continue;
      }
      assert(scopeOf(pack, r) === scopeOf(pack, {}), "Upgrade scope mismatch");
      roots.push(r);
    }
    const allKnownKeys = new Map(),
      conflicts = new Map(),
      canonical = new Map(),
      signatures = new Map();
    const find = (id) => {
      let root = id;
      while (canonical.get(root) !== root) {
        tick();
        root = canonical.get(root);
      }
      while (id !== root) {
        tick();
        const next = canonical.get(id);
        canonical.set(id, root);
        id = next;
      }
      return root;
    };
    const union = (a, b) => {
      a = find(a);
      b = find(b);
      if (a !== b) canonical.set(a < b ? b : a, a < b ? a : b);
    };
    // Stable observation equivalence is transitive; names and tier ordinals never join identities.
    for (const r of pack.objectives)
      if (visible(r) && r.track === "dmz-upgrade") canonical.set(r.id, r.id);
    for (const r of pack.objectives) {
      tick();
      if (!canonical.has(r.id)) continue;
      signatures.set(
        r.id,
        JSON.stringify([
          r.name,
          r.description,
          r.requirements,
          r.prerequisites,
          r.effects,
          r.upgrade?.tierLabel,
        ]),
      );
      for (const key of r.upgrade?.observationKeys || []) {
        tick();
        const scopedKey = JSON.stringify([scopeOf(pack, r), key]);
        const old = allKnownKeys.get(scopedKey);
        if (old) union(r.id, old);
        else allKnownKeys.set(scopedKey, r.id);
      }
    }
    const representatives = new Map(),
      conflictedGroups = new Set(),
      completedGroups = new Set();
    for (const [id, signature] of signatures) {
      tick();
      const root = find(id);
      canonical.set(id, root);
      if (completed(objectives.get(id))) completedGroups.add(root);
      if (representatives.has(root) && representatives.get(root) !== signature)
        conflictedGroups.add(root);
      else representatives.set(root, signature);
    }
    for (const [id, root] of canonical)
      if (conflictedGroups.has(root))
        for (const row of objectives.get(id).requirements) {
          tick();
          if (!conflicts.has(root)) conflicts.set(root, new Map());
          conflicts.get(root).set(row.itemId, {
            ...row,
            quantity: null,
            consumption: "unknown",
          });
        }
    const disputedEntities = new Set();
    for (const claim of pack.claims || []) {
      tick();
      if (claim.status === "disputed") disputedEntities.add(claim.entityId);
    }
    // Alias identity shares a cost once, but never discards weaker evidence or readiness.
    const evidenceFor = (r) =>
      r.status === "fictional" ||
      (r.status === "verified" &&
        r.sourceIds.length > 0 &&
        r.sourceIds.every((id) => {
          tick();
          return sources.get(id)?.provenance?.buildStatus === "known";
        }));
    const fullFor = (r) =>
      r.requirementsKnown !== false &&
      (r.track !== "dmz-upgrade" ||
        r.upgrade?.prerequisiteStatus === "known") &&
      evidenceFor(r);
    const readyFor = (r) => {
      const p = progress(r.id);
      return (
        fullFor(r) &&
        p.availability === "available" &&
        !p.reviewRequired &&
        r.prerequisites.every((id) => {
          tick();
          return completed(objectives.get(id));
        })
      );
    };
    const aliasEvidence = new Map();
    for (const [id, root] of canonical) {
      tick();
      const r = objectives.get(id),
        previous = aliasEvidence.get(root);
      const evidence = {
        full: fullFor(r),
        ready: readyFor(r),
        disputed: r.status === "disputed" || disputedEntities.has(id),
      };
      aliasEvidence.set(
        root,
        previous
          ? {
              full: previous.full && evidence.full,
              ready: previous.ready && evidence.ready,
              disputed: previous.disputed || evidence.disputed,
            }
          : evidence,
      );
    }
    const colors = new Map(),
      selected = [],
      seen = new Set();
    for (const root of roots) {
      const stack = [{ id: root.id, next: 0 }];
      while (stack.length) {
        tick();
        const f = stack.at(-1),
          r = objectives.get(f.id);
        assert(r, "Unresolved prerequisite");
        if (!visible(r)) {
          privacyLimited = true;
          partial = true;
          stack.pop();
          continue;
        }
        assert(
          scopeOf(pack, r) === scopeOf(pack, root),
          "Prerequisite scope mismatch",
        );
        if (completed(r) || completedGroups.has(canonical.get(r.id))) {
          stack.pop();
          continue;
        }
        if (colors.get(r.id) === 2) {
          stack.pop();
          continue;
        }
        colors.set(r.id, 1);
        if (f.next < (r.prerequisites || []).length) {
          const id = r.prerequisites[f.next++];
          tick();
          assert(colors.get(id) !== 1, "Dependency cycle; no advice returned");
          if (colors.get(id) !== 2) stack.push({ id, next: 0 });
          continue;
        }
        colors.set(r.id, 2);
        stack.pop();
        const key = canonical.get(r.id) || r.id;
        if (!seen.has(key)) {
          seen.add(key);
          selected.push(r);
        }
      }
    }
    const demands = new Map(),
      pins = new Set(profile.watchPins || []);
    const ensure = (id) => {
      const item = items.get(id);
      assert(item, "Unknown requirement item");
      if (!visible(item)) {
        privacyLimited = true;
        partial = true;
        return null;
      }
      if (!demands.has(id))
        demands.set(id, {
          id,
          name: guard.text(item.name),
          unit: item.unit,
          consumed: 0,
          retained: 0,
          contributors: [],
          blockers: new Set(),
          watchPinned: pins.has(id),
        });
      return demands.get(id);
    };
    for (const r of selected) {
      tick();
      const evidence = aliasEvidence.get(canonical.get(r.id)) || {
        full: fullFor(r),
        ready: false,
        disputed: r.status === "disputed" || disputedEntities.has(r.id),
      };
      const full = evidence.full;
      if (!full) partial = true;
      const horizon = evidence.ready ? "now" : "later";
      const disputed = evidence.disputed;
      const conflictingRows = conflicts.get(canonical.get(r.id));
      for (const raw of conflictingRows?.values() || r.requirements || []) {
        tick();
        const c = requirementFacts(pack, raw),
          item = items.get(c.itemId);
        assert(
          item && scopeOf(pack, item) === scopeOf(pack, r),
          "Requirement scope mismatch",
        );
        const d = ensure(c.itemId);
        if (!d) continue;
        assert(
          c.quantity === null ||
            (Number.isSafeInteger(c.quantity) &&
              c.quantity > 0 &&
              c.quantity <= 1e6),
          "Unsafe requirement quantity",
        );
        assert(
          ["unknown", "consumed", "retained"].includes(c.consumption),
          "Invalid consumption semantics",
        );
        const blocked =
          c.quantity === null ||
          c.consumption === "unknown" ||
          unsafeStatus.has(c.status) ||
          disputed ||
          Boolean(conflictingRows);
        if (c.quantity === null) d.blockers.add("Requirement amount unknown");
        if (c.consumption === "unknown")
          d.blockers.add("Consumption not confirmed");
        if (unsafeStatus.has(c.status) || disputed || Boolean(conflictingRows))
          d.blockers.add("Requirement evidence unresolved or conflicting");
        if (!blocked) {
          if (c.consumption === "consumed") d.consumed += c.quantity;
          else d.retained = Math.max(d.retained, c.quantity);
          assert(
            Number.isSafeInteger(d.consumed + d.retained) &&
              d.consumed + d.retained <= MAX,
            "Aggregate overflow",
          );
        }
        d.contributors.push({
          id: r.id,
          name: guard.text(r.name),
          quantity: c.quantity,
          consumption: c.consumption,
          horizon,
          partial: !full,
        });
      }
    }
    for (const id of new Set([
      ...(profile.watchPins || []),
      ...Object.keys(profile.reserves),
    ])) {
      tick();
      if (items.has(id)) ensure(id);
    }
    const rows = [];
    for (const d of demands.values()) {
      tick();
      const entered = Object.hasOwn(profile.inventory, d.id),
        held = entered ? profile.inventory[d.id] : null,
        reserve = profile.reserves[d.id] || 0;
      const demandKnown = d.blockers.size === 0;
      if (!entered) d.blockers.add("Inventory not entered");
      const numeric = d.blockers.size === 0;
      const allocation = numeric
        ? allocateDirectStock({
            consumed: d.consumed,
            retained: d.retained,
            held,
            reserve,
          })
        : null;
      const perGoal = [];
      let remaining = allocation
          ? Math.max(0, allocation.available - d.retained)
          : 0,
        floor = 0;
      for (const c of d.contributors) {
        tick();
        if (!numeric) {
          perGoal.push({ ...c, allocated: null, shortage: null });
          continue;
        }
        let allocated, shortage;
        if (c.consumption === "consumed") {
          allocated = Math.min(c.quantity, remaining);
          remaining -= allocated;
          shortage = c.quantity - allocated;
        } else {
          const increase = Math.max(0, c.quantity - floor);
          allocated = Math.min(
            increase,
            Math.max(0, allocation.available - floor),
          );
          shortage = increase - allocated;
          floor = Math.max(floor, c.quantity);
        }
        perGoal.push({ ...c, allocated, shortage });
      }
      rows.push({
        id: d.id,
        name: d.name,
        unit: d.unit,
        inventoryEntered: entered,
        held,
        reserve,
        required: demandKnown ? d.consumed + d.retained : null,
        knownConsumed: d.consumed,
        knownRetained: d.retained,
        keep: allocation?.keep ?? null,
        search: allocation?.search ?? null,
        upgradeGap: allocation?.upgradeGap ?? null,
        reserveGap: entered ? Math.max(0, reserve - held) : null,
        reserveProtected: entered ? Math.min(held, reserve) : null,
        protectedHeld: allocation?.protectedHeld ?? null,
        contributors: perGoal,
        watchPinned: d.watchPinned,
        noKnownNeed: d.contributors.length === 0,
        reasons: [
          ...d.blockers,
          ...(d.watchPinned ? ["Your watch pin"] : []),
          ...(reserve ? ["Your protected reserve"] : []),
        ],
        horizon:
          numeric &&
          d.contributors.length &&
          d.contributors.every((c) => c.horizon === "now")
            ? "now"
            : "later",
      });
    }
    return {
      ...identity,
      status: "ok",
      rows,
      includedCount: selected.length,
      unknownCount: selected.filter(
        (r) =>
          r.track === "dmz-upgrade" && progress(r.id).completion === "unknown",
      ).length,
      excludedCount: excluded,
      completeness:
        partial || privacyLimited ? "partial" : "complete-for-listed-costs",
      privacyLimited,
      coverageNote:
        partial || privacyLimited
          ? "Known requirements only — additional costs may exist. Observed scope is not current-build or exhaustive verification."
          : "Known direct requirements only; manual stock is not live inventory.",
      work,
    };
  } catch (reason) {
    return {
      ...identity,
      status: "blocked",
      rows: [],
      reasons: [reason.message],
      completeness: "unknown",
    };
  }
}
