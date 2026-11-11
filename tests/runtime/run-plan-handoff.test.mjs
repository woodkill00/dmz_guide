import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRunPlanHandoff } from "../../src/domain/collection-handoff.mjs";

const plan = () => ({
  kind: "dmz-run-plan-handoff",
  version: 1,
  packId: "fixture:pack",
  contentVersion: "v1",
  planId: "plan-1",
  name: "Synthetic plan",
  createdAt: "2026-11-11T12:00:00Z",
  objectiveIds: ["fixture:goal"],
  stops: [{ id: "fixture:stop", name: "Synthetic location" }],
});
test("run-plan map handoff accepts only public IDs and stop names", () => {
  assert.deepEqual(
    validateRunPlanHandoff(plan()).stops.map((stop) => stop.name),
    ["Synthetic location"],
  );
  assert.throws(
    () =>
      validateRunPlanHandoff({ ...plan(), inventory: { "fixture:item": 2 } }),
    /Invalid run-plan handoff/,
  );
  assert.throws(
    () =>
      validateRunPlanHandoff({
        ...plan(),
        stops: [
          { id: "fixture:stop", name: "S" },
          { id: "fixture:stop", name: "S" },
        ],
      }),
    /Invalid handoff stops/,
  );
});
