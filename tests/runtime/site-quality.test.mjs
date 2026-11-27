import test from "node:test";
import assert from "node:assert/strict";
import {
  projectSiteQuality,
  qualityReview,
  editQualityReview,
  validateQualityLog,
  validateQualityIndex,
  QUALITY_LIMITS,
} from "../../src/domain/site-quality.mjs";
const fixture = () => ({
  id: "test:quality",
  contentVersion: "v1",
  sources: [{ id: "source", title: "Synthetic source", type: "official" }],
  items: [
    {
      id: "test:item",
      name: "Synthetic public item",
      sourceIds: ["source"],
      rarity: "Common",
    },
  ],
  recipes: [],
  objectives: [],
  locations: [],
  guides: [],
  maps: [],
});
const options = {
  readerURL: (_p, r) => "/items/" + r.id + "/",
  editorURL: (_p, r) =>
    "/local-services/author/?destination=" + encodeURIComponent("/?id=" + r.id),
};
test("FR08 actual same-version record/context/cited-source edits invalidate review without mutating source", async () => {
  const pack = fixture(),
    before = JSON.stringify(pack),
    first = await projectSiteQuality([pack], options);
  const row = first.entries.find((r) => r.field === "picture"),
    log = editQualityReview({ version: 1, entries: [] }, row, "checked");
  assert.equal(qualityReview(row, log).state, "checked");
  assert.equal(JSON.stringify(pack), before);
  pack.items[0].description = "New neighboring evidence";
  let changed = (await projectSiteQuality([pack], options)).entries.find(
    (r) => r.id === row.id,
  );
  assert.deepEqual(qualityReview(changed, log), {
    state: "pending",
    stale: true,
  });
  const reviewed = editQualityReview(log, changed, "later");
  pack.sources[0].title = "Changed cited source in same version";
  changed = (await projectSiteQuality([pack], options)).entries.find(
    (r) => r.id === row.id,
  );
  assert.equal(qualityReview(changed, reviewed).stale, true);
  assert.equal(pack.contentVersion, "v1");
});
test("FR08 report excludes fixtures and protected identity/search metadata; declared picture references stay distinct", async () => {
  const pack = fixture();
  pack.items.push({
    id: "test:secret",
    name: "Secret synthetic item",
    spoiler: true,
  });
  pack.items.push({
    id: "test:mention",
    name: "Secret synthetic item fragment",
  });
  const index = await projectSiteQuality([pack], options);
  assert.ok(!JSON.stringify(index).includes("Secret synthetic item"));
  assert.ok(!index.entries.some((r) => r.recordId === "test:secret"));
  assert.equal(
    (await projectSiteQuality([{ ...pack, id: "fixture:demo" }], options))
      .entries.length,
    0,
  );
  const icons = { [pack.id]: { "test:item": "declared-picture" } };
  assert.ok(
    !(await projectSiteQuality([pack], { ...options, icons })).entries.some(
      (r) => r.field === "picture",
    ),
  );
  const malformed = structuredClone(index);
  malformed.entries[0].editorURL = "//external.invalid/";
  assert.throws(() => validateQualityIndex(malformed));
});
test("FR08 editorial imports reject duplicates/overcapacity/extra fields and retain prior log", async () => {
  const row = (await projectSiteQuality([fixture()], options)).entries[0],
    log = editQualityReview({ version: 1, entries: [] }, row, "later"),
    before = JSON.stringify(log);
  assert.throws(() =>
    validateQualityLog({
      version: 1,
      entries: [log.entries[0], log.entries[0]],
    }),
  );
  assert.throws(() =>
    validateQualityLog({
      version: 1,
      entries: [],
      progress: { complete: true },
    }),
  );
  const entries = Array.from(
    { length: QUALITY_LIMITS.reviewEntries },
    (_, i) => ({ id: "row-" + i, binding: row.binding, state: "later" }),
  );
  const full = { version: 1, entries };
  assert.throws(() => editQualityReview(full, row, "checked"));
  assert.equal(full.entries.length, 2000);
  assert.equal(JSON.stringify(log), before);
  const overBytes = {
    version: 1,
    entries: Array.from({ length: 800 }, (_, i) => ({
      id: "x".repeat(790) + i,
      binding: row.binding,
      state: "later",
    })),
  };
  assert.throws(() => validateQualityLog(overBytes));
});
