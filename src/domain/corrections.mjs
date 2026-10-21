import {
  assert,
  boundedWalk,
  parseBounded,
  ID,
  safeURL,
} from "../content/limits.mjs";
const keys = [
  "schemaVersion",
  "packId",
  "contentVersion",
  "entityId",
  "field",
  "currentValue",
  "proposedValue",
  "reason",
  "evidenceUrl",
  "attribution",
  "rights",
];
const bounds = {
  packId: [1, 100],
  contentVersion: [1, 100],
  entityId: [1, 100],
  field: [1, 100],
  currentValue: [0, 8000],
  proposedValue: [1, 8000],
  reason: [1, 2000],
  evidenceUrl: [1, 2000],
  attribution: [1, 500],
  rights: [1, 500],
};
function exact(value, allowed) {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    "Expected a packet object",
  );
  assert(
    Object.keys(value).length === allowed.length &&
      Object.keys(value).every((k) => allowed.includes(k)),
    "Unknown or missing packet fields",
  );
}
function text(value, min, max, label) {
  assert(
    typeof value === "string" &&
      value.length <= max &&
      value.trim().length >= min,
    `${label} must contain ${min}–${max} characters`,
  );
}
export function validateCorrection(value) {
  boundedWalk(value, { depth: 12, nodes: 2000, string: 8000 });
  exact(value, keys);
  assert(value.schemaVersion === 1, "Unsupported correction version");
  for (const [k, [min, max]] of Object.entries(bounds))
    text(value[k], min, max, k);
  assert(
    ID.test(value.packId) && ID.test(value.entityId),
    "Invalid namespaced record ID",
  );
  assert(
    safeURL(value.evidenceUrl),
    "Evidence must be a safe HTTP(S) URL without credentials",
  );
  return value;
}
export function parseCorrection(raw) {
  return validateCorrection(
    parseBounded(raw, 262144, { depth: 12, nodes: 2000, string: 8000 }),
  );
}
export function validateReview(value) {
  boundedWalk(value, { depth: 12, nodes: 2000, string: 8000 });
  exact(value, [
    "schemaVersion",
    "correction",
    "decision",
    "reviewer",
    "notes",
  ]);
  assert(value.schemaVersion === 1, "Unsupported review version");
  validateCorrection(value.correction);
  assert(
    ["approved", "rejected", "needs-evidence"].includes(value.decision),
    "Unknown local review decision",
  );
  text(value.reviewer, 1, 200, "Reviewer");
  text(value.notes, 1, 2000, "Notes");
  return value;
}
export function parseReview(raw) {
  return validateReview(
    parseBounded(raw, 262144, { depth: 12, nodes: 2000, string: 8000 }),
  );
}
export function discordURL(value) {
  if (value === null || value === "") return null;
  assert(safeURL(value), "Invalid Discord URL");
  const url = new URL(value);
  assert(
    url.protocol === "https:" &&
      !url.search &&
      !url.hash &&
      !url.port &&
      ((url.hostname === "discord.gg" &&
        /^\/[A-Za-z0-9-]+$/.test(url.pathname)) ||
        (url.hostname === "discord.com" &&
          /^\/invite\/[A-Za-z0-9-]+$/.test(url.pathname))),
    "Use an HTTPS Discord invite without tracking parameters",
  );
  return url.href;
}
