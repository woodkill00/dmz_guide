import { test } from "node:test";
import assert from "node:assert/strict";
import { dataReviewIssues } from "../../src/domain/data-review.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";

test("uncertainty queue excludes protected records and does not infer positions", () => {
  const pack = {
    objectives: [
      { id: "a", name: "A", requirementsKnown: false },
      { id: "secret", spoiler: true, requirementsKnown: false },
    ],
    recipes: [],
    locations: [{ id: "l", name: "L", coordinates: null, grid: null }],
    claims: [],
  };
  assert.deepEqual(
    dataReviewIssues(pack).issues.map((row) => row.id),
    ["a", "l"],
  );
  assert.equal(
    dataReviewIssues(pack).issues[1].reason,
    "No registered map position",
  );
});

test("relation review identifies the owner without exposing a missing or protected target", () => {
  const pack = {
    items: [{ id: "secret:item", spoiler: true }],
    recipes: [
      {
        id: "recipe:broken",
        name: "Broken",
        inputs: [{ itemId: "missing:item" }],
      },
      {
        id: "recipe:protected",
        name: "Protected",
        inputs: [{ itemId: "secret:item" }],
      },
    ],
    objectives: [],
    locations: [],
  };
  const issues = dataReviewIssues(pack).issues;
  assert.deepEqual(
    issues.map((row) => row.id),
    ["recipe:broken"],
  );
  assert.equal(issues[0].type, "relation");
  assert.equal(JSON.stringify(issues).includes("missing:item"), false);
  assert.equal(JSON.stringify(issues).includes("secret:item"), false);
});

test("known official starter has no unresolved declared record references", () => {
  const issues = dataReviewIssues(loadFixturePack("official-starter"), 1000);
  assert.equal(
    issues.issues.filter((row) => row.type === "relation").length,
    0,
  );
});

test("weapon review keeps missing numbers and unsupported sources explicit", () => {
  const issues = dataReviewIssues({
    items: [
      { id: "w:empty", name: "Empty", kind: "weapon", stats: [] },
      {
        id: "w:unsupported",
        name: "Unsupported",
        kind: "weapon",
        stats: [{ value: 25 }],
      },
    ],
  }).issues;
  assert.equal(issues.length, 2);
  assert.match(issues[0].reason, /No numeric/);
  assert.match(issues[1].reason, /direct source/);
});
