import { loadFixturePack } from "../helpers/catalog.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  progressRows,
  progressSources,
  setCompletion,
  resetProgress,
} from "../../src/domain/progression.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { featurePages } from "../../src/ui/progression-page.mjs";
const pack = loadFixturePack("demo-training");
const rowsFor = (copy, options) =>
  progressRows(copy, newProfile(copy), options);

test("source, evidence status, manual state and track filters compose without conflating tracks", () => {
  const copy = structuredClone(pack),
    profile = newProfile(copy);
  copy.objectives[0].status = "disputed";
  copy.objectives[0].sourceIds = ["source:second"];
  copy.sources.push({
    ...copy.sources[0],
    id: "source:second",
    title: "Second source",
  });
  profile.completion["demo:bench-unlock"] = "completed";
  assert.deepEqual(
    progressRows(copy, profile, {
      source: "source:second",
      status: "disputed",
      progress: "completed",
      track: "dmz-upgrade",
    }).map((r) => r.id),
    ["demo:bench-unlock"],
  );
  assert.equal(
    progressRows(copy, profile, { source: "source:second", status: "verified" })
      .length,
    0,
  );
  assert.equal(
    progressRows(copy, profile, { progress: "completed", track: "campaign" })
      .length,
    0,
  );
  assert.equal(
    progressRows(copy, profile, { progress: "not-applicable" }).every(
      (r) => r.type === "guide",
    ),
    true,
  );
  assert.equal(progressSources(copy).length, 2);
});

test("unrevealed spoilers are omitted from search and every cross-reference presentation field", () => {
  const copy = structuredClone(pack),
    profile = newProfile(copy);
  const secret = copy.objectives[2];
  copy.objectives[0].description = `Finish ${secret.name.toUpperCase()} first.`;
  copy.objectives[0].prerequisites = [secret.id];
  copy.objectives[0].effects = [
    { type: "categoryUnlock", target: secret.id, value: secret.name },
  ];
  copy.guides[0].relatedIds = [secret.id];
  copy.sources[0].title = `Notes on ${secret.name}`;
  copy.sources[0].supports = secret.description;
  copy.sources[0].url = `https://example.com/${secret.id}`;
  const rows = progressRows(copy, profile),
    objective = rows.find((r) => r.id === "demo:bench-unlock");
  assert.equal(
    objective.prerequisites[0].name,
    "Spoiler-protected prerequisite",
  );
  assert.equal(objective.prerequisites[0].url, null);
  assert.equal(objective.effects[0].target, "Spoiler-protected content");
  assert.equal(objective.effects[0].value, "Spoiler-protected content");
  assert.equal(
    rows.find((r) => r.id === "demo:crafting-guide").related[0].url,
    null,
  );
  assert.equal(objective.sources[0].url, null);
  assert.equal(objective.sources[0].title, "Spoiler-protected content");
  for (const query of [
    secret.name,
    secret.id,
    secret.description,
    "end of the exercise",
  ])
    assert.equal(progressRows(copy, profile, { query }).length, 0, query);
  profile.spoilers = true;
  const revealed = progressRows(copy, profile);
  assert.equal(
    revealed.find((r) => r.id === "demo:bench-unlock").effects[0].value,
    secret.name,
  );
  assert.equal(
    revealed.find((r) => r.id === "demo:crafting-guide").related[0].name,
    secret.name,
  );
  assert.equal(
    progressRows(copy, profile, { query: "end of the exercise" }).length,
    1,
  );
  profile.spoilers = false;
  assert.equal(progressRows(copy, profile, { query: secret.name }).length, 0);
});

test("source filters do not reveal metadata belonging only to hidden records", () => {
  const copy = structuredClone(pack);
  copy.sources.push({
    ...copy.sources[0],
    id: "source:secret",
    title: "Secret-only provenance",
  });
  copy.objectives[2].sourceIds = ["source:secret"];
  assert(!progressSources(copy).some((s) => s.id === "source:secret"));
  assert(
    progressSources(copy, { reveal: true }).some(
      (s) => s.id === "source:secret",
    ),
  );
  assert.equal(rowsFor(copy, { source: "source:secret" }).length, 0);
});

test("prerequisite chain uses only pack-qualified links and terminates for shared/cyclic defensive input", () => {
  const copy = structuredClone(pack);
  copy.objectives[2].spoiler = false;
  copy.objectives[2].prerequisites = ["demo:delivery-order"];
  const row = rowsFor(copy).find((r) => r.id === "demo:campaign-chapter");
  assert.deepEqual(
    row.prerequisites.map((r) => r.depth),
    [0, 1],
  );
  assert.equal(
    row.prerequisites[1].url,
    "/local/?pack=demo%3Atraining-pack&id=demo%3Abench-unlock",
  );
  copy.objectives[0].prerequisites = ["demo:campaign-chapter"];
  assert.equal(
    rowsFor(copy).find((r) => r.id === "demo:campaign-chapter").prerequisites
      .length,
    2,
  );
});

test("source URLs remain inert, unresolved links are not invented and provenance stays explicit", () => {
  const copy = structuredClone(pack);
  copy.sources[0].url = "javascript:alert(1)";
  copy.objectives[0].prerequisites = ["other:missing"];
  const row = rowsFor(copy)[0];
  assert.equal(row.sources[0].url, null);
  assert.equal(row.sources[0].reviewedAt, "2026-10-21");
  assert.equal(row.prerequisites[0].name, "Unresolved prerequisite");
  assert.equal(row.prerequisites[0].url, null);
});

