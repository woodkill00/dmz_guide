export const normalizeKeySearch = (value) =>
  value
    .normalize("NFKD")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
export function keyMatches(key, query = "", type = "") {
  const haystack = normalizeKeySearch(
    [
      key.name,
      ...key.aliases,
      key.acquisition,
      ...key.locations.flatMap((l) => [l.name, l.grid]),
      ...key.steps,
      ...key.requirements,
    ].join(" "),
  );
  return (
    (!type || key.category === type) &&
    normalizeKeySearch(query)
      .split(/\s+/)
      .filter(Boolean)
      .every((word) => haystack.includes(word))
  );
}
