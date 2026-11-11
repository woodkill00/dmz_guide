import { test } from "node:test";
import assert from "node:assert/strict";
import { dataReviewIssues } from "../../src/domain/data-review.mjs";

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
