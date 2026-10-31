import { upgradeFamilies } from "./upgrade-families.mjs";
import { upgradeAdvice } from "./upgrade-advice.mjs";
import { scopeOf } from "../content/validate.mjs";
import { spoilerGuard } from "./progression.mjs";
import { collectionNeeds } from "./collection-needs.mjs";
// Pure advisory scopes; never add all these roots to the persisted goal queue.
export function upgradeNeeds(pack, profile) {
  const all = upgradeAdvice(pack, profile, {
    includeIdentityState: true,
    strictVisibility: true,
  });
  const groups = upgradeFamilies(pack, profile, {
      completedIds: all.completedUpgradeIds || [],
    }),
    guard = spoilerGuard(pack, profile.spoilers);
  const next = upgradeAdvice(pack, profile, {
    scope: "selected-upgrades",
    strictVisibility: true,
    rootIds: groups.nextIds,
  });
  const items = new Map(
    pack.items
      .filter(
        (i) =>
          (profile.spoilers || !i.spoiler) &&
          !guard.limited &&
          !guard.contains(i.id) &&
          !guard.contains(i.name),
      )
      .map((i) => [i.id, i]),
  );
  const direct = new Map(pack.objectives.map((r) => [r.id, r]));
  const membership = (roots) => {
    const used = new Set(),
      seen = new Set(),
      pending = [...roots];
    let work = 0,
      limited = false;
    while (pending.length) {
      if (++work > 500000) {
        limited = true;
        break;
      }
      const id = pending.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      const r = direct.get(id);
      if (
        !r ||
        (!profile.spoilers && r.spoiler) ||
        guard.limited ||
        guard.contains(r.id) ||
        guard.contains(r.name)
      )
        continue;
      const complete =
        r.track === "dmz-upgrade"
          ? groups.records.get(id)?.completed
          : ["completed", "unlocked"].includes(profile.completion[id]);
      if (complete) continue;
      for (const line of r.requirements || []) {
        if (++work > 500000) {
          limited = true;
          break;
        }
        const item = items.get(line.itemId);
        if (item && scopeOf(pack, item) === scopeOf(pack, r))
          used.add(line.itemId);
      }
      if (limited) break;
      for (const pre of r.prerequisites || []) {
        if (++work > 500000) {
          limited = true;
          break;
        }
        pending.push(pre);
      }
      if (limited) break;
    }
    return { used, limited };
  };
  const nextUses = membership(groups.nextIds),
    allUses = membership(
      groups.families.flatMap((g) =>
        g.members.filter((m) => !m.completed).map((m) => m.id),
      ),
    );
  const project = (advice, membership) => ({
    status: advice.status,
    partial: advice.completeness !== "complete-for-listed-costs",
    reasons: advice.reasons || [],
    used: new Set([
      ...membership.used,
      ...advice.rows.filter((r) => r.contributors.length).map((r) => r.id),
    ]),
    membershipLimited: membership.limited,
    rows: new Map(advice.rows.map((r) => [r.id, r])),
  });
  const result = {
    groups,
    next: project(next, nextUses),
    all: project(all, allUses),
  };
  result.collection = collectionNeeds(pack, profile, result);
  return result;
}
