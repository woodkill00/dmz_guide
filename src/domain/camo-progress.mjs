import { assert, boundedWalk, parseBounded } from "../content/limits.mjs";
import { validateArmory } from "./armory-workspace.mjs";
import { camoGroups } from "./weapon-camos.mjs";
export const classGoldRequired = Object.freeze({
  "assault-rifle": 8,
  smg: 5,
  shotgun: 2,
  lmg: 3,
  "marksman-rifle": 3,
  "sniper-rifle": 3,
  pistol: 4,
  launcher: 4,
  melee: 1,
});
const exact = (v, keys) =>
  assert(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).sort().join() === keys.split(" ").sort().join(),
    "Unexpected camo progress metadata",
  );
const slug = (v) =>
  assert(
    typeof v === "string" &&
      v.length <= 100 &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) &&
      !["constructor", "prototype"].includes(v),
    "Invalid camo progress identity",
  );
export function progressCatalog(catalog) {
  return validateProgressCatalog({
    version: 1,
    weapons: catalog.weapons.map((w) => {
      const objective =
          w.rows.find((r) => r.id === "platinum")?.requirement || "",
        numeric = /^Complete (\d+) Gold Camo Challenges/.exec(objective);
      const reported = numeric
        ? Number(numeric[1])
        : objective.startsWith("Complete the Gold Camo Challenge,")
          ? 1
          : null;
      assert(
        reported === classGoldRequired[w.category],
        "Review changed class Gold requirement before tracking",
      );
      return {
        id: w.id,
        category: w.category,
        goldRequired: classGoldRequired[w.category],
        rows: w.rows.map(({ id, group, order }) => ({ id, group, order })),
      };
    }),
  });
}
export function validateProgressCatalog(c) {
  boundedWalk(c, { depth: 7, nodes: 15000, string: 2000 });
  exact(c, "version weapons");
  assert(
    new TextEncoder().encode(JSON.stringify(c)).length <= 160 * 1024 &&
      c.version === 1 &&
      Array.isArray(c.weapons) &&
      c.weapons.length === 35,
    "Invalid camo progress catalog",
  );
  const ids = new Set();
  for (const w of c.weapons) {
    exact(w, "id category goldRequired rows");
    slug(w.id);
    assert(!ids.has(w.id), "Duplicate camo progress weapon");
    ids.add(w.id);
    assert(
      Object.hasOwn(classGoldRequired, w.category) &&
        w.goldRequired === classGoldRequired[w.category] &&
        Array.isArray(w.rows) &&
        w.rows.length === 25,
      "Invalid camo progress class/rows",
    );
    const rows = new Set(),
      counts = {};
    w.rows.forEach((r, i) => {
      exact(r, "id group order");
      slug(r.id);
      assert(
        !rows.has(r.id) &&
          Object.hasOwn(camoGroups, r.group) &&
          r.order === i + 1,
        "Invalid camo progress row",
      );
      rows.add(r.id);
      counts[r.group] = (counts[r.group] || 0) + 1;
    });
    for (const [g, n] of Object.entries({
      military: 8,
      special: 3,
      completionist: 4,
      prestige: 4,
      modeMastery: 6,
    }))
      assert(counts[g] === n, "Camo progress group coverage drift");
    for (const name of ["gold", "platinum", "harmonic-break", "divergence"])
      assert(
        w.rows.some((r) => r.id === name && r.group === "completionist"),
        "Missing camo progression gate",
      );
  }
  return c;
}
export const parseProgressCatalog = (raw) =>
  validateProgressCatalog(
    parseBounded(raw, 160 * 1024, { depth: 7, nodes: 15000, string: 2000 }),
  );
export const camoKey = (weapon, row) =>
  row.id === "divergence" || row.group === "modeMastery"
    ? `shared:${row.id}`
    : `weapon:${weapon}:${row.id}`;
export function editCamoCompletion(
  workspace,
  catalog,
  weapon,
  camo,
  completed,
) {
  validateArmory(workspace);
  assert(typeof completed === "boolean", "Invalid camo completion");
  const w = catalog.weapons.find((w) => w.id === weapon),
    r = w?.rows.find((r) => r.id === camo);
  assert(r, "Unknown camo completion target");
  const key = camoKey(weapon, r),
    next = structuredClone(workspace),
    keys = new Set(next.camoCompletions || []);
  if (completed) keys.add(key);
  else keys.delete(key);
  next.camoCompletions = [...keys].sort();
  return validateArmory(next);
}
export function camoStates(catalog, workspace, weapon) {
  const w = catalog.weapons.find((w) => w.id === weapon);
  assert(w, "Unknown camo progress weapon");
  const completed = new Set(workspace.camoCompletions || []),
    done = (gun, row) => completed.has(camoKey(gun.id, row)),
    has = (gun, id) => gun.rows.some((r) => r.id === id && done(gun, r));
  const group = (g) => w.rows.filter((r) => r.group === g),
    all = (g) => group(g).every((r) => done(w, r));
  const first = (rows) => rows.find((r) => !done(w, r))?.id;
  const nextMilitary = first(group("military")),
    nextPrestige = first(group("prestige"));
  const globalCount = (id) => catalog.weapons.filter((g) => has(g, id)).length;
  const classGold = catalog.weapons.filter(
    (g) => g.category === w.category && has(g, "gold"),
  ).length;
  const chainMP = first(group("modeMastery").filter((r) => r.order <= 22)),
    chainDMZ = first(group("modeMastery").filter((r) => r.order > 22));
  return Object.fromEntries(
    w.rows.map((r) => {
      let next = false;
      if (r.group === "military") next = r.id === nextMilitary;
      if (r.group === "special") next = all("military");
      if (r.id === "gold") next = all("military") && all("special");
      if (r.id === "platinum")
        next = has(w, "gold") && classGold >= w.goldRequired;
      if (r.id === "harmonic-break")
        next = has(w, "platinum") && globalCount("platinum") >= 33;
      if (r.id === "divergence") next = globalCount("harmonic-break") >= 33;
      if (r.group === "prestige") next = r.id === nextPrestige;
      if (r.group === "modeMastery")
        next =
          completed.has("shared:divergence") &&
          [chainMP, chainDMZ].includes(r.id);
      return [r.id, done(w, r) ? "completed" : next ? "next" : "remaining"];
    }),
  );
}
