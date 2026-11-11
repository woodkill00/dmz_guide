import { test } from "node:test";
import assert from "node:assert/strict";
import { previewSourceImpact } from "../../src/domain/source-impact.mjs";
import { addRunPlan, emptyRunPlans } from "../../src/domain/run-plans.mjs";

test("source change preview only reports referenced records and never edits plan", () => {
  const before = {
    id: "fixture:pack",
    contentVersion: "v1",
    objectives: [{ id: "fixture:goal", name: "Old" }],
    items: [],
    locations: [],
  };
  const after = {
    ...before,
    contentVersion: "v2",
    objectives: [
      { id: "fixture:goal", name: "New" },
      { id: "fixture:other", name: "Other" },
    ],
  };
  const doc = addRunPlan(emptyRunPlans(before), {
    id: "p1",
    name: "Plan",
    date: "2026-11-11",
    objectives: [{ type: "objective", id: "fixture:goal" }],
    stops: [],
    reservations: {},
  });
  assert.deepEqual(previewSourceImpact(before, after, doc), [
    {
      planId: "p1",
      changes: [
        { id: "fixture:goal", state: "changed" },
        { id: "catalog content version", state: "changed" },
      ],
    },
  ]);
  assert.equal(doc.plans[0].objectives[0].id, "fixture:goal");
});

test("source and disputed-claim evidence changes reach referenced plans", () => {
  const before = {
    id: "fixture:pack",
    contentVersion: "v1",
    objectives: [{ id: "fixture:goal", sourceIds: ["source:a"] }],
    items: [],
    locations: [],
    recipes: [],
    sources: [{ id: "source:a", reviewedAt: "2026-11-10" }],
    claims: [{ id: "claim:a", entityId: "fixture:goal", status: "observed" }],
  };
  const after = structuredClone(before);
  after.sources[0].reviewedAt = "2026-11-11";
  after.claims[0].status = "disputed";
  const doc = addRunPlan(emptyRunPlans(before), {
    id: "p1",
    name: "Plan",
    date: "2026-11-11",
    objectives: [{ type: "objective", id: "fixture:goal" }],
    stops: [],
    reservations: {},
  });
  assert.deepEqual(previewSourceImpact(before, after, doc)[0].changes, [
    { id: "source:a", state: "changed" },
    { id: "claim:a", state: "changed" },
  ]);
});

test("recipe changes under a selected objective affect its saved plan", () => {
  const before = {
    id: "fixture:pack",
    contentVersion: "v1",
    objectives: [
      { id: "fixture:goal", requirements: [{ itemId: "fixture:output" }] },
    ],
    items: [
      { id: "fixture:output", name: "Output" },
      { id: "fixture:part", name: "Part" },
    ],
    locations: [],
    recipes: [
      {
        id: "fixture:recipe",
        output: { itemId: "fixture:output" },
        inputs: [{ itemId: "fixture:part", quantity: 1 }],
      },
    ],
  };
  const after = structuredClone(before);
  after.recipes[0].inputs[0].quantity = 2;
  const doc = addRunPlan(emptyRunPlans(before), {
    id: "p1",
    name: "Plan",
    date: "2026-11-11",
    objectives: [{ type: "objective", id: "fixture:goal" }],
    stops: [],
    reservations: {},
  });
  assert.deepEqual(previewSourceImpact(before, after, doc)[0].changes, [
    { id: "fixture:recipe", state: "changed" },
  ]);
});
