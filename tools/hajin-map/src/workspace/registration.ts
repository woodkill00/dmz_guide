import type { CoordinateFrame } from "./types.ts";
export const canonicalFrame = Object.freeze({
  mapId: "hajin",
  coordinateVersion: "hajin-official-v1-4096",
  width: 4096,
  height: 4096,
  imageDigest:
    "377393bf8bb36140ee97702e2ce3950acc7f62841f9bf66f9a9adc8a9f740acb",
});
export interface Anchor {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  evidence: string;
}
export interface Registration {
  id: string;
  frameId: string;
  imageDigest: string | null;
  frameSignature: string;
  transform: number[];
  fit: Anchor[];
  holdout: Anchor[];
  rms: number;
  maxError: number;
  reviewer: string;
  reviewedAt: string;
  declaredAxes: boolean;
  canonicalVersion: string;
}
export const frameSignature = (f: CoordinateFrame) =>
  JSON.stringify([
    f.id,
    f.mapId,
    f.coordinateVersion,
    f.width,
    f.height,
    f.units,
    f.origin,
    f.xAxis,
    f.yAxis,
    f.crop,
    f.imageDigest,
  ]);
export function transformPoint(
  p: { x: number; y: number },
  r: Pick<Registration, "transform">,
) {
  const [a, b, c, d, e, f] = r.transform;
  const x = a * p.x + b * p.y + c,
    y = d * p.x + e * p.y + f;
  if (
    ![x, y].every((n) => Number.isFinite(n) && n >= -1e-6 && n <= 4096 + 1e-6)
  )
    throw new Error("Transformed point is outside the canonical map.");
  return {
    x: Math.max(0, Math.min(4096, x)),
    y: Math.max(0, Math.min(4096, y)),
  };
}
function solve(m: number[][], v: number[]): number[] {
  const a = m.map((row, i) => [...row, v[i]]);
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++)
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-10)
      throw new Error("Fit anchors must be noncollinear.");
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const scale = a[col][col];
    for (let j = col; j < 4; j++) a[col][j] /= scale;
    for (let row = 0; row < 3; row++)
      if (row !== col) {
        const s = a[row][col];
        for (let j = col; j < 4; j++) a[row][j] -= s * a[col][j];
      }
  }
  return a.map((row) => row[3]);
}
export function registerFrame(
  frame: CoordinateFrame,
  fit: Anchor[],
  holdout: Anchor[],
  reviewer: string,
  declaredAxes = false,
): Registration {
  if (
    frame.mapId !== "hajin" ||
    frame.units === "unknown" ||
    frame.origin === "unknown" ||
    frame.xAxis === "unknown" ||
    frame.yAxis === "unknown" ||
    !frame.width ||
    !frame.height ||
    !frame.imageDigest
  )
    throw new Error(
      "Frame units, extent, axes and image digest must be known.",
    );
  if (
    !reviewer.trim() ||
    reviewer.length > 200 ||
    fit.length < 3 ||
    fit.length > 32 ||
    holdout.length < 2 ||
    holdout.length > 32
  )
    throw new Error("Provide reviewer, at least3 fit and2 hold-out landmarks.");
  const region = frame.crop ?? {
    x: 0,
    y: 0,
    width: frame.width,
    height: frame.height,
  };
  if (
    ![region.x, region.y, region.width, region.height].every(Number.isFinite) ||
    region.x < 0 ||
    region.y < 0 ||
    region.width <= 0 ||
    region.height <= 0 ||
    region.x + region.width > frame.width ||
    region.y + region.height > frame.height
  )
    throw new Error("Invalid documented crop.");
  if (
    !declaredAxes &&
    (frame.crop !== null ||
      frame.origin !== "top-left" ||
      frame.xAxis !== "right" ||
      frame.yAxis !== "down")
  )
    throw new Error("Explicitly review the documented crop/origin/axes.");
  const anchors = [...fit, ...holdout],
    seen = new Set<string>();
  for (const a of anchors) {
    if (
      ![a.x, a.y, a.targetX, a.targetY].every(Number.isFinite) ||
      a.x < region.x ||
      a.y < region.y ||
      a.x > region.x + region.width ||
      a.y > region.y + region.height ||
      a.targetX < 0 ||
      a.targetY < 0 ||
      a.targetX > 4096 ||
      a.targetY > 4096 ||
      !a.evidence.trim() ||
      a.evidence.length > 4000
    )
      throw new Error("Invalid landmark or missing evidence.");
    const key = `${a.x},${a.y}`;
    if (seen.has(key))
      throw new Error("Fit and held-out landmarks must be independent.");
    seen.add(key);
  }
  const quadrants = new Set(
    anchors.map(
      (a) =>
        `${a.x >= region.x + region.width / 2},${a.y >= region.y + region.height / 2}`,
    ),
  );
  if (
    quadrants.size < 3 ||
    !holdout.some(
      (a) =>
        a.x <= region.x + region.width * 0.1 ||
        a.x >= region.x + region.width * 0.9 ||
        a.y <= region.y + region.height * 0.1 ||
        a.y >= region.y + region.height * 0.9,
    )
  )
    throw new Error(
      "Distribute landmarks across the map and include a held-out crop-edge landmark.",
    );
  const matrix = Array.from({ length: 3 }, () => [0, 0, 0]),
    vx = [0, 0, 0],
    vy = [0, 0, 0];
  for (const p of fit) {
    const z = [
      (p.x - region.x) / region.width,
      (p.y - region.y) / region.height,
      1,
    ];
    for (let i = 0; i < 3; i++) {
      vx[i] += z[i] * p.targetX;
      vy[i] += z[i] * p.targetY;
      for (let j = 0; j < 3; j++) matrix[i][j] += z[i] * z[j];
    }
  }
  const x = solve(matrix, vx),
    y = solve(matrix, vy);
  const transform = [
    x[0] / region.width,
    x[1] / region.height,
    x[2] - (x[0] * region.x) / region.width - (x[1] * region.y) / region.height,
    y[0] / region.width,
    y[1] / region.height,
    y[2] - (y[0] * region.x) / region.width - (y[1] * region.y) / region.height,
  ];
  const det = transform[0] * transform[4] - transform[1] * transform[3];
  const scale = Math.max(
    ...[transform[0], transform[1], transform[3], transform[4]].map(Math.abs),
  );
  if (!Number.isFinite(det) || !scale || Math.abs(det) <= scale * scale * 1e-12)
    throw new Error("Singular transform.");
  if (!declaredAxes && (det < 0 || transform[0] <= 0 || transform[4] <= 0))
    throw new Error("Declare and review the source axis reversal/rotation.");
  const errors = holdout.map((a) => {
    const p = transformPoint(a, { transform });
    return Math.hypot(p.x - a.targetX, p.y - a.targetY);
  });
  const rms = Math.sqrt(errors.reduce((s, n) => s + n * n, 0) / errors.length),
    maxError = Math.max(...errors);
  if (
    rms > 8 ||
    maxError > 16 ||
    fit.some((a) => {
      const p = transformPoint(a, { transform });
      return Math.hypot(p.x - a.targetX, p.y - a.targetY) > 16;
    })
  )
    throw new Error("Registration exceeds8px RMS or16px maximum residual.");
  return {
    id: crypto.randomUUID(),
    frameId: frame.id,
    imageDigest: frame.imageDigest,
    frameSignature: frameSignature(frame),
    transform,
    fit: structuredClone(fit),
    holdout: structuredClone(holdout),
    rms,
    maxError,
    reviewer,
    reviewedAt: new Date().toISOString(),
    declaredAxes,
    canonicalVersion: canonicalFrame.coordinateVersion,
  };
}
export function identityRegistration(frame: CoordinateFrame): Registration {
  if (
    frame.mapId !== canonicalFrame.mapId ||
    frame.coordinateVersion !== canonicalFrame.coordinateVersion ||
    frame.width !== 4096 ||
    frame.height !== 4096 ||
    frame.crop !== null ||
    frame.origin !== "top-left" ||
    frame.xAxis !== "right" ||
    frame.yAxis !== "down" ||
    frame.units !== "pixels" ||
    frame.imageDigest !== canonicalFrame.imageDigest
  )
    throw new Error("Exact official frame identity is not established.");
  return {
    ...registerFrame(
      frame,
      [
        {
          x: 0,
          y: 0,
          targetX: 0,
          targetY: 0,
          evidence: "Exact official frame identity",
        },
        {
          x: 4096,
          y: 0,
          targetX: 4096,
          targetY: 0,
          evidence: "Exact official frame identity",
        },
        {
          x: 0,
          y: 4096,
          targetX: 0,
          targetY: 4096,
          evidence: "Exact official frame identity",
        },
      ],
      [
        {
          x: 4096,
          y: 4096,
          targetX: 4096,
          targetY: 4096,
          evidence: "Exact official frame identity",
        },
        {
          x: 100,
          y: 100,
          targetX: 100,
          targetY: 100,
          evidence: "Exact official frame identity",
        },
      ],
      "Official019 frame compatibility",
    ),
    id: "official-identity-v1",
  };
}
export function registrationMatches(
  frame: CoordinateFrame,
  r: Registration | undefined,
): r is Registration {
  return (
    !!r &&
    r.frameSignature === frameSignature(frame) &&
    r.canonicalVersion === canonicalFrame.coordinateVersion
  );
}
