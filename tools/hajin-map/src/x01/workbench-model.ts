import type { HubSnapshot, HubMarker } from "./dmzhub-model.ts";
import type { X01Snapshot, X01Marker } from "./model.ts";

export type Floor = 1 | 2;
export type Alignment = {
  floor: Floor;
  anchors: { codId: string; hubId: string; name: string; error: number }[];
  x: { scale: number; offset: number };
  y: { scale: number; offset: number };
  rmse: number;
  maxError: number;
  accepted: boolean;
};
export type Candidate = {
  id: string;
  codId: string;
  hubId: string;
  floor: Floor;
  distance: number;
  reason: "same name" | "same type";
};
const name = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
function fit(pairs: { from: number; to: number }[]) {
  const meanFrom = pairs.reduce((sum, row) => sum + row.from, 0) / pairs.length,
    meanTo = pairs.reduce((sum, row) => sum + row.to, 0) / pairs.length;
  const denominator = pairs.reduce(
    (sum, row) => sum + (row.from - meanFrom) ** 2,
    0,
  );
  if (denominator < 0.01) throw Error("Landmarks do not span the floor");
  const scale =
    pairs.reduce(
      (sum, row) => sum + (row.from - meanFrom) * (row.to - meanTo),
      0,
    ) / denominator;
  return { scale, offset: meanTo - scale * meanFrom };
}
export function deriveAlignment(
  hub: HubSnapshot,
  cod: X01Snapshot,
  floor: Floor,
): Alignment {
  const hubNames = new Map<string, HubMarker[]>();
  for (const row of hub.markers.filter(
    (row) => row.floor === floor && row.title,
  )) {
    const key = name(row.title!);
    hubNames.set(key, [...(hubNames.get(key) || []), row]);
  }
  const codNames = new Map<string, X01Marker[]>();
  for (const row of cod.markers.filter((row) => row.floor === floor)) {
    const key = name(row.name);
    codNames.set(key, [...(codNames.get(key) || []), row]);
  }
  const pairs: { cod: X01Marker; hub: HubMarker }[] = [];
  for (const [key, rows] of codNames) {
    const others = hubNames.get(key);
    if (key && rows.length === 1 && others?.length === 1)
      pairs.push({ cod: rows[0], hub: others[0] });
  }
  if (pairs.length < 6)
    throw Error("Not enough unique named landmarks to align this floor");
  const x = fit(pairs.map((row) => ({ from: row.cod.x, to: row.hub.x }))),
    y = fit(pairs.map((row) => ({ from: row.cod.y, to: row.hub.y })));
  const anchors = pairs.map(({ cod, hub }) => ({
    codId: cod.id,
    hubId: hub.id,
    name: cod.name,
    error: Math.hypot(
      hub.x - (x.offset + x.scale * cod.x),
      hub.y - (y.offset + y.scale * cod.y),
    ),
  }));
  const rmse = Math.sqrt(
      anchors.reduce((sum, row) => sum + row.error ** 2, 0) / anchors.length,
    ),
    maxError = Math.max(...anchors.map((row) => row.error));
  return {
    floor,
    anchors,
    x,
    y,
    rmse,
    maxError,
    accepted:
      rmse <= 0.015 &&
      maxError <= 0.035 &&
      x.scale > 0.4 &&
      x.scale < 1 &&
      y.scale > 0.4 &&
      y.scale < 1,
  };
}
export function alignPoint(
  row: { x: number; y: number },
  alignment: Alignment,
) {
  if (!alignment.accepted) throw Error("X01 alignment quality is insufficient");
  return {
    x: alignment.x.offset + alignment.x.scale * row.x,
    y: alignment.y.offset + alignment.y.scale * row.y,
  };
}
const compatible: Record<string, string[]> = {
  poi: ["major-poi-labels", "minor-poi-labels"],
  spawn: ["player-s-spawn"],
  exfil: ["exfiltration", "emergency-exfil"],
  key: ["key-room"],
  stash: ["core-room"],
  printer: ["3d-printer"],
  encoder: ["keycard-encoder"],
  ammo: ["ammo-armor-cache"],
  conn: ["stairs", "ascender"],
  bounty: ["bounty-terminal"],
};
export function candidateMatches(
  hub: HubSnapshot,
  cod: X01Snapshot,
  alignment: Alignment,
): Candidate[] {
  if (!alignment.accepted) return [];
  const candidates: Candidate[] = [];
  const hubRows = hub.markers.filter((row) => row.floor === alignment.floor);
  const categoryById = new Map(hub.categories.map((row) => [row.id, row.slug]));
  for (const source of cod.markers.filter(
    (row) => row.floor === alignment.floor,
  )) {
    const mapped = alignPoint(source, alignment);
    const nearby: Candidate[] = [];
    for (const row of hubRows) {
      const distance = Math.hypot(row.x - mapped.x, row.y - mapped.y);
      if (distance > 0.03) continue;
      const sameName = !!row.title && name(row.title) === name(source.name);
      const sameType =
        compatible[source.layer]?.includes(
          categoryById.get(row.categoryId) || "",
        ) && distance <= 0.012;
      if (!sameName && !sameType) continue;
      nearby.push({
        id: `${source.id}__${row.id}`,
        codId: source.id,
        hubId: row.id,
        floor: alignment.floor,
        distance,
        reason: sameName ? "same name" : "same type",
      });
      nearby.sort(
        (a, b) =>
          (a.reason === "same name" ? 0 : 1) -
            (b.reason === "same name" ? 0 : 1) || a.distance - b.distance,
      );
      if (nearby.length > 3) nearby.pop();
    }
    candidates.push(...nearby);
    if (candidates.length >= 100) break;
  }
  return candidates.sort((a, b) => a.distance - b.distance).slice(0, 100);
}
export type Change = {
  kind:
    | "added"
    | "removed"
    | "renamed"
    | "moved"
    | "floor"
    | "metadata"
    | "snapshot";
  id: string;
  before?: string;
  after?: string;
  distance?: number;
};
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
export function sourceDiff<
  T extends { id: string; x: number; y: number; floor?: number },
