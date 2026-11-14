import { spoilerGuard } from "./progression.mjs";

const signature = (value) => JSON.stringify(value ?? null);

/** Changes to cited claims are review candidates, never automatic catalog edits. */
export function sourceClaimChanges(current, candidate, limit = 500) {
  if (current.id !== candidate.id)
    throw Error("Candidate catalog identity differs");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
    throw Error("Invalid source change limit");
  const old = new Map((current.claims || []).map((row) => [row.id, row]));
  const next = new Map((candidate.claims || []).map((row) => [row.id, row]));
  const sources = new Map(
    (candidate.sources || []).map((row) => [row.id, row]),
  );
  const protectedIds = new Set(
    [current, candidate].flatMap((pack) =>
      ["items", "recipes", "objectives", "guides", "maps", "locations"]
        .flatMap((group) => pack[group] || [])
        .filter((record) => record.spoiler)
        .map((record) => record.id),
    ),
  );
  const oldGuard = spoilerGuard(current);
  const newGuard = spoilerGuard(candidate);
  const changes = [];
  for (const id of new Set([...old.keys(), ...next.keys()])) {
    const before = old.get(id) || null;
    const after = next.get(id) || null;
    if (protectedIds.has(before?.entityId) || protectedIds.has(after?.entityId))
      continue;
    if (
      oldGuard.contains(signature(before)) ||
      newGuard.contains(signature(after))
    )
      continue;
    if (signature(before) === signature(after)) continue;
    if (changes.length >= limit) break;
    const source = sources.get(after?.sourceId) || null;
    changes.push({
      id,
      state: before ? (after ? "changed" : "removed") : "added",
      entityId: after?.entityId || before.entityId,
      field: after?.field || before.field,
      oldValue: before?.value ?? null,
      newValue: after?.value ?? null,
      oldStatus: before?.status || null,
      newStatus: after?.status || null,
      sourceId: after?.sourceId || before.sourceId,
      citation: source?.url || null,
      sourceDate: source?.reviewedAt || source?.publishedAt || null,
      currentBuild: current.contentVersion,
      candidateBuild: candidate.contentVersion,
      applicability:
        current.contentVersion === candidate.contentVersion
          ? "same catalog version; mode/build still needs review"
          : "candidate version differs; verify build applicability",
    });
  }
  return {
    changes,
    truncated: changes.length === limit && old.size + next.size > limit,
  };
}
