import { previewRunChanges } from "./field-ops.mjs";
import { setCompletion } from "./progression.mjs";
import { upgradeProgressFor } from "./upgrade-progress.mjs";
import { validateProfile, validateInventoryForPack } from "./profile.mjs";

const safeName = (value) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 80;

/** A match draft is bound to the exact profile revision used at its start. */
export function startMatchSession(pack, profile, name) {
  validateProfile(profile);
  if (!safeName(name))
    throw Error("Enter a match name of at most 80 characters");
  if (
    profile.packId !== pack.id ||
    profile.contentVersion !== pack.contentVersion
  )
    throw Error("Review the selected catalog before starting a match");
  return {
    name: name.trim(),
    packId: pack.id,
    contentVersion: pack.contentVersion,
    revision: profile.revision,
    startedAt: new Date().toISOString(),
  };
}

/** Preview stock and objective reports in one guide-profile transaction. */
export function previewMatchSession(
  pack,
  profile,
  session,
  rows,
  objectives,
  stops = [],
) {
  validateProfile(profile);
  if (
    !session ||
    !safeName(session.name) ||
    session.packId !== pack.id ||
    session.packId !== profile.packId ||
    session.contentVersion !== pack.contentVersion ||
    session.contentVersion !== profile.contentVersion ||
    session.revision !== profile.revision
  )
    throw Error(
      "Match snapshot is stale. Start a new match from the current profile",
    );
  if (
    !Array.isArray(rows) ||
    rows.length > 200 ||
    !Array.isArray(objectives) ||
    objectives.length > 100 ||
    !Array.isArray(stops) ||
    stops.length > 100 ||
    stops.some((stop) => typeof stop !== "string" || stop.length > 160)
  )
    throw Error("Match reports exceed the review limit");
  if (!rows.length && !objectives.length)
    throw Error(
      "Add a find or objective before previewing; route stops are preview-only",
    );
  const stock = rows.length
    ? previewRunChanges(profile, pack, rows)
    : {
        candidate: structuredClone(profile),
        changes: [],
        revision: profile.revision,
      };
  let candidate = stock.candidate;
  const progress = [];
  const seen = new Set();
  for (const report of objectives) {
    if (
      !report ||
      typeof report.id !== "string" ||
      !["completed", "unknown"].includes(report.status) ||
      seen.has(report.id)
    )
      throw Error("Choose each match objective once with a valid state");
    seen.add(report.id);
    const objective = (pack.objectives || []).find(
      (row) => row.id === report.id,
    );
    if (!objective || (objective.spoiler && !profile.spoilers))
      throw Error("Match objective is unavailable or spoiler protected");
    const before =
      objective.track === "dmz-upgrade"
        ? upgradeProgressFor(pack, profile, report.id).completion
        : profile.completion[report.id] || "unknown";
    candidate = setCompletion(pack, candidate, report.id, report.status);
    progress.push({ id: report.id, before, after: report.status });
  }
  validateProfile(candidate);
  validateInventoryForPack(candidate, pack);
  return {
    candidate,
    changes: stock.changes,
    progress,
    stops: [...stops],
    revision: profile.revision,
    session,
  };
}
