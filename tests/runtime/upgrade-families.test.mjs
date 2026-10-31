import test from "node:test";
import assert from "node:assert/strict";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeFamilies } from "../../src/domain/upgrade-families.mjs";
import { upgradeNeeds } from "../../src/domain/upgrade-needs.mjs";
import { upgradeAdvice } from "../../src/domain/upgrade-advice.mjs";
function fixture() {
  const pack = upgradeFixture(),
    seed = pack.objectives[0];
  pack.objectives = [
    ["bank-iii", "Bank III", "III", 30],
    ["stash-ii", "Stash II", "II", 4],
    ["bank-i", "Bank I", "I", 5],
    ["bank-ii", "Bank II", "II", 10],
    ["stash-i", "Stash I", "I", 2],
  ].map(([id, name, tier, q]) => ({
    ...structuredClone(seed),
    id: "tier:" + id,
    name,
    requirements: [{ ...seed.requirements[0], quantity: q }],
    upgrade: { ...seed.upgrade, tierLabel: tier, observationKeys: [id] },
  }));
  return { pack, profile: newProfile(pack) };
}
const done = (profile, id) =>
  (profile.upgradeProgress["tier:" + id] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  });
test("families group alphabetically and select lowest incomplete despite source order/gaps/out-of-order completion", () => {
  const { pack, profile } = fixture();
  const before = JSON.stringify(pack);
  let groups = upgradeFamilies(pack, profile);
  assert.deepEqual(
    groups.families.map((g) => g.name),
    ["Bank", "Stash"],
  );
  assert.equal(groups.families[0].current.id, "tier:bank-i");
  done(profile, "bank-ii");
  assert.equal(
    upgradeFamilies(pack, profile).families[0].current.id,
    "tier:bank-i",
  );
  done(profile, "bank-i");
  assert.equal(
    upgradeFamilies(pack, profile).families[0].current.id,
    "tier:bank-iii",
  );
  done(profile, "bank-iii");
  groups = upgradeFamilies(pack, profile);
  assert.equal(groups.families[0].complete, true);
  assert.equal(groups.families[0].current.id, "tier:bank-iii");
  assert.equal(JSON.stringify(pack), before);
});
test("ambiguous duplicate ordinal/conflicting suffix and untiered names stay separate; hidden tiers absent", () => {
  const { pack, profile } = fixture();
  pack.objectives.push({
    ...structuredClone(pack.objectives[2]),
    id: "tier:alias",
  });
  let groups = upgradeFamilies(pack, profile);
  assert.equal(groups.families.filter((g) => g.ambiguous).length, 4);
  pack.objectives = pack.objectives.filter((r) => r.id !== "tier:alias");
  pack.objectives[2].upgrade.tierLabel = "IV";
  groups = upgradeFamilies(pack, profile);
  assert(groups.byRecord.get("tier:bank-i").ambiguous);
  pack.objectives[2].id = "tier:secret-hidden-entry";
  pack.objectives[2].name = "Secret tier I";
  pack.objectives[2].spoiler = true;
  groups = upgradeFamilies(pack, profile);
  assert(!groups.byRecord.has("tier:secret-hidden-entry"));
  assert.equal(
    groups.families.find((g) => g.name === "Bank").current.id,
    "tier:bank-ii",
  );
  const standalone = {
    ...structuredClone(pack.objectives[0]),
    id: "tier:plain",
    name: "Standalone",
    upgrade: {
      tierLabel: null,
      prerequisiteStatus: "unknown",
      observationKeys: ["plain"],
    },
  };
  pack.objectives.push(standalone);
  assert.equal(
    upgradeFamilies(pack, profile).byRecord.get(standalone.id).members.length,
    1,
  );
});
test("next/all quantities allocate common stock once; completion advances demand, future uses remain with no goals", () => {
  const { pack, profile } = fixture();
  const item = pack.items[0].id;
  profile.inventory[item] = 6;
  profile.reserves[item] = 1;
  let needs = upgradeNeeds(pack, profile);
  assert.equal(needs.next.rows.get(item).required, 7);
  assert.equal(needs.next.rows.get(item).search, 2);
  assert.equal(needs.all.rows.get(item).required, 51);
  assert.equal(needs.all.rows.get(item).search, 46);
  assert.equal(profile.goals.length, 0);
  done(profile, "bank-i");
  needs = upgradeNeeds(pack, profile);
  assert.equal(needs.next.rows.get(item).required, 12);
  assert.equal(needs.all.rows.get(item).required, 46);
  profile.inventory[item] = 100;
  needs = upgradeNeeds(pack, profile);
  assert.equal(needs.all.rows.get(item).search, 0);
  assert(needs.all.used.has(item));
  for (const r of pack.objectives)
    profile.upgradeProgress[r.id] = {
      completion: "completed",
      availability: "unknown",
      reviewRequired: false,
    };
  needs = upgradeNeeds(pack, profile);
  assert(!needs.all.used.has(item));
  assert(!needs.next.used.has(item));
});
test("retained floors shared by maximum, unknown quantities/stock and invalid binding stay unknown with membership", () => {
  const { pack, profile } = fixture();
  const item = pack.items[0].id;
  pack.objectives.forEach((r) => (r.requirements[0].consumption = "retained"));
  profile.inventory[item] = 0;
  let needs = upgradeNeeds(pack, profile);
  assert.equal(needs.next.rows.get(item).required, 5);
  assert.equal(needs.all.rows.get(item).required, 30);
  delete profile.inventory[item];
  needs = upgradeNeeds(pack, profile);
  assert.equal(needs.next.rows.get(item).search, null);
  assert.equal(needs.next.rows.get(item).required, 5);
  pack.objectives.find((r) => r.id === "tier:bank-i").requirements[0].quantity =
    null;
  needs = upgradeNeeds(pack, profile);
  assert.equal(needs.next.rows.get(item).required, null);
  profile.contentVersion = "mismatch";
  needs = upgradeNeeds(pack, profile);
  assert.equal(needs.next.status, "blocked");
  assert(needs.next.used.has(item));
  assert(needs.all.used.has(item));
});
test("selected root scope rejects bad identities and supports >100 readonly roots without profile mutation", () => {
  const { pack, profile } = fixture();
  const before = JSON.stringify(profile);
  for (const rootIds of [
    ["missing"],
    ["tier:bank-i", "tier:bank-i"],
    Array(20001).fill("tier:bank-i"),
  ])
    assert.equal(
      upgradeAdvice(pack, profile, { scope: "selected-upgrades", rootIds })
        .status,
      "blocked",
    );
  pack.objectives[0].spoiler = true;
  assert.equal(
    upgradeAdvice(pack, profile, {
      scope: "selected-upgrades",
      rootIds: [pack.objectives[0].id],
    }).status,
    "blocked",
  );
  const seed = pack.objectives[2];
  pack.objectives = Array.from({ length: 121 }, (_, i) => ({
    ...structuredClone(seed),
    id: "tier:family-" + i,
    name: "Family " + i + " I",
    upgrade: { ...seed.upgrade, observationKeys: ["family-" + i] },
  }));
  profile.inventory[pack.items[0].id] = 0;
  const snapshot = JSON.stringify(profile);
  const needs = upgradeNeeds(pack, profile);
  assert.equal(needs.groups.nextIds.length, 121);
  assert.equal(needs.next.status, "ok");
  assert.equal(needs.next.rows.get(pack.items[0].id).required, 605);
  assert.equal(JSON.stringify(profile), snapshot);
  assert.equal(JSON.parse(before).goals.length, 0);
});
test("explicit prerequisites counted once and observation aliases never duplicate costs", () => {
  const { pack, profile } = fixture();
  const item = pack.items[0].id;
  profile.inventory[item] = 0;
  pack.objectives.find((r) => r.id === "tier:stash-i").prerequisites = [
    "tier:bank-i",
  ];
  let needs = upgradeNeeds(pack, profile);
  assert.equal(needs.next.rows.get(item).required, 7);
  const alias = structuredClone(
    pack.objectives.find((r) => r.id === "tier:bank-i"),
  );
  alias.id = "tier:copy";
  pack.objectives.push(alias);
  needs = upgradeNeeds(pack, profile);
  assert.equal(needs.all.rows.get(item).required, 51);
});

