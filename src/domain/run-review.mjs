import { readRecord, commitRecord } from "../storage/store.mjs";

const owners = new Set(["inventory", "progression", "boss", "observation"]);
const id = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9:._-]{1,120}$/.test(value);
const text = (value, max) => typeof value === "string" && value.length <= max;
const quantity = (value, signed = false) => Number.isSafeInteger(value) && value >= (signed ? -2000000 : 0) && value <= 2000000;
const keys = (value, allowed) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join() === allowed.slice().sort().join();
export function validateReviewPayload(owner, value) {
  if (owner === "inventory" && keys(value, ["itemId", "pool", "mode", "quantity"]) && id(value.itemId) && ["stash", "carried"].includes(value.pool) && ["set", "delta"].includes(value.mode) && quantity(value.quantity, value.mode === "delta")) return value;
  if (owner === "progression" && keys(value, ["objectiveId", "status"]) && id(value.objectiveId) && ["unknown", "incomplete", "locked", "unlocked", "completed"].includes(value.status)) return value;
  if (owner === "observation" && keys(value, ["itemId", "locationId", "place", "container", "notes", "quantity"]) && id(value.itemId) && (value.locationId === null || id(value.locationId)) && text(value.place, 160) && text(value.container, 120) && text(value.notes, 1000) && (value.quantity === null || quantity(value.quantity))) return value;
  if (owner === "boss" && keys(value, ["bossId", "event", "date", "notes"]) && id(value.bossId) && ["kill", "attempt", "dog-tag"].includes(value.event) && /^\d{4}-\d{2}-\d{2}$/.test(value.date) && !Number.isNaN(Date.parse(value.date)) && new Date(value.date).toISOString().slice(0, 10) === value.date && text(value.notes, 500)) return value;
  throw Error("Invalid run review report");
}

export function emptyRunReview(packId) {
  if (!id(packId)) throw Error("Invalid review pack");
  return {
    kind: "dmz-run-review",
    version: 1,
    packId,
    revision: 0,
    entries: [],
    receipts: [],
  };
}

export function validateRunReview(doc) {
  if (
    !doc ||
    doc.kind !== "dmz-run-review" ||
    doc.version !== 1 ||
    !id(doc.packId) ||
    !Number.isSafeInteger(doc.revision) ||
    doc.revision < 0 ||
    !Array.isArray(doc.entries) ||
    doc.entries.length > 64 ||
    !Array.isArray(doc.receipts) ||
    doc.receipts.length > 64
  )
    throw Error("Invalid run review");
  const seen = new Set();
  for (const entry of doc.entries) {
    if (
      !entry ||
      !id(entry.id) ||
      !owners.has(entry.owner) ||
      !text(entry.label, 160) ||
      !entry.label ||
      Object.keys(entry).some(
        (key) =>
          !["id", "owner", "label", "state", "expectedRevision", "payload"].includes(key),
      ) ||
      !["staged", "uncertain", "rejected", "saved"].includes(entry.state) ||
      seen.has(entry.id) ||
      !Number.isSafeInteger(entry.expectedRevision) ||
      entry.expectedRevision < 0
    )
      throw Error("Invalid run review entry");
    seen.add(entry.id);
    validateReviewPayload(entry.owner, entry.payload);
  }
  const receiptIds = new Set();
  for (const receipt of doc.receipts) {
    if (
      !receipt ||
      !seen.has(receipt.entryId) ||
      receiptIds.has(receipt.entryId) ||
      !owners.has(receipt.owner) ||
      Object.keys(receipt).some(
        (key) =>
          !["entryId", "owner", "ownerRevision", "savedAt"].includes(key),
      ) ||
      !Number.isSafeInteger(receipt.ownerRevision) ||
      receipt.ownerRevision < 1 ||
      !/^\d{4}-\d{2}-\d{2}T/.test(receipt.savedAt)
    )
      throw Error("Invalid run review receipt");
    receiptIds.add(receipt.entryId);
    const ownerEntry = doc.entries.find(
      (entry) => entry.id === receipt.entryId,
    );
    if (
      ownerEntry?.state !== "saved" ||
      ownerEntry.owner !== receipt.owner ||
      receipt.ownerRevision <= ownerEntry.expectedRevision
    )
      throw Error("Receipt without saved entry");
  }
  if (
    doc.entries.some(
      (entry) => entry.state === "saved" && !receiptIds.has(entry.id),
    )
  )
    throw Error("Saved entry without receipt");
  return doc;
}

