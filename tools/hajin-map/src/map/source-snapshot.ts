import { toPixels, type MapPosition } from "./coordinates.ts";
import { hajin } from "./hajin.ts";
import type { MarkerSource } from "./marker-sources.ts";
export interface Category {
  id: string;
  name: string;
  group: string;
  icon: string;
}
export interface SourceRecord extends Omit<MapPosition, "x" | "y"> {
  x: number | null;
  y: number | null;
  placement?: "reference";
  sourceX?: number;
  sourceY?: number;
  id: string;
  name: string;
  category: string;
  floor?: string | number | null;
  notes?: string;
}
export interface Snapshot {
  schemaVersion: number;
  sourcePage: string;
  capturedAt: string;
  categories: Category[];
  records: SourceRecord[];
}

export function parseSnapshot(value: unknown, source: MarkerSource): Snapshot {
  const data = value as Snapshot;
  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.length > 0 && value.length <= max;
  if (
    !data ||
    data.schemaVersion !== 1 ||
    data.sourcePage !== source.page ||
    !text(data.capturedAt, 40) ||
    !Number.isFinite(Date.parse(data.capturedAt)) ||
    !Array.isArray(data.categories) ||
    data.categories.length > 100 ||
    !Array.isArray(data.records) ||
    data.records.length > 5000
  )
    throw new Error("Invalid source snapshot.");
  const categories = new Set<string>();
  for (const c of data.categories) {
    if (
      !text(c.id, 80) ||
      !/^[\w.:-]+$/.test(c.id) ||
      categories.has(c.id) ||
      !text(c.name, 120) ||
      !text(c.group, 80) ||
      !text(c.icon, 260) ||
      !c.icon.startsWith(source.iconDirectory) ||
      !/^[\w.-]+\.(png|svg)$/.test(c.icon.slice(source.iconDirectory.length))
    )
      throw new Error("Invalid source category.");
    categories.add(c.id);
  }
  const ids = new Set<string>();
  for (const record of data.records) {
    if (
      !text(record.id, 100) ||
      !/^[\w.:-]+$/.test(record.id) ||
      ids.has(record.id) ||
      !text(record.name, 200) ||
      !categories.has(record.category)
    )
      throw new Error("Invalid source marker.");
    if (record.placement === "reference") {
      if (
        source.id !== "mapgenie" ||
        record.x !== null ||
        record.y !== null ||
        ![record.sourceX, record.sourceY].every(
          (n) =>
            typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1024,
        )
      )
        throw new Error("Invalid reference entry.");
    } else {
      if (
        record.placement !== undefined ||
        record.x === null ||
        record.y === null
      )
        throw new Error("Invalid source position.");
      toPixels({ ...record, x: record.x, y: record.y }, hajin);
    }
    ids.add(record.id);
    if (
      record.notes !== undefined &&
      (typeof record.notes !== "string" || record.notes.length > 4000)
    )
      throw new Error("Invalid source notes.");
    if (
      record.floor != null &&
      !(typeof record.floor === "string" && text(record.floor, 128)) &&
      !(typeof record.floor === "number" && Number.isFinite(record.floor))
    )
      throw new Error("Invalid source floor.");
  }
  return data;
}
