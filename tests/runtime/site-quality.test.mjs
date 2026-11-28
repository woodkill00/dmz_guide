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

test("112 a complete structured recipe supplies its description without repetitive prose; unknown inputs remain findings", async () => {
  const pack = fixture();
  pack.recipes = [
    {
      id: "test:recipe",
      name: "Synthetic print",
      ingredientsKnown: true,
      output: { itemId: "test:item", quantity: 1 },
      inputs: [{ itemId: "test:item", quantity: 2 }],
      sourceIds: ["source"],
    },
  ];
  const before = JSON.stringify(pack);
  let index = await projectSiteQuality([pack], options);
  assert(
    !index.entries.some(
      (r) => r.recordId === "test:recipe" && r.field === "description",
    ),
  );
  assert.equal(JSON.stringify(pack), before);
  pack.recipes[0].ingredientsKnown = false;
  index = await projectSiteQuality([pack], options);
  assert(
    index.entries.some(
      (r) => r.recordId === "test:recipe" && r.field === "description",
    ),
  );
  assert(
    index.entries.some(
      (r) => r.recordId === "test:recipe" && r.field === "ingredients",
    ),
  );
});

test("112 container hints do not erase missing calibrated map locations", async () => {
  const pack = fixture();
  pack.guides = [
    {
      id: "mw4:loot-type-synthetic",
      title: "Synthetic container",
      relatedIds: ["test:item"],
      sourceIds: ["source"],
    },
  ];
  const index = await projectSiteQuality([pack], options);
  const gap = index.entries.find(
    (r) => r.recordId === "test:item" && r.field === "locations",
  );
  assert(gap);
  assert.match(gap.message, /calibrated.*container/i);
});
test("111 missing combat references retain exact weapon and editor routes", async () => {
  const index = await projectSiteQuality([], {
    weaponAcquisition: {
      weapons: [
        { id: "synthetic-rifle", name: "Synthetic rifle", sourceIds: [] },
      ],
      sources: [],
    },
    weaponIntel: { weapons: [] },
    specialEditorURL: (adapter, id) =>
      `/local-services/author/?adapter=${adapter}&id=${id}`,
  });
  assert.equal(
    index.entries[0].readerURL,
    "/armory/synthetic-rifle/#acquisition",
  );
  assert.match(index.entries[0].editorURL, /weapon-acquisition/);
});

test("111 admitted camo placeholders create bounded actionable gaps and stale when source changes", async () => {
  const { readWeaponCamos } = await import(
    "../../src/content/weapon-camos.mjs"
  );
  const { readWeaponAcquisition } = await import(
    "../../src/content/weapon-acquisition.mjs"
  );
  const { validateCamoCatalog } = await import(
    "../../src/domain/weapon-camos.mjs"
  );
  const catalog = structuredClone(await readWeaponCamos());
  const roster = (await readWeaponAcquisition()).weapons;
  catalog.weapons[0].rows[0].requirement = "   ";
  catalog.weapons[0].rows[1].requirement = "Not recorded";
  validateCamoCatalog(catalog, roster); // Reachable admitted text, not a relaxed schema.
  const before = JSON.stringify(catalog);
  const args = {
    weaponCamos: catalog,
    specialEditorURL: (adapter, id) =>
      `/local-services/author/?adapter=${adapter}&id=${id}`,
  };
  const first = await projectSiteQuality([], args);
  assert.equal(first.entries.length, 2);
  const row = first.entries.find((r) => r.recordId.endsWith("military-camo-1"));
  assert.equal(row.readerURL, "/armory/han-86/#camo:military-camo-1");
  assert.match(row.editorURL, /adapter=weapon-camos&id=han-86/);
  const log = editQualityReview({ version: 1, entries: [] }, row, "checked");
  catalog.provider.date = "2026-11-11";
  const changed = (await projectSiteQuality([], args)).entries.find(
    (r) => r.id === row.id,
  );
  assert.deepEqual(qualityReview(changed, log), {
    state: "pending",
    stale: true,
  });
  catalog.provider.date = "2026-11-10";
  assert.equal(JSON.stringify(catalog), before);
  catalog.weapons[0].rows[0].requirement = "Reach Weapon Level 10";
  assert.equal((await projectSiteQuality([], args)).entries.length, 1);
  assert.throws(() => validateCamoCatalog({ ...catalog, weapons: [] }, roster));
});
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
