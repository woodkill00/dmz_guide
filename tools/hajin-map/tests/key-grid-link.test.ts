import test from "node:test";
import assert from "node:assert/strict";
import {
  parseKeyGridTarget,
  keyGridCorners,
} from "../src/map/key-grid-link.ts";
import { gridToCanonical, tacticalGrid } from "../src/map/tactical-grid.ts";
test("057 key grid accepts one bounded area and inert public label", () => {
  assert.deepEqual(parseKeyGridTarget("?key-grid=F5&key-name=Lab"), {
    reference: "F5",
    name: "Lab",
  });
  for (const q of [
    "?key-grid=F5&key-grid=G6",
    "?key-grid=Z1",
    "?key-grid=f5",
    "?key-grid=F0",
    "?key-grid=F5&key-name=a&key-name=b",
    "?key-grid=F5&key-name=%00",
    "?key-grid=F5&key-name=" + "x".repeat(121),
  ])
    assert.equal(parseKeyGridTarget(q), null);
  assert.equal(
    parseKeyGridTarget("?key-grid=F5&key-name=%3Cscript%3E")?.name,
    "<script>",
  );
});
test("057 key area corners use reviewed tactical calibration", () => {
  const p = keyGridCorners("F5");
  assert.equal(p.length, 4);
  assert.deepEqual(p[0], gridToCanonical(tacticalGrid.x[5], tacticalGrid.y[4]));
  assert.deepEqual(p[2], gridToCanonical(tacticalGrid.x[6], tacticalGrid.y[5]));
  assert.throws(() => keyGridCorners("Unknown"));
});
