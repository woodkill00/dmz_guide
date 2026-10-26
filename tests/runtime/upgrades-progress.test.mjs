import test from "node:test";
import assert from "node:assert/strict";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import {
  setUpgradeProgress,
  upgradeProgressFor,
  isPrerequisiteSatisfied,
} from "../../src/domain/upgrade-progress.mjs";
import { resetProgress } from "../../src/domain/progression.mjs";
import { planSingle } from "../../src/domain/planner.mjs";
import { planShared } from "../../src/domain/shared-plan.mjs";
test("availability is not completion; repeat/undo/reset never spend or refund", () => {
  const pack = upgradeFixture(),
    p = newProfile(pack);
  p.inventory[pack.items[0].id] = 6;
  p.reserves[pack.items[0].id] = 2;
  p.goals = [{ id: "test:first", quantity: 1 }];
  const initial = structuredClone(p),
    available = setUpgradeProgress(pack, p, "test:first", {
      availability: "available",
    });
  assert.equal(isPrerequisiteSatisfied(pack, available, "test:first"), false);
  assert.equal(planSingle(pack, available).completed, false);
  assert.equal(planShared(pack, available).ledger[0].demand, 5);
  const complete = setUpgradeProgress(pack, available, "test:first", {
    completion: "completed",
  });
  assert.deepEqual(
    setUpgradeProgress(pack, complete, "test:first", {
      completion: "completed",
    }),
    complete,
  );
  assert.equal(planSingle(pack, complete).completed, true);
  for (const q of [available, complete, resetProgress(complete)])
    for (const field of [
      "inventory",
      "reserves",
      "goals",
      "routes",
      "watchPins",
    ])
      assert.deepEqual(q[field], p[field]);
  assert.equal(
    upgradeProgressFor(pack, complete, "test:second").completion,
    "unknown",
  );
  assert.deepEqual(p, initial);
  assert.throws(() =>
    setUpgradeProgress(pack, p, "test:first", { completion: "completed" }, 99),
  );
});
test("v2 unknown mechanics fail closed in both legacy arithmetic entrypoints", () => {
  const pack = upgradeFixture(),
    p = newProfile(pack);
  p.goals = [{ id: "test:first", quantity: 1 }];
  pack.objectives[0].requirements[0].consumption = "unknown";
  assert.throws(() => planSingle(pack, p), /unknown/);
  assert.throws(() => planShared(pack, p), /unknown/);
});
test("legacy non-upgrade unlocked semantics remain distinct for single roots and shared roots", () => {
  const pack = upgradeFixture(),
    p = newProfile(pack);
  pack.objectives[0].track = "dmz-order";
  p.inventory[pack.items[0].id] = 4;
  p.completion["test:first"] = "unlocked";
  p.goals = [{ id: "test:first", quantity: 1 }];
  assert.equal(planSingle(pack, p).completed, false);
  assert.equal(planSingle(pack, p).ledger[0].demand, 5);
  assert.equal(planSingle(pack, p).ledger[0].retained, 0);
  assert.equal(planShared(pack, p).ledger.length, 0);
  assert.equal(isPrerequisiteSatisfied(pack, p, "test:first"), true);
});
test("known costs do not imply readiness with locked availability, unknown prerequisites or live build", () => {
  for (const change of [
    (p, v) => (v.upgradeProgress["test:first"].availability = "locked"),
    (p) => (p.objectives[0].upgrade.prerequisiteStatus = "unknown"),
    (p) => {
      p.objectives[0].status = "observed";
      p.sources[0].provenance.buildStatus = "unknown";
    },
  ]) {
    const pack = upgradeFixture(),
      profile = newProfile(pack);
    profile.inventory[pack.items[0].id] = 100;
    profile.goals = [{ id: "test:first", quantity: 1 }];
    profile.upgradeProgress["test:first"] = {
      completion: "incomplete",
      availability: "available",
      reviewRequired: false,
    };
    change(pack, profile);
    const one = planSingle(pack, profile),
      shared = planShared(pack, profile);
    assert.equal(one.ledger[0].demand, 5);
    assert.equal(one.executable, false);
    assert.equal(shared.schedule[0].executable, false);
    assert.equal(shared.ledger[0].demand, 5);
  }
});
test("unrelated unknown requirement never blocks selected known costs", () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack);
  profile.inventory[pack.items[0].id] = 0;
  pack.objectives[1].requirements[0].consumption = "unknown";
  profile.goals = [{ id: "test:first", quantity: 1 }];
  assert.equal(planSingle(pack, profile).ledger[0].demand, 5);
  assert.equal(planShared(pack, profile).ledger[0].demand, 5);
});
test("legacy v1 upgrade unlocked remains review-required, unfinished and never ready", () => {
  const pack = upgradeFixture();
  pack.schemaVersion = 1;
  for (const r of pack.objectives) {
    for (const c of r.requirements) c.consumed = true;
  }
  const profile = newProfile(pack);
  profile.completion["test:first"] = "unlocked";
  profile.inventory[pack.items[0].id] = 100;
  profile.goals = [{ id: "test:first", quantity: 1 }];
  assert.equal(
    upgradeProgressFor(pack, profile, "test:first").reviewRequired,
    true,
  );
  assert.equal(planSingle(pack, profile).executable, false);
  assert.equal(planShared(pack, profile).schedule[0].executable, false);
  assert.equal(planShared(pack, profile).ledger[0].demand, 5);
});
test("v2 focused costs distinguish absent stock from explicit zero and exclude completed costs", () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack);
  profile.goals = [{ id: "test:first", quantity: 1 }];
  for (const plan of [planSingle, planShared])
    assert.throws(() => plan(pack, profile), /inventory not entered/);
  profile.inventory[pack.items[0].id] = 0;
  assert.equal(planSingle(pack, profile).ledger[0].missing, 5);
  assert.equal(planShared(pack, profile).ledger[0].missing, 5);
  delete profile.inventory[pack.items[0].id];
  profile.upgradeProgress["test:first"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  assert.equal(planSingle(pack, profile).ledger.length, 0);
  assert.equal(planShared(pack, profile).ledger.length, 0);
});
test("v2 chosen-route inputs including intermediates need entered stock, but additional root output does not", () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack),
    rootItem = structuredClone(pack.items[0]);
  rootItem.id = "test:output";
  pack.items.push(rootItem);
  const recipe = {
    id: "test:route",
    name: "Synthetic route",
    status: "fictional",
    sourceIds: [pack.sources[0].id],
    ingredientsKnown: true,
    eligibility: "stash",
    prerequisites: [],
    output: { itemId: rootItem.id, quantity: 1 },
    inputs: structuredClone(pack.objectives[0].requirements),
  };
  pack.recipes = [recipe];
  profile.goals = [{ id: recipe.id, quantity: 1 }];
  profile.inventory[pack.items[0].id] = 0;
  assert.equal(planSingle(pack, profile).ledger[0].missing, 5);
  assert.equal(
    planShared(pack, profile).ledger.find((r) => r.id === pack.items[0].id)
      .missing,
    5,
  );
  profile.goals = [{ id: "test:first", quantity: 1 }];
  pack.objectives[0].requirements[0].itemId = rootItem.id;
  profile.routes[rootItem.id] = recipe.id;
  assert.throws(() => planShared(pack, profile), /inventory not entered/);
  profile.inventory[rootItem.id] = 0;
  assert.equal(
    planShared(pack, profile).ledger.find((r) => r.id === pack.items[0].id)
      .missing,
    25,
  );
});
