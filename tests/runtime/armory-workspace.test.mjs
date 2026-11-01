import test from "node:test";
import assert from "node:assert/strict";
import { readWeaponIntel } from "../../src/content/weapon-intel.mjs";
import {
  emptyArmory,
  validateArmory,
  validateBuild,
  buildIssues,
  attachmentAdvice,
  baseComparison,
  comparePrivateObservations,
  parseArmoryBackup,
  parseSharedBuild,
} from "../../src/domain/armory-workspace.mjs";
import { armoryPublicReferences } from "../../src/ui/armory-workbench-page.mjs";
const db = await readWeaponIntel(),
  uuid = "11111111-1111-4111-8111-111111111111";
const build = (attachments = []) => ({
  id: uuid,
  name: "Synthetic QA build",
  weapon: "han-86",
  attachments,
  notes: "Fictional test",
  updatedAt: "2026-11-01",
});
const obs = (weapon, id = uuid) => ({
  id,
  weapon,
  metric: "ads",
  unit: "ms",
  value: 250,
  mode: "dmz",
  build: "synthetic-patch",
  date: "2026-11-01",
  target: "synthetic-target",
  armor: "none",
  rangeMeters: 10,
  method: "synthetic frame count",
  firingMode: "auto",
  loadoutContext: "base/no attachments",
  status: "recorded",
  image: null,
});
test("049 acquisition references conservatively exclude admitted spoilers and indirect secret mentions", () => {
  const pack = {
    id: "qa:public-pack",
    game: { id: "mw4", mode: "dmz" },
    sources: [],
    items: [],
    recipes: [],
    maps: [],
    guides: [
      {
        id: "qa:public-guide",
        title: "Public Han 86 guide",
        body: "Known safe advice.",
      },
      {
        id: "qa:secret-story",
        title: "Secret Sentinel Name",
        body: "Secret Sentinel body",
        spoiler: true,
      },
      {
        id: "qa:indirect",
        title: "Public-looking",
        body: "Mentions qa:secret-story and Secret Sentinel Name",
      },
    ],
    locations: [],
    objectives: [],
  };
  const other = {
    ...pack,
    id: "other",
    game: { id: "mw2", mode: "dmz" },
    guides: [{ id: "qa:other", title: "Other M4", body: "M4" }],
  };
  const campaign = {
    ...other,
    id: "campaign",
    game: { id: "mw4", mode: "campaign" },
  };
  const refs = armoryPublicReferences([pack, other, campaign]),
    raw = JSON.stringify(refs);
  assert(raw.includes("Public Han 86 guide"));
  assert(!raw.includes("Other M4"));
  assert(refs.every((r) => r.scope === "MW4 / DMZ"));
  for (const term of [
    "qa:secret-story",
    "Secret Sentinel Name",
    "Secret Sentinel body",
    "qa:indirect",
  ])
    assert(!raw.includes(term));
});
test("049 FR001 compare source modes and prevent unsupported unit conversion", () => {
  assert.equal(
    baseComparison(db, ["han-86", "m4"], "launch")[0].cells[0].value,
    740,
  );
  assert.equal(
    baseComparison(db, ["han-86", "m4"], "multiplayer").find(
      (r) => r.label === "ADS speed",
    ).cells[0].value,
    250,
  );
  assert.throws(() => baseComparison(db, ["han-86"], "launch"));
  assert.throws(() => baseComparison(db, ["han-86", "han-86"], "launch"));
  assert(
    baseComparison(db, ["han-86", "krait-p68"], "launch")[0].cells.every(
      (c) => c.value === null,
    ),
  );
});
test("049 FR002 real compatibility, slot and Apex restrictions", () => {
  assert.deepEqual(buildIssues(db, build(["fss-is300"])), []);
  assert(
    buildIssues(db, build(["fss-is300", "ftac-dominion"])).some((i) =>
      i.includes("one attachment per slot"),
    ),
  );
  const optic = db.attachments.find(
    (a) =>
      a.kind === "standard" &&
      a.slot === "optic" &&
      a.weapons.includes("han-86"),
  );
  assert(
    buildIssues(db, build([optic.id, "apex-han-86"])).some((i) =>
      i.includes("blocks"),
    ),
  );
  assert(
    buildIssues(db, build(["not-in-catalog"])).some((i) =>
      i.includes("absent"),
    ),
  );
  const wrong = db.attachments.find(
    (a) => a.kind === "standard" && !a.weapons.includes("han-86"),
  );
  assert(
    buildIssues(db, build([wrong.id])).some((i) =>
      i.includes("not reported compatible"),
    ),
  );
});
test("049 FR005 explanation distinguishes duration penalties and independent multipliers", () => {
  const advice = attachmentAdvice(db, "han-86", "fss-is300");
  assert(
    advice.some(
      (a) => a.metric === "ads" && a.verdict === "tradeoff" && a.percent > 0,
    ),
  );
  assert(advice.some((a) => a.metric === "bv" && a.verdict === "benefit"));
  assert(advice.every((a) => !Object.hasOwn(a, "predictedTotal")));
});
test("049 FR003 exact user observation context and explicit selection required", () => {
  const workspace = emptyArmory(),
    a = obs("han-86"),
    b = obs("m4", "22222222-2222-4222-8222-222222222222");
  workspace.observations = [a, b];
  assert.equal(
    comparePrivateObservations(workspace, ["han-86", "m4"], "ads", {})
      .comparable,
    false,
  );
  const selected = { "han-86": a.id, m4: b.id };
  assert.equal(
    comparePrivateObservations(workspace, ["han-86", "m4"], "ads", selected)
      .comparable,
    true,
  );
  for (const field of [
    "unit",
    "mode",
    "build",
    "date",
    "target",
    "armor",
    "rangeMeters",
    "method",
    "firingMode",
    "loadoutContext",
  ]) {
    const copy = structuredClone(workspace);
    copy.observations[1][field] = field === "rangeMeters" ? 99 : "different";
    assert.equal(
      comparePrivateObservations(copy, ["han-86", "m4"], "ads", selected)
        .comparable,
      false,
      field,
    );
  }
});
test("049 FR007 archives remain structurally readable and exportable", () => {
  const workspace = emptyArmory();
  workspace.builds = [
    { ...build(["removed-attachment"]), weapon: "removed-weapon" },
  ];
  workspace.observations = [
    { ...obs("removed-weapon"), metric: "removed_metric", unit: "old-unit" },
  ];
  workspace.acquisition["removed-weapon"] = {
    manual: true,
    attachments: ["removed-attachment"],
    blueprints: ["Synthetic old blueprint"],
  };
  validateArmory(workspace);
  assert(buildIssues(db, workspace.builds[0]).length);
  assert.deepEqual(
    parseArmoryBackup(
      JSON.stringify({ format: "dmz-armory-backup", version: 1, workspace }),
    ),
    workspace,
  );
});
test("049 private formats reject unsupported fields, duplicates and unsafe pictures", () => {
  const workspace = emptyArmory();
  workspace.builds = [build()];
  for (const mutate of [
    (w) => (w.version = 2),
    (w) => (w.revision = -1),
    (w) => w.builds.push(build()),
    (w) => w.observations.push({ ...obs("han-86"), value: Infinity }),
    (w) =>
      w.observations.push({
        ...obs("han-86"),
        image: {
          base64: btoa("<svg/>"),
          mime: "image/svg+xml",
          width: 1,
          height: 1,
          sha256: "0".repeat(64),
        },
      }),
    (w) =>
      (w.acquisition["han-86"] = {
        manual: "yes",
        attachments: [],
        blueprints: [],
      }),
  ]) {
    const copy = structuredClone(workspace);
    mutate(copy);
    assert.throws(() => validateArmory(copy));
  }
  assert.throws(() =>
    parseSharedBuild(
      '{"format":"dmz-armory-build","version":1,"version":2,"build":{}}',
    ),
  );
  const portable = { format: "dmz-armory-build", version: 1, build: build() };
  assert.deepEqual(parseSharedBuild(JSON.stringify(portable)), portable.build);
  assert.throws(() =>
    parseSharedBuild(JSON.stringify({ ...portable, workspace })),
  );
  assert.throws(() =>
    validateBuild({ ...build(), attachments: Array(7).fill("fss-is300") }),
  );
});
