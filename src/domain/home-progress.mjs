import { validateProfile } from "./profile.mjs";
import { spoilerGuard } from "./progression.mjs";
import { upgradeProgressFor } from "./upgrade-progress.mjs";
export function summarizeHomeProgress(pack, profile) {
  validateProfile(profile);
  if (
    profile.packId !== pack.id ||
    profile.contentVersion !== pack.contentVersion
  )
    throw Error("Saved profile needs catalog review");
  const guard = spoilerGuard(pack, false);
  if (guard.limited) return { limited: true, revision: profile.revision };
  const safe = pack.objectives.filter(
    (r) =>
      !r.spoiler &&
      ![r.id, r.name, r.description].some((x) => guard.contains(x || "")),
  );
  const upgrades = safe.filter((r) => r.track === "dmz-upgrade"),
    missions = safe.filter((r) => ["dmz-order", "dmz-story"].includes(r.track));
  return {
    limited: false,
    revision: profile.revision,
    upgrades: upgrades.length,
    upgradesDone: upgrades.filter(
      (r) => upgradeProgressFor(pack, profile, r.id).completion === "completed",
    ).length,
    missions: missions.length,
    missionsDone: missions.filter(
      (r) => profile.completion[r.id] === "completed",
    ).length,
  };
}
export function parseListContext(raw, allowed) {
  if (typeof raw !== "string" || raw.length > 32768)
    throw Error("Invalid list context");
  const v = JSON.parse(raw);
  if (
    !v ||
    Object.keys(v).sort().join() !==
      "contentVersion,context,fields,groups,pack,scroll,version" ||
    v.version !== 1 ||
    ![v.context, v.pack, v.contentVersion].every(
      (x) => typeof x === "string" && x.length <= 100,
    ) ||
    !v.fields ||
    typeof v.fields !== "object" ||
    Array.isArray(v.fields) ||
    Object.entries(v.fields).some(
      ([k, val]) =>
        !allowed.includes(k) || typeof val !== "string" || val.length > 200,
    ) ||
    !Array.isArray(v.groups) ||
    v.groups.length > 128 ||
    v.groups.some(
      (p) =>
        !Array.isArray(p) ||
        p.length !== 2 ||
        typeof p[0] !== "string" ||
        p[0].length > 200 ||
        typeof p[1] !== "boolean",
    ) ||
    !Number.isFinite(v.scroll) ||
    v.scroll < 0 ||
    v.scroll > 1e7
  )
    throw Error("Invalid list context");
  return v;
}
