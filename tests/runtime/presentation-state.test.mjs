import assert from "node:assert/strict";
import test from "node:test";
import { createPresentationState } from "../../src/ui/presentation-state.mjs";

// Synthetic view identities only: no profiles, source captures or browser storage.
const context = (change = {}) => ({
  workspace: "map",
  pack: "synthetic-pack",
  profile: "synthetic-profile",
  revision: 1,
  capture: "capture-a",
  ...change,
});
const view = (change = {}) => ({
  query: "",
  scope: "map",
  sort: "name",
  group: "facilities",
  filters: { "filter-state": "all" },
  expanded: ["group-a"],
  scroll: { anchor: "row-a", offset: 80 },
  focusKey: "row-a",
  detail: null,
  ...change,
});
function fixture(extraControls = []) {
  const controls = new Set([
    "filter-state", "group-a", "group-b", "row-a", "row-b", ...extraControls,
  ]);
  const records = new Set(["record-a", "record-b"]);
  const limits = { controlKeys: controls, maxScroll: 300 };
  const cache = createPresentationState({
    taskIds: Array.from({ length: 12 }, (_, i) => `task-${i}`),
    validateContext: (value) => value.workspace === "map" &&
      /^synthetic-[a-z-]+$/.test(value.pack) &&
      /^synthetic-[a-z-]+$/.test(value.profile),
    validateRecordRef: (value) => records.has(value),
  });
  return { cache, limits, controls, records };
}

test("071 view cache restores independent clean tool state without owning domain values", () => {
  const { cache, limits } = fixture();
  cache.activate("task-0", context(), limits);
  const source = view({ query: "synthetic private query", scope: "workspace" });
  cache.put("task-0", context(), source, limits);
  source.query = "mutated by caller";
  source.expanded.push("group-b");
  cache.activate("task-1", context(), limits);
  cache.put("task-1", context(), view({ query: "another task" }), limits);
  const restored = cache.activate("task-0", context(), limits);
  assert.equal(restored.query, "synthetic private query");
  assert.deepEqual(restored.expanded, ["group-a"]);
  restored.filters["filter-state"] = "changed";
  assert.equal(cache.get("task-0", context(), limits).filters["filter-state"], "all");
  assert.deepEqual(Object.keys(cache.stats()).sort(), ["bytes", "entries"]);
  assert(!JSON.stringify(cache).includes("synthetic private query"));
});

test("071 eight-entry LRU includes and protects the active originating task", () => {
  const { cache, limits } = fixture();
  cache.activate("task-0", context(), limits);
  cache.put("task-0", context(), view({ detail: { recordRef: "record-a", returnAnchor: "row-a" } }), limits);
  for (let i = 1; i < 8; i++) cache.put(`task-${i}`, context(), view(), limits);
  cache.get("task-1", context(), limits);
  cache.put("task-8", context(), view(), limits);
  assert.equal(cache.stats().entries, 8);
  assert.equal(cache.get("task-2", context(), limits), null);
  assert.equal(cache.get("task-0", context(), limits).detail.recordRef, "record-a");
  assert(cache.get("task-1", context(), limits));
});

test("071 invalid task/context/record identities reject atomically, never truncate", () => {
  const { cache, limits } = fixture();
  cache.activate("task-0", context(), limits);
  cache.put("task-0", context(), view(), limits);
  const before = cache.stats();
  assert.throws(() => cache.put("unknown-task", context(), view(), limits));
  assert.throws(() => cache.put("task-0", context({ profile: "untrusted profile" }), view(), limits));
  assert.throws(() => cache.put("task-0", context({ draft: "not a context identity" }), view(), limits));
  assert.throws(() => cache.put("task-0", context(), view({ detail: { recordRef: "missing-record", returnAnchor: "row-a" } }), limits));
  assert.deepEqual(cache.stats(), before);
  assert.equal(cache.get("task-0", context(), limits).query, "");
});

test("071 query bound is 256 UTF-16 units and rejects rather than clips", () => {
  const { cache, limits } = fixture();
  cache.activate("task-0", context(), limits);
  cache.put("task-0", context(), view({ query: "🧭".repeat(128) }), limits);
  assert.equal(cache.get("task-0", context(), limits).query.length, 256);
  assert.throws(() => cache.put("task-0", context(), view({ query: "🧭".repeat(129) }), limits));
  assert.equal(cache.get("task-0", context(), limits).query, "🧭".repeat(128));
});

test("071 disclosure admission uses current control keys and a 128-ID bound", () => {
  const keys = Array.from({ length: 129 }, (_, i) => `disclosure-${i}`);
  const { cache, limits } = fixture(keys);
  cache.activate("task-0", context(), limits);
  cache.put("task-0", context(), view({ expanded: keys.slice(0, 128) }), limits);
  assert.equal(cache.get("task-0", context(), limits).expanded.length, 128);
  assert.throws(() => cache.put("task-0", context(), view({ expanded: keys }), limits));
  assert.throws(() => cache.put("task-0", context(), view({ expanded: ["not-current"] }), limits));
  assert.throws(() => cache.put("task-0", context(), view({ focusKey: "#row-a > script" }), limits));
});

