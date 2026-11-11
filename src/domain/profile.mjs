import { validateFieldOps, emptyFieldOps } from "./field-ops-state.mjs";
import { validateItemBlueprints } from "./item-blueprints.mjs";
import {
  validateProgressEntry,
  validateSpendHistory,
} from "./spend-history.mjs";
import {
  LIMITS,
  ID,
  assert,
  boundedWalk,
  parseBounded,
} from "../content/limits.mjs";
const validID = (id) =>
  typeof id === "string" && id.length <= 100 && ID.test(id);
export const stockLimit = (profile, item) =>
  profile.schemaVersion === 3 && item?.kind === "currency"
    ? 2000000
    : LIMITS.quantity;
export function validateInventoryForPack(profile, pack) {
  // A mismatched backup retains its historical stock; rebind validates against the new known kinds.
  if (profile.contentVersion !== pack.contentVersion) return profile;
  for (const item of pack.items)
    for (const field of ["inventory", "reserves", "carried"]) {
      const value =
        field === "carried"
          ? profile.fieldOps?.carried?.[item.id]
          : profile[field][item.id];
      assert(
        value === undefined ||
          (Number.isSafeInteger(value) &&
            value >= 0 &&
            value <= stockLimit(profile, item)),
        "Known item stock/reserve exceeds its input bound",
      );
    }
  return profile;
}
export function resetProfile(profile, pack) {
  previewProfile(profile, pack);
  const candidate = structuredClone(profile);
  candidate.contentVersion = pack.contentVersion;
  for (const field of ["inventory", "reserves", "completion", "routes"])
    candidate[field] = {};
  if (Object.hasOwn(candidate, "itemBlueprints")) candidate.itemBlueprints = {};
  if (Object.hasOwn(candidate, "buildTargets")) candidate.buildTargets = {};
  if (candidate.fieldOps) candidate.fieldOps = emptyFieldOps();
  candidate.goals = [];
  candidate.spoilers = false;
  if (candidate.schemaVersion >= 2) {
    candidate.upgradeProgress = {};
    candidate.watchPins = [];
  }
  return validateProfile(candidate);
}
export function newProfile(pack) {
  return {
    schemaVersion: pack.schemaVersion === 2 ? 3 : 1,
    ...(pack.schemaVersion === 2
      ? { upgradeProgress: {}, watchPins: [], spendHistory: [] }
      : {}),
    id: pack.id,
    packId: pack.id,
    contentVersion: pack.contentVersion,
    revision: 0,
    inventory: {},
    reserves: {},
    goals: [],
    completion: {},
    spoilers: false,
    routes: {},
  };
}
export function validateProfile(p) {
  boundedWalk(p, { depth: 12, nodes: LIMITS.profileNodes, string: 2000 });
  assert(p && typeof p === "object" && !Array.isArray(p), "Invalid profile");
  const keys = [
    "schemaVersion",
    "id",
    "packId",
    "contentVersion",
    "revision",
    "inventory",
    "reserves",
    "goals",
    "completion",
    "spoilers",
    "routes",
  ];
  if (Object.hasOwn(p, "fieldOps")) {
    keys.push("fieldOps");
    validateFieldOps(p.fieldOps);
  }
  if (Object.hasOwn(p, "itemBlueprints")) {
    keys.push("itemBlueprints");
    validateItemBlueprints(p.itemBlueprints);
  }
  if (Object.hasOwn(p, "buildTargets")) {
    keys.push("buildTargets");
    assert(
      p.buildTargets &&
        typeof p.buildTargets === "object" &&
        !Array.isArray(p.buildTargets) &&
        Object.keys(p.buildTargets).length <= 100,
      "Invalid build targets",
    );
    for (const [id, q] of Object.entries(p.buildTargets))
      assert(
        validID(id) && Number.isSafeInteger(q) && q >= 1 && q <= 1000000,
        "Invalid build target quantity or item",
      );
  }
  if (p.schemaVersion >= 2) keys.push("upgradeProgress", "watchPins");
  if (p.schemaVersion === 3) keys.push("spendHistory");
  assert(
    Object.keys(p).every((k) => keys.includes(k)) &&
      keys.every((k) => Object.hasOwn(p, k)),
    "Invalid profile fields",
  );
  assert([1, 2, 3].includes(p.schemaVersion), "Unsupported profile version");
  assert(validID(p.id) && validID(p.packId), "Invalid profile ID");
  assert(
    typeof p.contentVersion === "string" && p.contentVersion.length <= 80,
    "Invalid content version",
  );
  assert(
    Number.isSafeInteger(p.revision) && p.revision >= 0,
    "Invalid revision",
  );
  assert(typeof p.spoilers === "boolean", "Invalid spoiler preference");
  for (const key of ["inventory", "reserves", "completion", "routes"]) {
    const map = p[key];
    assert(
      map && typeof map === "object" && !Array.isArray(map),
      `Invalid ${key}`,
    );
    assert(Object.keys(map).length <= 10000, "Too many references");
    for (const [id, v] of Object.entries(map)) {
      assert(validID(id), "Invalid reference ID");
      if (["inventory", "reserves"].includes(key))
        assert(
          Number.isSafeInteger(v) &&
            v >= 0 &&
            v <= (p.schemaVersion === 3 ? 2000000 : LIMITS.quantity),
          p.schemaVersion === 3
            ? "Quantity must be an integer from 0 to 2000000; known non-currency items remain capped at 1000000"
            : "Quantity must be an integer from 0 to 1000000",
        );
      else if (key === "completion")
        assert(
          ["unknown", "locked", "unlocked", "completed"].includes(v),
          "Invalid progress",
        );
      else assert(validID(v), "Invalid route");
    }
  }
  assert(
    Array.isArray(p.goals) && p.goals.length <= LIMITS.goals,
    "Goal limit exceeded",
  );
  for (const g of p.goals) {
    assert(
      g &&
        Object.keys(g).length === 2 &&
        validID(g.id) &&
        Number.isSafeInteger(g.quantity) &&
        g.quantity > 0 &&
        g.quantity <= LIMITS.quantity,
      "Invalid goal",
    );
  }
  assert(
    new Set(p.goals.map((g) => g.id)).size === p.goals.length,
    "Duplicate goals",
  );
  if (p.schemaVersion >= 2) {
    const map = p.upgradeProgress;
    assert(
      map &&
        typeof map === "object" &&
        !Array.isArray(map) &&
        Object.keys(map).length <= 10000,
      "Invalid upgrade progress",
    );
    for (const [id, entry] of Object.entries(map)) {
      assert(
        validID(id) &&
          entry &&
          typeof entry === "object" &&
          !Array.isArray(entry),
        "Invalid upgrade entry",
      );
      validateProgressEntry(entry);
    }
    assert(
      Array.isArray(p.watchPins) &&
        p.watchPins.length <= 1000 &&
        p.watchPins.every(validID) &&
        new Set(p.watchPins).size === p.watchPins.length,
      "Invalid watch pins",
    );
  }
  if (p.schemaVersion === 3) validateSpendHistory(p.spendHistory);
  assert(
    new TextEncoder().encode(JSON.stringify(p)).length <= LIMITS.profileBytes,
    "Profile exceeds byte limit",
  );
  return p;
}
export function parseProfile(text) {
  return validateProfile(
    parseBounded(text, LIMITS.profileBytes, {
      depth: 12,
      nodes: LIMITS.profileNodes,
      string: 2000,
    }),
  );
}
export function previewProfile(p, pack) {
  validateProfile(p);
  assert(p.packId === pack.id, "Backup belongs to a different pack");
  validateInventoryForPack(p, pack);
  const known = new Set(
    [...pack.items, ...pack.recipes, ...pack.objectives].map((r) => r.id),
  );
  const knownItems = new Set(pack.items.map((item) => item.id));
  const refs = new Set([
    ...Object.keys(p.inventory),
    ...Object.keys(p.fieldOps?.carried || {}),
    ...(p.fieldOps?.discoveries || []).map((entry) => entry.itemId),
    ...Object.keys(p.reserves),
    ...Object.keys(p.itemBlueprints || {}),
    ...Object.keys(p.buildTargets || {}),
    ...Object.keys(p.completion),
    ...Object.keys(p.upgradeProgress || {}),
    ...(p.watchPins || []),
    ...(p.spendHistory || [])
      .filter((e) => e.kind === "purchase")
      .flatMap((e) => [e.upgradeId, ...e.costs.map((c) => c.itemId)]),
    ...p.goals.map((g) => g.id),
    ...Object.keys(p.routes),
    ...Object.values(p.routes),
  ]);
  return {
    versionMismatch: p.contentVersion !== pack.contentVersion,
    unresolved: [
      ...new Set([
        ...[...refs].filter((id) => !known.has(id)),
        ...Object.keys(p.itemBlueprints || {}).filter(
          (id) => !knownItems.has(id),
        ),
        ...Object.keys(p.buildTargets || {}).filter(
          (id) => !knownItems.has(id),
        ),
        ...(p.fieldOps?.discoveries || [])
          .map((entry) => entry.locationId)
          .filter(
            (id) =>
              id && !pack.locations.some((location) => location.id === id),
          ),
      ]),
    ],
    inventoryEntries: Object.keys(p.inventory).length,
    goals: p.goals.length,
  };
}

