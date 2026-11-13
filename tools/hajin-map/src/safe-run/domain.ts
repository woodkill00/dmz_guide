import { displayDuplicates } from "../map/display-duplicates.ts";
import { mapCategoryType } from "../map/category-groups.ts";
import { toPixels } from "../map/coordinates.ts";
import { hajin } from "../map/hajin.ts";
import type { Snapshot } from "../map/source-snapshot.ts";
import type { MarkerSource } from "../map/marker-sources.ts";
import {
  distance,
  pointValid,
  requireValue,
  exactKeys,
  roadRoute,
  validateRoadGraph,
  type XY,
  type RoadGraph,
  type RoadLeg,
} from "../workspace/roads.ts";
import { validateJsonTree } from "../workspace/validation.ts";
import {
  classifyAccess,
  mergeAccess,
  type KeyIdentity,
  type SafeAccess,
} from "./access.ts";

export const limits = { candidates: 200, selected: 64, stateBytes: 32768 };
export const stateKey = "hajin-safe-run-v1";
export interface Stop {
  kind?: "safe" | "clinic" | "spawn";
  key: string;
  name: string;
  point: XY;
  sourceId: string;
  sourceName: string;
  sourcePage: string;
  capturedAt: string;
  notes: string;
  floor: string | null;
  matches: string[];
  nearby: number;
  access?: SafeAccess;
}
export interface Preference {
  version: 1;
  frame: "hajin-official-v1-4096";
  known: string[];
  order: string[];
  start: XY | null;
  spawnKey: string | null;
  mode: "direct" | "roads";
  manual: boolean;
}
export interface Dataset {
  safes: Stop[];
  spawns: Stop[];
  referenceOnly: number;
}
export function extractStops(
  captures: { source: MarkerSource; snapshot: Snapshot }[],
  keyCatalog: readonly KeyIdentity[] = [],
  includeClinics = false,
): Dataset {
  requireValue(captures.length <= 5, "Too many sources.");
  const safes: Stop[] = [],
    clinics: Stop[] = [],
    spawns: Stop[] = [];
  let referenceOnly = 0;
  for (const { source, snapshot } of captures) {
    for (const record of snapshot.records) {
      const category = snapshot.categories.find(
        (c) => c.id === record.category,
      )!;
      const kind =
        /^(safe|safes)$/i.test(category.name.trim()) ||
        /^(?:dmz[_-])?safes?$/i.test(category.id)
          ? "safe"
          : /^(spawn point|spawn points|infiltration point|infiltration points)$/i.test(
                category.name.trim(),
              )
            ? "spawn"
            : null;
      const stopKind = kind ??
        (includeClinics &&
        mapCategoryType({ categoryId: category.id, path: [category.group, category.name] }) === "clinic"
          ? "clinic"
          : null);
      if (!stopKind) continue;
      if (
        record.placement === "reference" ||
        record.x === null ||
        record.y === null
      ) {
        referenceOnly++;
        continue;
      }
      const stop: Stop = {
        kind: stopKind,
        key: `${source.id}:${record.id}`,
        name: record.name,
        point: toPixels({ ...record, x: record.x, y: record.y }, hajin),
        sourceId: source.id,
        sourceName: source.name,
        sourcePage: source.page,
        capturedAt: snapshot.capturedAt,
        notes: record.notes ?? "",
        floor: record.floor == null ? null : String(record.floor),
        matches: [],
        nearby: 0,
      };
      if (stopKind === "safe") stop.access = classifyAccess(stop, keyCatalog);
      (stopKind === "safe" ? safes : stopKind === "clinic" ? clinics : spawns).push(stop);
    }
  }
  requireValue(
    safes.length + clinics.length <= limits.candidates && spawns.length <= limits.candidates,
    "More than 200 safe or spawn candidates; refine the local capture before planning.",
  );
  const group = (rows: Stop[], category: string) => {
    const result = displayDuplicates(
      rows.map((s) => ({
        key: s.key,
        sourceId: s.sourceId,
        title: s.name,
        category,
        x: s.point[0],
        y: s.point[1],
        floor: s.floor,
        build: null,
        visible: true,
      })),
    );
    requireValue(!result.truncated, "Duplicate comparison limit reached.");
    for (const g of result.groups) {
      rows.find((s) => s.key === g.representative.key)!.matches = g.members
        .filter((m) => m.key !== g.representative.key)
        .map((m) => m.sourceId + ": " + m.title);
      if (category === "safe")
        rows.find((s) => s.key === g.representative.key)!.access = mergeAccess(
          g.members.map((m) => rows.find((s) => s.key === m.key)!.access!),
        );
    }
    return rows
      .filter((s) => !result.suppressed.has(s.key))
      .sort((a, b) => a.key.localeCompare(b.key, "en"));
  };
  const unique = [...group(safes, "safe"), ...group(clinics, "clinic")]
    .sort((a, b) => a.key.localeCompare(b.key, "en"));
  for (const s of unique)
    s.nearby = unique.filter(
      (t) =>
        t.key !== s.key &&
        t.sourceId !== s.sourceId &&
        t.kind === s.kind &&
        distance(s.point, t.point) <= 24,
    ).length;
  return { safes: unique, spawns: group(spawns, "spawn"), referenceOnly };
}
const validId = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 240 && /^[\w.:-]+$/.test(v);
export function parsePreference(text: string): Preference {
  requireValue(
    new TextEncoder().encode(text).length <= limits.stateBytes,
    "Saved safe-run preferences exceed 32KiB.",
  );
  const p: unknown = JSON.parse(text);
  validateJsonTree(p);
  exactKeys(p, [
    "version",
    "frame",
    "known",
    "order",
    "start",
    "spawnKey",
    "mode",
    "manual",
  ]);
  requireValue(
    p.version === 1 &&
      p.frame === hajin.coordinateSpaceVersion &&
      ["direct", "roads"].includes(p.mode as string) &&
      typeof p.manual === "boolean",
    "Invalid safe-run preferences.",
  );
  requireValue(
    Array.isArray(p.known) &&
      p.known.length <= limits.candidates &&
      p.known.every(validId) &&
      new Set(p.known).size === p.known.length,
    "Invalid known safes.",
  );
  requireValue(
    Array.isArray(p.order) &&
      p.order.length <= limits.selected &&
      p.order.every(
        (id) => validId(id) && (p.known as string[]).includes(id),
      ) &&
      new Set(p.order).size === p.order.length,
    "Invalid safe order.",
  );
  requireValue(
    (p.start === null || pointValid(p.start)) &&
      (p.spawnKey === null || (validId(p.spawnKey) && p.start !== null)),
    "Invalid start position.",
  );
  return p as unknown as Preference;
}
export function reconcile(
  previous: Preference | null,
  data: Dataset,
): { preference: Preference; notices: string[] } {
  const ids = data.safes.map((s) => s.key),
    notices: string[] = [];
  const p: Preference = previous
    ? structuredClone(previous)
    : {
        version: 1,
        frame: "hajin-official-v1-4096",
        known: [],
        order: [],
        start: null,
        spawnKey: null,
        mode: "direct",
        manual: false,
      };
  const retained = p.order.filter((id) => ids.includes(id)),
    added = ids.filter((id) => !p.known.includes(id));
  if (p.order.length !== retained.length)
    notices.push("Unavailable entries were removed from this route.");
  if (retained.length + added.length <= limits.selected)
    p.order = [...retained, ...added];
  else {
    p.order = retained;
    notices.push(
      `${added.length} new candidates left unselected: choose up to 64 stops.`,
    );
  }
  p.known = ids;
  if (p.spawnKey) {
    const spawn = data.spawns.find((s) => s.key === p.spawnKey);
    if (spawn) {
      if (p.start && distance(p.start, spawn.point) > 0.001)
        notices.push("Spawn position updated from the current capture.");
      p.start = [...spawn.point];
    } else {
      p.start = null;
      p.spawnKey = null;
      notices.push("Saved spawn is no longer available; choose a start.");
    }
  }
  return { preference: p, notices };
}
export interface SolveInput {
  start: XY;
  stops: { key: string; point: XY }[];
  mode: "direct" | "roads";
  optimize: boolean;
  graph: RoadGraph | null;
}
export interface SolveOutput {
  order: string[];
  legs: RoadLeg[];
  total: number;
  missing: number;
}
export function solveRun(input: SolveInput): SolveOutput {
  requireValue(
    pointValid(input.start) &&
      Array.isArray(input.stops) &&
      input.stops.length <= limits.selected &&
      input.stops.every((s) => validId(s.key) && pointValid(s.point)) &&
      new Set(input.stops.map((s) => s.key)).size === input.stops.length,
    "Invalid safe-run stops.",
  );
  requireValue(
    ["direct", "roads"].includes(input.mode) &&
      typeof input.optimize === "boolean",
    "Invalid route mode.",
  );
  if (input.mode === "roads") {
    requireValue(input.graph, "No local road network available.");
    validateRoadGraph(input.graph);
  }
  const leg = (a: XY, b: XY): RoadLeg =>
    input.mode === "roads"
      ? roadRoute(input.graph!, a, b)
      : {
          road: [a, b],
          connectors: [],
          roadLength: distance(a, b),
          connectorLength: 0,
          error: null,
        };
  const remaining = [...input.stops],
    ordered: typeof remaining = [],
    legs: RoadLeg[] = [];
  let at = input.start;
  while (remaining.length) {
    let index = 0,
      best = Infinity,
      chosen: RoadLeg | undefined;
    if (input.optimize)
      for (let i = 0; i < remaining.length; i++) {
        const l = leg(at, remaining[i].point),
          cost = l.error ? Infinity : l.roadLength + l.connectorLength;
        if (
          !chosen ||
          cost < best ||
          (cost === best && remaining[i].key < remaining[index].key)
        ) {
          index = i;
          best = cost;
          chosen = l;
        }
      }
    const next = remaining.splice(index, 1)[0];
    ordered.push(next);
    legs.push(chosen ?? leg(at, next.point));
    at = next.point;
  }
  return {
    order: ordered.map((s) => s.key),
    legs,
    total: legs.reduce((n, l) => n + l.roadLength + l.connectorLength, 0),
    missing: legs.filter((l) => l.error).length,
  };
}
