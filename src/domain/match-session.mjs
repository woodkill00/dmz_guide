import { previewRunChanges } from "./field-ops.mjs";
import { setCompletion } from "./progression.mjs";
import { upgradeProgressFor } from "./upgrade-progress.mjs";
import { validateProfile, validateInventoryForPack } from "./profile.mjs";
import { fieldCandidate, previewFieldUndo } from "./field-ops.mjs";

const safeName = (value) =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 80;

/** A match draft is bound to the exact profile revision used at its start. */
export function startMatchSession(
  pack,
  profile,
  name,
  plan = null,
  planRevision = null,
) {
  validateProfile(profile);
  if (!safeName(name))
    throw Error("Enter a match name of at most 80 characters");
  if (
    profile.packId !== pack.id ||
    profile.contentVersion !== pack.contentVersion
  )
    throw Error("Review the selected catalog before starting a match");
  if (
    plan !== null &&
    (typeof plan.id !== "string" ||
      !/^[a-zA-Z0-9:._-]{1,100}$/.test(plan.id) ||
      !Number.isSafeInteger(planRevision) ||
      planRevision < 0)
  )
    throw Error("Choose a valid saved preparation plan");
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    packId: pack.id,
    contentVersion: pack.contentVersion,
    revision: profile.revision,
    startedAt: new Date().toISOString(),
    planId: plan?.id || null,
    planRevision: plan ? planRevision : null,
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
    !/^[0-9a-f-]{36}$/i.test(session.id || "") ||
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
        candidate: fieldCandidate(profile, pack),
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
  candidate.fieldOps ||= fieldCandidate(profile, pack).fieldOps;
  candidate.fieldOps.matches ||= [];
  candidate.fieldOps.matches.push({
    id: session.id,
    name: session.name,
    at: new Date().toISOString(),
    startedAt: session.startedAt,
    planId: session.planId || null,
    planRevision: session.planRevision ?? null,
    stops: [...stops],
    progress,
    stockEventId: stock.changes.length ? session.id : null,
    undoneAt: null,
  });
  while (candidate.fieldOps.matches.length > 24)
    candidate.fieldOps.matches.shift();
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

/** A match can be reversed only while its exact stock and objective results remain current. */
export function previewMatchUndo(pack, profile, matchId) {
  validateProfile(profile);
  const match = profile.fieldOps?.matches?.find((row) => row.id === matchId);
  if (!match || match.undoneAt)
    throw Error("Match is unavailable or already undone");
  const stockUndo = match.stockEventId
    ? previewFieldUndo(profile, pack, match.stockEventId)
    : null;
  let candidate = stockUndo?.candidate || fieldCandidate(profile, pack);
  const changes = stockUndo?.changes || [];
  for (const row of match.progress) {
    const objective = pack.objectives.find((item) => item.id === row.id);
    if (!objective || (objective.spoiler && !profile.spoilers))
      throw Error("A match objective is unavailable or protected");
    const current =
      objective.track === "dmz-upgrade"
        ? upgradeProgressFor(pack, profile, row.id).completion
        : profile.completion[row.id] || "unknown";
    if (current !== row.after)
      throw Error(
        "Later edits changed a match objective. Reconcile manually instead of overwriting it",
      );
    candidate = setCompletion(pack, candidate, row.id, row.before);
  }
  candidate.fieldOps.matches.find((row) => row.id === matchId).undoneAt =
    new Date().toISOString();
  validateProfile(candidate);
  validateInventoryForPack(candidate, pack);
  return {
    candidate,
    changes,
    progress: match.progress.map((row) => ({
      id: row.id,
      before: row.after,
      after: row.before,
    })),
    undoOf: match.stockEventId,
  };
}