export function legacyUpgradeState(state = "unknown") {
  return {
    completion: state === "completed" ? "completed" : "unknown",
    availability: state === "locked" ? "locked" : "unknown",
    reviewRequired: state === "unlocked",
    legacyState: state,
  };
}
export function previewUpgradeMigration(profile, pack) {
  previewProfile(profile, pack);
  assert(
    profile.contentVersion === pack.contentVersion,
    "Rebind content before migrating progress",
  );
  const candidate = structuredClone(profile);
  if (profile.schemaVersion === 3)
    return {
      candidate,
      changed: false,
      moved: [],
      ambiguous: [],
      unresolved: previewProfile(profile, pack).unresolved,
    };
  candidate.schemaVersion = 3;
  candidate.spendHistory = [];
  if (profile.schemaVersion === 2)
    return {
      candidate: validateProfile(candidate),
      changed: true,
      moved: [],
      ambiguous: [],
      unresolved: previewProfile(candidate, pack).unresolved,
    };
  candidate.upgradeProgress = {};
  candidate.watchPins = [];
  const ids = new Set(
    pack.objectives.filter((r) => r.track === "dmz-upgrade").map((r) => r.id),
  );
  const moved = [],
    ambiguous = [];
  for (const [id, state] of Object.entries(candidate.completion))
    if (ids.has(id)) {
      candidate.upgradeProgress[id] = legacyUpgradeState(state);
      delete candidate.completion[id];
      moved.push(id);
      if (state === "unlocked") ambiguous.push(id);
    }
  validateProfile(candidate);
  return {
    candidate,
    changed: true,
    moved,
    ambiguous,
    unresolved: previewProfile(candidate, pack).unresolved,
  };
}
