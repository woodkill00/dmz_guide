import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeAnnotation,
  saveAnnotation,
  removeAnnotation,
} from "../src/workspace/annotations.ts";
import { emptyWorkspace } from "../src/workspace/model.ts";
test("private point CRUD validates extent and retains evidence and applicability", () => {
  const state = emptyWorkspace();
  const point = makeAnnotation({
    title: "My observation",
    x: 200,
    y: 300,
    notes: "Own gameplay",
    evidence: "Own observation",
    floor: "underground",
  });
  saveAnnotation(state, point);
  assert.equal(state.annotations[0].applicability.floor, "underground");
  saveAnnotation(state, { ...point, x: 400 });
  assert.equal(state.annotations.length, 1);
  assert.equal(state.annotations[0].x, 400);
  removeAnnotation(state, point.id);
  assert.equal(state.annotations.length, 0);
  assert.throws(() => makeAnnotation({ title: "Bad", x: -1, y: 200 }));
});
