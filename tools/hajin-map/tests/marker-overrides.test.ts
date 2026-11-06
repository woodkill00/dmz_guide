import { test } from "node:test";
import assert from "node:assert/strict";
import {
  markerDraft,
  overridden,
  overrideVisible,
} from "../src/workspace/marker-overrides.ts";
import { emptyWorkspace } from "../src/workspace/model.ts";
import {
  saveAnnotation,
  removeAnnotation,
} from "../src/workspace/annotations.ts";
import { validateWorkspace } from "../src/workspace/backup.ts";
const record = {
  key: "source-record",
  identity: null,
  id: "a",
  kind: "source",
  sourceId: "official",
  sourceName: "Call of Duty",
  title: "Synthetic safe",
  category: "Safes",
  categoryId: "safe",
  notes: "Synthetic notes",
  x: 2048,
  y: 2048,
  floor: "1",
  build: "synthetic-build",
  visible: true,
  status: "Source claim",
  capturedAt: null,
  url: null,
} as const;
test("local marker edits are drafts until saved; unique, persistent, parent-masked and independent of fresh source text", () => {
  const w = emptyWorkspace(),
    a = markerDraft(w, record);
  assert.equal(w.annotations.length, 0);
  a.title = "My correction";
  a.x = 2100;
  saveAnnotation(w, a);
  assert.equal(overridden(w, "source", "official", "a"), true);
  assert.equal(
    markerDraft(w, { ...record, title: "New upstream title" }).title,
    "My correction",
  );
  assert.equal(overrideVisible(a, w.visibility), true);
  w.visibility.sourceEnabled.official = false;
  assert.equal(overrideVisible(a, w.visibility), false);
  w.visibility.sourceEnabled.official = true;
  w.visibility.categoryMask.official.safe = false;
  assert.equal(overrideVisible(a, w.visibility), false);
  assert.throws(
    () => saveAnnotation(w, { ...a, id: "duplicate" }),
    /already has/,
  );
  validateWorkspace(JSON.parse(JSON.stringify(w)));
  assert.equal(w.annotations[0].origin?.recordId, "a");
  removeAnnotation(w, a.id);
  assert.equal(overridden(w, "source", "official", "a"), false);
  validateWorkspace(w);
});
test("marker origin validation rejects malformed and duplicate backup references", () => {
  const w = emptyWorkspace(),
    a = markerDraft(w, record);
  saveAnnotation(w, a);
  assert.throws(
    () => saveAnnotation(w, { ...a, origin: { ...a.origin!, recordId: "" } }),
    /origin/,
  );
  assert.throws(
    () => saveAnnotation(w, { ...a, origin: null as never }),
    /origin/,
  );
  w.annotations.push({ ...a, id: "duplicate" });
  assert.throws(() => validateWorkspace(w), /Duplicate local marker/);
});
test("owned points edit in place and reviewed edits remain private with reviewed-layer affinity", () => {
  const w = emptyWorkspace(),
    a = markerDraft(w, record);
  delete a.origin;
  saveAnnotation(w, a);
  const own = markerDraft(w, {
    ...record,
    kind: "custom",
    sourceId: "custom",
    id: a.id,
  });
  own.title = "Edited private point";
  assert.equal(w.annotations[0].title, "Synthetic safe");
  saveAnnotation(w, own);
  assert.equal(w.annotations.length, 1);
  const reviewed = markerDraft(w, {
    ...record,
    kind: "reviewed",
    sourceId: "reviewed",
    id: "reviewed-example",
  });
  assert.equal(reviewed.origin?.kind, "reviewed");
  saveAnnotation(w, reviewed);
  w.visibility.curatedEnabled = false;
  assert.equal(overrideVisible(reviewed, w.visibility), false);
  assert.equal(w.entities.length, 0);
  validateWorkspace(w);
});

test("deleting and recreating an override retains multiple valid recovery-bin versions", () => {
  const w = emptyWorkspace();
  for (let i = 0; i < 2; i++) {
    const a = markerDraft(w, record);
    a.notes = "Revision " + i;
    saveAnnotation(w, a);
    removeAnnotation(w, a.id);
    validateWorkspace(w);
  }
  assert.equal(w.annotations.length, 0);
  assert.equal(w.fieldGuide?.toolkit?.trash.length, 2);
  assert.equal(overridden(w, "source", "official", "a"), false);
});
