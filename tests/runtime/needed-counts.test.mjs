import test from "node:test";
import assert from "node:assert/strict";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import { collectionFixture } from "../helpers/collection-needs.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeBudget } from "../../src/domain/upgrade-budget.mjs";
import { upgradeNeeds } from "../../src/domain/upgrade-needs.mjs";
import { collectionBudget } from "../../src/domain/collection-budget.mjs";
import { collectionNeedsValues } from "../../src/client/upgrade-needs-view.mjs";
test("upgrade-only direct shortages agree between all three views across stock/reserve boundaries", () => {
  const pack = upgradeFixture(),
    p = newProfile(pack),
    id = pack.items[0].id;
  for (const held of [0, 2, 6, 15, 18, 25])
    for (const reserve of [0, 3, 9, 20]) {
      p.inventory[id] = held;
      p.reserves[id] = reserve;
      const expected = Math.max(0, 15 + reserve - held),
        a = upgradeBudget(pack, p).items.find((r) => r.id === id),
        needs = upgradeNeeds(pack, p);
      assert.equal(a.missing, expected);
      assert.equal(needs.all.rows.get(id).search, expected);
      assert.equal(needs.collection.get(id).missing, expected);
      assert.equal(
        collectionBudget(pack, p).items.find((r) => r.id === id).missing,
        expected,
      );
    }
});
test("combined missions/upgrades share outputs, batch yields, intermediate stock and reusable tools", () => {
  const pack = collectionFixture(),
    p = newProfile(pack);
  for (const i of pack.items) p.inventory[i.id] = 0;
  const mission = {
    ...structuredClone(pack.objectives[0]),
    id: "craft:mission",
    name: "Fictional mission",
    track: "dmz-story",
  };
  delete mission.upgrade;
  pack.objectives.push(mission);
  const get = () =>
    new Map(collectionBudget(pack, p).items.map((r) => [r.id, r]));
  let rows = get();
  assert.equal(rows.get("craft:output").required, 6);
  assert.equal(rows.get("craft:part").required, 6);
  assert.equal(rows.get("craft:wire").required, 18);
  assert.equal(rows.get("craft:tool").required, 1);
  p.inventory["craft:output"] = 2;
  p.reserves["craft:output"] = 1;
  p.inventory["craft:part"] = 1;
  rows = get();
  assert.equal(rows.get("craft:output").missing, 5);
  assert.equal(rows.get("craft:part").missing, 5);
  assert.equal(rows.get("craft:wire").required, 15);
  p.completion[mission.id] = "completed";
  rows = get();
  assert.equal(rows.get("craft:output").required, 3);
  assert.equal(rows.get("craft:wire").required, 3);
  p.upgradeProgress["craft:upgrade"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  assert.equal(get().size, 0);
  p.completion[mission.id] = "incomplete";
  assert(get().has("craft:output"));
});
test("unknown inventory and unsafe objective costs never appear covered", () => {
  const pack = collectionFixture(),
    p = newProfile(pack);
  for (const i of pack.items) p.inventory[i.id] = 0;
  delete p.inventory["craft:output"];
  let needs = upgradeNeeds(pack, p);
  assert.equal(
    collectionNeedsValues(needs.collection, "craft:output").missing,
    "Unknown",
  );
  assert.equal(needs.collection.get("craft:wire").state, "review");
  p.inventory["craft:output"] = 0;
  assert.equal(upgradeNeeds(pack, p).collection.get("craft:wire").missing, 12);
  p.contentVersion = "old";
  assert.equal(collectionBudget(pack, p).status, "blocked");
  assert.equal(
    upgradeNeeds(pack, p).collection.get("craft:output").state,
    "review",
  );
});
test("uncertain objective marks budget item provisional even when listed stock is enough", () => {
  const pack = upgradeFixture(),
    p = newProfile(pack);
  p.inventory[pack.items[0].id] = 100;
  pack.objectives[0].status = "unknown";
  const row = upgradeBudget(pack, p).items[0];
  assert.equal(row.partial, true);
});
test("combined collection adapter and formatting are read-only", () => {
  const pack = collectionFixture(),
    p = newProfile(pack);
  for (const i of pack.items) p.inventory[i.id] = 0;
  const before = structuredClone({ pack, p }),
    needs = upgradeNeeds(pack, p),
    view = collectionBudget(pack, p);
  assert.equal(view.items.find((r) => r.id === "craft:wire").missing, 12);
  assert.equal(
    collectionNeedsValues(needs.collection, "craft:wire").state,
    "short",
  );
  p.inventory["craft:wire"] = 12;
  assert.equal(
    collectionNeedsValues(upgradeNeeds(pack, p).collection, "craft:wire").state,
    "covered",
  );
  delete p.inventory["craft:wire"];
  p.inventory["craft:wire"] = 0;
  assert.deepEqual({ pack, p }, before);
});

test("partial recipe demand keeps a qualified known minimum visible; blocked projections do not", () => {
  const pack = collectionFixture(),
    p = newProfile(pack);
  for (const i of pack.items) p.inventory[i.id] = 0;
  delete p.inventory["craft:output"];
  pack.objectives[0].requirements.push({
    ...pack.objectives[0].requirements[0],
    itemId: "craft:wire",
    quantity: 5,
  });
  let projection = upgradeNeeds(pack, p),
    values = collectionNeedsValues(projection.collection, "craft:wire");
  assert.equal(values.required, "At least 5");
  assert.equal(values.missing, "At least 5");
  assert.equal(
    collectionBudget(pack, p).items.find((r) => r.id === "craft:wire")
      .knownRequired,
    5,
  );
  p.contentVersion = "old";
  values = collectionNeedsValues(
    upgradeNeeds(pack, p).collection,
    "craft:wire",
  );
  assert.equal(values.required, "Unknown");
  assert.equal(values.missing, "Unknown");
});

test("completed item uses show explicit zero instead of dashes, without reviving costs", () => {
  const pack = collectionFixture(),
    p = newProfile(pack);
  p.upgradeProgress["craft:upgrade"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  const needs = upgradeNeeds(pack, p),
    uses = {
      upgrades: [{ id: "craft:upgrade", completed: true }],
      missions: [],
    };
  const values = collectionNeedsValues(
    needs.listedCollection,
    "craft:output",
    uses,
  );
  assert.equal(values.required, "0");
  assert.equal(values.missing, "0");
  assert.equal(values.emptyReason, "completed");
  assert.equal(values.state, "covered");
  p.upgradeProgress["craft:upgrade"].completion = "incomplete";
  assert.equal(
    collectionNeedsValues(
      upgradeNeeds(pack, p).listedCollection,
      "craft:output",
      { upgrades: [{ completed: false }], missions: [] },
    ).required,
    "3",
  );
  p.contentVersion = "old";
  assert.equal(
    collectionNeedsValues(
      upgradeNeeds(pack, p).listedCollection,
      "craft:unrelated",
    ).required,
    "Review",
  );
});
