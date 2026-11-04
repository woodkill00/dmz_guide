const requireValue = (ok: unknown) => {
  if (!ok) throw Error("Invalid sidebar allocation.");
};
export function sidebarAllocation(
  available: number,
  shares: readonly number[],
  minimum: number,
) {
  requireValue(
    Number.isFinite(available) &&
      available >= 0 &&
      Number.isFinite(minimum) &&
      minimum >= 0 &&
      shares.length >= 2 &&
      shares.length <= 8 &&
      shares.every((v) => Number.isFinite(v) && v >= 0) &&
      shares.some((v) => v > 0),
  );
  const count = shares.length,
    sum = shares.reduce((a, b) => a + b, 0);
  const minima =
    count === 2
      ? [
          Math.min(minimum, available * 0.45),
          Math.min(minimum, available - Math.min(minimum, available * 0.45)),
        ]
      : shares.map(() => Math.min(minimum, available / count));
  const remaining = Math.max(0, available - minima.reduce((a, b) => a + b, 0)),
    surplus = shares.map((v, i) =>
      Math.max(0, (available * v) / sum - minima[i]),
    ),
    surplusSum = surplus.reduce((a, b) => a + b, 0);
  const sizes = minima.map(
    (v, i) =>
      v + remaining * (surplusSum ? surplus[i] / surplusSum : shares[i] / sum),
  );
  return { sizes, minima };
}
export function sidebarPair(
  sizes: readonly number[],
  minima: readonly number[],
  index: number,
  requested: number,
) {
  requireValue(
    sizes.length === minima.length &&
      Number.isInteger(index) &&
      index >= 0 &&
      index + 1 < sizes.length &&
      Number.isFinite(requested) &&
      sizes.every(
        (v, i) =>
          Number.isFinite(v) &&
          Number.isFinite(minima[i]) &&
          v >= minima[i] - 1e-7 &&
          minima[i] >= 0,
      ),
  );
  const next = [...sizes],
    total = next[index] + next[index + 1],
    size = Math.max(
      minima[index],
      Math.min(total - minima[index + 1], requested),
    );
  next[index] = size;
  // Ignore arithmetic dust at a subpixel boundary, never a visible deficit.
  next[index + 1] = Math.max(minima[index + 1], total - size);
  return next;
}
