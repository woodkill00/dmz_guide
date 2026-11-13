import { filterShopping } from "./collection-workbench.mjs";

/** A bounded presentation order over the existing read-only collection projection. */
export function connectedPreparation(model, limit = 8) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
    throw Error("Invalid preparation limit");
  const rank = (row) =>
    (row.state === "short" ? 0 : row.state === "review" ? 1 : 2) * 4 +
    (row.tracked ? 0 : row.next ? 1 : 2);
  const rows = filterShopping(model, { hideCovered: true }).sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.item.name.localeCompare(b.item.name) ||
      a.id.localeCompare(b.id),
  );
  return {
    actions: rows.slice(0, limit).map((row) => ({
      id: row.id,
      name: row.item.name,
      state: row.state,
      missing: row.missing ?? null,
      knownMissing: row.knownMissing ?? 0,
      unit: row.item.unit,
      cause:
        row.tracked && row.next
          ? "Tracked mission and next upgrade"
          : row.tracked
            ? "Tracked mission"
            : row.next
              ? "Next upgrade"
              : "Listed unfinished goal",
      rootIds: row.rootIds,
      craft: row.craft,
    })),
    total: rows.length,
    partial: model.limited,
  };
}