test("071 scroll values are finite/nonnegative and restore within the current range", () => {
  const { cache, limits } = fixture();
  cache.activate("task-0", context(), limits);
  for (const offset of [NaN, Infinity, -1]) {
    assert.throws(() => cache.put("task-0", context(), view({ scroll: { anchor: "row-a", offset } }), limits));
  }
  cache.put("task-0", context(), view({ scroll: { anchor: "row-a", offset: 900 } }), limits);
  assert.equal(cache.get("task-0", context(), limits).scroll.offset, 300);
  assert.equal(cache.get("task-0", context(), { ...limits, maxScroll: 40 }).scroll.offset, 40);
  assert.throws(() => cache.get("task-0", context(), { ...limits, maxScroll: NaN }));
});

test("071 one detail return frame stays within its originating entry", () => {
  const { cache, limits } = fixture();
  cache.activate("task-0", context(), limits);
  cache.put("task-0", context(), view({ detail: { recordRef: "record-a", returnAnchor: "row-a" } }), limits);
  assert.equal(cache.stats().entries, 1);
  assert.equal(cache.get("task-0", context(), limits).detail.returnAnchor, "row-a");
  assert.throws(() => cache.put("task-0", context(), view({ detail: [{ recordRef: "record-a", returnAnchor: "row-a" }] }), limits));
  assert.throws(() => cache.put("task-0", context(), view({ detail: { recordRef: "record-a", returnAnchor: "row-a", previous: { recordRef: "record-b" } } }), limits));
});

test("071 cache refuses drafts, operations, progress and nested filter payloads", () => {
  const { cache, limits } = fixture();
  cache.activate("task-0", context(), limits);
  for (const extra of [{ draft: "private" }, { operations: [] }, { progress: 4 }, { notes: "private" }]) {
    assert.throws(() => cache.put("task-0", context(), { ...view(), ...extra }, limits));
  }
  assert.throws(() => cache.put("task-0", context(), view({ filters: { "filter-state": { notes: "private" } } }), limits));
  assert.throws(() => cache.put("task-0", context(), view({ filters: { "unmapped-control": "all" } }), limits));
});

test("071 UTF-8 admission evicts clean inactive views before exceeding 64 KiB", () => {
  const largeKeys = Array.from({ length: 24 }, (_, i) => `control-${i}-${"🧭".repeat(240)}`);
  const { cache, limits } = fixture(largeKeys);
  cache.activate("task-0", context(), limits);
  cache.put("task-0", context(), view({ query: "active return" }), limits);
  for (let i = 1; i < 6; i++) cache.put(`task-${i}`, context(), view({ expanded: largeKeys }), limits);
  assert(cache.stats().bytes <= 65536);
  assert(cache.stats().entries < 6, "byte budget, not only the eight-entry limit, evicts");
  assert.equal(cache.get("task-0", context(), limits).query, "active return");
  assert(cache.get("task-5", context(), limits));
});

test("071 oversized active return drops optional expansions, preserving exact query and identity", () => {
  const keys = Array.from({ length: 128 }, (_, i) => `control-${i}-${"🧭".repeat(180)}`);
  const { cache, limits } = fixture(keys);
  cache.activate("task-0", context(), limits);
  const result = cache.put("task-0", context(), view({ query: "keep exact query", expanded: keys, detail: { recordRef: "record-a", returnAnchor: "row-a" } }), limits);
  assert.equal(result.reduced, true);
  const restored = cache.get("task-0", context(), limits);
  assert.equal(restored.query, "keep exact query");
  assert.equal(restored.scroll.anchor, "row-a");
  assert.equal(restored.detail.recordRef, "record-a");
  assert.deepEqual(restored.expanded, []);
  assert(cache.stats().bytes <= 65536);
});

test("071 pack/profile changes clear incompatible clean views without touching owner data", () => {
  const { cache, limits } = fixture();
  const domain = { quantities: { item: 7 }, draft: "owned elsewhere", recovery: "retained" };
  cache.activate("task-0", context(), limits);
  cache.put("task-0", context(), view({ query: "previous context" }), limits);
  cache.activate("task-1", context({ pack: "synthetic-next-pack" }), limits);
  assert.equal(cache.get("task-0", context(), limits), null);
  assert.equal(cache.stats().entries, 1);
  assert.deepEqual(domain, { quantities: { item: 7 }, draft: "owned elsewhere", recovery: "retained" });
});

test("071 capture invalidation removes stale record/focus refs but retains applicable query", () => {
  const { cache, limits, records, controls } = fixture();
  cache.activate("task-0", context(), limits);
  cache.put("task-0", context(), view({ query: "synthetic query", detail: { recordRef: "record-a", returnAnchor: "row-a" } }), limits);
  records.delete("record-a");
  controls.delete("row-a");
  cache.reconcile(context({ revision: 2, capture: "capture-b" }), limits);
  const restored = cache.get("task-0", context({ revision: 2, capture: "capture-b" }), limits);
  assert.equal(restored.query, "synthetic query");
  assert.equal(restored.detail, null);
  assert.equal(restored.focusKey, null);
  assert.equal(restored.scroll.anchor, null);
  assert.deepEqual(restored.expanded, ["group-a"]);
});
