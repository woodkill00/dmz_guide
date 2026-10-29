import { spendingView } from "./upgrade-spending.mjs";
import { previewProfile } from "./profile.mjs";
import { spoilerGuard } from "./progression.mjs";

// Counts are withheld as a whole if any participating reference is protected
// or unresolved. A retained prior pack can identify retired, nonhidden records.
export function safeReferenceCount(ids, pack, reveal, previousPack = null) {
  if (reveal) return ids.length;
  if (previousPack?.id !== pack.id) previousPack = null;
  const guard = spoilerGuard(pack),
    oldGuard = previousPack ? spoilerGuard(previousPack) : null;
  const records = new Map(
    [...(previousPack?.objectives || []), ...pack.objectives].map((r) => [
      r.id,
      r,
    ]),
  );
  if (
    ids.some(
      (id) =>
        !records.has(id) ||
        records.get(id).spoiler ||
        guard.contains(id) ||
        oldGuard?.contains(id),
    )
  )
    return null;
  return ids.length;
}

// This is the only display projection. The staged profile stays private to the
// controller, never embedded as hidden JSON or untrusted identifier attributes.
export function profileChangeSummary(before, after, pack) {
  const validation = previewProfile(after, pack);
  const guard = spoilerGuard(pack, before.spoilers);
  const records = new Map(
    ["items", "recipes", "objectives", "guides", "maps", "locations"]
      .flatMap((group) => pack[group] || [])
      .map((record) => [record.id, record]),
  );
  let protectedChanges = false;
  const protectedReference = (id) => {
    if (before.spoilers || !id) return false;
    const record = records.get(id);
    return !record || record.spoiler || guard.limited || guard.contains(id);
  };
  const withheld = () => ({
    label: "Protected or unresolved changes",
    before: "Unresolved or spoiler-protected details withheld",
    after: "Reveal spoilers to inspect; no hidden quantities or counts shown",
  });
  const name = (id) => {
    const record = records.get(id);
    if (!record) return "Unresolved reference";
    if (record.spoiler && !before.spoilers) return "Spoiler-protected record";
    return guard.text(record.name || record.title || record.id);
  };
  const version = (value) =>
    value === pack.contentVersion || before.spoilers
      ? guard.text(value)
      : "Different content version (text withheld while spoilers are hidden)";
  const sections = [];
  const section = (title, changes) => sections.push({ title, changes });
  for (const [field, title] of [
    ["inventory", "Inventory"],
    ["reserves", "Protected reserves"],
    ["completion", "Progress"],
    ["upgradeProgress", "Upgrade progress"],
    ["routes", "Crafting routes"],
  ]) {
    const changes = [];
    let hidden = false;
    for (const id of new Set([
      ...Object.keys(before[field] || {}),
      ...Object.keys(after[field] || {}),
    ])) {
      const old = before[field]?.[id],
        next = after[field]?.[id];
      if (JSON.stringify(old) === JSON.stringify(next)) continue;
      if (
        protectedReference(id) ||
        (field === "routes" &&
          (protectedReference(old) || protectedReference(next)))
      ) {
        hidden = protectedChanges = true;
        continue;
      }
      const display = (value) =>
        value === undefined
          ? "Not set"
          : field === "routes"
            ? name(value)
            : field === "upgradeProgress"
              ? `${value.completion} / ${value.availability}${value.reviewRequired ? " · review required" : ""}${value.legacyState ? " · legacy " + value.legacyState : ""}`
              : String(value);
      changes.push({
        label: name(id),
        before: display(old),
        after: display(next),
      });
    }
    if (hidden) changes.push(withheld());
    section(title, changes);
  }
  section(
    "Watch pins",
    [...new Set([...(before.watchPins || []), ...(after.watchPins || [])])]
      .filter(
        (id) =>
          (before.watchPins || []).includes(id) !==
          (after.watchPins || []).includes(id),
      )
      .filter((id) => {
        if (!protectedReference(id)) return true;
        protectedChanges = true;
        return false;
      })
      .map((id) => ({
        label: name(id),
        before: (before.watchPins || []).includes(id) ? "Pinned" : "Not pinned",
        after: (after.watchPins || []).includes(id) ? "Pinned" : "Not pinned",
      })),
  );
  const oldSpending = spendingView(pack, {
      ...before,
      spoilers: before.spoilers,
    }),
    newSpending = spendingView(pack, { ...after, spoilers: before.spoilers }),
    historyPartial = oldSpending.partial || newSpending.partial,
    historyChanged =
      JSON.stringify(before.spendHistory || []) !==
      JSON.stringify(after.spendHistory || []);
  const historyChanges = [];
  if (historyChanged) {
    if (historyPartial)
      historyChanges.push({
        label: "Recorded spending history",
        before: "Protected history details withheld",
        after:
          "History will be replaced; reveal spoilers to inspect. No events are replayed.",
      });
    else {
      historyChanges.push({
        label: "Recorded events (not all past gameplay)",
        before:
          before.schemaVersion === 3
            ? String(oldSpending.history.length)
            : "Spending not recorded in this format",
        after:
          after.schemaVersion === 3
            ? String(newSpending.history.length)
            : "Spending not recorded in this format",
      });
      const amount = (row) =>
        row
          ? `net ${row.net}; gross ${row.gross}; reversed ${row.reversed}`
          : "No recorded usage";
      historyChanges.push({
        label: "Recorded material count units",
        before: amount(oldSpending.materials),
        after: amount(newSpending.materials),
      });
      const key = (r) => JSON.stringify([r.itemId, r.kind, r.unit]),
        oldRows = new Map(
          [...oldSpending.items, ...oldSpending.currencies].map((r) => [
            key(r),
            r,
          ]),
        ),
        newRows = new Map(
          [...newSpending.items, ...newSpending.currencies].map((r) => [
            key(r),
            r,
          ]),
        );
      const ids = [...new Set([...oldRows.keys(), ...newRows.keys()])];
      for (const id of ids.slice(0, 50)) {
        const row = newRows.get(id) || oldRows.get(id);
        historyChanges.push({
          label: `${row.name} (${row.unit}${row.kind === "currency" ? ", separate currency" : ""})`,
          before: amount(oldRows.get(id)),
          after: amount(newRows.get(id)),
        });
      }
      if (ids.length > 50)
        historyChanges.push({
          label: "Bounded spending preview",
          before: "First 50 visible item/unit rows",
          after:
            "Additional visible rows retained in the private backup; export for full inspection.",
        });
    }
  }
  section("Recorded spending history", historyChanges);
  section(
    "Profile format",
    before.schemaVersion === after.schemaVersion
      ? []
      : [
          {
            label: "Schema version",
            before: String(before.schemaVersion),
            after: String(after.schemaVersion),
          },
        ],
  );
  const goals = [];
  for (let i = 0; i < Math.max(before.goals.length, after.goals.length); i++) {
    const old = before.goals[i],
      next = after.goals[i];
    if (old?.id === next?.id && old?.quantity === next?.quantity) continue;
    if (protectedReference(old?.id) || protectedReference(next?.id)) {
      protectedChanges = true;
      continue;
    }
    const display = (goal) =>
      goal
        ? `${name(goal.id)} · additional quantity ${goal.quantity}`
        : "No goal";
    goals.push({
      label: `Visible priority change ${goals.length + 1}`,
      before: display(old),
      after: display(next),
    });
  }
  section("Goals in priority order", goals);
  if (protectedChanges) section("Protected changes", [withheld()]);
  const identity = [];
  if (before.packId !== after.packId)
    identity.push({
      label: "Catalog",
      before:
        before.packId === pack.id
          ? guard.text(pack.title)
          : "Different catalog",
      after:
        after.packId === pack.id ? guard.text(pack.title) : "Different catalog",
    });
  if (before.contentVersion !== after.contentVersion)
    identity.push({
      label: "Content version",
      before: version(before.contentVersion),
      after: version(after.contentVersion),
    });
  section("Catalog and version", identity);
  section(
    "Spoiler preference",
    before.spoilers === after.spoilers
      ? []
      : [
          {
            label: "Show spoiler content",
            before: before.spoilers ? "On" : "Off",
            after: after.spoilers ? "On" : "Off",
          },
        ],
  );
  return {
    catalog: guard.text(pack.title || "Selected catalog"),
    activeVersion: guard.text(pack.contentVersion),
    currentVersion: version(before.contentVersion),
    proposedVersion: version(after.contentVersion),
    versionMismatch: validation.versionMismatch,
    unresolvedCount:
      validation.unresolved.length && !before.spoilers
        ? "Withheld while private details are protected"
        : validation.unresolved.length,
    historyChanged,
    historyPartial,
    sections,
  };
}

