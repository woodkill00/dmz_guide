import { assert, boundedWalk, parseBounded } from "../content/limits.mjs";
import { bytesFromBase64, imageInfo } from "../content/portable.mjs";

export const ARMORY_LIMITS = Object.freeze({
  bytes: 12 * 1024 * 1024,
  images: 8 * 1024 * 1024,
  builds: 100,
  observations: 100,
});
const exact = (v, keys) =>
  assert(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).sort().join() === keys.split(" ").sort().join(),
    "Unexpected private armory fields",
  );
const text = (v, max, min = 0) =>
  assert(
    typeof v === "string" &&
      v.length >= min &&
      v.length <= max &&
      !v.includes("\0"),
    "Invalid private armory text",
  );
const id = (v) =>
  assert(
    typeof v === "string" &&
      v.length <= 100 &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v),
    "Invalid armory reference",
  );
const uuid = (v) =>
  assert(
    typeof v === "string" &&
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v),
    "Invalid private record identity",
  );
const date = (v) =>
  assert(
    typeof v === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid observation date",
  );
const finite = (v, max) =>
  assert(
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max,
    "Invalid measurement value",
  );
const list = (v, max) =>
  assert(
    Array.isArray(v) && v.length <= max,
    "Private armory collection limit",
  );
const unique = (values) =>
  assert(
    new Set(values.map((v) => (typeof v === "string" ? v.toLowerCase() : v)))
      .size === values.length,
    "Duplicate private armory identity",
  );
export const slotKey = (v) => v.trim().toLowerCase().replace(/\s+/g, "-");
export const emptyArmory = () => ({
  version: 1,
  revision: 0,
  builds: [],
  observations: [],
  acquisition: {},
});

export function validateBuild(build) {
  exact(build, "id name weapon attachments notes updatedAt");
  uuid(build.id);
  text(build.name, 100, 1);
  id(build.weapon);
  list(build.attachments, 6);
  build.attachments.forEach(id);
  unique(build.attachments);
  text(build.notes, 1000);
  date(build.updatedAt);
  return build;
}
export function buildIssues(db, build) {
  const weapon = db.weapons.find((w) => w.id === build.weapon);
  if (!weapon)
    return [
      "Weapon is absent from the current database; this archived build can be exported or removed.",
    ];
  const issues = [],
    selected = build.attachments.map((id) =>
      db.attachments.find((a) => a.id === id),
    );
  if (selected.some((a) => !a))
    issues.push("An attachment is absent from the current database.");
  const known = selected.filter(Boolean),
    standard = known.filter((a) => a.kind === "standard"),
    apex = known.filter((a) => a.kind === "apex");
  if (standard.length > 5 || apex.length > 1)
    issues.push(
      "Planning template permits five standard attachments and one Apex.",
    );
  const slots = standard.map((a) => slotKey(a.slot));
  if (new Set(slots).size !== slots.length)
    issues.push("Choose only one attachment per slot.");
  for (const a of known) {
    if (!a.weapons.includes(weapon.id))
      issues.push(`${a.name} is not reported compatible with ${weapon.name}.`);
    if (
      a.kind === "standard" &&
      !weapon.slots.map(slotKey).includes(slotKey(a.slot))
    )
      issues.push(`${a.name} uses an unsupported weapon slot.`);
  }
  if (apex.length)
    for (const a of standard)
      if (weapon.blockedSlots.map(slotKey).includes(slotKey(a.slot)))
        issues.push(
          `${apex[0].name} blocks ${a.slot}; remove the conflicting attachment explicitly.`,
        );
  return issues;
}
export function attachmentAdvice(db, weaponId, attachmentId) {
  const attachment = db.attachments.find((a) => a.id === attachmentId);
  assert(attachment, "Unknown attachment");
  return Object.entries(attachment.effects[weaponId] || {}).map(
    ([id, factor]) => {
      const metric = db.metrics.find((m) => m.id === id);
      assert(metric, "Unknown effect metric");
      const percent = Number(((factor - 1) * 100).toFixed(2));
      const verdict =
        percent === 0
          ? "unchanged"
          : percent > 0 === (metric.better === "higher")
            ? "benefit"
            : "tradeoff";
      return {
        metric: id,
        label: metric.name,
        percent,
        verdict,
        text: `${metric.name}: ${percent >= 0 ? "+" : ""}${percent}% (${verdict}${metric.unit === "ms" ? "; change in time, not speed" : ""})`,
      };
    },
  );
}
export function validateObservation(o) {
  exact(
    o,
    "id weapon metric value unit mode build date target armor rangeMeters method firingMode loadoutContext status image",
  );
  uuid(o.id);
  id(o.weapon);
  text(o.metric, 100, 1);
  assert(/^[a-z0-9][a-z0-9_:-]*$/.test(o.metric), "Invalid measurement metric");
  finite(o.value, 1e9);
  text(o.unit, 100);
  assert(["dmz", "multiplayer"].includes(o.mode), "Invalid measurement mode");
  text(o.build, 120, 1);
  date(o.date);
  text(o.target, 100, 1);
  text(o.armor, 100);
  if (o.rangeMeters !== null) finite(o.rangeMeters, 10000);
  text(o.method, 1000, 1);
  text(o.firingMode, 100, 1);
  text(o.loadoutContext, 1000, 1);
  assert(
    ["recorded", "repeated"].includes(o.status),
    "Invalid private observation status",
  );
  if (o.image !== null) {
    exact(o.image, "base64 mime width height sha256");
    assert(
      o.image.mime === "image/png" && /^[a-f0-9]{64}$/.test(o.image.sha256),
      "Invalid evidence picture",
    );
    const bytes = bytesFromBase64(o.image.base64),
      info = imageInfo(bytes);
    assert(
      info.mime === "image/png" &&
        info.width === o.image.width &&
        info.height === o.image.height,
      "Evidence picture signature/dimensions mismatch",
    );
  }
  return o;
}
export function validateArmory(workspace) {
  boundedWalk(workspace, {
    depth: 16,
    nodes: 20000,
    string: Math.ceil((2 * 1024 * 1024) / 3) * 4,
  });
  exact(workspace, "version revision builds observations acquisition");
  assert(
    workspace.version === 1 &&
      Number.isSafeInteger(workspace.revision) &&
      workspace.revision >= 0,
    "Invalid private workspace version/revision",
  );
  list(workspace.builds, 100);
  list(workspace.observations, 100);
  workspace.builds.forEach(validateBuild);
  workspace.observations.forEach(validateObservation);
  unique(workspace.builds.map((b) => b.id));
  unique(workspace.observations.map((o) => o.id));
  assert(
    workspace.acquisition &&
      typeof workspace.acquisition === "object" &&
      !Array.isArray(workspace.acquisition) &&
      Object.keys(workspace.acquisition).length <= 256,
    "Invalid acquisition tracker",
  );
  for (const [weapon, v] of Object.entries(workspace.acquisition)) {
    id(weapon);
    exact(v, "manual attachments blueprints");
    assert(typeof v.manual === "boolean", "Invalid manual tracker");
    list(v.attachments, 2000);
    v.attachments.forEach(id);
    unique(v.attachments);
    list(v.blueprints, 100);
    v.blueprints.forEach((name) => text(name, 100, 1));
    unique(v.blueprints);
  }
  const imageBytes = workspace.observations.reduce(
    (n, o) => n + (o.image ? bytesFromBase64(o.image.base64).length : 0),
    0,
  );
  assert(
    imageBytes <= ARMORY_LIMITS.images,
    "Total evidence image byte limit exceeded",
  );
  assert(
    new TextEncoder().encode(JSON.stringify(workspace)).length <=
      ARMORY_LIMITS.bytes,
    "Private workspace byte limit exceeded",
  );
  return workspace;
}
export function parseArmoryBackup(raw) {
  const value = parseBounded(raw, ARMORY_LIMITS.bytes + 65536, {
    depth: 18,
    nodes: 20010,
    string: Math.ceil((2 * 1024 * 1024) / 3) * 4,
  });
  exact(value, "format version workspace");
  assert(
    value.format === "dmz-armory-backup" && value.version === 1,
    "Unsupported armory backup",
  );
  return validateArmory(value.workspace);
}
export function parseSharedBuild(raw) {
  const value = parseBounded(raw, 16384, {
    depth: 6,
    nodes: 100,
    string: 1000,
  });
  exact(value, "format version build");
  assert(
    value.format === "dmz-armory-build" && value.version === 1,
    "Unsupported shared build",
  );
  return validateBuild(value.build);
}
export const observationContext = (o) =>
  JSON.stringify([
    o.metric,
    o.unit,
    o.mode,
    o.build,
    o.date,
    o.target,
    o.armor,
    o.rangeMeters,
    o.method,
    o.firingMode,
    o.loadoutContext,
  ]);
