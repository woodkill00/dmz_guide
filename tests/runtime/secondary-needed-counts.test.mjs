import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeNeeds } from "../../src/domain/upgrade-needs.mjs";
import {
  needsValues,
  upgradeNeedsDetail,
} from "../../src/client/upgrade-needs-view.mjs";
test("secondary reported costs agree with real catalog without changing strict totals", () => {
  const pack = loadFixturePack("official-starter"),
    p = newProfile(pack),
    id = "mw4:ingredient-control-unit";
  let n = upgradeNeeds(pack, p);
  assert.equal(n.all.rows.get(id).required, null);
  assert.equal(needsValues(n.all, id).required, "30");
  assert.equal(needsValues(n.all, id).missing, "Enter owned");
  p.inventory[id] = 7;
  p.reserves[id] = 2;
  n = upgradeNeeds(pack, p);
  assert.equal(needsValues(n.all, id).missing, "25");
  assert.match(upgradeNeedsDetail(pack, n, id), /Required 30; missing 25/);
  n.all.excludedNumericIds.add(n.all.rows.get(id).contributors[0].id);
  assert.equal(needsValues(n.all, id).required, "Unknown");
  n = upgradeNeeds(pack, { ...p, contentVersion: "old" });
  assert.equal(needsValues(n.all, id).required, "Unknown");
});
