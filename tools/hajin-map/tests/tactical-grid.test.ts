import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tacticalGrid,
  gridGeometry,
  gridToCanonical,
  canonicalToGrid,
  gridReferenceAt,
} from "../src/map/tactical-grid.ts";
import { hajin } from "../src/map/hajin.ts";
test("023 calibrated grid binds canonical image and inset source footprint, with21lines/90cells", () => {
  assert.equal(tacticalGrid.canonicalDigest, hajin.provenance.sha256);
  assert.equal(tacticalGrid.canonicalVersion, hajin.coordinateSpaceVersion);
  const g = gridGeometry();
  assert.equal(g.lines.length, 21);
  assert.equal(g.cells.length, 90);
  assert.equal(g.cells[0].reference, "A1");
  assert.equal(g.cells.at(-1)?.reference, "J9");
  for (const cell of g.cells)
    assert.equal(gridReferenceAt(cell.center.x, cell.center.y), cell.reference);
  assert.equal(gridReferenceAt(0, 0), null);
  assert.equal(gridReferenceAt(4096, 4096), null);
  assert.ok(g.cells[0].corner.x > 670 && g.cells[0].corner.x < 680);
  assert.ok(g.cells[0].corner.y > 950 && g.cells[0].corner.y < 960);
});
test("023 reviewed The Grid control is G6 and source-to-canonical round trips without swapping axes", () => {
  const p = gridToCanonical(65.451, 66);
  assert.equal(gridReferenceAt(p.x, p.y), "G6");
  assert.ok(Math.abs(p.x - 2484.99) < 0.05 && Math.abs(p.y - 2521.99) < 0.05);
  for (const x of tacticalGrid.x)
    for (const y of tacticalGrid.y) {
      const p = gridToCanonical(x, y),
        q = canonicalToGrid(p.x, p.y);
      assert.ok(Math.abs(q.x - x) < 1e-10 && Math.abs(q.y - y) < 1e-10);
    }
});
test("023 exact internal edges select right/below; outer edges include last cell and outside is unknown", () => {
  const at = (x: number, y: number) => {
    const p = gridToCanonical(x, y);
    return gridReferenceAt(p.x, p.y);
  };
  for (let c = 0; c < 10; c++)
    for (let r = 0; r < 9; r++)
      assert.equal(
        at(tacticalGrid.x[c], tacticalGrid.y[r]),
        `${String.fromCharCode(65 + c)}${r + 1}`,
      );
  assert.equal(at(tacticalGrid.x.at(-1)!, tacticalGrid.y.at(-1)!), "J9");
  assert.equal(at(tacticalGrid.x[0] - 1e-6, 20), null);
  assert.equal(at(tacticalGrid.x.at(-1)! + 1e-6, 20), null);
  assert.equal(at(50, tacticalGrid.y[0] - 1e-6), null);
  assert.equal(at(50, tacticalGrid.y.at(-1)! + 1e-6), null);
  assert.equal(at(tacticalGrid.x[1] - 1e-6, 20), "A2");
  assert.equal(at(tacticalGrid.x[1] + 1e-6, 20), "B2");
  for (const n of [NaN, Infinity, -1, 4097]) {
    assert.equal(gridReferenceAt(n, 2048), null);
    assert.equal(gridReferenceAt(2048, n), null);
  }
});