>(before: T[], after: T[], label: (row: T) => string): Change[] {
  if (before.length > 500 || after.length > 500)
    throw Error("Source update exceeds 500 markers");
  const old = new Map(before.map((row) => [row.id, row])),
    next = new Map(after.map((row) => [row.id, row]));
  if (old.size !== before.length || next.size !== after.length)
    throw Error("Duplicate source marker ID");
  const changes: Change[] = [];
  for (const row of after) {
    const previous = old.get(row.id);
    if (!previous) {
      changes.push({ kind: "added", id: row.id, after: label(row) });
      continue;
    }
    if (label(previous) !== label(row))
      changes.push({
        kind: "renamed",
        id: row.id,
        before: label(previous),
        after: label(row),
      });
    if (previous.floor !== row.floor)
      changes.push({
        kind: "floor",
        id: row.id,
        before: String(previous.floor),
        after: String(row.floor),
      });
    const distance = Math.hypot(row.x - previous.x, row.y - previous.y);
    if (distance > 0.0001)
      changes.push({ kind: "moved", id: row.id, distance });
    const semantic = (value: T) => {
      const copy = { ...value } as Record<string, unknown>;
      for (const key of ["id", "x", "y", "floor", "name", "title"])
        delete copy[key];
      return stableJson(copy);
    };
    if (semantic(previous) !== semantic(row))
      changes.push({
        kind: "metadata",
        id: row.id,
        before: semantic(previous),
        after: semantic(row),
      });
  }
  for (const row of before)
    if (!next.has(row.id))
      changes.push({ kind: "removed", id: row.id, before: label(row) });
  return changes;
}
export type Connector = {
  first: HubMarker;
  second: HubMarker;
  kind: "stairs" | "ascender";
  distance: number;
  provisional: true;
};
export function pairedConnectors(hub: HubSnapshot): Connector[] {
  const pairs: Connector[] = [];
  for (const kind of ["stairs", "ascender"] as const) {
    const category = hub.categories.find((row) => row.slug === kind);
    if (!category) continue;
    const first = hub.markers.filter(
        (row) => row.floor === 1 && row.categoryId === category.id,
      ),
      second = hub.markers.filter(
        (row) => row.floor === 2 && row.categoryId === category.id,
      );
    for (const a of first) {
      const ranked = second
          .map((b) => ({ b, d: Math.hypot(a.x - b.x, a.y - b.y) }))
          .sort((x, y) => x.d - y.d),
        top = ranked[0];
      if (!top || top.d > 0.02) continue;
      const reverse = first
        .map((b) => ({ b, d: Math.hypot(b.x - top.b.x, b.y - top.b.y) }))
        .sort((x, y) => x.d - y.d)[0];
      if (reverse?.b.id === a.id)
        pairs.push({
          first: a,
          second: top.b,
          kind,
          distance: top.d,
          provisional: true,
        });
    }
  }
  return pairs;
}
export type Stop = {
  id: string;
  floor: Floor;
  x: number;
  y: number;
  name: string;
  keyRoom?: boolean;
};
export type RouteLeg = {
  from: Stop;
  to: Stop;
  connector?: Connector;
  distance: number;
  warning: string;
};
export function routeLegs(stops: Stop[], connectors: Connector[]): RouteLeg[] {
  if (stops.length > 30) throw Error("Route exceeds 30 stops");
  const legs: RouteLeg[] = [];
  for (let index = 1; index < stops.length; index++) {
    const from = stops[index - 1],
      to = stops[index];
    if (from.floor === to.floor) {
      legs.push({
        from,
        to,
        distance: Math.hypot(from.x - to.x, from.y - to.y),
        warning: to.keyRoom
          ? "Key-room access needs in-game confirmation."
          : "Straight-line schematic; corridor access unverified.",
      });
      continue;
    }
    const ranked = connectors
      .map((connector) => {
        const start = from.floor === 1 ? connector.first : connector.second,
          end = to.floor === 1 ? connector.first : connector.second;
        return {
          connector,
          distance:
            Math.hypot(from.x - start.x, from.y - start.y) +
            Math.hypot(to.x - end.x, to.y - end.y),
        };
      })
      .sort((a, b) => a.distance - b.distance);
    const chosen = ranked[0];
    legs.push({
      from,
      to,
      connector: chosen?.connector,
      distance: chosen?.distance ?? Infinity,
      warning: chosen
        ? `Possible ${chosen.connector.kind} pairing inferred from nearby source markers; floor connection and door/corridor access unverified.`
        : "No nearby floor-connector hypothesis is available.",
    });
  }
  return legs;
}
