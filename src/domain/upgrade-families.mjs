import { upgradeAdvice } from "./upgrade-advice.mjs";
import { spoilerGuard, upgradeSortKey, romanVersion } from "./progression.mjs";
import { scopeOf } from "../content/validate.mjs";
import { legacyUpgradeState } from "./profile.mjs";
const names = new Intl.Collator("en", { sensitivity: "base", numeric: true });
export function upgradeFamilies(pack, profile, { completedIds = null } = {}) {
  const completedIdentities = new Set(
    completedIds ||
      upgradeAdvice(pack, profile, {
        includeIdentityState: true,
        strictVisibility: true,
      }).completedUpgradeIds ||
      [],
  );
  const guard = spoilerGuard(pack, profile.spoilers),
    families = new Map(),
    byRecord = new Map(),
    records = new Map();
  for (const record of pack.objectives) {
    if (
      record.track !== "dmz-upgrade" ||
      (!profile.spoilers && record.spoiler) ||
      guard.limited ||
      guard.contains(record.id) ||
      guard.contains(record.name)
    )
      continue;
    const sort = upgradeSortKey(record, guard, profile.spoilers);
    if (guard.contains(sort.name)) continue;
    const suffix = record.name.match(/\s+([MDCLXVI]+)$/),
      fromName = suffix ? romanVersion(suffix[1]) : null;
    const explicit = romanVersion(record.upgrade?.tierLabel);
    const tierConflict =
      explicit !== null && fromName !== null && explicit !== fromName;
    const ranked = sort.version > 0 && !!sort.name.trim() && !tierConflict;
    const key = ranked
      ? JSON.stringify([scopeOf(pack, record), sort.name])
      : JSON.stringify(["record", record.id]);
    if (!families.has(key))
      families.set(key, {
        name: ranked ? sort.name : guard.text(record.name),
        ambiguous: tierConflict,
        members: [],
      });
    const progress =
      profile.schemaVersion === 1
        ? legacyUpgradeState(profile.completion[record.id])
        : profile.upgradeProgress[record.id];
    families.get(key).members.push({
      id: record.id,
      name: guard.text(record.name),
      ordinal: ranked ? sort.version : 0,
      ownCompleted: progress?.completion === "completed",
      completed:
        progress?.completion === "completed" ||
        completedIdentities.has(record.id),
      tier: ranked ? record.upgrade?.tierLabel || suffix?.[1] : null,
    });
  }
  const result = [...families.values()].flatMap((family) => {
    const ranks = new Set();
    const duplicate = family.members.some(
      (member) =>
        member.ordinal > 0 &&
        (ranks.has(member.ordinal) || !ranks.add(member.ordinal)),
    );
    return duplicate
      ? family.members.map((member) => ({
          name: member.name,
          ambiguous: true,
          members: [member],
        }))
      : [family];
  });
  for (const family of result) {
    family.members.sort(
      (a, b) => a.ordinal - b.ordinal || names.compare(a.name, b.name),
    );
    family.id = family.members[0].id;
    family.current =
      family.members.find((r) => !r.completed) || family.members.at(-1);
    family.complete = family.members.every((r) => r.completed);
    for (const member of family.members) {
      byRecord.set(member.id, family);
      records.set(member.id, member);
    }
  }
  result.sort((a, b) => names.compare(a.name, b.name));
  return {
    families: result,
    byRecord,
    records,
    nextIds: result.filter((g) => !g.complete).map((g) => g.current.id),
  };
}
