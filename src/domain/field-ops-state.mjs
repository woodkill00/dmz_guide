import { assert, ID } from "../content/limits.mjs";
const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const keys = (value, names) =>
  object(value) &&
  Object.keys(value).sort().join() === [...names].sort().join();
const id = (value) =>
  typeof value === "string" && value.length <= 100 && ID.test(value);
const uuid = (value) =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const text = (value, max = 1000) =>
  typeof value === "string" && value.length <= max;
const quantity = (value) =>
  Number.isSafeInteger(value) && value >= 0 && value <= 2000000;
const timestamp = (value) =>
  typeof value === "string" &&
  value.length <= 40 &&
  Number.isFinite(Date.parse(value));
export const emptyFieldOps = () => ({
  version: 1,
  carried: {},
  history: [],
  receipts: [],
  discoveries: [],
  matches: [],
});
export function validateFieldOps(state) {
  const names = ["version", "carried", "history", "receipts", "discoveries"];
  if (Object.hasOwn(state || {}, "matches")) names.push("matches");
  assert(
    keys(state, names) && state.version === 1,
    "Invalid field operations state",
  );
  assert(
    object(state.carried) && Object.keys(state.carried).length <= 1000,
    "Too many carried items",
  );
  for (const [key, value] of Object.entries(state.carried))
    assert(id(key) && quantity(value), "Invalid carried item quantity");
  assert(
    Array.isArray(state.history) && state.history.length <= 64,
    "Inventory history limit exceeded",
  );
  let changes = 0;
  for (const event of state.history) {
    assert(
      keys(event, [
        "id",
        "at",
        "label",
        "kind",
        "version",
        "undoOf",
        "changes",
      ]) &&
        uuid(event.id) &&
        timestamp(event.at) &&
        text(event.label, 160) &&
        text(event.kind, 32) &&
        text(event.version, 80) &&
        (event.undoOf === null || uuid(event.undoOf)),
      "Invalid inventory history event",
    );
    assert(
      Array.isArray(event.changes) &&
        event.changes.length > 0 &&
        event.changes.length <= 1000,
      "Invalid inventory changes",
    );
    for (const change of event.changes)
      assert(
        keys(change, ["itemId", "pool", "before", "after"]) &&
          id(change.itemId) &&
          ["stash", "carried"].includes(change.pool) &&
          (change.before === null || quantity(change.before)) &&
          (change.after === null || quantity(change.after)) &&
          change.before !== change.after,
        "Invalid inventory change",
      );
    assert(
      new Set(event.changes.map((c) => c.pool + ":" + c.itemId)).size ===
        event.changes.length,
      "Duplicate history item",
    );
    changes += event.changes.length;
  }
  assert(
    changes <= 1200 &&
      new Set(state.history.map((e) => e.id)).size === state.history.length,
    "Inventory history exceeds bounded capacity",
  );
  assert(
    Array.isArray(state.receipts) &&
      state.receipts.length <= 256 &&
      new Set(state.receipts).size === state.receipts.length &&
      state.receipts.every(
        (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value),
      ),
    "Invalid scan receipts",
  );
  assert(
    Array.isArray(state.discoveries) && state.discoveries.length <= 100,
    "Discovery limit exceeded",
  );
  for (const entry of state.discoveries)
    assert(
      keys(entry, [
        "id",
        "at",
        "itemId",
        "quantity",
        "place",
        "locationId",
        "container",
        "notes",
        "photoId",
      ]) &&
        uuid(entry.id) &&
        timestamp(entry.at) &&
        id(entry.itemId) &&
        (entry.quantity === null || quantity(entry.quantity)) &&
        text(entry.place, 160) &&
        (entry.locationId === null || id(entry.locationId)) &&
        text(entry.container, 120) &&
        text(entry.notes, 1000) &&
        (entry.photoId === null || uuid(entry.photoId)),
      "Invalid private discovery",
    );
  assert(
    new Set(state.discoveries.map((e) => e.id)).size ===
      state.discoveries.length,
    "Duplicate discovery ID",
  );
  assert(
    new Set(state.discoveries.map((entry) => entry.photoId).filter(Boolean))
      .size <= 32,
    "Photo limit reached; export a complete backup before adding more photos",
  );
  if (state.matches) {
    assert(
      Array.isArray(state.matches) && state.matches.length <= 24,
      "Match history limit exceeded",
    );
    for (const match of state.matches)
      assert(
        keys(match, [
          "id",
          "name",
          "at",
          "startedAt",
          "planId",
          "planRevision",
          "stops",
          "progress",
          "stockEventId",
          "undoneAt",
        ]) &&
          uuid(match.id) &&
          text(match.name, 80) &&
          match.name.trim() &&
          timestamp(match.at) &&
          timestamp(match.startedAt) &&
          (match.planId === null ||
            (typeof match.planId === "string" &&
              /^[a-zA-Z0-9:._-]{1,100}$/.test(match.planId))) &&
          (match.planRevision === null ||
            (Number.isSafeInteger(match.planRevision) &&
              match.planRevision >= 0)) &&
          Array.isArray(match.stops) &&
          match.stops.length <= 100 &&
          match.stops.every((stop) => text(stop, 160)) &&
          Array.isArray(match.progress) &&
          match.progress.length <= 100 &&
          match.progress.every(
            (row) =>
              keys(row, ["id", "before", "after"]) &&
              id(row.id) &&
              ["unknown", "completed"].includes(row.before) &&
              ["unknown", "completed"].includes(row.after),
          ) &&
          (match.stockEventId === null || uuid(match.stockEventId)) &&
          (match.undoneAt === null || timestamp(match.undoneAt)),
        "Invalid saved match",
      );
    assert(
      new Set(state.matches.map((match) => match.id)).size ===
        state.matches.length,
      "Duplicate match ID",
    );
  }
  return state;
}
export function journalInventory(previous, next, meta = {}) {
  if (!next.fieldOps) return next;
  const old = previous?.fieldOps || emptyFieldOps(),
    changes = [];
  for (const pool of ["stash", "carried"]) {
    const before = pool === "stash" ? previous?.inventory || {} : old.carried;
    const after = pool === "stash" ? next.inventory : next.fieldOps.carried;
    for (const itemId of new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]))
      if ((before[itemId] ?? null) !== (after[itemId] ?? null))
        changes.push({
          itemId,
          pool,
          before: before[itemId] ?? null,
          after: after[itemId] ?? null,
        });
  }
  if (!changes.length) return next;
  assert(changes.length <= 1000, "Too many quantity changes in one save");
  const history = [
    ...(meta.kind === "restore" ? next.fieldOps.history : old.history),
    {
      id: meta.entryId || crypto.randomUUID(),
      at: new Date().toISOString(),
      label: String(meta.label || "Inventory update").slice(0, 160),
      kind: String(meta.kind || "inventory").slice(0, 32),
      version: next.contentVersion,
      undoOf: meta.undoOf || null,
      changes,
    },
  ];
  while (
    history.length > 64 ||
    history.reduce((n, e) => n + e.changes.length, 0) > 1200
  )
    history.shift();
  next.fieldOps.history = history;
  validateFieldOps(next.fieldOps);
  return next;
}
