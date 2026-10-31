import { upgradeAdvice } from "./upgrade-advice.mjs";
import { allocateDirectStock } from "./shared-plan.mjs";
import { spoilerGuard } from "./progression.mjs";
import { upgradeProgressFor } from "./upgrade-progress.mjs";
// Direct independent costs only. Full prerequisite advice remains a separate scope.
export function upgradeOverview(pack, profile) {
  const guard = spoilerGuard(pack, profile.spoilers);
  const advice = upgradeAdvice(pack, profile, {
    includeIdentityState: true,
    strictVisibility: true,
  });
  const rows = new Map();
  const tracked = new Set(profile.goals.map((g) => g.id));
  for (const record of pack.objectives) {
    if (
      record.track !== "dmz-upgrade" ||
      (!profile.spoilers && record.spoiler) ||
      guard.limited ||
      guard.contains(record.id) ||
      guard.contains(record.name)
    )
      continue;
    const progress = upgradeProgressFor(pack, profile, record.id);
    rows.set(record.id, {
      id: record.id,
      completed: progress.completion === "completed",
      tracked: tracked.has(record.id),
      review:
        progress.reviewRequired ||
        ["unknown", "unverified", "disputed", "stale"].includes(record.status),
      materials: [],
      unknown:
        advice.status === "blocked" ||
        !record.requirements?.length ||
        record.requirementsKnown === false,
    });
  }
  for (const material of advice.rows) {
    const byGoal = new Map();
    for (const use of material.contributors) {
      if (!rows.has(use.id)) continue;
      const group = byGoal.get(use.id) || {
        consumed: 0,
        retained: 0,
        unknown: false,
        partial: false,
      };
      group.partial ||= use.partial;
      if (
        use.quantity === null ||
        !["consumed", "retained"].includes(use.consumption)
      )
        group.unknown = true;
      else if (use.consumption === "consumed") group.consumed += use.quantity;
      else group.retained = Math.max(group.retained, use.quantity);
      byGoal.set(use.id, group);
    }
    for (const [id, demand] of byGoal) {
      const row = rows.get(id);
      const numeric =
        !demand.unknown &&
        material.required !== null &&
        material.inventoryEntered;
      let missing = null;
      if (numeric) {
        try {
          missing = allocateDirectStock({
            ...demand,
            held: material.held,
            reserve: material.reserve,
          }).upgradeGap;
        } catch {
          /* Unsafe sums fail closed; the canonical advice also bounds work. */
        }
      }
      row.materials.push({
        id: material.id,
        name: material.name,
        unit: material.unit,
        required: demand.unknown ? null : demand.consumed + demand.retained,
        held: material.held,
        reserve: material.reserve,
        missing,
      });
      row.unknown ||= missing === null;
      row.unknown ||= demand.partial;
    }
  }
  for (const row of rows.values()) {
    if (!row.completed && !row.materials.length) row.unknown = true;
    row.review ||= row.unknown;
    row.missing = !row.completed && row.materials.some((m) => m.missing > 0);
  }
  return {
    rows,
    completedUpgradeIds: advice.completedUpgradeIds || [],
    completed: [...rows.values()].filter((r) => r.completed).length,
    total: rows.size,
    blocked: advice.status === "blocked",
  };
}
export function overviewMatches(row, filter) {
  if (!row) return false;
  return filter === "incomplete"
    ? !row.completed
    : filter === "tracked"
      ? row.tracked
      : filter === "missing"
        ? row.missing
        : filter === "review"
          ? row.review
          : true;
}