test("completion and reset only alter completion, never consume items or derive other unlocks", () => {
  const profile = newProfile(pack);
  profile.inventory["demo:wire"] = 10;
  profile.reserves["demo:wire"] = 2;
  profile.goals = [{ id: "demo:board-batch", quantity: 1 }];
  profile.routes["demo:board"] = "demo:board-batch";
  profile.spoilers = true;
  const next = setCompletion(
    pack,
    profile,
    "demo:campaign-chapter",
    "completed",
  );
  assert.equal(next.completion["demo:bench-unlock"], undefined);
  for (const field of [
    "inventory",
    "reserves",
    "goals",
    "routes",
    "spoilers",
  ]) {
    assert.equal(JSON.stringify(next[field]), JSON.stringify(profile[field]));
    assert.equal(
      JSON.stringify(resetProgress(next)[field]),
      JSON.stringify(profile[field]),
    );
  }
  assert.deepEqual(profile.completion, {});
  assert.deepEqual(resetProgress(next).completion, {});
  assert.throws(
    () => setCompletion(pack, profile, "unknown:objective", "completed"),
    /Unknown objective/,
  );
  assert.throws(
    () => setCompletion(pack, profile, "demo:bench-unlock", "ready"),
    /Unknown progress/,
  );
});

test("progression shell provides all filters, no-script explanation, generic title and escaped pack labels", () => {
  const page = featurePages([{ ...pack, title: "<script>bad</script>" }])[0];
  for (const id of [
    "progress-track",
    "progress-query",
    "progress-source",
    "progress-status",
    "progress-state",
    "progress-count",
    "export-current-profile",
  ])
    assert(page.body.includes(`id="${id}"`));
  assert(page.body.includes("<noscript>"));
  assert(!page.body.includes("<script>bad</script>"));
  assert.equal(page.title, "Progression & field guides");
});

test("a disputed claim stays flagged even when a user marks a source-backed objective complete", () => {
  const copy = structuredClone(pack),
    p = newProfile(copy);
  copy.objectives[0].status = "verified";
  copy.claims.push({
    id: "claim:disagreement",
    entityId: copy.objectives[0].id,
    status: "disputed",
  });
  p.completion[copy.objectives[0].id] = "completed";
  assert.equal(progressRows(copy, p)[0].disputed, true);
});

test("large validated shared prerequisite graph has bounded projections with honest paging and truncation", async () => {
  const { validatePack } = await import("../../src/content/validate.mjs");
  const schema = JSON.parse(readFileSync("schemas/pack.schema.json"));
  const copy = structuredClone(pack),
    template = copy.objectives[0];
  for (const group of ["items", "recipes", "guides", "maps", "locations"])
    copy[group] = [];
  copy.objectives = Array.from({ length: 8000 }, (_, i) => ({
    ...template,
    id: `demo:node-${i}`,
    name: `Fictional node ${i}`,
    description: "",
    requirements: [],
    effects: [],
    prerequisites: i
      ? [`demo:node-${i - 1}`, ...(i > 1 ? [`demo:node-${i - 2}`] : [])]
      : [],
  }));
  validatePack(copy, schema);
  const profile = newProfile(copy),
    rows = progressRows(copy, profile, { limit: 100 });
  assert.equal(rows.total, 8000);
  assert.equal(rows.length, 100);
  assert.equal(rows.more, true);
  assert(rows.every((r) => r.prerequisites.length <= 32));
  assert(rows.reduce((sum, r) => sum + r.prerequisites.length, 0) <= 2048);
  assert(rows.some((r) => r.detailsTruncated));
  assert.equal(
    progressRows(copy, profile, { offset: 100 })[0].id,
    "demo:node-100",
  );
  const last = progressRows(copy, profile, { query: "Fictional node 7999" });
  assert.equal(last.total, 1);
  assert.equal(last[0].id, "demo:node-7999");
});

test("large spoiler dictionaries fail closed and source/effect previews have explicit bounds", () => {
  const copy = structuredClone(pack),
    template = copy.guides[1];
  copy.guides = Array.from({ length: 4 }, (_, i) => ({
    ...template,
    id: `demo:secret-${i}`,
    body: String(i).repeat(19000),
  }));
  const rows = rowsFor(copy);
  assert.equal(rows.privacyLimited, true);
  assert.equal(rows[0].description, "Spoiler-protected content");
  assert.equal(rowsFor(copy, { query: "Fictional once-only" }).length, 0);
  assert.equal(rowsFor(copy, { reveal: true }).privacyLimited, false);
  copy.guides = [];
  copy.sources = Array.from({ length: 501 }, (_, i) => ({
    ...pack.sources[0],
    id: `source:fixture-${i}`,
  }));
  copy.objectives[0].sourceIds = copy.sources.map((s) => s.id);
  const sources = progressSources(copy);
  assert.equal(sources.length, 500);
  assert.equal(sources.truncated, true);
  const row = rowsFor(copy)[0];
  assert.equal(row.sources.length, 32);
  assert.equal(row.detailsTruncated, true);
});
