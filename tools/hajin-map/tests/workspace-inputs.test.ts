import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSnapshot,
  validateJsonTree,
  validateSnapshotCollection,
  LIMITS,
} from "../src/workspace/validation.ts";

import { syntheticSnapshot } from "./fixtures/workspace.ts";

test("snapshot validation makes an immutable independent copy and preserves raw coordinates/unknowns", () => {
  const input = syntheticSnapshot();
  const parsed = parseSnapshot(JSON.stringify(input), "synthetic");
  input.records[0].title = "changed";
  assert.equal(parsed.records[0].title, "SYNTHETIC TEST POINT");
  assert.equal(parsed.records[0].rawGeometry.x, 25);
  assert.equal(parsed.records[0].applicability.floor, null);
  assert.ok(Object.isFrozen(parsed.records[0].rawGeometry));
  assert.throws(() => {
    parsed.records[0].title = "mutated";
  });
});

test("rejects schema, provider mismatch, permission injection and unknown fields", () => {
  for (const patch of [
    { schemaVersion: 2 },
    { sourceId: "other" },
    { permissionEvidence: "self-granted" },
    { acquisitionStatus: "authorized" },
  ]) {
    assert.throws(() =>
      parseSnapshot(
        JSON.stringify({ ...syntheticSnapshot(), ...patch }),
        "synthetic",
      ),
    );
  }
});

test("rejects duplicate IDs, missing category references and incompatible record applicability", () => {
  const duplicate = syntheticSnapshot();
  duplicate.records.push(structuredClone(duplicate.records[0]));
  assert.throws(() => parseSnapshot(JSON.stringify(duplicate), "synthetic"));
  const category = syntheticSnapshot();
  category.records[0].categoryId = "missing";
  assert.throws(() => parseSnapshot(JSON.stringify(category), "synthetic"));
  const map = syntheticSnapshot();
  map.records[0].applicability.mapId = "different-map";
  assert.throws(() => parseSnapshot(JSON.stringify(map), "synthetic"));
});

test("rejects geometry, bounds, false activity timestamps and unsafe evidence URLs", () => {
  for (const point of [
    { kind: "line", x: 1, y: 2 },
    { kind: "point", x: 101, y: 0 },
    { kind: "point", x: null, y: 2 },
  ]) {
    const input = syntheticSnapshot();
    Object.assign(input.records[0].rawGeometry, point);
    assert.throws(() => parseSnapshot(JSON.stringify(input), "synthetic"));
  }
  const active = syntheticSnapshot();
  Object.assign(active.records[0].activityClaim, { state: "observed-active" });
  assert.throws(() => parseSnapshot(JSON.stringify(active), "synthetic"));
  const url = syntheticSnapshot();
  (url.records[0].evidence as unknown[]).push({
    note: "test",
    url: "javascript:alert(1)",
  });
  assert.throws(() => parseSnapshot(JSON.stringify(url), "synthetic"));
});

test("bounds byte size before parse, record/category counts, titles and nesting", () => {
  assert.throws(
    () => parseSnapshot(" ".repeat(LIMITS.snapshotBytes + 1), "synthetic"),
    /byte/i,
  );
  const input = syntheticSnapshot();
  input.records = Array(5001).fill(input.records[0]);
  assert.throws(() => parseSnapshot(JSON.stringify(input), "synthetic"));
  const title = syntheticSnapshot();
  title.records[0].title = "x".repeat(201);
  assert.throws(() => parseSnapshot(JSON.stringify(title), "synthetic"));
  let deep: unknown = 1;
  for (let i = 0; i < 18; i++) deep = [deep];
  assert.throws(() => validateJsonTree(deep), /depth/i);
});

test("inert JSON validation rejects dangerous keys, nonfinite values, cycles and non-JSON objects", () => {
  for (const value of [
    JSON.parse('{"__proto__":{}}'),
    JSON.parse('{"constructor":{}}'),
    { n: Infinity },
    new Date(),
    { n: undefined },
  ]) {
    assert.throws(() => validateJsonTree(value));
  }
  const circular: unknown[] = [];
  circular.push(circular);
  assert.throws(() => validateJsonTree(circular));
});

test("array accessors, extra properties, symbols and custom prototypes are rejected without executing them", () => {
  let invoked = 0;
  const getter: unknown[] = [];
  Object.defineProperty(getter, "extra", {
    enumerable: true,
    get() {
      invoked++;
      return "unexpected";
    },
  });
  assert.throws(() => validateJsonTree(getter));
  assert.equal(invoked, 0);
  const symbol: unknown[] = [];
  symbol[Symbol("hidden")] = "value";
  const extra: unknown[] = [];
  Object.assign(extra, { extra: 1 });
  const custom: unknown[] = [];
  Object.setPrototypeOf(custom, {});
  for (const array of [symbol, extra, custom])
    assert.throws(() => validateJsonTree(array));
});

test("aggregate snapshot admission scopes identities and bounds retained source data", () => {
  const one = parseSnapshot(
    JSON.stringify(syntheticSnapshot("first")),
    "first",
  );
  const two = parseSnapshot(
    JSON.stringify(syntheticSnapshot("second")),
    "second",
  );
  assert.doesNotThrow(() => validateSnapshotCollection([one, two]));
  assert.throws(() => validateSnapshotCollection([one, one]));
  assert.throws(() => validateSnapshotCollection(Array(21).fill(one)));
  const providers = Array.from({ length: 6 }, (_, i) =>
    parseSnapshot(
      JSON.stringify(syntheticSnapshot(`source-${i}`)),
      `source-${i}`,
    ),
  );
  assert.doesNotThrow(()=>validateSnapshotCollection(providers.slice(0,5)));
  assert.throws(() => validateSnapshotCollection(providers));
  const full = parseSnapshot(
    JSON.stringify(syntheticSnapshot("first", 5000)),
    "first",
  );
  const refresh = parseSnapshot(
    JSON.stringify({
      ...syntheticSnapshot("first"),
      snapshotId: "new-revision",
    }),
    "first",
  );
  assert.throws(() => validateSnapshotCollection([full, refresh]));
});
