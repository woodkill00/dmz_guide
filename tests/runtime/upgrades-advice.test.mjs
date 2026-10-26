import test from "node:test";
import assert from "node:assert/strict";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeAdvice } from "../../src/domain/upgrade-advice.mjs";
const run = (change = () => {}) => {
  const pack = upgradeFixture(),
    profile = newProfile(pack);
  profile.inventory[pack.items[0].id] = 6;
  change(pack, profile);
  const original = JSON.stringify([pack, profile]),
    result = upgradeAdvice(pack, profile);
  assert.equal(JSON.stringify([pack, profile]), original);
  return { pack, profile, result, row: result.rows[0] };
};
test("A01–06 shared stock, focus, complete/undo and reserve target invariant", () => {
  for (const [held, reserve, G, K, U, Q, S] of [
    [6, 0, 15, 6, 9, 0, 9],
    [18, 5, 15, 13, 2, 0, 2],
    [6, 9, 15, 0, 15, 3, 18],
  ]) {
    const { pack, profile, row } = run((p, v) => {
      v.inventory[p.items[0].id] = held;
      v.reserves[p.items[0].id] = reserve;
    });
    assert.deepEqual(
      [row.required, row.keep, row.upgradeGap, row.reserveGap, row.search],
      [G, K, U, Q, S],
    );
    profile.inventory[pack.items[0].id] += S;
    assert.equal(upgradeAdvice(pack, profile).rows[0].search, 0);
  }
  const { pack, profile } = run();
  profile.goals = [{ id: "test:first", quantity: 1 }];
  const focused = upgradeAdvice(pack, profile, { scope: "focused" }).rows[0];
  assert.deepEqual([focused.required, focused.keep, focused.search], [5, 5, 0]);
  profile.upgradeProgress["test:first"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  assert.equal(upgradeAdvice(pack, profile).rows[0].search, 4);
  delete profile.upgradeProgress["test:first"];
  assert.equal(upgradeAdvice(pack, profile).rows[0].search, 9);
});
test("A07–10 retained floor, shared prerequisite, missing vs zero and unknown row", () => {
  const x = run((p) => {
    p.objectives[0].requirements[0].quantity = 8;
    p.objectives[1].requirements[0].quantity = 5;
    p.objectives[1].requirements[0].consumption = "retained";
  });
  assert.equal(x.row.required, 13);
  assert.equal(x.row.search, 7);
  const shared = run((p) => {
    const pre = structuredClone(p.objectives[0]);
    pre.id = "test:prerequisite";
    pre.upgrade.observationKeys = ["prerequisite"];
    pre.requirements[0].quantity = 4;
    p.objectives.forEach((o) => (o.prerequisites = [pre.id]));
    p.objectives.push(pre);
  });
  assert.equal(shared.row.required, 19);
  assert.equal(
    run((p, v) => delete v.inventory[p.items[0].id]).row.search,
    null,
  );
  assert.equal(run((p, v) => (v.inventory[p.items[0].id] = 0)).row.search, 15);
  for (const value of [null, "unknown", "disputed"])
    assert.equal(
      run((p) => {
        const r = p.objectives[0].requirements[0];
        if (value === null) r.quantity = null;
        else if (value === "unknown") r.consumption = value;
        else r.status = value;
      }).row.search,
      null,
    );
});
test("A11–14 available incomplete, no inferred tier, pins and repeated/conflicting observation", () => {
  assert.equal(
    run(
      (p, v) =>
        (v.upgradeProgress["test:first"] = {
          completion: "unknown",
          availability: "available",
          reviewRequired: false,
        }),
    ).row.required,
    15,
  );
  const noNeed = run((p, v) => {
    for (const o of p.objectives)
      v.upgradeProgress[o.id] = {
        completion: "completed",
        availability: "unknown",
        reviewRequired: false,
      };
    v.watchPins = [p.items[0].id];
    v.reserves[p.items[0].id] = 9;
  });
  assert.equal(noNeed.row.required, 0);
  assert.equal(noNeed.row.search, 3);
  assert(noNeed.row.watchPinned);
  const duplicate = run((p) => {
    const d = structuredClone(p.objectives[0]);
    d.id = "test:duplicate";
    p.objectives.push(d);
  });
  assert.equal(duplicate.row.required, 15);
  assert.equal(
    run((p) => {
      const d = structuredClone(p.objectives[0]);
      d.id = "test:conflict";
      d.requirements[0].quantity = 50;
      p.objectives.push(d);
    }).row.search,
    null,
  );
});
test("A15–20 >100 roots, cycle/work refusal, hidden use, fully stocked, direct only, partial evidence", () => {
  const many = run(
    (p) =>
      (p.objectives = Array.from({ length: 101 }, (_, i) => ({
        ...structuredClone(p.objectives[0]),
        id: `test:n-${i}`,
        name: `Synthetic ${i}`,
        upgrade: {
          tierLabel: null,
          prerequisiteStatus: "known",
          observationKeys: [`n-${i}`],
        },
      }))),
  );
  assert.equal(many.row.required, 505);
  assert.equal(many.profile.goals.length, 0);
  const cycle = run((p) => {
    p.objectives[0].prerequisites = ["test:second"];
    p.objectives[1].prerequisites = ["test:first"];
  });
  assert.equal(cycle.result.status, "blocked");
  assert.deepEqual(cycle.result.rows, []);
  assert.equal(
    upgradeAdvice(many.pack, many.profile, { workLimit: 1 }).status,
    "blocked",
  );
  const hidden = run((p) => {
    p.objectives[1].spoiler = true;
    p.objectives[1].requirements[0].itemId = p.items[1].id;
  });
  assert.equal(hidden.result.rows.length, 1);
  assert(!JSON.stringify(hidden.result).includes("test:second"));
  assert.equal(run((p, v) => (v.inventory[p.items[0].id] = 100)).row.search, 0);
  const partial = run((p) => {
    p.sources[0].provenance.buildStatus = "unknown";
    p.objectives[0].upgrade.prerequisiteStatus = "unknown";
  });
  assert.equal(partial.row.search, 9);
  assert.equal(partial.result.completeness, "partial");
  assert.equal(partial.row.horizon, "later");
});
test("direct-only A19 ignores chosen crafting route and unknown gates affect only their own items", () => {
  const { pack, profile } = run((p) => {
    p.objectives = p.objectives.slice(0, 1);
    p.objectives[0].requirements[0].quantity = 2;
  });
  profile.inventory[pack.items[0].id] = 1;
  profile.inventory[pack.items[1].id] = 0;
  pack.recipes = [
    {
      id: "test:craft",
      name: "Synthetic craft",
      output: { itemId: pack.items[0].id, quantity: 1 },
      inputs: [
        {
          itemId: pack.items[1].id,
          quantity: 3,
          consumption: "consumed",
          status: "fictional",
          sourceIds: [],
        },
      ],
      prerequisites: [],
    },
  ];
  profile.routes[pack.items[0].id] = "test:craft";
  const result = upgradeAdvice(pack, profile);
  assert.equal(result.rows.length, 1);
  assert.deepEqual([result.rows[0].keep, result.rows[0].search], [1, 1]);
  pack.objectives[0].requirements.push({
    itemId: pack.items[1].id,
    quantity: 5,
    consumption: "unknown",
    status: "fictional",
    sourceIds: [],
  });
  const mixed = upgradeAdvice(pack, profile);
  assert.equal(mixed.rows.find((r) => r.id === pack.items[0].id).search, 1);
  assert.equal(mixed.rows.find((r) => r.id === pack.items[1].id).search, null);
});
test("scope, unsafe quantities and >goal limits fail without partial exact output", () => {
  for (const modify of [
    (p, v) => (v.contentVersion = "wrong"),
    (p) =>
      (p.objectives[0].scope = {
        gameId: "different",
        mode: "dmz",
        build: "other",
      }),
    (p) => (p.objectives[0].requirements[0].quantity = 1000000000001),
  ]) {
    const { result } = run(modify);
    assert.equal(result.status, "blocked");
    assert.deepEqual(result.rows, []);
  }
});
test("transitive observation aliases count once in every order and completion cannot revive via an alias", () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack);
  profile.inventory[pack.items[0].id] = 0;
  const template = pack.objectives[0];
  pack.objectives = [
    ["a", ["one"]],
    ["b", ["two"]],
    ["c", ["one", "two"]],
  ].map(([id, keys]) => ({
    ...structuredClone(template),
    id: `test:${id}`,
    upgrade: { ...template.upgrade, observationKeys: keys },
  }));
  for (const rows of [
    pack.objectives,
    [...pack.objectives].reverse(),
    [pack.objectives[1], pack.objectives[0], pack.objectives[2]],
  ]) {
    const p = { ...pack, objectives: rows };
    assert.equal(upgradeAdvice(p, profile).rows[0].required, 5);
  }
  profile.upgradeProgress["test:a"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  assert.equal(upgradeAdvice(pack, profile).rows.length, 0);
  profile.goals = [{ id: "test:retired", quantity: 1 }];
  assert.equal(
    upgradeAdvice(pack, profile, { scope: "focused" }).status,
    "blocked",
  );
});
test("observation aliases never merge completion across record build scopes", () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack),
    first = pack.objectives[0];
  const alternate = structuredClone(first),
    item = structuredClone(pack.items[0]);
  alternate.id = "test:other-build";
  item.id = "test:other-build-item";
  alternate.scope = item.scope = {
    gameId: pack.game.id,
    mode: pack.game.mode,
    build: "other-synthetic-build",
  };
  alternate.requirements[0].itemId = item.id;
  pack.items.push(item);
  pack.objectives.push(alternate);
  profile.goals = [{ id: first.id, quantity: 1 }];
  profile.inventory[pack.items[0].id] = 0;
  profile.upgradeProgress[alternate.id] = {
    completion: "completed",
    availability: "available",
    reviewRequired: false,
  };
  assert.equal(
    upgradeAdvice(pack, profile, { scope: "focused" }).rows[0].required,
    5,
  );
});
test("aliases preserve disputed status/claims and partial readiness independently of order", () => {
  for (const kind of ["status", "claim", "prerequisite", "build", "review"]) {
    const pack = upgradeFixture(),
      profile = newProfile(pack),
      first = pack.objectives[0];
    const alias = structuredClone(first);
    alias.id = "test:alias";
    pack.objectives = [first, alias];
    profile.inventory[pack.items[0].id] = 100;
    for (const r of pack.objectives)
      profile.upgradeProgress[r.id] = {
        completion: "incomplete",
        availability: "available",
        reviewRequired: false,
      };
    if (kind === "status") alias.status = "disputed";
    if (kind === "claim")
      pack.claims = [
        { id: "test:dispute", entityId: alias.id, status: "disputed" },
      ];
    if (kind === "prerequisite") alias.upgrade.prerequisiteStatus = "unknown";
    if (kind === "build") alias.status = "observed";
    if (kind === "review")
      profile.upgradeProgress[alias.id].reviewRequired = true;
    for (const order of [pack.objectives, [...pack.objectives].reverse()]) {
      const result = upgradeAdvice({ ...pack, objectives: order }, profile),
        row = result.rows[0];
      if (["status", "claim"].includes(kind)) assert.equal(row.search, null);
      else {
        assert.equal(row.required, 5);
        assert.equal(row.search, 0);
      }
      assert.equal(row.horizon, "later");
      if (["prerequisite", "build"].includes(kind))
        assert.equal(result.completeness, "partial");
    }
  }
});
test("unselected or completed alias conflicts do not contaminate independent focused costs", () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack),
    alias = structuredClone(pack.objectives[1]);
  alias.id = "test:second-conflict";
  alias.requirements[0].quantity = 50;
  pack.objectives.push(alias);
  profile.inventory[pack.items[0].id] = 0;
  profile.goals = [{ id: "test:first", quantity: 1 }];
  assert.equal(
    upgradeAdvice(pack, profile, { scope: "focused" }).rows[0].search,
    5,
  );
  profile.upgradeProgress["test:second"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  assert.equal(upgradeAdvice(pack, profile).rows[0].search, 5);
});
test("selected conflicting aliases with different materials gate every possible affected item", () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack),
    alias = structuredClone(pack.objectives[0]);
  alias.id = "test:alternate-material";
  alias.requirements[0].itemId = pack.items[1].id;
  pack.objectives.push(alias);
  for (const item of pack.items) profile.inventory[item.id] = 0;
  profile.goals = [{ id: "test:first", quantity: 1 }];
  const result = upgradeAdvice(pack, profile, { scope: "focused" });
  assert.equal(result.rows.length, 2);
  for (const row of result.rows) assert.equal(row.search, null);
});
