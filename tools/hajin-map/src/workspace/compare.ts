import type { PlacedRecord } from "./model.ts";
export interface Candidate {
  a: PlacedRecord;
  b: PlacedRecord;
  distance: number;
  uncertain: boolean;
}
export interface CandidateResult {
  pairs: Candidate[];
  truncated: boolean;
  examined: number;
  reason: "pairs" | "work" | null;
}
const byKey = (a: PlacedRecord, b: PlacedRecord) =>
  a.key.localeCompare(b.key, "en");
function compatible(a: PlacedRecord, b: PlacedRecord) {
  return (
    a.applicability.mapId === b.applicability.mapId &&
    a.applicability.coordinateVersion === b.applicability.coordinateVersion &&
    (!a.applicability.gameBuild ||
      !b.applicability.gameBuild ||
      a.applicability.gameBuild === b.applicability.gameBuild) &&
    (!a.applicability.floor ||
      !b.applicability.floor ||
      a.applicability.floor === b.applicability.floor) &&
    a.category.toLocaleLowerCase() === b.category.toLocaleLowerCase()
  );
}
export function suggest(input: PlacedRecord[]): CandidateResult {
  if (input.length > 20000)
    throw new Error("Comparison record limit exceeded.");
  const records = [...input].sort(byKey),
    grid = new Map<string, Map<string, PlacedRecord[]>>(),
    pairs: Candidate[] = [];
  let examined = 0,
    truncated = false,
    reason: CandidateResult["reason"] = null;
  outer: for (const record of records) {
    const gx = Math.floor(record.x / 24),
      gy = Math.floor(record.y / 24);
    const prefix = JSON.stringify([
      record.applicability.mapId,
      record.applicability.coordinateVersion,
      record.category.trim().toLocaleLowerCase(),
    ]);
    const identity = JSON.stringify([record.sourceId, record.snapshotId]);
    for (let x = gx - 1; x <= gx + 1; x++)
      for (let y = gy - 1; y <= gy + 1; y++)
        for (const [group, others] of grid.get(`${prefix}:${x},${y}`) ?? []) {
          if (group === identity) continue;
          for (const other of others) {
            if (examined >= 250000) {
              truncated = true;
              reason = "work";
              break outer;
            }
            examined++;
            if (!compatible(record, other)) continue;
            const distance = Math.hypot(record.x - other.x, record.y - other.y);
            if (distance > 24) continue;
            if (pairs.length === 10000) {
              truncated = true;
              reason = "pairs";
              break outer;
            }
            const [a, b] =
              byKey(record, other) < 0 ? [record, other] : [other, record];
            pairs.push({
              a,
              b,
              distance,
              uncertain:
                !a.applicability.floor ||
                !b.applicability.floor ||
                !a.applicability.gameBuild ||
                !b.applicability.gameBuild,
            });
          }
        }
    const key = `${prefix}:${gx},${gy}`;
    const bucket = grid.get(key) ?? new Map<string, PlacedRecord[]>();
    const group = bucket.get(identity) ?? [];
    group.push(record);
    bucket.set(identity, group);
    grid.set(key, bucket);
  }
  pairs.sort(
    (a, b) => a.distance - b.distance || byKey(a.a, b.a) || byKey(a.b, b.b),
  );
  return { pairs, truncated, examined, reason };
}
