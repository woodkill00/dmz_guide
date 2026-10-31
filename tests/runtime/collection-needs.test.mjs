import test from "node:test";
import assert from "node:assert/strict";
import { collectionFixture } from "../helpers/collection-needs.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { upgradeNeeds } from "../../src/domain/upgrade-needs.mjs";
const setup = () => {
  const pack = collectionFixture(),
    profile = newProfile(pack);
  for (const i of pack.items) profile.inventory[i.id] = 0;
  return { pack, profile };
};
const row = (pack, profile, id) =>
  upgradeNeeds(pack, profile).collection.get(`craft:${id}`);
test("unfinished upgrade recipe chains, yields, reserves and output stock are counted without profile mutation", () => {
  const { pack, profile } = setup(),
    before = structuredClone(profile);
  assert.equal(row(pack, profile, "part").required, 4);
  assert.equal(row(pack, profile, "wire").required, 12);
  assert.equal(row(pack, profile, "tool").required, 1);
  assert.equal(row(pack, profile, "wire").state, "short");
  assert.deepEqual(profile, before);
  profile.inventory["craft:wire"] = 12;
  assert.equal(row(pack, profile, "wire").state, "covered");
  profile.reserves["craft:wire"] = 2;
  assert.equal(row(pack, profile, "wire").missing, 2);
  profile.inventory["craft:output"] = 3;
  assert.equal(row(pack, profile, "wire"), undefined);
});
test("completed upgrades remove direct and indirect membership, incomplete missions remain independently", () => {
  const { pack, profile } = setup();
  profile.upgradeProgress["craft:upgrade"] = {
    completion: "completed",
    availability: "unknown",
  };
  assert.equal(row(pack, profile, "wire"), undefined);
  const mission = {
    ...structuredClone(pack.objectives[0]),
    id: "craft:mission",
    track: "dmz-story",
    name: "Fictional mission",
  };
  delete mission.upgrade;
  pack.objectives.push(mission);
  assert(row(pack, profile, "wire").used);
  profile.completion[mission.id] = "completed";
  assert.equal(row(pack, profile, "wire"), undefined);
});
test("shared intermediate demand aggregates before batch rounding; retained tools use max", () => {
  const { pack, profile } = setup();
  pack.objectives[0].requirements.push({
    ...pack.objectives[0].requirements[0],
    itemId: "craft:part",
    quantity: 1,
  });
  assert.equal(row(pack, profile, "part").required, 5);
  assert.equal(row(pack, profile, "wire").required, 15);
  assert.equal(row(pack, profile, "tool").required, 1);
});
test("ambiguous recipes never sum alternative costs into a false shortage; explicit route resolves", () => {
  const { pack, profile } = setup();
  const alternate = structuredClone(pack.recipes[0]);
  alternate.id = "craft:alternative";
  pack.recipes.push(alternate);
  profile.inventory["craft:part"] = 5;
  const part = row(pack, profile, "part");
  assert.equal(part.state, "review");
  assert.equal(part.required, null);
  assert.equal(part.knownMissing, 0);
  profile.routes["craft:output"] = "craft:output-recipe";
  assert.equal(row(pack, profile, "part").state, "covered");
});
test("unknown stock/cost, cycles and overflow stay unresolved, never green", () => {
  const { pack, profile } = setup();
  delete profile.inventory["craft:output"];
  assert.equal(row(pack, profile, "part").state, "review");
  profile.inventory["craft:output"] = 0;
  pack.recipes[0].inputs[0].quantity = null;
  assert.equal(row(pack, profile, "part").state, "review");
  pack.recipes[0].output.quantity = 1;
  pack.recipes[0].inputs[0].quantity = 1000000;
  pack.recipes[1].inputs[0].quantity = 1000000;
  assert.equal(row(pack, profile, "wire").state, "review");
  assert.equal(row(pack, profile, "wire").required, null);
  pack.recipes[0].output.quantity = 2;
  pack.recipes[0].inputs[0].quantity = 2;
  pack.recipes[1].inputs[0].quantity = 3;
  pack.recipes[1].inputs[0].itemId = "craft:output";
  assert.equal(row(pack, profile, "part").state, "review");
});
test("protected recipe identities and candidate counts stay private; no filtered sole-route inference", () => {
  const { pack, profile } = setup();
  const alternate = structuredClone(pack.recipes[0]);
  alternate.id = "craft:protected";
  alternate.name = "Protected secret";
  const hidden = structuredClone(pack.objectives[0]);
  hidden.id = "craft:hidden-objective";
  hidden.name = "Protected secret";
  hidden.spoiler = true;
  pack.objectives.push(hidden);
  pack.recipes.push(alternate);
  const result = upgradeNeeds(pack, profile).collection;
  assert.equal(result.get("craft:part").state, "review");
  assert(
    !JSON.stringify([...result.values()].map((r) => [...r.names])).includes(
      "Protected secret",
    ),
  );
  profile.routes["craft:output"] = "craft:output-recipe";
  assert.equal(row(pack, profile, "part").state, "short");
});
test("mission-only quantities never certify coverage on wrong binding or invalid draft", () => {
  const { pack, profile } = setup();
  const mission = { ...pack.objectives[0], track: "mission" };
  delete mission.upgrade;
  pack.objectives = [mission];
  profile.inventory["craft:output"] = 100;
  assert.equal(row(pack, profile, "output").state, "covered");
  profile.contentVersion = "wrong";
  assert.equal(row(pack, profile, "output").state, "review");
  profile.contentVersion = pack.contentVersion;
  profile.inventory["craft:wire"] = NaN;
  assert.equal(row(pack, profile, "output").state, "review");
});

