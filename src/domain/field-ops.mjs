import { assert } from "../content/limits.mjs";
import {
  validateProfile,
  validateInventoryForPack,
  stockLimit,
} from "./profile.mjs";
import { emptyFieldOps } from "./field-ops-state.mjs";
export function fieldCandidate(profile, pack) {
  validateProfile(profile);
  assert(
    profile.packId === pack.id &&
      profile.contentVersion === pack.contentVersion,
    "Review/rebind the catalog in Settings before changing field quantities",
  );
  const next = structuredClone(profile);
  next.fieldOps ||= emptyFieldOps();
  return next;
}
export function previewFieldChanges(
  profile,
  pack,
  rows,
  { receipts = [] } = {},
) {
  assert(
    Array.isArray(rows) && rows.length > 0 && rows.length <= 600,
    "Choose 1–600 quantity changes",
  );
  const candidate = fieldCandidate(profile, pack),
    changes = [],
    seen = new Set();
  for (const row of rows) {
    assert(
      row && ["stash", "carried"].includes(row.pool),
      "Choose stash or carried stock",
    );
    const item = pack.items.find(
      (item) => item.id === row.itemId && (!item.spoiler || profile.spoilers),
    );
    assert(item, "Item is missing or protected in this catalog");
    const key = row.pool + ":" + row.itemId;
    assert(
      !seen.has(key),
      "Combine changes for the same item/pool before applying",
    );
    seen.add(key);
    const stock =
        row.pool === "stash" ? candidate.inventory : candidate.fieldOps.carried,
      before = stock[row.itemId];
    assert(
      row.mode === "set" || row.mode === "delta",
      "Choose an absolute count or a change",
    );
    assert(Number.isSafeInteger(row.quantity), "Enter a whole quantity");
    assert(
      row.mode !== "delta" || row.quantity >= 0 || before !== undefined,
      "Enter the current quantity before subtracting from unknown stock",
    );
    const after =
      row.mode === "set" ? row.quantity : (before ?? 0) + row.quantity;
    assert(
      Number.isSafeInteger(after) &&
        after >= 0 &&
        after <= stockLimit(profile, item),
      "Quantity exceeds this item's allowed range",
    );
    stock[row.itemId] = after;
    changes.push({
      itemId: row.itemId,
      pool: row.pool,
      before: before ?? null,
      after,
    });
  }
  for (const receipt of receipts) {
    assert(/^[a-f0-9]{64}$/.test(receipt), "Invalid screenshot fingerprint");
    assert(
      !candidate.fieldOps.receipts.includes(receipt),
      "This screenshot was already applied; nothing was changed",
    );
    candidate.fieldOps.receipts.push(receipt);
  }
  validateProfile(candidate);
  validateInventoryForPack(candidate, pack);
  return { candidate, changes, revision: profile.revision };
}
export function previewTransfer(
  profile,
  pack,
  itemId,
  quantity,
  from = "stash",
) {
  assert(
    Number.isSafeInteger(quantity) && quantity > 0,
    "Transfer a positive whole quantity",
  );
  const source =
    from === "stash" ? profile.inventory : profile.fieldOps?.carried || {};
  assert(
    source[itemId] !== undefined && source[itemId] >= quantity,
    "Not enough entered stock in the source compartment",
  );
  return previewFieldChanges(profile, pack, [
    { itemId, pool: from, mode: "delta", quantity: -quantity },
    {
      itemId,
      pool: from === "stash" ? "carried" : "stash",
      mode: "delta",
      quantity,
    },
  ]);
}
export function previewReturnCarried(profile, pack) {
  const rows = Object.entries(profile.fieldOps?.carried || {})
    .filter(([, q]) => q > 0)
    .flatMap(([itemId, quantity]) => [
      { itemId, pool: "carried", mode: "delta", quantity: -quantity },
      { itemId, pool: "stash", mode: "delta", quantity },
    ]);
  return previewFieldChanges(profile, pack, rows);
}
export function previewRunChanges(profile, pack, rows) {
  assert(
    Array.isArray(rows) && rows.length > 0 && rows.length <= 200,
    "Stage 1–200 run rows",
  );
  let candidate = fieldCandidate(profile, pack);
  const combined = new Map();
  for (const row of rows) {
    const preview = previewFieldChanges(candidate, pack, [row]);
    candidate = preview.candidate;
    for (const change of preview.changes) {
      const key = change.pool + ":" + change.itemId,
        old = combined.get(key);
      combined.set(key, {
        ...change,
        before: old ? old.before : change.before,
      });
    }
  }
  return {
    candidate,
    changes: [...combined.values()].filter(
      (change) => change.before !== change.after,
    ),
    revision: profile.revision,
  };
}
export function previewFieldUndo(profile, pack, eventId) {
  const candidate = fieldCandidate(profile, pack),
    event = candidate.fieldOps.history.find((event) => event.id === eventId);
  assert(
    event && event.version === pack.contentVersion,
    "History belongs to an unavailable catalog version",
  );
  assert(
    !candidate.fieldOps.history.some((entry) => entry.undoOf === event.id),
    "This entry was already undone",
  );
  for (const change of event.changes) {
    assert(
      pack.items.some(
        (item) =>
          item.id === change.itemId && (!item.spoiler || profile.spoilers),
      ),
      "A history item is missing or protected",
    );
    const stock =
      change.pool === "stash"
        ? candidate.inventory
        : candidate.fieldOps.carried;
    assert(
      (stock[change.itemId] ?? null) === change.after,
      "Later edits changed an affected quantity. Reconcile manually instead of overwriting it",
    );
    if (change.before === null) delete stock[change.itemId];
    else stock[change.itemId] = change.before;
  }
  validateProfile(candidate);
  validateInventoryForPack(candidate, pack);
  return {
    candidate,
    undoOf: event.id,
    changes: event.changes.map((change) => ({
      ...change,
      before: change.after,
      after: change.before,
    })),
  };
}
export function addDiscovery(profile, pack, entry, existingId = null) {
  const candidate = fieldCandidate(profile, pack);
  assert(
    pack.items.some(
      (item) => item.id === entry.itemId && (!item.spoiler || profile.spoilers),
    ),
    "Choose a visible known item",
  );
  assert(
    entry.locationId === null ||
      pack.locations.some(
        (location) =>
          location.id === entry.locationId &&
          (!location.spoiler || profile.spoilers),
      ),
    "Choose a known location or leave it unlinked",
  );
  const old = existingId
    ? candidate.fieldOps.discoveries.find((entry) => entry.id === existingId)
    : null;
  assert(
    !existingId || old,
    "The discovery changed or was removed. Reopen it to edit.",
  );
  const saved = {
    ...entry,
    id: old?.id || entry.id || crypto.randomUUID(),
    at: old?.at || new Date().toISOString(),
  };
  if (old)
    candidate.fieldOps.discoveries[
      candidate.fieldOps.discoveries.indexOf(old)
    ] = saved;
  else candidate.fieldOps.discoveries.unshift(saved);
  validateProfile(candidate);
  return candidate;
}

export function locationTimeline(pack, profile, locationId, limit = 64) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 128)
    throw Error("Invalid timeline limit");
  const location = (pack.locations || []).find((row) => row.id === locationId);
  if (!location) return [];
  const sources = (location.sourceIds || []).flatMap((id) => {
    const source = (pack.sources || []).find((row) => row.id === id);
    return source
      ? [
          {
            kind: "source",
            id,
            date: source.reviewedAt || source.publishedAt || null,
            title: source.title,
            detail: source.supports || "Source report",
            url: source.url,
          },
        ]
      : [];
  });
  const privateRows = (profile?.fieldOps?.discoveries || [])
    .filter((row) => row.locationId === locationId)
    .map((row) => ({
      kind: "private",
      id: row.id,
      date: row.at || null,
      title:
        (pack.items || []).find((item) => item.id === row.itemId)?.name ||
        "My observation",
      detail: row.notes || row.place || "Player observation",
      url: null,
      photoId: row.photoId || null,
    }));
  return [...sources, ...privateRows]
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .slice(0, limit);
}
