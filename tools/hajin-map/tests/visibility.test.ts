import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultVisibility,
  setSourceAll,
  sourceSelection,
  isVisible,
  globalVisibility,
} from "../src/workspace/visibility.ts";
test("all sixteen master/mask/search/registration combinations obey intersection", () => {
  for (const master of [false, true])
    for (const mask of [false, true])
      for (const search of [false, true])
        for (const registered of [false, true]) {
          const v = defaultVisibility();
          v.sourceEnabled.official = master;
          v.categoryMask.official = { a: mask };
          v.query = search ? "  nEeDlE  " : "absent";
          assert.equal(
            isVisible(v, "official", "a", "Needle", registered),
            master && mask && search && registered,
            JSON.stringify({ master, mask, search, registered }),
          );
        }
});
test("source and global controls preserve masters and derive all/none/mixed masks", () => {
  const v = defaultVisibility(),
    categories = { official: ["a", "b"], codmunity: ["a", "unmapped"] };
  assert.equal(sourceSelection(v, "official", []), "none");
  assert.equal(sourceSelection(v, "official", categories.official), "all");
  v.categoryMask.official = { a: true, b: false };
  v.sourceEnabled.official = false;
  assert.equal(sourceSelection(v, "official", categories.official), "mixed");
  assert.deepEqual(v.categoryMask.official, { a: true, b: false });
  setSourceAll(v, "official", categories.official, false);
  assert.equal(v.sourceEnabled.official, false);
  assert.equal(sourceSelection(v, "official", categories.official), "none");
  v.sourceEnabled.codmunity = true;
  setSourceAll(v, "codmunity", categories.codmunity, false);
  assert.equal(v.sourceEnabled.codmunity, true);
  globalVisibility(v, categories, true);
  for (const [id, ids] of Object.entries(categories)) {
    assert.equal(v.sourceEnabled[id], true);
    assert.equal(sourceSelection(v, id, ids), "all");
  }
  assert.equal(v.curatedEnabled, true);
  assert.equal(v.customEnabled, true);
  globalVisibility(v, categories, false);
  for (const [id, ids] of Object.entries(categories)) {
    assert.equal(v.sourceEnabled[id], true);
    assert.equal(sourceSelection(v, id, ids), "none");
  }
  assert.equal(v.curatedEnabled, false);
  assert.equal(v.customEnabled, false);
});
test("master, mask, search and registration intersect; master off preserves category mix", () => {
  const v = defaultVisibility();
  v.sourceEnabled.official = true;
  v.categoryMask.official = { a: true, b: false };
  assert.equal(sourceSelection(v, "official", ["a", "b"]), "mixed");
  assert.equal(isVisible(v, "official", "a", "Needle", true), true);
  v.query = "different";
  assert.equal(isVisible(v, "official", "a", "Needle", true), false);
  v.query = "";
  v.sourceEnabled.official = false;
  assert.equal(isVisible(v, "official", "a", "Needle", true), false);
  assert.equal(v.categoryMask.official.a, true);
  setSourceAll(v, "official", ["a", "b"], true);
  assert.equal(sourceSelection(v, "official", ["a", "b"]), "all");
  assert.equal(isVisible(v, "official", "a", "Needle", false), false);
  globalVisibility(v, { official: ["a", "b"] }, false);
  assert.equal(v.customEnabled, false);
});
