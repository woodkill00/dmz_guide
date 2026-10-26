import { test } from "node:test";
import assert from "node:assert/strict";
import {
  registerFrame,
  transformPoint,
  canonicalFrame,
} from "../src/workspace/registration.ts";
import { syntheticSnapshot } from "./fixtures/workspace.ts";
import { categoryName } from "../src/workspace/taxonomy.ts";
const frame = { ...syntheticSnapshot().frame, imageDigest: "a".repeat(64) };
const fit = [
  [0, 0],
  [100, 0],
  [0, 80],
].map(([x, y]) => ({
  x,
  y,
  targetX: x * 40,
  targetY: y * 40,
  evidence: "Synthetic landmark",
}));
const holdout = [
  [90, 70],
  [10, 10],
].map(([x, y]) => ({
  x,
  y,
  targetX: x * 40,
  targetY: y * 40,
  evidence: "Independent synthetic landmark",
}));
test("affine calibration validates independent distributed holdouts and binds frame digest", () => {
  const r = registerFrame(
    frame as any,
    fit,
    holdout,
    "Synthetic reviewer",
    true,
  );
  assert.deepEqual(transformPoint({ x: 25, y: 40 }, r), { x: 1000, y: 1600 });
  assert.equal(r.imageDigest, frame.imageDigest);
  assert.ok(r.rms <= 8);
  assert.equal(canonicalFrame.mapId, "hajin");
  assert.equal(categoryName("x", {}), "Unmapped");
});
test("documented cropped frames and declared reversed axes calibrate without blind normalization", () => {
  const cropFrame = { ...frame, crop: { x: 40, y: 20, width: 20, height: 40 } };
  const points = [
    [40, 20],
    [60, 20],
    [40, 60],
  ].map(([x, y]) => ({
    x,
    y,
    targetX: (x - 40) * 204.8,
    targetY: (y - 20) * 102.4,
    evidence: "Documented cropped landmark",
  }));
  const held = [
    [58, 56],
    [42, 24],
  ].map(([x, y]) => ({
    x,
    y,
    targetX: (x - 40) * 204.8,
    targetY: (y - 20) * 102.4,
    evidence: "Independent crop edge",
  }));
  assert.throws(() =>
    registerFrame(cropFrame as any, points, held, "Me", false),
  );
  const r = registerFrame(cropFrame as any, points, held, "Me", true);
  const p = transformPoint({ x: 50, y: 40 }, r);
  assert.ok(Math.abs(p.x - 2048) < 1e-6 && Math.abs(p.y - 2048) < 1e-6);
  const flippedFit = fit.map((a) => ({ ...a, targetX: 4000 - a.targetX })),
    flippedHeld = holdout.map((a) => ({ ...a, targetX: 4000 - a.targetX }));
  assert.throws(() =>
    registerFrame(frame as any, flippedFit, flippedHeld, "Me", false),
  );
  assert.doesNotThrow(() =>
    registerFrame(frame as any, flippedFit, flippedHeld, "Me", true),
  );
});
test("rejects singular, inaccurate, unknown and insufficient calibration", () => {
  assert.throws(() =>
    registerFrame(frame as any, [fit[0], fit[0], fit[0]], holdout, "r", true),
  );
  assert.throws(() =>
    registerFrame(
      frame as any,
      fit,
      [{ ...holdout[0], targetX: 0 }, holdout[1]],
      "r",
      true,
    ),
  );
  assert.throws(() =>
    registerFrame(frame as any, fit, holdout.slice(0, 1), "r", true),
  );
  assert.throws(() =>
    registerFrame(
      { ...frame, units: "unknown" } as any,
      fit,
      holdout,
      "r",
      true,
    ),
  );
});
