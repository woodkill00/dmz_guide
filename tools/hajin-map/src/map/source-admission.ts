/** Whole-source admission preserves the20k aggregate processing budget.
 * Imported workspace heads are authoritative; otherwise prefer enabled sources,
 * official first and the newly added provider last. Raw captures remain intact. */
export function sourceAdmission(
  workspace: ReadonlyMap<string, number>,
  loaded: ReadonlyMap<string, number>,
  enabled: Readonly<Record<string, boolean>>,
  limit = 20000,
) {
  let used = 0;
  const excluded = new Set<string>();
  for (const count of workspace.values()) {
    if (!Number.isInteger(count) || count < 0 || count > 5000)
      throw Error("Invalid source record count.");
    used += count;
  }
  if (used > limit) throw Error("Workspace source record limit exceeded.");
  const entries = [...loaded]
    .filter(([id]) => !workspace.has(id))
    .sort(
      ([a], [b]) =>
        Number(enabled[a] === false) - Number(enabled[b] === false) ||
        Number(b === "official") - Number(a === "official") ||
        Number(a === "mapgenie") - Number(b === "mapgenie") ||
        a.localeCompare(b, "en"),
    );
  for (const [id, count] of entries) {
    if (!Number.isInteger(count) || count < 0 || count > 5000)
      throw Error("Invalid source record count.");
    if (used + count > limit) excluded.add(id);
    else used += count;
  }
  return { excluded, used };
}
