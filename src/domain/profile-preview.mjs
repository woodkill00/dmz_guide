import { previewProfile } from "./profile.mjs";
import { spoilerGuard } from "./progression.mjs";

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
    for (const id of new Set([
      ...Object.keys(before[field] || {}),
      ...Object.keys(after[field] || {}),
    ])) {
      const old = before[field]?.[id],
        next = after[field]?.[id];
      if (JSON.stringify(old) === JSON.stringify(next)) continue;
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
      .map((id) => ({
        label: name(id),
        before: (before.watchPins || []).includes(id) ? "Pinned" : "Not pinned",
        after: (after.watchPins || []).includes(id) ? "Pinned" : "Not pinned",
      })),
  );
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
    const display = (goal) =>
      goal
        ? `${name(goal.id)} · additional quantity ${goal.quantity}`
        : "No goal";
    goals.push({
      label: `Priority ${i + 1}`,
      before: display(old),
      after: display(next),
    });
  }
  section("Goals in priority order", goals);
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
    unresolvedCount: validation.unresolved.length,
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
  return { candidate, comparisonKnown, changed, retired, added };
}
