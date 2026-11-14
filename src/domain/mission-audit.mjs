import { ordersPageCoverage } from "./progression.mjs";

export const auditStates = Object.freeze([
  "not-checked",
  "needs-correction",
  "fill-later",
  "ready-for-review",
  "checked",
]);
export const auditSections = Object.freeze([
  "identity",
  "steps",
  "prerequisites",
  "item-needs",
  "locations",
  "rewards",
  "walkthrough",
  "sources",
  "images",
]);
const scopedId = (part) => encodeURIComponent(part);
const fingerprint = (value) => {
  let hash = 2166136261;
  for (const char of JSON.stringify(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export function missionAuditTargets(
  pack,
  { pageSet = "hajin-launch", pageCount = 24 } = {},
) {
  if (!pack || typeof pack.id !== "string") throw Error("Audit pack required");
  const objectiveById = new Map(
    (pack.objectives || []).map((record) => [record.id, record]),
  );
  const sourceById = new Map(
    (pack.sources || []).map((source) => [source.id, source]),
  );
  const evidenceFor = (record) => ({
    record,
    sources: (record?.sourceIds || []).map(
      (id) => sourceById.get(id) || { id, missing: true },
    ),
  });
  const pages = ordersPageCoverage(pack, pageCount, "hajin").map((row) => ({
    id: `page:${scopedId(pack.id)}:${scopedId(pageSet)}:${row.page}:roster`,
    kind: "page",
    section: "roster",
    label: `Orders page ${row.page} · ${row.state}`,
    page: row.page,
    recorded: row.state === "recorded",
    objectiveIds: row.objectiveIds,
    sourceFingerprint: fingerprint(
      row.objectiveIds.map((id) => evidenceFor(objectiveById.get(id))),
    ),
  }));
  const x01Pages = (pack.objectives || []).some(
    (record) => record.track === "dmz-order" && record.orderSet === "x01",
  )
    ? ordersPageCoverage(pack, 5, "x01").map((row) => ({
        id: `page:${scopedId(pack.id)}:x01-season1:${row.page}:roster`,
        kind: "page",
        orderSet: "x01",
        section: "roster",
        label: `X01 page ${row.page} · ${row.state}`,
        page: row.page,
        recorded: row.state === "recorded",
        objectiveIds: row.objectiveIds,
        sourceFingerprint: fingerprint(
          row.objectiveIds.map((id) => evidenceFor(objectiveById.get(id))),
        ),
      }))
    : [];
  const names = new Map();
  for (const record of pack.objectives || []) {
    if (record.track !== "dmz-order" || !record.name) continue;
    names.set(record.name, (names.get(record.name) || 0) + 1);
  }
  const missionLabel = (record) => {
    if (record.spoiler) return "Spoiler-protected mission";
    const name = record.name || record.title || record.id;
    if (record.track !== "dmz-order" || names.get(record.name) < 2) return name;
    const chapter = record.description?.match(
      /^Reported in (?:the )?(.+?) chapter;/,
    )?.[1];
    const reportedPage = record.description?.match(
      /^Reported as page (\d+)/,
    )?.[1];
    const qualifier = Number.isSafeInteger(record.orderPage)
      ? `${record.orderSet === "x01" ? "X01 " : ""}page ${record.orderPage}`
      : chapter || (reportedPage ? `reported page ${reportedPage}` : record.id);
    return `${name} · ${qualifier}`;
  };
  const missions = (pack.objectives || [])
    .filter(
      (record) => record.track === "dmz-order" || record.track === "dmz-story",
    )
    .flatMap((record) =>
      auditSections.map((section) => ({
        id: `mission:${scopedId(pack.id)}:${scopedId(record.id)}:${section}`,
        kind: "mission",
        track: record.track,
        objectiveId: record.id,
        section,
        label: missionLabel(record),
        spoiler: Boolean(record.spoiler),
        sourceFingerprint: fingerprint(evidenceFor(record)),
        page: Number.isSafeInteger(record.orderPage) ? record.orderPage : null,
        orderSet: record.orderSet || "hajin",
        warning:
          {
            steps: !record.steps?.length && "Steps not recorded",
            prerequisites:
              !record.prerequisites?.length && "Prerequisites not recorded",
            "item-needs":
              record.requirementsKnown !== true &&
              "Item requirements are not confirmed complete",
            locations:
              "No dedicated mission-location field in this catalog schema; inspect linked records",
            rewards:
              "No dedicated reward field in this catalog schema; inspect cited sources",
            walkthrough: !record.description && "Walkthrough not recorded",
            sources: !record.sourceIds?.length && "Sources not recorded",
            images:
              !record.assetId &&
              !record.assetIds?.length &&
              "Images not recorded",
          }[section] || null,
      })),
    );
  return [...pages, ...x01Pages, ...missions];
}

export function validateMissionAudit(value, packId) {
  if (
    !value ||
    value.version !== 1 ||
    value.packId !== packId ||
    typeof value.contentVersion !== "string" ||
    value.contentVersion.length > 200 ||
    value.pageSet !== "hajin-launch" ||
    !Array.isArray(value.entries) ||
    (value.history !== undefined && !Array.isArray(value.history)) ||
    (value.history?.length || 0) > 1000
  )
    throw Error("Invalid mission audit file or catalog");
  if (
    value.entries.length > 10000 ||
    new TextEncoder().encode(JSON.stringify(value)).byteLength > 2_000_000
  )
    throw Error("Mission audit exceeds size limit");
  const validEntry = (entry) =>
    entry &&
    typeof entry.id === "string" &&
    entry.id.length <= 400 &&
    auditStates.includes(entry.state) &&
    typeof entry.note === "string" &&
    entry.note.length <= 2000 &&
    typeof entry.reviewer === "string" &&
    entry.reviewer.length <= 120 &&
    (entry.revision === undefined ||
      (Number.isSafeInteger(entry.revision) && entry.revision >= 0)) &&
    (entry.sourceFingerprint === undefined ||
      /^[0-9a-f]{8}$/.test(entry.sourceFingerprint)) &&
    (entry.reviewedAt === null ||
      (typeof entry.reviewedAt === "string" &&
        !Number.isNaN(Date.parse(entry.reviewedAt))));
  const seen = new Set();
  for (const entry of value.entries) {
    if (!validEntry(entry) || seen.has(entry.id))
      throw Error("Invalid mission audit entry");
    seen.add(entry.id);
  }
  for (const event of value.history || []) {
    if (
      !event ||
      typeof event.id !== "string" ||
      event.id.length > 400 ||
      (event.before !== null &&
        (!validEntry(event.before) || event.before.id !== event.id)) ||
      (event.after !== null &&
        (!validEntry(event.after) || event.after.id !== event.id)) ||
      typeof event.at !== "string" ||
      Number.isNaN(Date.parse(event.at))
    )
      throw Error("Invalid mission audit history");
  }
  return {
    ...value,
    entries: value.entries.map((entry) => ({
      ...entry,
      revision: entry.revision ?? 0,
    })),
    history: (value.history || []).map((event) => ({
      ...event,
      before: event.before && {
        ...event.before,
        revision: event.before.revision ?? 0,
      },
      after: event.after && {
        ...event.after,
        revision: event.after.revision ?? 0,
      },
    })),
  };
}

export function missionAuditRestorePreview(current, incoming, targets) {
  const known = new Map(targets.map((target) => [target.id, target]));
  const previous = new Map(current.entries.map((entry) => [entry.id, entry]));
  const proposed = new Map(incoming.entries.map((entry) => [entry.id, entry]));
  const changed = [...proposed.values()].filter(
    (entry) =>
      previous.has(entry.id) &&
      JSON.stringify(entry) !== JSON.stringify(previous.get(entry.id)),
  ).length;
  return {
    added: [...proposed.keys()].filter((id) => !previous.has(id)).length,
    changed,
    removed: [...previous.keys()].filter((id) => !proposed.has(id)).length,
    stale: [...proposed.values()].filter((entry) => {
      const target = known.get(entry.id);
      return !target || entry.sourceFingerprint !== target.sourceFingerprint;
    }).length,
  };
}
