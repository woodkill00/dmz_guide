import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  validateProfile,
  parseProfile,
  resetProfile,
  previewProfile,
} from "../../src/domain/profile.mjs";
import { profileChangeSummary } from "../../src/domain/profile-preview.mjs";
import {
  setBuildTarget,
  buildTargetNeeds,
} from "../../src/domain/build-targets.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { collectionFixture } from "../helpers/collection-needs.mjs";
import { createInventoryDraft } from "../../src/client/inventory-window.mjs";
import { buildGroupsMarkup } from "../../src/client/build-collect-view.mjs";
const real = loadFixturePack("official-starter");
test("optional build targets round-trip v1–v3, reject invalid shapes and reset with references", () => {
  for (const version of [1, 2, 3]) {
    const p = newProfile(real);
    p.schemaVersion = version;
    if (version === 1) {
      delete p.upgradeProgress;
      delete p.watchPins;
      delete p.spendHistory;
    }
    if (version === 2) delete p.spendHistory;
    p.buildTargets = { "mw4:bandage": 2 };
    validateProfile(p);
    assert.equal(
      parseProfile(JSON.stringify(p)).buildTargets["mw4:bandage"],
      2,
    );
    assert.deepEqual(resetProfile(p, real).buildTargets, {});
  }
  for (const value of [
    null,
    [],
    false,
    { "mw4:bandage": 0 },
    { "mw4:bandage": 1.2 },
    { "mw4:bandage": 1000001 },
    { "mw4:bandage": "2" },
  ])
    assert.throws(() =>
      validateProfile({ ...newProfile(real), buildTargets: value }),
    );
  const p = newProfile(real);
  p.buildTargets = { "retired:item": 1 };
  assert(previewProfile(p, real).unresolved.includes("retired:item"));
});
test("actual target inputs use yields, stock and reserves without upgrading evidence or changing goals", () => {
  const base = newProfile(real),
    p = setBuildTarget(real, base, "mw4:bandage", 2),
    before = structuredClone(p);
  assert.equal(base.buildTargets, undefined);
  p.inventory["mw4:synthetics"] = 5;
  p.reserves["mw4:synthetics"] = 2;
  let m = buildTargetNeeds(real, p);
  assert.equal(m.groups.length, 1);
  assert.equal(
    m.groups[0].direct.find((r) => r.id === "mw4:synthetics").remaining,
    27,
  );
  assert.equal(
    m.groups[0].direct.find((r) => r.id === "mw4:chemicals").remaining,
    30,
  );
  p.inventory["mw4:bandage"] = 2;
  m = buildTargetNeeds(real, p);
  assert.equal(m.groups[0].root.remaining, 2);
  assert.equal(
    m.groups[0].direct.find((r) => r.id === "mw4:synthetics").remaining,
    27,
  );
  assert.equal(
    m.groups[0].direct.find((r) => r.id === "mw4:chemicals").remaining,
    30,
  );
  assert.equal(p.buildTargets["mw4:bandage"], 2);
  assert.deepEqual(p.goals, before.goals);
  assert.deepEqual(p.upgradeProgress, before.upgradeProgress);
  assert.deepEqual(p.spendHistory, before.spendHistory);
  const changed = profileChangeSummary(base, p, real);
  assert(
    changed.sections.some((s) => s.title === "Want to build / get targets"),
  );
});
test("combined build graph shares intermediate stock and handles retained tools and batched yields once", () => {
  const pack = collectionFixture();
  let p = newProfile(pack);
  p = setBuildTarget(pack, p, "craft:output", 3);
  p = setBuildTarget(pack, p, "craft:part", 2);
  p.inventory["craft:output"] = 1;
  p.inventory["craft:part"] = 1;
  p.inventory["craft:wire"] = 3;
  const m = buildTargetNeeds(pack, p),
    wire = m.combined.find((r) => r.id === "craft:wire");
  // Three additional outputs need two batches (4 parts), plus 2 extra parts.
  // Keep the owned part: craft 6 parts, each needing 3 wire.
  assert.equal(wire.required, 18);
  assert.equal(wire.remaining, 15);
  assert.equal(m.combined.find((r) => r.id === "craft:part").required, 7);
  assert.equal(m.combined.find((r) => r.id === "craft:part").remaining, 6);
  assert.equal(m.combined.find((r) => r.id === "craft:tool").required, 1);
  assert(!m.combined.some((r) => r.id === "craft:spare"));
  p.contentVersion = "old";
  assert.equal(buildTargetNeeds(pack, p).status, "blocked");
});
test("ambiguous routes and no-recipe targets remain honest; inventory targets stage/checkpoint/cancel independently", () => {
  const pack = collectionFixture();
  let p = setBuildTarget(pack, newProfile(pack), "craft:output", 1);
  pack.recipes.push({
    ...structuredClone(pack.recipes[0]),
    id: "craft:alternative",
  });
  assert(buildTargetNeeds(pack, p).groups[0].ambiguous);
  assert(
    buildGroupsMarkup(
      buildTargetNeeds(pack, p),
      pack,
      new Map(),
      false,
      new Map(),
    ).includes("/collection/?pack=qa044%3Acollection#crafting"),
  );
  p.routes["craft:output"] = "craft:output-recipe";
  assert(!buildTargetNeeds(pack, p).groups[0].ambiguous);
  const draft = createInventoryDraft(pack.items, p);
  draft.setBuild("craft:spare", "2", p);
  assert(draft.isDirty());
  assert.equal(p.buildTargets["craft:spare"], 2);
  draft.checkpoint();
  assert(!draft.isDirty());
  draft.setBuild("craft:spare", "", p);
  assert.equal(draft.firstInvalid().field, "buildTargets");
  draft.setBuild("craft:spare", null, p);
  assert.equal(p.buildTargets["craft:spare"], undefined);
});

