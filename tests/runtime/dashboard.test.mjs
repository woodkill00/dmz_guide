import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import {
  setBuildTarget,
  buildTargetNeeds,
} from "../../src/domain/build-targets.mjs";
import { quickCollect } from "../../src/domain/quick-collect.mjs";
import {
  projectDashboard,
  buildWindow,
  dashboardPreferences,
  weaponDashboard,
} from "../../src/domain/dashboard.mjs";
import {
  createFoundOperation,
  commitFoundOperation,
  verifyFoundOperation,
} from "../../src/client/collection-action.mjs";
import { journalInventory } from "../../src/domain/field-ops-state.mjs";
const pack = loadFixturePack("official-starter");
test("087 collection projection equals tracker calculations without mutating profile", () => {
  const profile = setBuildTarget(pack, newProfile(pack), "mw4:bandage", 2);
  profile.inventory["mw4:bandage"] = 5;
  profile.inventory["mw4:synthetics"] = 5;
  profile.reserves["mw4:synthetics"] = 2;
  const before = structuredClone(profile);
  const model = projectDashboard(pack, profile);
  assert.deepEqual(model.builds, buildTargetNeeds(pack, profile));
  assert.deepEqual(
    model.needed.items,
    quickCollect(pack, profile).items.filter((r) => r.remaining !== 0),
  );
  assert.equal(
    model.builds.groups[0].direct.find((r) => r.id === "mw4:synthetics")
      .remaining,
    27,
  );
  assert.deepEqual(profile, before);
  assert.deepEqual(
    projectDashboard(pack, profile, { crafting: true }).needed.items,
    quickCollect(pack, profile, { crafting: true }).items.filter(
      (r) => r.remaining !== 0,
    ),
  );
});
test("087 absent/stale state and spoiler boundaries are honest", () => {
  assert.equal(projectDashboard(pack, null).status, "absent");
  assert.equal(
    projectDashboard(pack, { ...newProfile(pack), contentVersion: "older" })
      .status,
    "stale",
  );
  const p = newProfile(pack),
    m = projectDashboard(pack, p);
  assert.equal(m.orders.filter((r) => r.set === "hajin").length, 24);
  assert.equal(m.orders.filter((r) => r.set === "x01").length, 5);
  const secretIds = pack.objectives.filter((r) => r.spoiler).map((r) => r.id);
  assert(
    !m.orders.flatMap((r) => r.rows).some((r) => secretIds.includes(r.id)),
  );
});
test("087 build windows cap aggregate tiles and replace pages for 100 targets", () => {
  const groups = Array.from({ length: 100 }, (_, g) => ({
    id: "target-" + g,
    name: "Target",
    direct: Array.from({ length: 20 }, (_, i) => ({ id: "item-" + i })),
  }));
  const raw = { groups, combined: groups[0].direct };
  for (const expanded of [false, true])
    for (let page = 0; page < 30; page++) {
      const w = buildWindow(raw, { expanded, page });
      assert(w.groups.length <= (expanded ? 5 : 3));
      assert(
        w.groups.reduce((n, g) => n + g.tiles.length, 0) <=
          (expanded ? 50 : 12),
      );
    }
  assert.notEqual(
    buildWindow(raw, { expanded: true, page: 0 }).groups[0].id,
    buildWindow(raw, { expanded: true, page: 1 }).groups[0].id,
  );
});
test("087 layout validation excludes private data and duplicate sections", () => {
  const defaults = dashboardPreferences(null);
  assert.deepEqual(
    dashboardPreferences({ ...defaults, inventory: { secret: 1 } }),
    defaults,
  );
  assert.deepEqual(
    dashboardPreferences({ ...defaults, order: Array(6).fill("builds") }),
    defaults,
  );
});
test("087 blueprint ownership follows printing upgrades; weapon names do not invent missing totals", () => {
  const p = newProfile(pack);
  p.upgradeProgress["mw4:upgrade-uncommon-ingredient-printing"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  const m = projectDashboard(pack, p);
  assert(m.recipes.some((r) => r.owned && r.automatic));
  const rows = weaponDashboard(
    {
      m4: {
        manual: true,
        blueprints: ["Private custom name"],
        attachments: [],
      },
      retired: { manual: false, blueprints: [], attachments: [] },
    },
    [{ id: "m4", name: "M4" }],
  );
  assert.equal(rows[0].name, "M4");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].manualExtractions, null);
  assert.equal(rows[0].remaining, 3);
  assert.equal(rows[0].unrecorded, true);
  assert(!("blueprints" in rows[0]));
});

