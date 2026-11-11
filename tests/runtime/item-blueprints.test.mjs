import { profileImpact } from "../../src/content/portable.mjs";
import { cashFormatSave } from "../../src/domain/inventory-items.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  validateProfile,
  parseProfile,
  previewProfile,
  resetProfile,
} from "../../src/domain/profile.mjs";
import { itemBlueprintOwned } from "../../src/domain/item-blueprints.mjs";
import { createInventoryDraft } from "../../src/client/inventory-window.mjs";
import {
  profileChangeSummary,
  previewContentRebind,
} from "../../src/domain/profile-preview.mjs";
import {
  previewCraft,
  craftReceipt,
  reverseCraft,
} from "../../src/domain/craft-transaction.mjs";
import { collectionFixture } from "../helpers/collection-needs.mjs";
const pack = () => collectionFixture();
for (const version of [1, 2, 3])
  test(
    "optional item blueprints round trip without changing profile version " +
      version,
    () => {
      const p = pack(),
        profile = newProfile(p);
      if (version === 1) {
        delete profile.upgradeProgress;
        delete profile.watchPins;
        delete profile.spendHistory;
      }
      if (version === 2) delete profile.spendHistory;
      profile.schemaVersion = version;
      const original = structuredClone(profile);
      assert.equal(validateProfile(profile), profile);
      profile.itemBlueprints = { "craft:output": true };
      assert(itemBlueprintOwned(profile, "craft:output"));
      assert(!itemBlueprintOwned(profile, "craft:part"));
      assert.deepEqual(parseProfile(JSON.stringify(profile)), profile);
      delete profile.itemBlueprints;
      assert.deepEqual(profile, original);
    },
  );
for (const value of [
  null,
  [],
  false,
  { "craft:output": false },
  { "craft:output": "yes" },
  { "bad-key": true },
])
  test("reject malformed blueprint checklist " + JSON.stringify(value), () => {
    const profile = newProfile(pack());
    profile.itemBlueprints = value;
    assert.throws(() => validateProfile(profile));
  });
test("blueprint draft shares dirty/checkpoint semantics and preserves quantities and retired flags", () => {
  const p = pack(),
    profile = newProfile(p);
  profile.inventory["craft:output"] = 0;
  const original = structuredClone(profile),
    draft = createInventoryDraft(p.items, profile);
  draft.setBlueprint("craft:output", true, profile);
  assert(draft.isDirty());
  assert.equal(profile.inventory["craft:output"], 0);
  assert(draft.blueprintOwned("craft:output"));
  draft.setBlueprint("craft:output", false, profile);
  assert(!draft.isDirty());
  assert.deepEqual(profile, original);
  draft.setBlueprint("craft:output", true, profile);
  draft.checkpoint();
  assert(!draft.isDirty());
  draft.setBlueprint("craft:output", false, profile);
  assert(draft.isDirty());
  draft.setBlueprint("unknown:item", true, profile);
  assert(!itemBlueprintOwned(profile, "unknown:item"));
  const backup = { ...profile, itemBlueprints: { "retired:item": true } };
  const next = createInventoryDraft(p.items, backup);
  next.setBlueprint("craft:part", true, backup);
  assert.equal(backup.itemBlueprints["retired:item"], true);
});
test("backup/rebind/reset includes blueprint state and reports non-item and retired references", () => {
  const p = pack(),
    before = newProfile(p),
    after = structuredClone(before);
  after.itemBlueprints = {
    "craft:output": true,
    "craft:upgrade": true,
    "retired:item": true,
  };
  assert.deepEqual(
    new Set(previewProfile(after, p).unresolved),
    new Set(["craft:upgrade", "retired:item"]),
  );
  const summary = profileChangeSummary(before, after, p);
  assert(
    summary.sections.find(
      (section) => section.title === "Item blueprint ownership",
    ).changes.length > 0,
  );
  const rebound = previewContentRebind(
    after,
    { ...p, contentVersion: p.contentVersion + "-next" },
    p,
  ).candidate;
  assert.deepEqual(rebound.itemBlueprints, after.itemBlueprints);
  const reset = resetProfile(after, p);
  assert.deepEqual(reset.itemBlueprints, {});
  assert.deepEqual(after.itemBlueprints, {
    "craft:output": true,
    "craft:upgrade": true,
    "retired:item": true,
  });
});
test("ownership never bypasses craft eligibility or costs; actual craft and undo retain it", () => {
  const p = pack(),
    profile = newProfile(p);
  for (const item of p.items) profile.inventory[item.id] = 0;
  Object.assign(profile.inventory, { "craft:part": 4, "craft:tool": 1 });
  const baseline = previewCraft(p, profile, "craft:output-recipe");
  profile.itemBlueprints = { "craft:output": true };
  const preview = previewCraft(p, profile, "craft:output-recipe");
  assert.equal(preview.ready, baseline.ready);
  assert.deepEqual(preview.inputs, baseline.inputs);
  assert(preview.ready);
  assert.equal(preview.candidate.itemBlueprints["craft:output"], true);
  const after = { ...preview.candidate, revision: profile.revision + 1 },
    receipt = craftReceipt(p, profile, after, preview);
  assert.deepEqual(
    reverseCraft(p, after, receipt).itemBlueprints,
    profile.itemBlueprints,
  );
  p.recipes[0].eligibility = "unknown";
  assert(!previewCraft(p, profile, "craft:output-recipe").ready);
});

test("cash-format migration preserves staged blueprint ownership", () => {
  const p = pack();
  p.items.push({
    ...p.items[0],
    id: "craft:cash",
    kind: "currency",
    unit: "cash",
    name: "Fictional cash",
  });
  const legacy = newProfile({ ...p, schemaVersion: 1 });
  legacy.itemBlueprints = { "craft:output": true };
  legacy.inventory["craft:cash"] = 1333601;
  const result = cashFormatSave(legacy, p);
  assert(result.needsUpgrade);
  assert.equal(result.candidate.schemaVersion, 3);
  assert.equal(result.candidate.inventory["craft:cash"], 1333601);
  assert.equal(result.candidate.itemBlueprints["craft:output"], true);
  assert.equal(legacy.schemaVersion, 1);
});

test("content update impact includes removed or non-item blueprint references", () => {
  const before = pack(),
    after = structuredClone(before),
    profile = newProfile(before);
  profile.itemBlueprints = { "craft:unrelated": true, "craft:upgrade": true };
  after.items = after.items.filter((item) => item.id !== "craft:unrelated");
  after.recipes = after.recipes.filter(
    (recipe) => recipe.output.itemId !== "craft:unrelated",
  );
  after.contentVersion += "-updated";
  const impact = profileImpact(profile, before, after);
  assert.deepEqual(
    new Set(impact.unresolved),
    new Set(["craft:unrelated", "craft:upgrade"]),
  );
  assert.equal(profile.itemBlueprints["craft:unrelated"], true);
});