export function addReviewEntry(doc, entry) {
  validateRunReview(doc);
  const next = structuredClone(doc);
  if (next.entries.some((row) => row.id === entry.id))
    throw Error("Review entry already exists");
  next.entries.push({ ...entry, state: "staged" });
  return validateRunReview(next);
}

// A failed or interrupted owner call may have committed despite a missing
// acknowledgement. Require manual reconciliation before another attempt.
export function markReviewUncertain(doc, entryId) {
  validateRunReview(doc);
  const next = structuredClone(doc);
  const entry = next.entries.find((row) => row.id === entryId);
  if (!entry || entry.state !== "staged") throw Error("Entry already handled");
  entry.state = "uncertain";
  return validateRunReview(next);
}

export function reconcileUncertainEntry(doc, entryId, outcome, receipt) {
  validateRunReview(doc);
  const next = structuredClone(doc);
  const entry = next.entries.find((row) => row.id === entryId);
  if (!entry || entry.state !== "uncertain")
    throw Error("Entry is not uncertain");
  if (outcome === "not-saved") entry.state = "staged";
  else if (outcome === "saved") {
    if (
      !receipt ||
      !Number.isSafeInteger(receipt.ownerRevision) ||
      receipt.ownerRevision <= entry.expectedRevision
    )
      throw Error("Confirmed owner revision required");
    entry.state = "saved";
    next.receipts.push({
      entryId,
      owner: entry.owner,
      ownerRevision: receipt.ownerRevision,
      savedAt: receipt.savedAt,
    });
  } else throw Error("Choose a confirmed owner outcome");
  return validateRunReview(next);
}

export function rejectReviewEntry(doc, entryId) {
  validateRunReview(doc);
  const next = structuredClone(doc);
  const entry = next.entries.find((candidate) => candidate.id === entryId);
  if (!entry || entry.state !== "staged")
    throw Error("Entry cannot be rejected");
  entry.state = "rejected";
  return validateRunReview(next);
}

// Call only after the owning store confirms its write. A receipt never
// authorizes replay; a caller must explicitly stage a new entry instead.
export function receiptForSavedEntry(doc, entryId, ownerRevision, savedAt) {
  validateRunReview(doc);
  const next = structuredClone(doc);
  const entry = next.entries.find((candidate) => candidate.id === entryId);
  if (!entry || entry.state !== "staged") throw Error("Entry already handled");
  if (
    !Number.isSafeInteger(ownerRevision) ||
    ownerRevision <= entry.expectedRevision
  )
    throw Error("Owner revision did not advance");
  entry.state = "saved";
  next.receipts.push({ entryId, owner: entry.owner, ownerRevision, savedAt });
  return validateRunReview(next);
}

const storageKey = (packId) => `run-review:${packId}`;
export async function loadRunReview(packId) {
  const stored = await readRecord("content", storageKey(packId));
  if (!stored) return emptyRunReview(packId);
  const doc = validateRunReview(stored.value);
  if (doc.packId !== packId) throw Error("Run review storage mismatch");
  return doc;
}
export async function saveRunReview(doc, expectedRevision) {
  validateRunReview(doc);
  if (doc.revision !== expectedRevision) throw Error("Stale run review");
  const saved = await commitRecord(
    "content",
    storageKey(doc.packId),
    doc,
    expectedRevision,
  );
  return validateRunReview(saved);
}

// Persist the uncertainty fence before invoking an owner. If either owner
// acknowledgement or the final receipt write fails, the row remains fenced.
export async function commitReviewedOwner(
  doc,
  entryId,
  writeOwner,
  saveReview = saveRunReview,
) {
  validateRunReview(doc);
  if (typeof writeOwner !== "function" || typeof saveReview !== "function")
    throw Error("Owner and review saves are required");
  const entry = doc.entries.find((row) => row.id === entryId);
  if (!entry || entry.state !== "staged") throw Error("Entry already handled");
  const fenced = await saveReview(
    markReviewUncertain(doc, entryId),
    doc.revision,
  );
  validateRunReview(fenced);
  if (
    fenced.revision <= doc.revision ||
    fenced.entries.find((row) => row.id === entryId)?.state !== "uncertain"
  )
    throw Error("Review uncertainty was not saved");
  const ownerRevision = await writeOwner(entry);
  const receipted = reconcileUncertainEntry(fenced, entryId, "saved", {
    ownerRevision,
    savedAt: new Date().toISOString(),
  });
  return saveReview(receipted, fenced.revision);
}