test("a recipe cycle does not resurrect ingredients when all root outputs are held", () => {
  const { pack, profile } = setup();
  pack.recipes[1].inputs[0].itemId = "craft:output";
  profile.inventory["craft:output"] = 3;
  assert.equal(row(pack, profile, "output").state, "covered");
  assert.equal(row(pack, profile, "part"), undefined);
});

test("hidden recipe endpoints cannot leave a falsely unique automatic producer", () => {
  const { pack, profile } = setup();
  const hiddenItem = {
    ...structuredClone(pack.items[0]),
    id: "craft:private-input",
    name: "Protected component",
  };
  pack.items.push(hiddenItem);
  const hidden = {
    ...structuredClone(pack.objectives[0]),
    id: "craft:private-objective",
    name: "Protected component",
    spoiler: true,
  };
  pack.objectives.push(hidden);
  const alternate = structuredClone(pack.recipes[0]);
  alternate.id = "craft:endpoint-alternative";
  alternate.inputs[0].itemId = hiddenItem.id;
  pack.recipes.push(alternate);
  const result = upgradeNeeds(pack, profile).collection;
  assert.equal(result.get("craft:part").state, "review");
  assert(!result.has(hiddenItem.id));
  assert(
    !JSON.stringify([...result.values()].map((r) => [...r.names])).includes(
      "Protected component",
    ),
  );
});

test("an active cycle cannot resurrect ingredients of a separate already-covered cycle", () => {
  const { pack, profile } = setup();
  pack.recipes[1].inputs[0].itemId = "craft:output";
  profile.inventory["craft:output"] = 3;
  const root = structuredClone(pack.objectives[0]);
  root.id = "craft:second-upgrade";
  root.name = "Second fictional upgrade I";
  root.upgrade.observationKeys = ["second"];
  root.requirements[0].itemId = "craft:wire";
  root.requirements[0].quantity = 1;
  pack.objectives.push(root);
  const recipe = structuredClone(pack.recipes[1]);
  recipe.id = "craft:wire-cycle";
  recipe.output.itemId = "craft:wire";
  recipe.inputs[0].itemId = "craft:wire";
  pack.recipes.push(recipe);
  assert.equal(row(pack, profile, "output").state, "covered");
  assert.equal(row(pack, profile, "part"), undefined);
  assert.equal(row(pack, profile, "wire").state, "review");
});

test("unsafe mission amounts remain yellow, while a verified partial known shortage stays red", () => {
  const { pack, profile } = setup();
  const mission = { ...pack.objectives[0], track: "mission" };
  delete mission.upgrade;
  pack.objectives = [mission];
  mission.status = "unverified";
  assert.equal(row(pack, profile, "output").state, "review");
  assert.equal(row(pack, profile, "output").required, null);
  mission.status = "fictional";
  mission.requirementsKnown = false;
  assert.equal(row(pack, profile, "output").state, "short");
});

test("bounded recipe work preserves only known membership and warns instead of inventing covered/unrelated needs", () => {
  const { pack, profile } = setup();
  const seed = pack.items[0];
  const inputs = Array.from({ length: 100 }, (_, i) => ({
    ...structuredClone(pack.recipes[0].inputs[0]),
    itemId: `limit:item-${i}`,
  }));
  pack.items.push(
    ...inputs.map((c) => ({
      ...structuredClone(seed),
      id: c.itemId,
      name: c.itemId,
    })),
  );
  const recipe = pack.recipes[0];
  pack.recipes = Array.from({ length: 5000 }, (_, i) => ({
    ...recipe,
    id: `limit:recipe-${i}`,
    name: `Fictional limit ${i}`,
    inputs,
  }));
  const result = upgradeNeeds(pack, profile).collection;
  assert.equal(result.limited, true);
  assert.equal(result.get("craft:output").state, "review");
  assert(!result.has("craft:spare"));
});

test("campaign requirements reached through an upgrade prerequisite retain campaign namespace", () => {
  const { pack, profile } = setup();
  const mission = structuredClone(pack.objectives[0]);
  mission.id = "craft:campaign";
  mission.name = "Fictional chapter";
  mission.track = "campaign";
  delete mission.upgrade;
  mission.requirements[0].itemId = "craft:wire";
  pack.objectives[0].prerequisites = [mission.id];
  pack.objectives.push(mission);
  assert(
    [...row(pack, profile, "wire").names].some(
      (name) => name === "Campaign: Fictional chapter",
    ),
  );
});
