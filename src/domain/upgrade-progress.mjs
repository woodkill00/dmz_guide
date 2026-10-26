import { assert, clone } from "../content/limits.mjs";
import { legacyUpgradeState, validateProfile } from "./profile.mjs";
export const upgradeCompletionStates = ["unknown", "incomplete", "completed"];
export const upgradeAvailabilityStates = ["unknown", "locked", "available"];
export function upgradeProgressFor(pack, profile, id) {
  assert(
    pack.objectives.some((r) => r.id === id && r.track === "dmz-upgrade"),
    "Unknown upgrade",
  );
  if (profile.schemaVersion === 1)
    return legacyUpgradeState(profile.completion[id]);
  return {
    completion: "unknown",
    availability: "unknown",
    reviewRequired: false,
    ...profile.upgradeProgress[id],
  };
}
export function isObjectiveCompleted(pack, profile, id) {
  const objective = pack.objectives.find((r) => r.id === id);
  return objective?.track === "dmz-upgrade"
    ? upgradeProgressFor(pack, profile, id).completion === "completed"
    : ["completed", "unlocked"].includes(profile.completion[id]);
}
export function isPrerequisiteSatisfied(pack, profile, id) {
  return isObjectiveCompleted(pack, profile, id);
}
export function setUpgradeProgress(
  pack,
  profile,
  id,
  patch,
  expectedRevision = profile.revision,
) {
  validateProfile(profile);
  assert(
    profile.packId === pack.id &&
      profile.contentVersion === pack.contentVersion,
    "Content version mismatch. Preview and rebind in settings.",
  );
  assert(
    profile.revision === expectedRevision,
    "Progress confirmation expired",
  );
  assert(
    profile.schemaVersion === 2,
    "Preview and confirm profile migration in Settings before editing upgrades.",
  );
  assert(
    patch &&
      Object.keys(patch).every((k) =>
        ["completion", "availability"].includes(k),
      ) &&
      Object.keys(patch).length > 0,
    "Invalid progress change",
  );
  const current = upgradeProgressFor(pack, profile, id),
    entry = { ...current, ...patch, reviewRequired: false };
  assert(
    upgradeCompletionStates.includes(entry.completion) &&
      upgradeAvailabilityStates.includes(entry.availability),
    "Invalid upgrade state",
  );
  const next = clone(profile);
  next.upgradeProgress[id] = entry;
  return validateProfile(next);
}
export function setWatchPin(pack, profile, id, pinned) {
  validateProfile(profile);
  assert(
    profile.schemaVersion === 2,
    "Preview and confirm profile migration in Settings before adding watch pins.",
  );
  assert(
    profile.packId === pack.id &&
      profile.contentVersion === pack.contentVersion,
    "Content version mismatch",
  );
  assert(
    pack.items.some((r) => r.id === id) && typeof pinned === "boolean",
    "Unknown watch item",
  );
  const next = clone(profile);
  next.watchPins = next.watchPins.filter((x) => x !== id);
  if (pinned) next.watchPins.push(id);
  return validateProfile(next);
}

/** Readiness is stricter than listed-cost arithmetic and never follows availability alone. */
export function upgradeReadinessReasons(pack, profile, record) {
  if (
    record.track !== "dmz-upgrade" ||
    isObjectiveCompleted(pack, profile, record.id)
  )
    return [];
  const progress = upgradeProgressFor(pack, profile, record.id),
    reasons = [];
  if (progress.availability !== "available")
    reasons.push(
      `${record.name}: upgrade availability is ${progress.availability}`,
    );
  if (progress.reviewRequired)
    reasons.push(`${record.name}: legacy progress requires review`);
  if (record.upgrade?.prerequisiteStatus !== "known")
    reasons.push(`${record.name}: prerequisite completeness unknown`);
  if (
    record.status !== "fictional" &&
    !(
      record.sourceIds?.length &&
      record.sourceIds.every(
        (id) =>
          pack.sources.find((s) => s.id === id)?.provenance?.buildStatus ===
          "known",
      )
    )
  )
    reasons.push(`${record.name}: current-build applicability unknown`);
  return reasons;
}