test("completed observation alias removes every equivalent identity from next/full needs without changing manual reports", () => {
  const { pack, profile } = fixture(),
    original = pack.objectives.find((r) => r.id === "tier:bank-i"),
    alias = structuredClone(original);
  alias.id = "tier:bank-copy";
  pack.objectives.push(alias);
  done(profile, "bank-i");
  const needs = upgradeNeeds(pack, profile);
  assert(needs.groups.records.get(alias.id).completed);
  assert(!needs.groups.records.get(alias.id).ownCompleted);
  assert(!needs.groups.nextIds.includes(alias.id));
  assert.equal(profile.upgradeProgress[alias.id], undefined);
  assert.equal(needs.all.rows.get(pack.items[0].id).required, 46);
});

test("strict next/full views omit protected names/IDs and metadata, even without a spoiler flag on the upgrade", () => {
  const { pack, profile } = fixture();
  const item = pack.items[0].id;
  profile.inventory[item] = 0;
  pack.objectives = pack.objectives.filter((r) => r.id === "tier:bank-i");
  const secret = {
    ...structuredClone(pack.items[1]),
    id: "secret:hidden-item",
    name: "Hidden keyword",
    spoiler: true,
  };
  pack.items.push(secret);
  pack.objectives[0].name = "Hidden keyword I";
  done(profile, "bank-i");
  const advice = upgradeAdvice(pack, profile, { includeIdentityState: true });
  assert.deepEqual(advice.completedUpgradeIds, []);
  const needs = upgradeNeeds(pack, profile);
  assert.equal(needs.groups.families.length, 0);
  assert(!needs.all.used.has(item));
  assert(!needs.next.used.has(item));
});

test("5000 independent families calculate selected demand without relaxing persisted100-goal cap", () => {
  const { pack, profile } = fixture(),
    seed = pack.objectives[2];
  pack.objectives = Array.from({ length: 5000 }, (_, i) => ({
    ...structuredClone(seed),
    id: `scale:family-${i}`,
    name: `Family ${i} I`,
    upgrade: { ...seed.upgrade, observationKeys: [`scale-${i}`] },
  }));
  profile.inventory[pack.items[0].id] = 0;
  const needs = upgradeNeeds(pack, profile);
  assert.equal(needs.groups.families.length, 5000);
  assert.equal(needs.next.status, "ok");
  assert.equal(needs.next.rows.get(pack.items[0].id).required, 25000);
  assert.equal(profile.goals.length, 0);
});
