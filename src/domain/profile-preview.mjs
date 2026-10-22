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
    ["routes", "Crafting routes"],
  ]) {
    const changes = [];
    for (const id of new Set([
      ...Object.keys(before[field]),
      ...Object.keys(after[field]),
    ])) {
      const old = before[field][id],
        next = after[field][id];
      if (old === next) continue;
      const display = (value) =>
        value === undefined
          ? "Not set"
          : field === "routes"
            ? name(value)
            : String(value);
      changes.push({
        label: name(id),
        before: display(old),
        after: display(next),
      });
    }
    section(title, changes);
  }
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
