import { readFileSync } from "node:fs";
import { validatePack } from "../../src/content/validate.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { collectionFixture } from "../helpers/collection-needs.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import {
  collectionWorkbench,
  filterShopping,
  whyNeeded,
  coverageIssues,
  shoppingText,
} from "../../src/domain/collection-workbench.mjs";
import {
  craftContext,
  previewCraft,
  craftReceipt,
  reverseCraft,
} from "../../src/domain/craft-transaction.mjs";
import {
  validateCollectionRoute,
  saveCollectionRoute,
  loadCollectionRoute,
  createCollectionRouteContext,
  readCollectionRouteContext,
} from "../../src/domain/collection-route.mjs";
function setup() {
  const pack = collectionFixture(),
    profile = newProfile(pack);
  for (const i of pack.items) profile.inventory[i.id] = 0;
  return { pack, profile };
}
function stocked() {
  const x = setup();
  Object.assign(x.profile.inventory, {
    "craft:wire": 20,
    "craft:part": 4,
    "craft:tool": 1,
  });
  return x;
}
function storage() {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    m,
  };
}
function mapped() {
  const x = setup(),
    demo = loadFixturePack("demo-training");
  x.pack.maps = structuredClone(demo.maps);
  x.pack.locations = structuredClone(
    demo.locations.filter((l) => l.coordinates).slice(0, 2),
  ).map((l) => ({ ...l, itemIds: ["craft:wire"] }));
  return x;
}
test("045 why traces exact unfinished roots through multi-stage crafting without mutating profile", () => {
  const { pack, profile } = setup(),
    before = structuredClone(profile);
  const m = collectionWorkbench(pack, profile),
    why = whyNeeded(m, "craft:wire");
  assert.deepEqual(
    why.roots.map((r) => r.id),
    ["craft:upgrade"],
  );
  assert.equal(why.steps.length, 2);
  assert(why.steps.some((s) => s.parentItemId === "craft:part"));
  assert.deepEqual(profile, before);
  profile.upgradeProgress["craft:upgrade"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  assert.equal(collectionWorkbench(pack, profile).shopping.length, 0);
});
test("045 shopping filters, unit-aware shortages, priorities and full private text export", () => {
  const { pack, profile } = setup();
  const m = collectionWorkbench(pack, profile);
  assert(filterShopping(m, { state: "craft" }).every((r) => r.craft));
  assert(
    filterShopping(m, { state: "short" }).every((r) => r.state === "short"),
  );
  assert.equal(filterShopping(m, { query: "wire" }).length, 1);
  const text = shoppingText(m, m.shopping);
  assert.match(text, /PRIVATE COLLECTION/);
  assert.match(text, /Fictional wire/);
  assert(!text.includes("spendHistory"));
  profile.inventory["craft:wire"] = 100;
  assert(
    !filterShopping(collectionWorkbench(pack, profile), {
      hideCovered: true,
    }).some((r) => r.id === "craft:wire"),
  );
});
test("045 tracked mission and next-tier priority use unfinished known root IDs", () => {
  const { pack, profile } = setup();
  const mission = {
    ...structuredClone(pack.objectives[0]),
    id: "craft:mission",
    track: "dmz-story",
    name: "Fictional mission",
  };
  delete mission.upgrade;
  mission.requirements[0].itemId = "craft:wire";
  pack.objectives.push(mission);
  profile.goals = [{ id: mission.id, quantity: 1 }];
  const m = collectionWorkbench(pack, profile),
    wire = m.shopping.find((r) => r.id === "craft:wire");
  assert.equal(wire.rootIds.length, 2);
  assert(wire.next && wire.tracked);
  assert.equal(filterShopping(m, { sort: "helped" })[0].id, "craft:wire");
  profile.completion[mission.id] = "completed";
  assert.equal(
    whyNeeded(collectionWorkbench(pack, profile), "craft:wire").roots.length,
    1,
  );
});
test("045 recipe route selection resolves alternatives while coverage review never invents recipes", () => {
  const { pack, profile } = setup();
  const alt = structuredClone(pack.recipes[0]);
  alt.id = "craft:alternative";
  pack.recipes.push(alt);
  assert.equal(
    collectionWorkbench(pack, profile).shopping.find(
      (r) => r.id === "craft:part",
    ).required,
    null,
  );
  profile.routes["craft:output"] = alt.id;
  const m = collectionWorkbench(pack, profile);
  assert.equal(m.shopping.find((r) => r.id === "craft:part").required, 4);
  assert(
    coverageIssues(m, "2099-01-01").issues.some(
      (r) => r.kind === "Review date",
    ),
  );
  assert(
    coverageIssues(m).issues.some((r) => r.detail.includes("does not mean")),
  );
});
test("045 confirmed craft pre-credit accounting, retained tools, batches and safe exact reversal", () => {
  const { pack, profile } = stocked(),
    before = structuredClone(profile),
    p = previewCraft(pack, profile, "craft:output-recipe", 2);
  assert(p.ready);
  assert.equal(p.candidate.inventory["craft:part"], 0);
  assert.equal(p.candidate.inventory["craft:tool"], 1);
  assert.equal(p.candidate.inventory["craft:output"], 4);
  assert.deepEqual(profile, before);
  const after = structuredClone(p.candidate);
  after.revision++;
  const receipt = craftReceipt(pack, profile, after, p),
    reversed = reverseCraft(pack, after, receipt);
  assert.deepEqual(reversed.inventory, profile.inventory);
  assert.deepEqual(reversed.goals, profile.goals);
  after.revision++;
  assert.throws(() => reverseCraft(pack, after, receipt), /expired/);
});
test("045 reserves, combined consumed/retained floors and same-item output never fund their own craft", () => {
  const { pack, profile } = stocked();
  profile.reserves["craft:part"] = 1;
  assert(!previewCraft(pack, profile, "craft:output-recipe", 2).ready);
  profile.reserves = {};
  pack.recipes[0].inputs.push({
    ...pack.recipes[0].inputs[0],
    quantity: 3,
    consumption: "retained",
  });
  assert(!previewCraft(pack, profile, "craft:output-recipe", 1).ready);
  pack.recipes[0].inputs = pack.recipes[0].inputs.slice(0, 1);
  pack.recipes[0].output.itemId = "craft:part";
  profile.inventory["craft:part"] = 1;
  assert(!previewCraft(pack, profile, "craft:output-recipe", 1).ready);
});
test("045 unknown evidence/stock/eligibility/prerequisites and stock caps cannot execute", () => {
  const { pack, profile } = stocked();
  delete profile.inventory["craft:output"];
  assert(!previewCraft(pack, profile, "craft:output-recipe").ready);
  profile.inventory["craft:output"] = 1000000;
  assert(!previewCraft(pack, profile, "craft:output-recipe").ready);
  profile.inventory["craft:output"] = 0;
  pack.recipes[0].eligibility = "unknown";
  assert(!previewCraft(pack, profile, "craft:output-recipe").ready);
  pack.recipes[0].eligibility = "stash";
  pack.recipes[0].inputs[0].consumption = "unknown";
  assert(!previewCraft(pack, profile, "craft:output-recipe").ready);
  assert.throws(
    () => previewCraft(pack, profile, "craft:output-recipe", 0),
    /Batches/,
  );
  profile.contentVersion = "wrong";
  assert.throws(
    () => previewCraft(pack, profile, "craft:output-recipe"),
    /binding/,
  );
});
test("045 receipt rejects recipe changes and any unrelated subsequent profile mutation", () => {
  const { pack, profile } = stocked(),
    p = previewCraft(pack, profile, "craft:output-recipe"),
    after = { ...p.candidate, revision: profile.revision + 1 },
    receipt = craftReceipt(pack, profile, after, p);
  const changed = structuredClone(after);
  changed.reserves["craft:wire"] = 1;
  assert.throws(() => reverseCraft(pack, changed, receipt), /expired/);
  pack.recipes[0].name += " changed";
  assert.throws(() => reverseCraft(pack, after, receipt), /identity/);
});
test("045 spoiler-protected endpoints omitted from search/why/export/recipe preview", () => {
  const { pack, profile } = setup();
  const hidden = structuredClone(pack.objectives[0]);
  hidden.id = "craft:hidden";
  hidden.name = "Fictional wire";
  hidden.spoiler = true;
  pack.objectives.push(hidden);
  const m = collectionWorkbench(pack, profile);
  assert(!m.shopping.some((r) => r.id === "craft:wire"));
  assert.throws(() => whyNeeded(m, "craft:wire"), /protected/);
  assert(!shoppingText(m, m.shopping).includes("Fictional wire"));
  assert.throws(
    () => previewCraft(pack, profile, "craft:part-recipe"),
    /protected/,
  );
});
test("045 calibrated route persistence and bounded opaque session context roundtrip", async () => {
  const { pack, profile } = mapped(),
    s = storage(),
    ids = pack.locations.map((l) => l.id);
  assert.equal(validateCollectionRoute(pack, profile, ids).stops.length, 2);
  await saveCollectionRoute(pack, profile, ids, s);
  assert.deepEqual(await loadCollectionRoute(pack, profile, s), ids);
  const token = "12345678-1234-4234-8234-123456789abc";
  const url = await createCollectionRouteContext(pack, profile, ids, s, {
    now: 1000,
    token,
  });
  assert(!url.includes(ids[0]));
  assert.equal(
    (await readCollectionRouteContext(pack, profile, token, s, { now: 2000 }))
      .stops.length,
    2,
  );
  const stored = s.getItem(`dmz-collection-context:${token}`);
  assert(!stored.includes("coordinates"));
  assert.match(JSON.parse(stored).binding, /^[a-f0-9]{64}$/);
});
test("045 route rejects duplicate/mixed-floor/unknown positions and changed calibration", async () => {
  const { pack, profile } = mapped(),
    s = storage(),
    ids = pack.locations.map((l) => l.id);
  assert.throws(
    () => validateCollectionRoute(pack, profile, [ids[0], ids[0]]),
    /unique/,
  );
  await saveCollectionRoute(pack, profile, ids, s);
  pack.locations[0].coordinates.x += 1;
  await assert.rejects(loadCollectionRoute(pack, profile, s), /calibration/);
  pack.locations[1].coordinates = null;
  assert.throws(
    () => validateCollectionRoute(pack, profile, ids),
    /calibrated/,
  );
});
test("045 route tokens reject expiry/tampering/oversize/extra fields/wrong content and storage failures", async () => {
  const { pack, profile } = mapped(),
    s = storage(),
    token = "12345678-1234-4234-8234-123456789abc";
  await createCollectionRouteContext(pack, profile, [pack.locations[0].id], s, {
    now: 1000,
    token,
  });
  await assert.rejects(
    readCollectionRouteContext(pack, profile, token, s, { now: 7201001 }),
    /expired/,
  );
  const key = `dmz-collection-context:${token}`,
    data = JSON.parse(s.getItem(key));
  data.url = "https://evil.invalid";
  s.setItem(key, JSON.stringify(data));
  await assert.rejects(
    readCollectionRouteContext(pack, profile, token, s, { now: 1001 }),
    /Invalid/,
  );
  s.setItem(key, "x".repeat(16385));
  await assert.rejects(
    readCollectionRouteContext(pack, profile, token, s),
    /large/,
  );
  await assert.rejects(
    readCollectionRouteContext(pack, profile, "../../bad", s),
    /token/,
  );
  await assert.rejects(
    createCollectionRouteContext(
      pack,
      profile,
      [pack.locations[0].id],
      {
        setItem() {
          throw Error("quota");
        },
      },
      { now: 1000, token },
    ),
    /quota/,
  );
});
test("045 mixed retained and duplicate consumed causes remain exact in why chains", () => {
  const { pack, profile } = setup();
  const first = pack.recipes[0].inputs[0];
  pack.recipes[0].inputs.push(
    { ...first, quantity: 3, consumption: "retained" },
    { ...first, quantity: 1 },
  );
  const m = collectionWorkbench(pack, profile),
    steps = whyNeeded(m, "craft:part").steps.filter(
      (s) => s.id === "craft:output-recipe",
    );
  assert.equal(steps.find((s) => s.consumption === "consumed").quantity, 6);
  assert.equal(steps.find((s) => s.consumption === "retained").quantity, 3);
  assert.equal(m.needs.collection.get("craft:part").required, 9);
});
test("045 protected units, pack headers and floor metadata stay out of search/export/routes", () => {
  const { pack, profile } = mapped();
  const secret = "count";
  const hidden = {
    ...structuredClone(pack.objectives[0]),
    id: "craft:hidden-metadata",
    name: secret,
    spoiler: true,
  };
  hidden.track = "mission";
  delete hidden.upgrade;
  hidden.requirements = [];
  pack.objectives.push(hidden);
  pack.title = secret;
  pack.contentVersion = secret;
  profile.contentVersion = secret;
  pack.items.find((i) => i.id === "craft:wire").unit = secret;
  const m = collectionWorkbench(pack, profile);
  assert.equal(filterShopping(m, { query: secret }).length, 0);
  assert(!shoppingText(m, m.shopping).includes(secret));
  pack.locations[0].coordinates.floor = secret;
  pack.maps[0].floors.push(secret);
  assert.throws(
    () => validateCollectionRoute(pack, profile, [pack.locations[0].id]),
    /protected/,
  );
});
test("045 foreign recipe and prerequisite scopes cannot execute", () => {
  const { pack, profile } = stocked();
  const foreign = {
    gameId: pack.game.id,
    mode: "campaign",
    build: pack.game.build,
  };
  pack.recipes[0].scope = foreign;
  for (const id of [
    pack.recipes[0].output.itemId,
    ...pack.recipes[0].inputs.map((c) => c.itemId),
  ])
    pack.items.find((i) => i.id === id).scope = foreign;
  assert.throws(
    () => previewCraft(pack, profile, "craft:output-recipe"),
    /scope/,
  );
  delete pack.recipes[0].scope;
  for (const i of pack.items) delete i.scope;
  const pre = {
    ...structuredClone(pack.objectives[0]),
    id: "craft:foreign-pre",
    track: "campaign",
    scope: foreign,
    requirements: [],
  };
  delete pre.upgrade;
  pack.objectives.push(pre);
  profile.completion[pre.id] = "completed";
  pack.recipes[0].prerequisites = [pre.id];
  assert(!previewCraft(pack, profile, "craft:output-recipe").ready);
});
test("045 dense prerequisite projection respects shared work across independent recipe checks", () => {
  const { pack, profile } = stocked();
  const seed = pack.objectives[0];
  for (let i = 0; i < 3000; i++) {
    const r = {
      ...structuredClone(seed),
      id: `dag:n${i}`,
      name: `Fictional DAG ${i}`,
      track: "dmz-order",
      prerequisites: Array.from(
        { length: Math.min(i, 100) },
        (_, j) => `dag:n${i - j - 1}`,
      ),
    };
    delete r.upgrade;
    pack.objectives.push(r);
    profile.completion[r.id] = "completed";
  }
  pack.recipes[0].prerequisites = ["dag:n2999"];
  const context = craftContext(pack, profile);
  assert(context.evaluate("craft:output-recipe").ready);
  assert.throws(() => context.evaluate("craft:output-recipe"), /work limit/);
  const alternate = structuredClone(pack.recipes[0]);
  alternate.id = "craft:dense-alternate";
  pack.recipes.push(alternate);
  assert.equal(collectionWorkbench(pack, profile).craftReviewLimited, true);
  assert(
    !collectionWorkbench(pack, profile).crafts.find(
      (c) => c.recipe.id === alternate.id,
    ).ready,
  );
});
test("045 defensive over-budget prerequisite edges fail before unbounded enqueue", () => {
  const { pack, profile } = stocked();
  const seed = pack.objectives[0];
  // Deliberately exceeds admission graph-work limits; defensive domain input, not game data.
  for (let i = 0; i < 3000; i++) {
    const r = {
      ...structuredClone(seed),
      id: `dag:n${i}`,
      name: `Fictional dense ${i}`,
      track: "dmz-order",
      prerequisites: Array.from(
        { length: Math.min(i, 200) },
        (_, j) => `dag:n${i - j - 1}`,
      ),
    };
    delete r.upgrade;
    pack.objectives.push(r);
    profile.completion[r.id] = "completed";
  }
  pack.recipes[0].prerequisites = ["dag:n2999"];
  assert.throws(
    () => previewCraft(pack, profile, "craft:output-recipe"),
    /work limit/,
  );
});

test("045 craft receipt identity checks raw input metadata independently of display masking", () => {
  const { pack, profile } = stocked(),
    p = previewCraft(pack, profile, "craft:output-recipe");
  const after = { ...p.candidate, revision: profile.revision + 1 },
    receipt = craftReceipt(pack, profile, after, p);
  pack.items.find((i) => i.id === "craft:part").description =
    "Different raw identity";
  assert.throws(() => reverseCraft(pack, after, receipt), /identity/);
});

test("045 evidence source inspections share the readiness work budget", () => {
  const { pack, profile } = stocked(),
    seed = pack.sources[0];
  const proofs = Array.from({ length: 1000 }, (_, i) => ({
    ...structuredClone(seed),
    id: `proof:s${i}`,
    title: `Fictional proof ${i}`,
  }));
  pack.sources.push(...proofs);
  pack.recipes[0].sourceIds = proofs.map((s) => s.id);
  const context = craftContext(pack, profile);
  assert.throws(() => {
    for (let i = 0; i < 501; i++)
      context.evaluate("craft:output-recipe", 1, { materialize: false });
  }, /work limit/);
});
test("045 defensive masked-unit changes still expire raw craft identity", () => {
  const { pack, profile } = stocked();
  for (const [i, name] of ["count", "resource-unit"].entries()) {
    const h = {
      ...structuredClone(pack.objectives[0]),
      id: `private:unit-${i}`,
      track: "mission",
      name,
      spoiler: true,
      requirements: [],
    };
    delete h.upgrade;
    pack.objectives.push(h);
  }
  const p = previewCraft(pack, profile, "craft:output-recipe"),
    after = { ...p.candidate, revision: profile.revision + 1 },
    receipt = craftReceipt(pack, profile, after, p);
  // Deliberate raw metadata corruption after the receipt; not an admitted catalog update.
  pack.items.find((i) => i.id === "craft:part").unit = "resource-unit";
  assert.throws(() => reverseCraft(pack, after, receipt), /identity/);
});

test("045 defensive reference audit distinguishes missing references from protected endpoints", () => {
  const { pack, profile } = setup();
  pack.recipes[0].inputs[0].itemId = "missing:item";
  const m = collectionWorkbench(pack, profile);
  assert(coverageIssues(m).issues.some((r) => r.kind === "Broken reference"));
  const protectedCase = setup(),
    hidden = {
      ...structuredClone(protectedCase.pack.objectives[0]),
      id: "private:hidden",
      track: "mission",
      name: "Fictional part",
      spoiler: true,
      requirements: [],
    };
  delete hidden.upgrade;
  protectedCase.pack.objectives.push(hidden);
  assert(
    !coverageIssues(
      collectionWorkbench(protectedCase.pack, protectedCase.profile),
    ).issues.some((r) => r.kind === "Broken reference"),
  );
});

test("045 shortage priorities retain separate unit classes even when their display labels are masked", () => {
  const { pack, profile } = setup(),
    seed = pack.items[0],
    line = pack.objectives[0].requirements[0];
  for (const [id, kind, unit, q] of [
    ["currency:cash", "currency", "dmz-cash", 100],
    ["resource:mat", "resource", "resource-unit", 10],
  ]) {
    pack.items.push({
      ...structuredClone(seed),
      id,
      name: `Fictional ${kind}`,
      kind,
      unit,
    });
    pack.objectives[0].requirements.push({
      ...structuredClone(line),
      itemId: id,
      quantity: q,
    });
    profile.inventory[id] = 0;
  }
  for (const [i, name] of ["count", "dmz-cash", "resource-unit"].entries()) {
    const h = {
      ...structuredClone(pack.objectives[0]),
      id: `private:mask-${i}`,
      name,
      track: "mission",
      spoiler: true,
      requirements: [],
    };
    delete h.upgrade;
    pack.objectives.push(h);
  }
  const sorted = filterShopping(collectionWorkbench(pack, profile), {
    sort: "shortage",
  });
  const groups = sorted.map((r) => r.unitGroup);
  assert.deepEqual([...new Set(groups)].sort(), [0, 1, 2]);
  assert.deepEqual(
    groups,
    [...groups].sort((a, b) => a - b),
  );
});

test("045 missing non-fictional evidence blocks execution and unsupported input coverage", () => {
  const { pack, profile } = stocked();
  const r = pack.recipes[0];
  r.status = "observed";
  r.sourceIds = [];
  let p = previewCraft(pack, profile, r.id);
  assert(!p.ready && !p.quantityReady);
  assert(p.reasons.some((s) => /references/.test(s)));
  r.sourceIds = [pack.sources[0].id];
  r.inputs[0].status = "verified";
  r.inputs[0].sourceIds = [];
  p = previewCraft(pack, profile, r.id);
  assert(!p.ready && !p.quantityReady);
  r.inputs[0].sourceIds = [pack.sources[0].id];
  const pre = {
    ...structuredClone(pack.objectives[0]),
    id: "proof:prerequisite",
    track: "mission",
    requirements: [],
    sourceIds: [],
    status: "verified",
  };
  delete pre.upgrade;
  pack.objectives.push(pre);
  profile.completion[pre.id] = "completed";
  r.prerequisites = [pre.id];
  p = previewCraft(pack, profile, r.id);
  assert(!p.ready && p.quantityReady);
  assert(
    coverageIssues(collectionWorkbench(pack, profile)).issues.some(
      (i) => i.kind === "Missing supporting evidence",
    ),
  );
});

test("045 routes reject nonfinite projected points and overflowing extent spans", () => {
  const { pack, profile } = mapped(),
    ids = pack.locations.map((l) => l.id);
  pack.maps[0].extent = [0, 0, 1e308, 1];
  for (const l of pack.locations) {
    l.coordinates.x = 1e308;
    l.coordinates.y = 0.5;
  }
  validatePack(
    pack,
    JSON.parse(
      readFileSync(
        new URL("../../schemas/pack.schema.json", import.meta.url),
        "utf8",
      ),
    ),
    { profile: "published" },
  );
  assert.throws(
    () => validateCollectionRoute(pack, profile, ids),
    /calibrated/,
  );
  pack.maps[0].extent = [-1e308, 0, 1e308, 1];
  assert.throws(
    () => validateCollectionRoute(pack, profile, ids),
    /calibrated/,
  );
});
