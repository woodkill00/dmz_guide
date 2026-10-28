import type { Workspace } from "./model.ts";
import { placedRecords } from "./backup.ts";
import { sourcePolicies } from "./policy.ts";
import { isVisible } from "./visibility.ts";
import { captureIdentity, pairKey } from "./usability.ts";
import { displayKind, type DisplayRecord } from "../map/display-duplicates.ts";
export interface ExplorerRecord {
  key: string;
  identity: string | null;
  id: string;
  kind: "source" | "custom" | "reviewed";
  sourceId: string;
  sourceName: string;
  title: string;
  category: string;
  categoryId: string;
  notes: string;
  x: number | null;
  y: number | null;
  floor: string | null;
  build: string | null;
  visible: boolean;
  status: string;
  capturedAt: string | null;
  url: string | null;
}
export interface LocalCapture {
  id: string;
  getSnapshotDigest: () => string | undefined;
  getSnapshot: () =>
    | {
        capturedAt: string;
        categories: { id: string; name: string }[];
        records: {
          id: string;
          name: string;
          category: string;
          x: number;
          y: number;
          floor?: string | number | null;
          notes?: string;
        }[];
      }
    | undefined;
}
export function loadedIdentity(source: LocalCapture, id: string) {
  const s = source.getSnapshot(),
    digest = source.getSnapshotDigest();
  return s && digest
    ? captureIdentity(source.id, `loaded-${s.capturedAt}`, digest, id)
    : null;
}
export function explorerRecords(
  state: Workspace,
  legacy: LocalCapture[],
  selected = new Map<string, string>(),
): ExplorerRecord[] {
  const entries = new Map(state.snapshots.map((e) => [e.snapshot.sourceId, e]));
  for (const [id, key] of selected) {
    const e = state.snapshots.find((e) => e.key === key);
    if (e) entries.set(id, e);
  }
  const records: ExplorerRecord[] = [],
    v = state.visibility;
  for (const source of legacy) {
    if (entries.has(source.id) && !entries.get(source.id)!.legacy) continue;
    const s = source.getSnapshot();
    if (!s) continue;
    const categories = new Map(s.categories.map((c) => [c.id, c.name]));
    for (const r of s.records)
      records.push({
        key: JSON.stringify([source.id, "loaded", r.id]),
        identity: loadedIdentity(source, r.id),
        id: r.id,
        kind: "source",
        sourceId: source.id,
        sourceName: sourcePolicies[source.id].name,
        title: r.name,
        category: categories.get(r.category) ?? r.category,
        categoryId: r.category,
        notes: r.notes ?? "",
        x: r.x * 4096,
        y: r.y * 4096,
        floor: r.floor == null ? null : String(r.floor),
        build: null,
        visible: isVisible(
          v,
          source.id,
          r.category,
          `${r.name} ${r.category}`,
          true,
        ),
        status: "Source claim · not independently verified",
        capturedAt: s.capturedAt,
        url: sourcePolicies[source.id].page,
      });
  }
  const placed = new Map(placedRecords(state, selected).map((r) => [r.key, r]));
  for (const entry of entries.values()) {
    if (entry.legacy) continue;
    const s = entry.snapshot,
      categories = new Map(s.categories.map((c) => [c.id, c.path.join(" / ")]));
    for (const r of s.records) {
      const key = JSON.stringify([s.sourceId, s.snapshotId, r.id]),
        p = placed.get(key);
      records.push({
        key,
        identity: captureIdentity(s.sourceId, s.snapshotId, entry.digest, r.id),
        id: r.id,
        kind: "source",
        sourceId: s.sourceId,
        sourceName: sourcePolicies[s.sourceId].name,
        title: r.title,
        category: categories.get(r.categoryId) ?? r.categoryId,
        categoryId: r.categoryId,
        notes: r.evidence.map((e) => e.note).join("\n"),
        x: p?.x ?? null,
        y: p?.y ?? null,
        floor: r.applicability.floor,
        build: r.applicability.gameBuild,
        visible:
          !!p &&
          isVisible(
            v,
            s.sourceId,
            r.categoryId,
            `${r.title} ${p.category}`,
            true,
          ),
        status: `Source claim · ${r.activityClaim.state}${r.activityClaim.observedAt ? " · " + r.activityClaim.observedAt : ""}`,
        capturedAt: s.capturedAt,
        url: sourcePolicies[s.sourceId].page,
      });
    }
  }
  for (const a of state.annotations)
    records.push({
      key: "custom:" + a.id,
      identity: null,
      id: a.id,
      kind: "custom",
      sourceId: "custom",
      sourceName: "My points",
      title: a.title,
      category: a.category,
      categoryId: a.category,
      notes: [a.notes, a.evidence].filter(Boolean).join("\n"),
      x: a.x,
      y: a.y,
      floor: a.applicability.floor,
      build: a.applicability.gameBuild,
      visible:
        v.customEnabled &&
        `${a.title} ${a.category} ${a.notes}`
          .toLowerCase()
          .includes(v.query.trim().toLowerCase()),
      status: `My observation · ${a.verificationState}`,
      capturedAt: a.updatedAt,
      url: null,
    });
  for (const e of state.entities)
    records.push({
      key: "reviewed:" + e.id,
      identity: null,
      id: e.id,
      kind: "reviewed",
      sourceId: "reviewed",
      sourceName: "Reviewed map",
      title: e.title,
      category: e.category,
      categoryId: e.category,
      notes: e.notes,
      x: e.x,
      y: e.y,
      floor: e.applicability.floor,
      build: e.applicability.gameBuild,
      visible:
        v.curatedEnabled &&
        e.acceptance === "accepted" &&
        `${e.title} ${e.category}`
          .toLowerCase()
          .includes(v.query.trim().toLowerCase()),
      status: `Reviewed · ${e.acceptance} · ${e.freshness}`,
      capturedAt: null,
      url: null,
    });
  return records;
}
export function asDisplay(r: ExplorerRecord): DisplayRecord | null {
  return r.kind === "source" && r.x !== null && r.y !== null
    ? {
        key: r.key,
        identity: r.identity ?? undefined,
        sourceId: r.sourceId,
        title: r.title,
        category: r.categoryId,
        x: r.x,
        y: r.y,
        floor: r.floor,
        build: r.build,
        visible: r.visible,
      }
    : null;
}
const normalized = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export interface Coverage {
  record: ExplorerRecord;
  state:
    | "matched"
    | "uncertain"
    | "not-found"
    | "kept-separate"
    | "unplaced"
    | "incomplete";
  reason: string;
  official: ExplorerRecord[];
}
export function coverage(
  records: ExplorerRecord[],
  separate: readonly { a: string; b: string }[] = [],
  limit = 250000,
) {
  const official = records.filter(
      (r) =>
        r.kind === "source" &&
        r.sourceId === "official" &&
        r.x !== null &&
        r.y !== null,
    ),
    grid = new Map<string, ExplorerRecord[]>(),
    names = new Map<string, ExplorerRecord[]>(),
    blocked = new Set(separate.map((p) => pairKey(p.a, p.b)));
  if (!official.length)
    return { available: false, rows: [] as Coverage[], truncated: false };
  for (const r of official) {
    const k = displayKind(r.categoryId),
      cell = `${k}:${Math.floor(r.x! / 24)},${Math.floor(r.y! / 24)}`,
      bucket = grid.get(cell) ?? [];
    bucket.push(r);
    grid.set(cell, bucket);
    const n = k + ":" + normalized(r.title),
      same = names.get(n) ?? [];
    same.push(r);
    names.set(n, same);
  }
  let examined = 0,
    truncated = false;
  const rows: Coverage[] = [];
  for (const r of records.filter(
    (r) => r.kind === "source" && r.sourceId !== "official",
  )) {
    if (r.x === null || r.y === null) {
      rows.push({
        record: r,
        state: "unplaced",
        reason: "Source frame is not registered.",
        official: [],
      });
      continue;
    }
    if (truncated) {
      rows.push({
        record: r,
        state: "incomplete",
        reason: "Comparison work limit reached; not classified as missing.",
        official: [],
      });
      continue;
    }
    const k = displayKind(r.categoryId),
      gx = Math.floor(r.x / 24),
      gy = Math.floor(r.y / 24),
      candidates: ExplorerRecord[] = [];
    let matched: ExplorerRecord | undefined,
      kept = false;
    outer: for (let x = gx - 1; x <= gx + 1; x++)
      for (let y = gy - 1; y <= gy + 1; y++)
        for (const o of grid.get(`${k}:${x},${y}`) ?? []) {
          if (++examined > limit) {
            truncated = true;
            break outer;
          }
          if (Math.hypot(r.x - o.x!, r.y - o.y!) > 24) continue;
          if (candidates.length < 5) candidates.push(o);
          const compatible =
            (!r.floor || !o.floor || r.floor === o.floor) &&
            (!r.build || !o.build || r.build === o.build);
          if (
            compatible &&
            normalized(r.title) &&
            normalized(r.title) === normalized(o.title)
          ) {
            if (
              r.identity &&
              o.identity &&
              blocked.has(pairKey(r.identity, o.identity))
            ) {
              kept = true;
              continue;
            }
            if (
              r.floor === null ||
              o.floor === null ||
              r.build === null ||
              o.build === null
            )
              continue;
            matched = o;
            break outer;
          }
        }
    if (!matched && !truncated && !candidates.length) {
      for (const o of names.get(k + ":" + normalized(r.title)) ?? []) {
        if (++examined > limit) {
          truncated = true;
          break;
        }
        if (candidates.length < 5) candidates.push(o);
        if (candidates.length === 5) break;
      }
    }
    const state = matched
      ? "matched"
      : truncated
        ? "incomplete"
        : kept
          ? "kept-separate"
          : candidates.length
            ? "uncertain"
            : "not-found";
    rows.push({
      record: r,
      state,
      reason:
        state === "matched"
          ? "Name/location match in loaded official data; unknown applicability is not verification."
          : state === "incomplete"
            ? "Comparison work limit reached; not classified as missing."
            : state === "kept-separate"
              ? "You kept this capture separate."
              : state === "uncertain"
                ? "Nearby category, conflicting applicability, or matching name at another position: review required."
                : "No match found in loaded official data. This is not proof of game completeness.",
      official: matched ? [matched] : candidates,
    });
  }
  return { available: true, rows, truncated };
}
