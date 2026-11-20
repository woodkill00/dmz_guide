import test from "node:test";
import assert from "node:assert/strict";
import {
  exportPreferences,
  parsePreferences,
  reviewPreferences,
  applyPreferences,
  validPreference,
} from "../../src/domain/map-preferences.mjs";
const origin = "http://127.0.0.1:4173",
  key = "hajin-coordinate-grid-v1";
function storage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}
const candidate = () => ({
  kind: "dmz-map-preferences",
  version: 1,
  sourceOrigin: "http://127.0.0.1:5175",
  entries: { [key]: "0" },
});
test("095 UI preference shapes retain owner width bounds and reject invalid X01 values", () => {
  for (const width of [180, 4096])
    assert.ok(
      validPreference(
        "dmz-ui-map-pane-v1",
        JSON.stringify({ version: 1, width }),
      ),
    );
  for (const width of [179, 4097])
    assert.equal(
      validPreference(
        "dmz-ui-map-pane-v1",
        JSON.stringify({ version: 1, width }),
      ),
      false,
    );
  for (const s of ["true", "{}", "null"])
    assert.equal(validPreference("dmz-x01-map-ui-v1", s), false);
  assert.ok(validPreference("hajin-marker-size-v1", "normal"));
});
test("095 explicit preference apply preserves unrelated guide state and original source", () => {
  const s = storage();
  s.setItem("guide-inventory", "private");
  const c = candidate(),
    r = reviewPreferences(c, [key], s, origin);
  assert.equal(applyPreferences(r, s, origin).applied, 1);
  assert.equal(s.getItem(key), "0");
  assert.equal(s.getItem("guide-inventory"), "private");
  assert.deepEqual(c, candidate());
  assert.throws(() => applyPreferences(r, s, origin), /expired/);
});
test("095 selected target byte conflict refuses all writes; empty differs from absent", () => {
  const s = storage(),
    r = reviewPreferences(candidate(), [key], s, origin);
  s.setItem(key, "");
  assert.throws(() => applyPreferences(r, s, origin), /changed/);
  assert.equal(s.getItem(key), "");
});
test("095 unknown keys, future schema, wrong origin and size rejected", () => {
  for (const mutate of [
    (c) => (c.entries.auth = "secret"),
    (c) => (c.version = 2),
    (c) => (c.sourceOrigin = "https://example.com"),
    (c) => (c.entries[key] = "x".repeat(262145)),
  ]) {
    const c = candidate();
    mutate(c);
    assert.throws(() => parsePreferences(JSON.stringify(c)));
  }
});
test("095 corrupt strings export inert but cannot apply; source filters are recovery only", () => {
  const s = storage();
  s.setItem(key, "broken");
  const c = exportPreferences(s, origin);
  assert.equal(c.entries[key], "broken");
  assert.throws(() => reviewPreferences(c, [key], s, origin));
});
test("095 partial quota failure rolls back only own bytes, preserving competing writer", () => {
  const s = storage(),
    c = candidate(),
    other = "hajin-marker-size-v1";
  c.entries[other] = "normal";
  s.setItem(key, "1");
  const r = reviewPreferences(c, [key, other], s, origin),
    set = s.setItem;
  let fail = true;
  s.setItem = (k, v) => {
    if (k === other && fail) {
      set(key, "another writer");
      fail = false;
      throw Error("Quota");
    }
    set(k, v);
  };
  assert.throws(() => applyPreferences(r, s, origin), /uncertain/);
  assert.equal(s.getItem(key), "another writer");
  assert.equal(s.getItem(other), null);
});
test("095 quota rolls back absent values and lifecycle invalidates review", () => {
  const s = storage(),
    c = candidate(),
    other = "hajin-marker-size-v1";
  c.entries[other] = "normal";
  let r = reviewPreferences(c, [key, other], s, origin);
  const set = s.setItem;
  s.setItem = (k, v) => {
    if (k === other) throw Error("Quota");
    set(k, v);
  };
  assert.throws(() => applyPreferences(r, s, origin), /rolled back/);
  assert.equal(s.getItem(key), null);
  r = reviewPreferences(candidate(), [key], s, origin);
  r.active = false;
  assert.throws(() => applyPreferences(r, s, origin), /expired/);
});
