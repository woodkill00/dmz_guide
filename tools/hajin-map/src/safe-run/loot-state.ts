import { exactKeys, pointValid, requireValue, type XY } from "../workspace/roads.ts";
import { validateJsonTree } from "../workspace/validation.ts";

export const lootOptionsKey = "hajin-loot-run-options-v1";
export const lootObservationsKey = "hajin-loot-run-observations-v1";
export interface LootOptions {
  version: 1;
  avoidRestricted: boolean;
  clinicsFirst: boolean;
  maxStops: number | null;
}
export const defaultLootOptions = (): LootOptions => ({
  version: 1,
  avoidRestricted: false,
  clinicsFirst: false,
  maxStops: null,
});
export function parseLootOptions(text: string): LootOptions {
  requireValue(new TextEncoder().encode(text).length <= 1024, "Loot options are too large.");
  const value: unknown = JSON.parse(text);
  validateJsonTree(value);
  exactKeys(value, ["version", "avoidRestricted", "clinicsFirst", "maxStops"]);
  requireValue(value.version === 1 && typeof value.avoidRestricted === "boolean" && typeof value.clinicsFirst === "boolean" && (value.maxStops === null || (typeof value.maxStops === "number" && Number.isInteger(value.maxStops) && value.maxStops >= 1 && value.maxStops <= 64)), "Invalid Loot Run options.");
  return value as unknown as LootOptions;
}

export type ObservationResult = "found" | "not-found" | "blocked";
export interface LootObservation {
  key: string;
  name: string;
  kind: "safe" | "clinic";
  point: XY;
  capturedAt: string;
  observedAt: string;
  gameBuild: string;
  result: ObservationResult;
  note: string;
}
export interface LootJournal { version: 1; observations: LootObservation[] }
export const emptyLootJournal = (): LootJournal => ({ version: 1, observations: [] });
const limitedText = (value: unknown, length: number) => typeof value === "string" && value.length <= length;
const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
export function parseLootJournal(text: string): LootJournal {
  requireValue(new TextEncoder().encode(text).length <= 65536, "Gameplay observations exceed 64KiB.");
  const value: unknown = JSON.parse(text);
  validateJsonTree(value);
  exactKeys(value, ["version", "observations"]);
  requireValue(value.version === 1 && Array.isArray(value.observations) && value.observations.length <= 200, "Invalid gameplay observations.");
  const seen = new Set<string>();
  for (const entry of value.observations as unknown[]) {
    exactKeys(entry, ["key", "name", "kind", "point", "capturedAt", "observedAt", "gameBuild", "result", "note"]);
    const row = entry as unknown as LootObservation;
    requireValue(limitedText(row.key, 240) && /^[\w.:-]+$/.test(row.key) && !seen.has(row.key) && limitedText(row.name, 240) && row.name.length > 0 && ["safe", "clinic"].includes(row.kind) && pointValid(row.point) && limitedText(row.capturedAt, 80) && validDate(row.observedAt) && limitedText(row.gameBuild, 80) && ["found", "not-found", "blocked"].includes(row.result) && limitedText(row.note, 500), "Invalid gameplay observation.");
    seen.add(row.key);
  }
  return value as unknown as LootJournal;
}
