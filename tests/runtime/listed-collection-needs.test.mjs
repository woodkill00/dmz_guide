import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { collectionFixture } from "../helpers/collection-needs.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeNeeds } from "../../src/domain/upgrade-needs.mjs";
import { upgradeBudget } from "../../src/domain/upgrade-budget.mjs";
for (const key of ["official-starter", "upgrade-observations"])
  test(
    "actual catalog reported quantities render without upgrading source evidence: " +
      key,
    () => {
      const pack = loadFixturePack(key),
        p = newProfile(pack);
      for (const i of pack.items) p.inventory[i.id] = 0;
      const before = structuredClone({ pack, p }),
        needs = upgradeNeeds(pack, p),
        budget = upgradeBudget(pack, p);
      let shown = 0;
      for (const r of budget.items) {
        if (r.required == null) continue;
        const row = needs.listedCollection.get(r.id);
        assert(row);
        assert.equal(row.required, r.required, r.name);
        assert.equal(row.missing, r.missing, r.name);
        shown++;
      }
      assert(shown > 15);
      assert.deepEqual({ pack, p }, before);
    },
  );
test("real starter Control Unit lists30, subtracts entered stock/reserves, and leaves strict eligibility unresolved", () => {
  const pack = loadFixturePack("official-starter"),
    p = newProfile(pack),
    id = "mw4:ingredient-control-unit";
  let n = upgradeNeeds(pack, p);
  assert.equal(n.listedCollection.get(id).required, 30);
  assert.equal(n.listedCollection.get(id).missing, null);
  p.inventory[id] = 7;
  p.reserves[id] = 2;
  n = upgradeNeeds(pack, p);
  assert.equal(n.listedCollection.get(id).missing, 25);
  assert.equal(n.collection.get(id).required, null);
  assert.equal(n.listedCollection.get(id).listed, true);
  p.inventory[id] = 32;
  assert.equal(upgradeNeeds(pack, p).listedCollection.get(id).state, "review");
  p.upgradeProgress["mw4:upgrade-vendor-item-upgrade-ii"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  assert.equal(upgradeNeeds(pack, p).listedCollection.get(id).required, 10);
  p.contentVersion = "old";
  assert.equal(upgradeNeeds(pack, p).listedCollection.get(id).required, null);
});
test("disputed/conflicting observations never become a numeric provisional fallback", () => {
  const pack = collectionFixture(),
    p = newProfile(pack);
  for (const i of pack.items) p.inventory[i.id] = 0;
  pack.objectives[0].status = "disputed";
  assert.equal(
    upgradeNeeds(pack, p).listedCollection.get("craft:output").required,
    null,
  );
  pack.objectives[0].status = "unverified";
  pack.objectives[0].requirements[0].status = "unverified";
  pack.objectives[0].requirements[0].consumption = "unknown";
  const alias = structuredClone(pack.objectives[0]);
  alias.id = "craft:alias";
  alias.requirements[0].quantity = 50;
  pack.objectives.push(alias);
  assert.equal(
    upgradeNeeds(pack, p).listedCollection.get("craft:output").required,
    null,
  );
});
