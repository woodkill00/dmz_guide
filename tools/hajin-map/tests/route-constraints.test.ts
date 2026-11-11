import { test } from "node:test";
import assert from "node:assert/strict";
import { routeStopConstraints } from "../src/workspace/route-constraints.ts";
import { recordHandle } from "../src/workspace/field-guide.ts";
import type { ExplorerRecord } from "../src/workspace/explorer-index.ts";

const record = {
  key: "source:test:room", identity: "capture-one", version: "capture-one", id: "room",
  kind: "source", sourceId: "source:test", sourceName: "Fixture source",
  title: "Fixture hospital", category: "Building", categoryId: "building", notes: "",
  x: 100, y: 100, floor: null, build: null, visible: true, status: "unverified",
  capturedAt: null, url: null,
} satisfies ExplorerRecord;

test("route stop warnings distinguish recorded key area, unknown floor and road gap", () => {
  const stop = recordHandle(record);
  const first = routeStopConstraints(stop, 0, [record], [{ locationName: "Fixture hospital" }], "road", true, []);
  assert(first.some((line) => line.includes("1 recorded key use")));
  assert(first.includes("Floor unrecorded"));
  const later = routeStopConstraints(stop, 1, [record], [], "road", true, [{ road: [], connectors: [], roadLength: 0, connectorLength: 0, error: "No connected road" }]);
  assert(later.some((line) => line.includes("Incoming road gap: No connected road")));
  assert(routeStopConstraints(stop, 1, [record], [], "direct", false, []).some((line) => line.includes("straight line")));
  assert(routeStopConstraints({ kind: "manual", id: "manual", x: 1, y: 2, label: "Stop" }, 1, [], [], "road", false, []).includes("Incoming road coverage unavailable"));
});