test("retired saved recipes still show every reported vest/backpack ingredient without mutating saved routes", () => {
  const p = newProfile(real);
  const names = [
    "3-Plate Armor Vest",
    "3-Plate Ballistic Gel Vest",
    "Large Backpack",
    "Large Secure Backpack",
  ];
  for (const name of names) {
    const item = real.items.find((i) => i.name === name);
    p.buildTargets ??= {};
    p.buildTargets[item.id] = 1;
    p.inventory[item.id] = 5;
    p.reserves[item.id] = 2;
    p.routes[item.id] = "retired:recipe";
  }
  const before = structuredClone(p),
    model = buildTargetNeeds(real, p);
  for (const g of model.groups) {
    const recipe = real.recipes.find((r) => r.output.itemId === g.id);
    assert.equal(g.recipe, recipe.id);
    assert.deepEqual(
      new Set(g.direct.map((r) => r.id)),
      new Set(recipe.inputs.map((i) => i.itemId)),
    );
    assert(g.direct.every((r) => r.remaining > 0));
  }
  assert.deepEqual(p, before);
});

test("additional targets retain ingredient lists when all inputs are stocked and scale independently of owned outputs", () => {
  const p = newProfile(real),
    id = "mw4:bandage";
  p.buildTargets = { [id]: 2 };
  p.inventory[id] = 100;
  p.inventory["mw4:synthetics"] = 30;
  p.inventory["mw4:chemicals"] = 30;
  let model = buildTargetNeeds(real, p);
  assert.equal(model.groups[0].root.remaining, 2);
  assert.equal(model.groups[0].direct.length, 2);
  assert(model.groups[0].direct.every((r) => r.remaining === 0));
  const html = buildGroupsMarkup(model, real, new Map(), false, new Map());
  assert(html.includes("Synthetics"));
  assert(!html.includes("Target already owned"));
  p.buildTargets[id] = 3;
  model = buildTargetNeeds(real, p);
  assert.equal(
    model.groups[0].direct.find((r) => r.id === "mw4:synthetics").remaining,
    15,
  );
  assert.equal(p.inventory[id], 100);
});
