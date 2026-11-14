import { ID, assert, boundedWalk } from "../content/limits.mjs";

const digest = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const date = (value) =>
  typeof value === "string" &&
  value.length <= 40 &&
  Number.isFinite(Date.parse(value));
const text = (value, max) => typeof value === "string" && value.length <= max;
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join() === keys.sort().join();

export function emptySourceReviewLog(packId) {
  return { kind: "dmz-source-review-log", version: 1, packId, entries: [] };
}

export function validateSourceReviewLog(value, packId) {
  boundedWalk(value, { depth: 5, nodes: 3000, string: 2200 });
  assert(
    exact(value, ["kind", "version", "packId", "entries"]) &&
      value.kind === "dmz-source-review-log" &&
      value.version === 1 &&
      value.packId === packId &&
      ID.test(packId),
    "Invalid source review log",
  );
  assert(
    Array.isArray(value.entries) && value.entries.length <= 100,
    "Source review log limit exceeded",
  );
  const keys = new Set();
  for (const row of value.entries) {
    assert(
      exact(row, [
        "claimId",
        "candidateDigest",
        "decision",
        "at",
        "citation",
        "sourceDate",
        "currentBuild",
        "candidateBuild",
        "proposed",
        "verifiedAt",
      ]) &&
        text(row.claimId, 100) &&
        ID.test(row.claimId) &&
        digest(row.candidateDigest) &&
        ["rejected", "opened-studio", "verified-in-catalog"].includes(
          row.decision,
        ) &&
        date(row.at) &&
        (row.citation === null ||
          (text(row.citation, 500) && /^https?:\/\//.test(row.citation))) &&
        (row.sourceDate === null || text(row.sourceDate, 40)) &&
        text(row.currentBuild, 120) &&
        text(row.candidateBuild, 120) &&
        text(row.proposed, 2000) &&
        (row.verifiedAt === null || date(row.verifiedAt)) &&
        (row.decision === "verified-in-catalog" || row.verifiedAt === null),
      "Invalid source review decision",
    );
    const key = `${row.candidateDigest}:${row.claimId}`;
    assert(!keys.has(key), "Duplicate source review decision");
    keys.add(key);
  }
  assert(
    new TextEncoder().encode(JSON.stringify(value)).length <= 250000,
    "Source review log exceeds 250 KB",
  );
  return value;
}

export function recordSourceDecision(log, row) {
  validateSourceReviewLog(log, log.packId);
  const next = structuredClone(log);
  const index = next.entries.findIndex(
    (entry) =>
      entry.candidateDigest === row.candidateDigest &&
      entry.claimId === row.claimId,
  );
  if (index >= 0) next.entries.splice(index, 1);
  next.entries.push(row);
  while (next.entries.length > 100) next.entries.shift();
  return validateSourceReviewLog(next, log.packId);
}

export function verifySourceDecisions(log, pack) {
  validateSourceReviewLog(log, pack.id);
  const next = structuredClone(log);
  let changed = false;
  for (const row of next.entries) {
    if (row.decision !== "opened-studio") continue;
    const current = pack.claims?.find((claim) => claim.id === row.claimId);
    if (
      JSON.stringify({
        value: current?.value ?? null,
        status: current?.status ?? null,
      }) !== row.proposed
    )
      continue;
    row.decision = "verified-in-catalog";
    row.verifiedAt = new Date().toISOString();
    changed = true;
  }
  return { log: validateSourceReviewLog(next, pack.id), changed };
}
