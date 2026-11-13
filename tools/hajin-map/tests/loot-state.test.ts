import assert from "node:assert/strict";
import test from "node:test";
import { defaultLootOptions, emptyLootJournal, parseLootOptions, parseLootJournal } from "../src/safe-run/loot-state.ts";

test("079 route options enforce bounds and reject extra data", () => {
  assert.deepEqual(parseLootOptions(JSON.stringify(defaultLootOptions())), defaultLootOptions());
  assert.throws(() => parseLootOptions(JSON.stringify({ ...defaultLootOptions(), maxStops: 65 })));
  assert.throws(() => parseLootOptions(JSON.stringify({ ...defaultLootOptions(), unknown: true })));
});
test("079 gameplay checks validate source binding and bounded player notes", () => {
  const entry = { key: "official:clinic-a", name: "SYNTHETIC Clinic", kind: "clinic", point: [10, 20], capturedAt: "2026-11-13T00:00:00Z", observedAt: "2026-11-13", gameBuild: "SYNTHETIC build", result: "found", note: "SYNTHETIC observation" };
  assert.deepEqual(parseLootJournal(JSON.stringify({ version: 1, observations: [entry] })).observations[0], entry);
  assert.deepEqual(parseLootJournal(JSON.stringify(emptyLootJournal())), emptyLootJournal());
  assert.throws(() => parseLootJournal(JSON.stringify({ version: 1, observations: [entry, entry] })));
  assert.throws(() => parseLootJournal(JSON.stringify({ version: 1, observations: [{ ...entry, note: "x".repeat(501) }] })));
  assert.throws(() => parseLootJournal(JSON.stringify({ version: 1, observations: [{ ...entry, point: [-1, 20] }] })));
  assert.throws(() => parseLootJournal(JSON.stringify({ version: 1, observations: [{ ...entry, observedAt: "2026-02-30" }] })));
});