/** Changed evidence triggers review, never revokes historical completion or infers tiers. */
export function previewContentRebind(profile, pack, previousPack = null) {
  previewProfile(profile, pack);
  const candidate = structuredClone(profile);
  candidate.contentVersion = pack.contentVersion;
  const current = new Map(
    pack.objectives
      .filter((r) => r.track === "dmz-upgrade")
      .map((r) => [r.id, r]),
  );
  const old = new Map(
    (previousPack?.id === pack.id ? previousPack.objectives : [])
      .filter((r) => r.track === "dmz-upgrade")
      .map((r) => [r.id, r]),
  );
  const comparisonKnown =
    previousPack?.id === pack.id &&
    previousPack.contentVersion === profile.contentVersion;
  const oldSources = new Map(
    (previousPack?.sources || []).map((s) => [s.id, s]),
  );
  const newSources = new Map((pack.sources || []).map((s) => [s.id, s]));
  const signature = (r, sources) =>
    JSON.stringify([
      r.requirements,
      r.sourceIds,
      [
        ...new Set([
          ...(r.sourceIds || []),
          ...(r.requirements || []).flatMap((row) => row.sourceIds || []),
        ]),
      ]
        .sort()
        .map((id) => sources.get(id)),
      r.status,
      r.prerequisites,
      r.upgrade,
      r.effects,
    ]);
  const changed = [],
    retired = [],
    added = [];
  for (const [id, entry] of Object.entries(candidate.upgradeProgress || {})) {
    if (!current.has(id)) {
      retired.push(id);
      entry.reviewRequired = true;
    } else if (
      !comparisonKnown ||
      !old.has(id) ||
      signature(old.get(id), oldSources) !==
        signature(current.get(id), newSources)
    ) {
      changed.push(id);
      entry.reviewRequired = true;
    }
  }
  if (comparisonKnown)
    for (const id of current.keys()) if (!old.has(id)) added.push(id);
  previewProfile(candidate, pack);
  return { candidate, comparisonKnown, changed, retired, added };
}
