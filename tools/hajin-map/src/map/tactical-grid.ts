/** Source-backed tactical reference geometry; never a full-image equal subdivision.
 * See specs/023-map-coordinate-grid/research.md for provenance and uncertainty. */
export const tacticalGrid = Object.freeze({
  source: "https://codcentral.net/blog/mw4-dmz-map/",
  canonicalVersion: "hajin-official-v1-4096",
  canonicalDigest:
    "377393bf8bb36140ee97702e2ce3950acc7f62841f9bf66f9a9adc8a9f740acb",
  sourceWidth: 2880,
  sourceHeight: 2700,
  x: Object.freeze([
    2.676, 12.185, 21.694, 31.203, 40.712, 50.221, 59.73, 69.239, 78.748,
    88.257, 97.766,
  ]),
  y: Object.freeze([
    7.919, 18.065, 28.211, 38.356, 48.502, 58.648, 68.793, 78.939, 89.084,
    99.229,
  ]),
  matrix: Object.freeze([
    Object.freeze([
      0.9999973629011739, 0.0000048508329500984715, 599.9982417689733,
    ]),
    Object.freeze([
      -0.000005190429150749143, 0.9999988162653923, 739.9967045501395,
    ]),
  ]),
});
export interface GridPoint {
  x: number;
  y: number;
}
export function gridToCanonical(xPercent: number, yPercent: number): GridPoint {
  const x = (xPercent * tacticalGrid.sourceWidth) / 100,
    y = (yPercent * tacticalGrid.sourceHeight) / 100,
    m = tacticalGrid.matrix;
  return {
    x: m[0][0] * x + m[0][1] * y + m[0][2],
    y: m[1][0] * x + m[1][1] * y + m[1][2],
  };
}
export function canonicalToGrid(x: number, y: number): GridPoint {
  const m = tacticalGrid.matrix,
    dx = x - m[0][2],
    dy = y - m[1][2],
    det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  return {
    x: ((m[1][1] * dx - m[0][1] * dy) / det / tacticalGrid.sourceWidth) * 100,
    y: ((-m[1][0] * dx + m[0][0] * dy) / det / tacticalGrid.sourceHeight) * 100,
  };
}
function indexAt(value: number, edges: readonly number[]): number | null {
  // Only floating-point inverse roundoff at a transformed exact edge is snapped.
  const near = edges.find((edge) => Math.abs(edge - value) <= 1e-10);
  if (near !== undefined) value = near;
  if (value < edges[0] || value > edges.at(-1)!) return null;
  if (value === edges.at(-1)) return edges.length - 2;
  return edges.findIndex((edge, i) => i > 0 && value < edge) - 1;
}
export function gridReferenceAt(x: number, y: number): string | null {
  if (![x, y].every((v) => Number.isFinite(v) && v >= 0 && v <= 4096))
    return null;
  const p = canonicalToGrid(x, y),
    column = indexAt(p.x, tacticalGrid.x),
    row = indexAt(p.y, tacticalGrid.y);
  return column === null || row === null
    ? null
    : `${String.fromCharCode(65 + column)}${row + 1}`;
}
export function gridGeometry() {
  const { x, y } = tacticalGrid;
  const lines = [
    ...x.map((v) => [gridToCanonical(v, y[0]), gridToCanonical(v, y.at(-1)!)]),
    ...y.map((v) => [gridToCanonical(x[0], v), gridToCanonical(x.at(-1)!, v)]),
  ];
  const cells = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 10 }, (_, c) => ({
      reference: `${String.fromCharCode(65 + c)}${r + 1}`,
      corner: gridToCanonical(x[c], y[r]),
      center: gridToCanonical((x[c] + x[c + 1]) / 2, (y[r] + y[r + 1]) / 2),
    })),
  ).flat();
  return { lines, cells };
}
