import { spoilerGuard } from "./progression.mjs";
export const QUALITY_LIMITS = Object.freeze({
  entries: 10000,
  bytes: 2097152,
  reviewEntries: 2000,
  reviewBytes: 524288,
  page: 100,
});
const plain = (v) => v && typeof v === "object" && !Array.isArray(v);
const exact = (v, fields) =>
  plain(v) && Object.keys(v).sort().join() === fields.split(" ").sort().join();
const text = (v, max) =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const path = (v) =>
  text(v, 2048) && /^\/(?!\/)/.test(v) && !/[\\\u0000-\u0020\u007f]/.test(v);
export function canonicalQuality(value) {
  if (Array.isArray(value)) return value.map(canonicalQuality);
  if (!plain(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalQuality(value[key])]),
  );
}
export async function qualityFingerprint(value) {
  const bytes = new TextEncoder().encode(
    JSON.stringify(canonicalQuality(value)),
  );
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export async function projectSiteQuality(
  packs,
  {
    readerURL,
    editorURL,
    icons = {},
    weaponAcquisition,
    weaponIntel,
    weaponCamos,
    specialEditorURL,
    keys,
  } = {},
) {
  const candidates = [];
  for (const pack of packs) {
    if (
      pack.id.startsWith("fixture:") ||
      pack.sources?.some((s) => s.type === "original-fixture")
    )
      continue;
    const guard = spoilerGuard(pack);
    if (guard.limited) continue;
    for (const [collection, kind] of [
      ["items", "item"],
      ["recipes", "recipe"],
      ["objectives", "objective"],
      ["locations", "location"],
      ["guides", "guide"],
    ]) {
      for (const record of pack[collection] || []) {
        if (record.spoiler || guard.contains(JSON.stringify(record))) continue;
        const title = record.name || record.title || record.id;
        if (guard.contains(title)) continue;
        const checks = [];
        if (
          ![record.description, record.body].some(
            (v) => typeof v === "string" && v.trim(),
          )
        )
          checks.push(["description", "No catalog description recorded."]);
        if (!record.sourceIds?.length)
          checks.push([
            "sources",
            "No cited source identity recorded on this catalog record.",
          ]);
        if (kind === "item") {
          if (!record.rarity || /^(unknown|not recorded)$/i.test(record.rarity))
            checks.push(["rarity", "Rarity is not recorded."]);
          if (
            !record.assetId &&
            !record.assetIds?.length &&
            !icons[pack.id]?.[record.id]
          )
            checks.push([
              "picture",
              "No catalog or icon-registry picture reference. A local custom picture may exist.",
            ]);
          if (!record.locationIds?.length && !record.locations?.length)
            checks.push([
              "locations",
              "No catalog loot-location links. Container hints may be recorded separately.",
            ]);
        }
        if (
          kind === "recipe" &&
          (record.ingredientsKnown !== true || !record.inputs?.length)
        )
          checks.push([
            "ingredients",
            "Ingredient coverage is incomplete or unrecorded; not evidence of a free craft.",
          ]);
        if (kind === "objective") {
          if (
            record.requirementsKnown === false ||
            record.requirements?.some((r) => r.quantity == null)
          )
            checks.push([
              "requirements",
              "Listed requirements include unrecorded amounts or incomplete scope.",
            ]);
          if (!record.description?.trim() && !record.steps?.length)
            checks.push([
              "steps",
              "No task instructions recorded in this catalog record.",
            ]);
        }
        if (kind === "location" && !record.grid && !record.coordinates)
          checks.push([
            "position",
            "No grid or coordinates recorded. Position must not be guessed.",
          ]);
        if (!checks.length) continue;
        const context = {
          packId: pack.id,
          contentVersion: pack.contentVersion,
          record,
          sources: (record.sourceIds || []).map(
            (id) =>
              pack.sources.find((s) => s.id === id) || { missingSource: id },
          ),
        };
        const base = await qualityFingerprint(context);
        for (const [field, message] of checks)
          candidates.push({
            id: encodeURIComponent(`${pack.id}~${record.id}~${field}`),
            binding: await qualityFingerprint({ base, field, message }),
            packId: pack.id,
            recordId: record.id,
            kind:
              record.track === "dmz-upgrade"
                ? "upgrade"
                : ["dmz-order", "dmz-story"].includes(record.track)
                  ? "mission"
                  : kind,
            title: title.slice(0, 200),
            field,
            message,
            readerURL: readerURL(pack, record, kind),
            editorURL: editorURL(pack, record),
          });
      }
    }
  }
  if (weaponAcquisition && weaponIntel) {
    const combat = new Set(weaponIntel.weapons.map((w) => w.id));
    for (const weapon of weaponAcquisition.weapons.filter(
      (w) => !combat.has(w.id),
    ))
      candidates.push({
        id: `weapon~${weapon.id}~stats`,
        binding: await qualityFingerprint({
          weapon,
          sources: weaponAcquisition.sources.filter((s) =>
            weapon.sourceIds.includes(s.id),
          ),
          combat: false,
        }),
        packId: "weapon-acquisition",
        recordId: weapon.id,
        kind: "weapon",
        title: weapon.name,
        field: "stats",
        message:
          "Acquisition/camo reference exists; no combat-stat record in this database.",
        readerURL: weaponURL(weapon.id),
        editorURL: specialEditorURL("weapon-acquisition", weapon.id),
      });
  }
  // The admitted camo schema requires fields, but whitespace and source
  // placeholders still need editorial attention. Never infer a challenge.
  for (const weapon of weaponCamos?.weapons || []) {
    if (weapon.spoiler) continue;
    for (const camo of weapon.rows) {
      const instruction = camo.requirement.trim();
      if (
        instruction &&
        !/^(unknown|not recorded|not available|tbd|pending)[.!]?$/i.test(
          instruction,
        )
      )
        continue;
      candidates.push({
        id: `camo~${weapon.id}~${camo.id}~instructions`,
        binding: await qualityFingerprint({
          provider: weaponCamos.provider,
          checkedAt: weaponCamos.checkedAt,
          weapon: {
            id: weapon.id,
            name: weapon.name,
            sourceURL: weapon.sourceURL,
          },
          camo,
        }),
        packId: "weapon-camos",
        recordId: `${weapon.id}:${camo.id}`,
        kind: "camo",
        title: `${weapon.name} · ${camo.name}`.slice(0, 200),
        field: "instructions",
        message:
          "Camo challenge instructions are unrecorded. Verify the cited source before editing.",
        readerURL: weaponCamoURL(weapon.id, camo.id),
        editorURL: specialEditorURL("weapon-camos", weapon.id),
      });
    }
  }
  for (const key of keys?.keys || []) {
    if (
      key.spoiler ||
      key.grid ||
      key.coordinates ||
      key.locations?.some((location) => location.grid || location.coordinates)
    )
      continue;
    candidates.push({
      id: `key~${key.id}~position`,
      binding: await qualityFingerprint({
        key,
        source: keys.source || keys.sourceURL || null,
      }),
      packId: "keys",
      recordId: key.id,
      kind: "key",
      title: key.name,
      field: "position",
      message:
        "No structured key grid or coordinates recorded in this reference.",
      readerURL: `/keys/${encodeURIComponent(key.id)}/`,
      editorURL: specialEditorURL("key-reference", key.id),
    });
  }
  candidates.sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) ||
      a.title.localeCompare(b.title, "en", { numeric: true }) ||
      a.field.localeCompare(b.field),
  );
  const entries = [];
  let bytes = 200;
  for (const row of candidates) {
    const size = new TextEncoder().encode(JSON.stringify(row)).length + 1;
    if (
      entries.length >= QUALITY_LIMITS.entries ||
      bytes + size > QUALITY_LIMITS.bytes
    )
      break;
    entries.push(row);
    bytes += size;
  }
  return validateQualityIndex({
    version: 1,
    eligibleCount: candidates.length,
    indexedCount: entries.length,
    limited: entries.length < candidates.length,
    entries,
  });
}
export function validateQualityIndex(value) {
  if (
    !exact(value, "version eligibleCount indexedCount limited entries") ||
    value.version !== 1 ||
    !Array.isArray(value.entries) ||
    value.entries.length > QUALITY_LIMITS.entries ||
    value.indexedCount !== value.entries.length ||
    !Number.isSafeInteger(value.eligibleCount) ||
    value.eligibleCount < value.indexedCount ||
    value.limited !== value.eligibleCount > value.indexedCount ||
    new TextEncoder().encode(JSON.stringify(value)).length >
      QUALITY_LIMITS.bytes
  )
    throw Error("Invalid quality coverage");
  const ids = new Set();
  for (const row of value.entries) {
    if (
      !exact(
        row,
        "id binding packId recordId kind title field message readerURL editorURL",
      ) ||
      !text(row.id, 800) ||
      ids.has(row.id) ||
      !hash(row.binding) ||
      !text(row.packId, 100) ||
      !text(row.recordId, 100) ||
      !text(row.kind, 40) ||
      !text(row.title, 200) ||
      !text(row.field, 40) ||
      !text(row.message, 240) ||
      !path(row.readerURL) ||
      !path(row.editorURL)
    )
      throw Error("Invalid quality finding");
    ids.add(row.id);
  }
  return value;
}
export function validateQualityLog(value) {
  if (
    !exact(value, "version entries") ||
    value.version !== 1 ||
    !Array.isArray(value.entries) ||
    value.entries.length > QUALITY_LIMITS.reviewEntries ||
    new TextEncoder().encode(JSON.stringify(value)).length >
      QUALITY_LIMITS.reviewBytes
  )
    throw Error(
      "Quality review limit or format invalid; previous reviews retained",
    );
  const ids = new Set();
  for (const row of value.entries) {
    if (
      !exact(row, "id binding state") ||
      !text(row.id, 800) ||
      ids.has(row.id) ||
      !hash(row.binding) ||
      !["later", "checked"].includes(row.state)
    )
      throw Error("Invalid quality review record");
    ids.add(row.id);
  }
  return value;
}
export function qualityReview(row, log) {
  const previous = log.entries.find((entry) => entry.id === row.id);
  return {
    state: previous?.binding === row.binding ? previous.state : "pending",
    stale: !!previous && previous.binding !== row.binding,
  };
}
export function editQualityReview(log, row, state) {
  validateQualityLog(log);
  if (!["pending", "later", "checked"].includes(state))
    throw Error("Invalid review state");
  const entries = log.entries.filter((r) => r.id !== row.id);
  if (state !== "pending")
    entries.push({ id: row.id, binding: row.binding, state });
  return validateQualityLog({ version: 1, entries });
}
export const qualityReviewKey = "dmz-quality-reviews-v1";
export const qualityState = (log, row) => qualityReview(row, log);
import { weaponURL, weaponCamoURL } from "./weapon-routes.mjs";
