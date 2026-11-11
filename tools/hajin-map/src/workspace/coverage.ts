import type { ExplorerRecord } from "./explorer-index.ts";

export function scopedMapCoverage(records: ExplorerRecord[], keyUses: { grid: string }[] = []) {
  const rows = new Map<string, { source: string; category: string; positioned: number; unlocated: number }>();
  for (const record of records) {
    if (record.kind !== "source") continue;
    const key = `${record.sourceId}\u0000${record.categoryId}`;
    const row = rows.get(key) || { source: record.sourceName, category: record.category, positioned: 0, unlocated: 0 };
    if (record.x !== null && record.y !== null) row.positioned++;
    else row.unlocated++;
    rows.set(key, row);
  }
  return {
    rows: [...rows.values()].sort((a, b) => a.source.localeCompare(b.source) || a.category.localeCompare(b.category)),
    guideKeyGridOnly: keyUses.filter((use) => /^[A-J][1-9]$/.test(use.grid)).length,
    scope: "Loaded source entries in the current map workspace. Guide key-use grids are separate references, not positioned map markers.",
  };
}
