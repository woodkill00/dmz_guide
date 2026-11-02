import test from "node:test";
import assert from "node:assert/strict";
import { features, featureURL } from "../../src/ui/feature-registry.mjs";
import destinations from "../../src/ui/map-destinations.json" with { type: "json" };
import {
  navigationPreferences,
  boundSearchEntries,
  searchEntries,
  validateSearchIndex,
  safeDestination,
} from "../../src/domain/navigation-hub.mjs";
import { buildUnifiedIndex } from "../../src/content/unified-index.mjs";
import { fixtureCatalog } from "../helpers/catalog.mjs";
const r = (id, title = "Synthetic") => ({
  id,
  type: "item",
  title,
  summary: "Synthetic fixture only",
  url: "/items/example/",
  mapUrl: null,
  planUrl: null,
  packId: "",
  recordId: "",
});
test("058 registry preserves every previous map destination and distinct mission/upgrade entries", () => {
  assert.equal(new Set(features.map((f) => f.id)).size, features.length);
  for (const [id] of [...destinations.tools, ...destinations.planner])
    assert(features.some((f) => f.kind === "map" && f.path === "/?tool=" + id));
  assert(features.some((f) => f.path === "/missions/"));
  assert(features.some((f) => f.path === "/upgrades/"));
  for (const f of features) assert(safeDestination(featureURL(f)));
});
test("058 shortcuts accept bounded known IDs only and never imported HTML or paths", () => {
  assert.deepEqual(
    navigationPreferences(
      '{"version":1,"pins":["keys","keys","../../x","__proto__"],"recent":["missions"]}',
    ),
    { pins: ["keys"], recent: ["missions"] },
  );
  assert.deepEqual(navigationPreferences("x".repeat(17000)), {
    pins: [],
    recent: [],
  });
  assert.equal(
    navigationPreferences(
      JSON.stringify({
        version: 1,
        pins: features.map((f) => f.id),
        recent: [],
      }),
    ).pins.length,
    8,
  );
});
test("058 deterministic index cap retains essential tools and visibly reports limited coverage", () => {
  const v = boundSearchEntries(
    [r("essential")],
    Array.from({ length: 10 }, (_, i) => r("r" + i)),
    { maxEntries: 4, maxBytes: 5000 },
  );
  assert.equal(v.entries[0].id, "essential");
  assert.equal(v.eligibleCount, 11);
  assert.equal(v.indexedCount, 4);
  assert.equal(v.limited, true);
  assert.throws(() =>
    boundSearchEntries([r("a"), r("b")], [], { maxEntries: 1 }),
  );
  assert.throws(() => boundSearchEntries([r("a")], [], { maxBytes: 20 }));
});
test("058 query matching is bounded, multi-token, typed and paginated", () => {
  const v = boundSearchEntries(
    [],
    Array.from({ length: 150 }, (_, i) => r("r" + i, "Copper supply " + i)),
  );
  assert.equal(searchEntries(v, "supply copper").total, 150);
  assert.equal(searchEntries(v, "copper", "item", 100).rows.length, 50);
  assert.equal(searchEntries(v, "copper", "weapon").total, 0);
});
test("058 hostile search records reject protocols, duplicate IDs and invalid coverage", () => {
  for (const url of [
    "javascript:alert(1)",
    "https://evil.invalid/",
    "//evil.invalid",
    "http://127.0.0.1:9999/",
    "/x\\evil",
  ])
    assert(!safeDestination(url));
  for (const mutate of [
    (v) => v.entries.push(v.entries[0]),
    (v) => (v.entries[0].url = "javascript:1"),
    (v) => (v.limited = true),
    (v) => (v.entries[0].type = "hidden"),
  ]) {
    const v = boundSearchEntries([], [r("a")]);
    mutate(v);
    assert.throws(() => validateSearchIndex(v));
  }
});
test("058 actual index excludes all fictional packs and spoiler names/IDs while including sources, keys and weapons", async () => {
  const packs = fixtureCatalog.entries.map((e) => e.pack),
    v = await buildUnifiedIndex(packs);
  assert(v.entries.some((r) => r.type === "key"));
  assert(v.entries.some((r) => r.type === "attachment"));
  assert(v.entries.some((r) => r.type === "upgrade"));
  assert.equal(
    v.entries.filter((r) => r.type === "feature").length,
    features.length,
  );
  for (const p of packs) {
    if (p.sources.some((s) => s.type === "original-fixture"))
      assert(!v.entries.some((r) => r.packId === p.id));
    for (const r of [...p.items, ...p.objectives, ...p.guides].filter(
      (r) => r.spoiler,
    ))
      assert(!v.entries.some((e) => e.recordId === r.id && e.packId === p.id));
  }
  assert(Buffer.byteLength(JSON.stringify(v)) <= 2097152);
});
import {
  summarizeHomeProgress,
  parseListContext,
} from "../../src/domain/home-progress.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
test("058 Home summary respects protected terms and legacy completion without mutating profile", () => {
  const pack = structuredClone(
      fixtureCatalog.entries.find((e) => e.key === "upgrade-observations").pack,
    ),
    profile = newProfile(pack);
  profile.schemaVersion = 1;
  delete profile.upgradeProgress;
  delete profile.watchPins;
  delete profile.spendHistory;
  const upgrade = pack.objectives.find((r) => r.track === "dmz-upgrade");
  profile.completion[upgrade.id] = "completed";
  const before = JSON.stringify(profile);
  assert.equal(summarizeHomeProgress(pack, profile).upgradesDone, 1);
  assert.equal(JSON.stringify(profile), before);
  const hidden = {
    ...upgrade,
    id: "synthetic:hidden",
    name: upgrade.name,
    spoiler: true,
  };
  pack.objectives.push(hidden);
  assert.equal(summarizeHomeProgress(pack, profile).upgradesDone, 0);
});
test("058 malformed list context is rejected atomically, including invalid tuples and private fields", () => {
  const v = {
    version: 1,
    context: "demo:training-pack",
    pack: "demo:training-pack",
    contentVersion: "1",
    fields: { "progress-query": "delivery" },
    groups: [["known", true]],
    scroll: 20,
  };
  assert.deepEqual(parseListContext(JSON.stringify(v), ["progress-query"]), v);
  for (const change of [
    (x) => (x.groups = [null]),
    (x) => (x.groups = [1]),
    (x) => (x.fields.notes = "private"),
    (x) => (x.scroll = Infinity),
    (x) => (x.fields["progress-query"] = "x".repeat(201)),
  ]) {
    const bad = structuredClone(v);
    change(bad);
    assert.throws(() =>
      parseListContext(JSON.stringify(bad), ["progress-query"]),
    );
  }
});