export function comparePrivateObservations(
  workspace,
  weaponIds,
  metric,
  selection,
) {
  const rows = weaponIds.map((weapon) =>
    workspace.observations.find(
      (o) =>
        o.id === selection[weapon] &&
        o.weapon === weapon &&
        o.metric === metric &&
        o.mode === "dmz",
    ),
  );
  if (rows.some((o) => !o))
    return {
      comparable: false,
      reason: "Select one DMZ observation explicitly for every weapon.",
      rows: rows.filter(Boolean),
    };
  if (new Set(rows.map(observationContext)).size !== 1)
    return {
      comparable: false,
      reason:
        "Measurement contexts or units differ. Review individual evidence; no numeric comparison is available.",
      rows,
    };
  return {
    comparable: true,
    reason: "Matched user-reported context; not officially verified.",
    rows,
  };
}
export function baseComparison(db, weaponIds, mode) {
  assert(
    weaponIds.length >= 2 &&
      weaponIds.length <= 4 &&
      new Set(weaponIds).size === weaponIds.length,
    "Select two to four different weapons",
  );
  assert(["launch", "multiplayer"].includes(mode), "Unknown comparison source");
  assert(
    weaponIds.every((id) => db.weapons.some((w) => w.id === id)),
    "Unknown comparison weapon",
  );
  const definitions =
    mode === "launch"
      ? [
          { id: "rpm", name: "Fire rate" },
          { id: "magazine", name: "Magazine" },
          { id: "reserve", name: "Reserve ammunition" },
          { id: "levels", name: "Weapon levels" },
        ]
      : db.metrics;
  const rows = definitions.map((m) => ({
    label: m.name,
    cells: weaponIds.map((id) => {
      if (mode === "launch") {
        const v = db.weapons.find((w) => w.id === id).official[m.id];
        return { value: v.value, unit: v.unit, status: v.applicability };
      }
      const values = db.communityStats[id] || {};
      return {
        value: Object.hasOwn(values, m.id) ? values[m.id] : null,
        unit: m.unit || "unspecified",
        status: Object.hasOwn(values, m.id)
          ? "community-unverified"
          : "unknown",
      };
    }),
  }));
  for (const row of rows) {
    const units = new Set(
      row.cells.filter((c) => c.value !== null).map((c) => c.unit),
    );
    if (units.size > 1)
      for (const cell of row.cells)
        if (cell.value !== null) {
          cell.value = null;
          cell.status = "Units differ; consult individual reports";
        }
  }
  return rows;
}
