import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeSourceEdits,
  validateSourceEdits,
  sourceValue,
} from "../../src/domain/page-source-edits.mjs";
test("093 local source corrections preserve captured originals, survive ID-based reorder and retire superseded reports", () => {
  const original = {
    rows: [
      { id: "a", requirement: "Captured" },
      { id: "b", requirement: "Other" },
    ],
  };
  const changed = structuredClone(original);
  changed.rows[0].requirement = "Local";
  let edits = mergeSourceEdits([], original, changed);
  assert.equal(edits[0].path, "/rows/@a/requirement");
  assert.equal(edits[0].before, "Captured");
  const reordered = { rows: [changed.rows[1], changed.rows[0]] };
  edits = mergeSourceEdits(edits, reordered, reordered);
  assert.equal(edits.length, 1);
  assert.equal(sourceValue(reordered, edits[0].path).value, "Local");
  const second = structuredClone(reordered);
  second.rows[1].requirement = "Second local";
  edits = mergeSourceEdits(edits, reordered, second);
  assert.equal(edits[0].before, "Captured");
  const restored = structuredClone(second);
  restored.rows[1].requirement = "Captured";
  assert.deepEqual(mergeSourceEdits(edits, second, restored), []);
  const updated = { rows: [{ id: "a", requirement: "Provider update" }] };
  assert.deepEqual(mergeSourceEdits(edits, updated, updated), []);
  assert.throws(() =>
    validateSourceEdits([{ ...edits[0], origin: "provider" }]),
  );
  assert.throws(() =>
    mergeSourceEdits(
      [],
      { image: { sha256: "a" } },
      { image: { sha256: "b" } },
    ),
  );
});
