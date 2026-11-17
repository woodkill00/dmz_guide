import { assert, boundedWalk } from "../content/limits.mjs";
import { validateArmory } from "./armory-workspace.mjs";

export const ACQUISITION_MAX_BYTES = 512 * 1024;
export const MANUAL_EXTRACTION_LIMIT = 9999;
export const acquisitionCategories = [
  "assault-rifle",
  "smg",
  "shotgun",
  "lmg",
  "marksman-rifle",
  "sniper-rifle",
  "pistol",
  "launcher",
  "melee",
];
const hosts = new Set([
  "www.callofduty.com",
  "callofduty.com",
  "mw4.gg",
  "dmzhub.gg",
  "codmunity.gg",
  "dmztracker.gg",
  "codcentral.net",
  "www.windowscentral.com",
  "callofduty.monsterenergy.com",
]);
const exact = (v, keys) =>
  assert(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      [Object.prototype, null].includes(Object.getPrototypeOf(v)) &&
      Object.keys(v).sort().join() === keys.split(" ").sort().join(),
    "Unexpected acquisition fields",
  );
const text = (v, max, min = 1) =>
  assert(
    typeof v === "string" &&
      v.length >= min &&
      v.length <= max &&
      !/[\u0000-\u001f\u007f]/.test(v),
    "Invalid acquisition text",
  );
const slug = (v) => {
  text(v, 100);
  assert(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) &&
      !["constructor", "prototype"].includes(v),
    "Invalid acquisition ID",
  );
};
const unique = (rows) =>
  assert(new Set(rows).size === rows.length, "Duplicate acquisition identity");
const list = (v, max) =>
  assert(Array.isArray(v) && v.length <= max, "Acquisition list exceeds limit");
const date = (v) => {
  assert(
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Invalid acquisition date",
  );
  assert(
    Number.isFinite(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid acquisition date",
  );
};
export const normalizeBlueprintName = (v) =>
  String(v)
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
export const blueprintOwnedName = (row) =>
  row.name + (row.variant ? " · " + row.variant : "");
export function validateAcquisitionCatalog(value) {
  boundedWalk(value, { depth: 8, nodes: 25000, string: 1000 });
  assert(
    new TextEncoder().encode(JSON.stringify(value)).length <=
      ACQUISITION_MAX_BYTES,
    "Acquisition byte limit exceeded",
  );
  exact(value, "version updatedAt coverage sources weapons blueprints");
  assert(value.version === 1, "Unsupported acquisition catalog");
  date(value.updatedAt);
  text(value.coverage, 1000);
  list(value.sources, 32);
  list(value.weapons, 256);
  list(value.blueprints, 512);
  const refs = new Set();
  for (const s of value.sources) {
    exact(s, "id title url date status");
    slug(s.id);
    text(s.title, 160);
    text(s.url, 1000);
    date(s.date);
    assert(
      ["official", "reported"].includes(s.status),
      "Invalid acquisition source status",
    );
    const url = new URL(s.url);
    assert(
      url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.port &&
        hosts.has(url.hostname),
      "Unsafe acquisition source URL",
    );
    refs.add(s.id);
  }
  unique(value.sources.map((s) => s.id));
  const references = (ids) => {
    list(ids, 8);
    assert(ids.length > 0, "Missing acquisition evidence");
    unique(ids);
    ids.forEach((id) => assert(refs.has(id), "Unknown acquisition source"));
  };
  for (const w of value.weapons) {
    exact(w, "id name category sourceIds");
    slug(w.id);
    text(w.name, 100);
    assert(
      acquisitionCategories.includes(w.category),
      "Invalid acquisition category",
    );
    references(w.sourceIds);
  }
  unique(value.weapons.map((w) => w.id));
  const weaponIds = new Set(value.weapons.map((w) => w.id));
  for (const b of value.blueprints) {
    exact(b, "id weapon name variant method sourceIds");
    slug(b.id);
    slug(b.weapon);
    assert(weaponIds.has(b.weapon), "Unknown blueprint weapon");
    text(b.name, 80);
    text(b.variant, 30, 0);
    text(blueprintOwnedName(b), 100);
    text(b.method, 500);
    references(b.sourceIds);
  }
  unique(value.blueprints.map((b) => b.id));
  unique(
    value.blueprints.map(
      (b) => b.weapon + "|" + normalizeBlueprintName(blueprintOwnedName(b)),
    ),
  );
  return value;
}
export function extractionCount(entry) {
  return entry?.manualExtractions ?? null;
}
export function acquisitionEntry(workspace, id) {
  return (
    workspace.acquisition[id] || {
      manual: false,
      attachments: [],
      blueprints: [],
    }
  );
}
export function ownsBlueprint(entry, name) {
  return entry.blueprints.some(
    (n) => normalizeBlueprintName(n) === normalizeBlueprintName(name),
  );
}
export function editAcquisition(workspace, weapon, change) {
  validateArmory(workspace);
  assert(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(weapon) &&
      weapon.length <= 100 &&
      !["constructor", "prototype"].includes(weapon),
    "Invalid weapon ID",
  );
  const candidate = structuredClone(workspace),
    entry = (candidate.acquisition[weapon] ??= {
      manual: false,
      attachments: [],
      blueprints: [],
    });
  if (change.kind === "manual") {
    assert(typeof change.value === "boolean", "Invalid manual ownership");
    entry.manual = change.value;
  } else if (change.kind === "count") {
    assert(
      Number.isSafeInteger(change.value) &&
        change.value >= 0 &&
        change.value <= MANUAL_EXTRACTION_LIMIT,
      "Enter a whole extraction count from 0 to 9999",
    );
    entry.manualExtractions = change.value;
  } else if (change.kind === "blueprint") {
    text(change.name, 100);
    const name = change.name.trim().replace(/\s+/g, " ");
    assert(
      name.length > 0 && typeof change.owned === "boolean",
      "Enter a blueprint name",
    );
    if (change.owned && !ownsBlueprint(entry, name))
      entry.blueprints.push(name);
    if (!change.owned)
      entry.blueprints = entry.blueprints.filter(
        (n) => normalizeBlueprintName(n) !== normalizeBlueprintName(name),
      );
  } else throw Error("Unknown acquisition edit");
  return validateArmory(candidate);
}
export function acquisitionRows(catalog, workspace) {
  return catalog.weapons.map((w) => {
    const entry = acquisitionEntry(workspace, w.id),
      known = catalog.blueprints.filter((b) => b.weapon === w.id),
      count = extractionCount(entry);
    return {
      ...w,
      entry,
      count,
      reached: count !== null && count >= 3,
      known,
      ownedKnown: known.filter((b) =>
        ownsBlueprint(entry, blueprintOwnedName(b)),
      ).length,
      custom: entry.blueprints.filter(
        (n) =>
          !known.some(
            (b) =>
              normalizeBlueprintName(blueprintOwnedName(b)) ===
              normalizeBlueprintName(n),
          ),
      ),
    };
  });
}
