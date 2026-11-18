import test from "node:test";
import assert from "node:assert/strict";
import { readWeaponCamos } from "../../src/content/weapon-camos.mjs";
import {
  progressCatalog,
  camoKey,
  camoStates,
  editCamoCompletion,
  classGoldRequired,
  parseProgressCatalog,
} from "../../src/domain/camo-progress.mjs";
import {
  emptyArmory,
  validateArmory,
  parseArmoryBackup,
} from "../../src/domain/armory-workspace.mjs";
import { editAcquisition } from "../../src/domain/weapon-acquisition.mjs";
import { renderWeaponCamos } from "../../src/ui/weapon-camos-page.mjs";
const source = await readWeaponCamos(),
  catalog = progressCatalog(source),
  weapon = catalog.weapons[0],
  clone = (v) => structuredClone(v);
const set = (s, id, yes = true, w = weapon.id) =>
  editCamoCompletion(s, catalog, w, id, yes);
const group = (g) => weapon.rows.filter((r) => r.group === g);
test("090 every weapon has four primary tiers, correct source gates and637 canonical identities", () => {
  const keys = new Set(
    catalog.weapons.flatMap((w) => w.rows.map((r) => camoKey(w.id, r))),
  );
  assert.equal(keys.size, 637);
  assert.deepEqual(classGoldRequired, {
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
  for (const w of source.weapons) {
    const html = renderWeaponCamos(source, w);
    assert.equal((html.match(/data-camo-tile=/g) || []).length, 25);
    assert.equal((html.match(/data-camo-complete=/g) || []).length, 25);
    assert.equal((html.match(/data-camo-tier=/g) || []).length, 5);
    assert.match(html, /data-camo-view-panel="mastery" hidden/);
  }
  const changed = clone(source);
  changed.weapons[0].rows.find((r) => r.id === "platinum").requirement =
    "Complete 9 Gold Camo Challenges, then …";
  assert.throws(() => progressCatalog(changed), /changed class/);
});
test("090 Military8 → parallelSpecial3 → Gold; undo never erases later completion", () => {
  let state = emptyArmory();
  let statuses = camoStates(catalog, state, weapon.id);
  assert.equal(statuses["military-camo-1"], "next");
  assert(group("special").every((r) => statuses[r.id] === "remaining"));
  assert.equal(statuses.gold, "remaining");
  for (const r of group("military")) state = set(state, r.id);
  statuses = camoStates(catalog, state, weapon.id);
  assert(group("special").every((r) => statuses[r.id] === "next"));
  assert.equal(statuses.gold, "remaining");
  for (const r of group("special").slice(0, 2)) state = set(state, r.id);
  assert.equal(camoStates(catalog, state, weapon.id).gold, "remaining");
  state = set(state, group("special")[2].id);
  assert.equal(camoStates(catalog, state, weapon.id).gold, "next");
  state = set(state, "gold");
  state = set(state, "military-camo-2", false);
  statuses = camoStates(catalog, state, weapon.id);
  assert.equal(statuses.gold, "completed");
  assert.equal(statuses["military-camo-2"], "next");
  assert(group("special").every((r) => statuses[r.id] === "completed"));
  state = set(state, "gold", false);
  assert.equal(camoStates(catalog, state, weapon.id).gold, "remaining");
});
test("090 reported classGold and33crossweapon gates remain independent of roster size", () => {
  let state = emptyArmory();
  const cls = catalog.weapons.filter((w) => w.category === weapon.category);
  for (const w of cls.slice(0, 7)) state = set(state, "gold", true, w.id);
  assert.equal(camoStates(catalog, state, weapon.id).platinum, "remaining");
  state = set(state, "gold", true, cls[7].id);
  assert.equal(camoStates(catalog, state, weapon.id).platinum, "next");
  for (const w of catalog.weapons.slice(0, 32))
    state = set(state, "platinum", true, w.id);
  assert.equal(
    camoStates(catalog, state, weapon.id)["harmonic-break"],
    "remaining",
  );
  state = set(state, "platinum", true, catalog.weapons[32].id);
  assert.equal(camoStates(catalog, state, weapon.id)["harmonic-break"], "next");
  for (const w of catalog.weapons.slice(0, 33))
    state = set(state, "harmonic-break", true, w.id);
  assert.equal(camoStates(catalog, state, weapon.id).divergence, "next");
});
test("090 shared Divergence/mastery ticks sync across weapons while Prestige stays perweapon", () => {
  let state = set(emptyArmory(), "divergence");
  const modes = group("modeMastery"),
    other = catalog.weapons[1].id;
  let a = camoStates(catalog, state, other);
  assert.equal(a.divergence, "completed");
  assert.equal(a[modes[0].id], "next");
  assert.equal(a[modes[3].id], "next");
  state = set(state, modes[0].id);
  a = camoStates(catalog, state, other);
  assert.equal(a[modes[0].id], "completed");
  assert.equal(a[modes[1].id], "next");
  assert.equal(
    state.camoCompletions.filter((k) => k.startsWith("shared:")).length,
    2,
  );
  state = set(state, group("prestige")[0].id);
  assert.equal(
    camoStates(catalog, state, weapon.id)[group("prestige")[1].id],
    "next",
  );
  assert.equal(
    camoStates(catalog, state, other)[group("prestige")[0].id],
    "next",
  );
  state = set(state, "divergence", false);
  a = camoStates(catalog, state, weapon.id);
  assert.equal(a[modes[0].id], "completed");
  assert.equal(a[modes[1].id], "remaining");
});
test("090 legacy/archives/misplacedkeys/fullbackup and otherwriters preserve private records", () => {
  let state = emptyArmory();
  assert(!Object.hasOwn(validateArmory(state), "camoCompletions"));
  state.revision = 8;
  state.acquisition[weapon.id] = {
    manual: true,
    manualExtractions: 2,
    attachments: [],
    blueprints: ["Synthetic owned blueprint"],
  };
  state.camoCompletions = [
    "shared:gold",
    "weapon:han-86:divergence",
    "weapon:archived-weapon:removed-camo",
  ];
  const before = JSON.stringify(state),
    next = set(state, "gold");
  assert.equal(JSON.stringify(state), before);
  assert.equal(next.revision, 8);
  assert.deepEqual(next.acquisition, state.acquisition);
  assert.equal(camoStates(catalog, state, weapon.id).gold, "remaining");
  assert.equal(camoStates(catalog, state, weapon.id).divergence, "remaining");
  const changed = editAcquisition(next, weapon.id, {
    kind: "manual",
    value: false,
  });
  assert.deepEqual(changed.camoCompletions, next.camoCompletions);
  assert.deepEqual(
    parseArmoryBackup(
      JSON.stringify({
        format: "dmz-armory-backup",
        version: 1,
        workspace: next,
      }),
    ),
    next,
  );
  assert.deepEqual(
    set(next, "gold", false).camoCompletions,
    state.camoCompletions.slice().sort(),
  );
});
test("090 rejects malformed/oversized completion state and unsafe metadata without accepting arbitrary targets", () => {
  for (const values of [
    null,
    {},
    ["shared:gold", "shared:gold"],
    ["shared:Constructor"],
    ["weapon:bad/key:gold"],
    ["shared:prototype"],
    ["shared:" + "a".repeat(101)],
    Array.from({ length: 2049 }, (_, i) => `shared:test-${i}`),
  ]) {
    const s = emptyArmory();
    s.camoCompletions = values;
    assert.throws(() => validateArmory(s));
  }
  assert.throws(() => set(emptyArmory(), "not-real"), /Unknown/);
  assert.throws(() => set(emptyArmory(), "gold", 1), /Invalid/);
  const c = clone(catalog);
  c.weapons[0].goldRequired = 9;
  assert.throws(() => parseProgressCatalog(JSON.stringify(c)));
  assert.throws(() => parseProgressCatalog(" ".repeat(160 * 1024 + 1)), /byte/);
});
