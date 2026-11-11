import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { collectionFixture } from "../helpers/collection-needs.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeNeeds } from "../../src/domain/upgrade-needs.mjs";
import { collectionNeedsValues } from "../../src/client/upgrade-needs-view.mjs";
const real = loadFixturePack("official-starter");
test("actual resource recipes propagate listed costs while strict advice remains unknown", () => {
  const p = newProfile(real),
    before = structuredClone(p),
    n = upgradeNeeds(real, p);
  for (const [slug, expected] of Object.entries({
    synthetics: 7800,
    electronics: 9200,
    chemicals: 10700,
    metals: 10300,
  })) {
    const id = "mw4:" + slug,
      r = n.listedCollection.get(id);
    assert.equal(r.required, expected);
    assert.equal(r.missing, null);
    assert.equal(r.craftEstimate, true);
    assert.equal(r.estimated, true);
    assert.equal(
      collectionNeedsValues(n.listedCollection, id).missing,
      "Enter owned",
    );
    assert.equal(n.collection.get(id).required, null);
  }
  assert.deepEqual(p, before);
});
test("entered resources calculate shortages; held printed outputs reduce costs using actual yields", () => {
  const p = newProfile(real);
  for (const i of real.items) p.inventory[i.id] = 0;
  let n = upgradeNeeds(real, p);
  p.inventory["mw4:synthetics"] = 100;
  p.reserves["mw4:synthetics"] = 20;
  n = upgradeNeeds(real, p);
  assert.equal(n.listedCollection.get("mw4:synthetics").missing, 7720);
  const id = "mw4:ingredient-control-unit",
    recipe = real.recipes.find((r) => r.output.itemId === id),
    baseline = n;
  p.inventory[id] = 30;
  n = upgradeNeeds(real, p);
  for (const input of recipe.inputs) {
    assert.equal(
      n.listedCollection.get(input.itemId).required,
      baseline.listedCollection.get(input.itemId).required -
        input.quantity * 30,
    );
  }
  assert.equal(n.listedCollection.get(id).required, 30);
});
test("reported planning does not choose ambiguous alternatives or lift old binding blocks", () => {
  const pack = collectionFixture(),
    p = newProfile(pack);
  pack.recipes.push({
    ...structuredClone(pack.recipes[0]),
    id: "craft:other-output",
  });
  let n = upgradeNeeds(pack, p);
  assert.equal(n.listedCollection.get("craft:wire").required, null);
  p.routes["craft:output"] = "craft:output-recipe";
  n = upgradeNeeds(pack, p);
  assert.equal(n.listedCollection.get("craft:wire").required, 12);
  assert.equal(n.collection.get("craft:wire").required, null);
  p.contentVersion = "old";
  assert.equal(
    upgradeNeeds(pack, p).listedCollection.get("craft:wire").required,
    null,
  );
});
