import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ordersPageCoverage,
  progressRows,
} from "../../src/domain/progression.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";

test("unrecorded Orders pages stay unknown and are never inferred complete", () => {
  const pages = ordersPageCoverage({
    objectives: [{ id: "fixture:mission", track: "dmz-order", orderPage: 3 }],
  });
  assert.equal(pages.length, 24);
  assert.deepEqual(pages[2], {
    page: 3,
    state: "recorded",
    objectiveIds: ["fixture:mission"],
  });
  assert.deepEqual(pages[0], {
    page: 1,
    state: "unrecorded",
    objectiveIds: [],
  });
});

test("story mission steps stay bounded and spoiler guarded in the workspace projection", () => {
  const pack = structuredClone(loadFixturePack("demo-training"));
  const mission = pack.objectives[0];
  mission.track = "dmz-story";
  mission.steps = ["Find the fictional relay", "Return to the staging area"];
  const row = progressRows(pack, newProfile(pack), {
    track: "dmz-story",
  }).find((candidate) => candidate.id === mission.id);
  assert.deepEqual(row.steps, mission.steps);
  assert.equal(row.requirements.length, mission.requirements.length);
  assert(row.sources.length > 0);
});

test("official starter admits only reported page-one Orders and no Story Mission", () => {
  const pack = loadFixturePack("official-starter");
  const pages = ordersPageCoverage(pack);
  assert.equal(pages.length, 24);
  assert.equal(
    pages.filter((page) => page.state === "unrecorded").length === 23 &&
      pages[0].objectiveIds.length === 3,
    true,
  );
  assert.equal(
    pack.objectives.some((objective) => objective.track === "dmz-story"),
    false,
  );
  assert.equal(
    pack.objectives.some((objective) =>
      (objective.steps || []).some((step) => /fictional|synthetic/i.test(step)),
    ),
    false,
  );
});
