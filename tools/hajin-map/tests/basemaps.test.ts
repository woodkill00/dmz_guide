import { test } from "node:test";
import assert from "node:assert/strict";
import { rasterHeader } from "../src/workspace/basemaps.ts";
test("background preflight rejects executable, truncated and oversized raster headers", () => {
  assert.throws(() => rasterHeader(new TextEncoder().encode("<svg/>")));
  const b = new Uint8Array(33);
  b.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(b.buffer).setUint32(8, 13);
  b.set([73, 72, 68, 82], 12);
  new DataView(b.buffer).setUint32(16, 9000);
  new DataView(b.buffer).setUint32(20, 9000);
  assert.throws(() => rasterHeader(b));
});