test("088 dashboard manual goals include unsaved weapons, preserve unknowns and exclude only completed goals", () => {
  const acquired = {
    one: {
      manual: false,
      manualExtractions: 1,
      blueprints: ["Private name"],
      attachments: [],
    },
    done: {
      manual: true,
      manualExtractions: 4,
      blueprints: [],
      attachments: [],
    },
    legacy: { manual: true, blueprints: [], attachments: [] },
    zero: {
      manual: true,
      manualExtractions: 0,
      blueprints: [],
      attachments: [],
    },
    unchecked: {
      manual: false,
      manualExtractions: 3,
      blueprints: [],
      attachments: [],
    },
    retired: {
      manual: false,
      manualExtractions: 0,
      blueprints: [],
      attachments: [],
    },
  };
  const original = JSON.stringify(acquired),
    weapons = ["one", "done", "legacy", "zero", "unchecked", "unsaved"].map(
      (id) => ({ id, name: id }),
    );
  const rows = weaponDashboard(acquired, weapons),
    byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(byId.one.remaining, 2);
  assert.equal(byId.done.remaining, 0);
  assert.equal(byId.done.outstanding, false);
  assert.equal(byId.legacy.unrecorded, true);
  assert.equal(byId.legacy.outstanding, true);
  assert.equal(byId.zero.remaining, 3);
  assert.equal(byId.zero.unrecorded, false);
  assert.equal(byId.unchecked.remaining, 0);
  assert.equal(byId.unchecked.outstanding, false);
  assert.equal(byId.unsaved.remaining, 3);
  assert.equal(byId.unsaved.unrecorded, true);
  assert(!byId.retired);
  assert.equal(JSON.stringify(acquired), original);
  assert.equal(weaponDashboard(undefined, weapons).length, 6);
  assert.deepEqual(weaponDashboard(acquired, []), []);
});
test("087 successful commit followed by failed verification never permits delta replay", async () => {
  const p = newProfile(pack),
    op = createFoundOperation(pack, p, "mw4:synthetics", "3");
  let count = 0,
    saved;
  const save = async (candidate, revision, meta) => {
    count++;
    saved = structuredClone(candidate);
    journalInventory(p, saved, meta);
    saved.revision = revision + 1;
    return saved;
  };
  await commitFoundOperation(op, { save });
  assert.equal(op.state, "committed-unverified");
  await assert.rejects(
    verifyFoundOperation(op, {
      read: async () => {
        throw Error("Timeout");
      },
    }),
  );
  await assert.rejects(commitFoundOperation(op, { save }));
  assert.equal(count, 1);
  await verifyFoundOperation(op, { read: async () => saved });
  assert.equal(op.state, "confirmed");
  assert.equal(saved.inventory["mw4:synthetics"], 3);
  assert.equal(p.fieldOps, undefined);
});
test("087 abort preserves draft and immutable stock candidate; invalid amounts rejected", async () => {
  const p = newProfile(pack),
    op = createFoundOperation(pack, p, "mw4:synthetics", "2");
  await assert.rejects(
    commitFoundOperation(op, {
      save: async () => {
        throw Error("Quota");
      },
    }),
  );
  assert.equal(op.state, "failed-before-commit");
  assert.equal(op.amount, 2);
  assert.equal(p.inventory["mw4:synthetics"], undefined);
  for (const raw of ["-1", "0", "1.5", "10000001"])
    assert.throws(() => createFoundOperation(pack, p, "mw4:synthetics", raw));
});
