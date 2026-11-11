import { test } from "node:test";
import assert from "node:assert/strict";
import {
  traceRunPrerequisites,
  keyPackingForUses,
  keyUsesForStops,
} from "../../src/domain/run-prerequisites.mjs";
import {
  addRunPlan,
  emptyRunPlans,
  evaluateRunReadiness,
  moveRunPlan,
  validateRunPlans,
} from "../../src/domain/run-plans.mjs";

const pack = { id: "official:fixture", contentVersion: "v1" };
const plan = (id, amount) => ({
  id,
  name: id,
  date: "2026-11-11",
  objectives: [],
  stops: [],
  reservations: { "fixture:item": amount },
});
test("run-plan order controls competing stock without changing inventory", () => {
  const doc = addRunPlan(
    addRunPlan(emptyRunPlans(pack), plan("first", 4)),
    plan("second", 4),
  );
  const profile = {
    packId: pack.id,
    contentVersion: "v1",
    inventory: { "fixture:item": 5 },
    reserves: {},
  };
  assert.deepEqual(
    evaluateRunReadiness(doc, profile).rows.map(
      (row) => row.reservations[0].missing,
    ),
    [0, 3],
  );
  assert.deepEqual(
    evaluateRunReadiness(moveRunPlan(doc, "second", -1), profile).rows.map(
      (row) => row.reservations[0].missing,
    ),
    [0, 3],
  );
  assert.equal(
    evaluateRunReadiness(moveRunPlan(doc, "second", -1), profile).rows[0].id,
    "second",
  );
  assert.equal(profile.inventory["fixture:item"], 5);
});
test("blank stock and stale content never become covered or zero", () => {
  const doc = addRunPlan(emptyRunPlans(pack), plan("first", 2));
  const unknown = evaluateRunReadiness(doc, {
    packId: pack.id,
    contentVersion: "v1",
    inventory: {},
    reserves: {},
  });
  assert.equal(unknown.rows[0].reservations[0].status, "unknown");
  assert.equal(unknown.rows[0].reservations[0].missing, null);
  const stale = evaluateRunReadiness(doc, {
    packId: pack.id,
    contentVersion: "v2",
    inventory: { "fixture:item": 5 },
    reserves: {},
  });
  assert.equal(stale.stale, true);
  assert.equal(stale.rows[0].reservations[0].status, "unknown");
  assert.equal(
    evaluateRunReadiness(
      doc,
      {
        packId: pack.id,
        contentVersion: "v1",
        inventory: { "fixture:item": 5 },
        reserves: {},
      },
      "v2",
    ).stale,
    true,
  );
});
test("malformed references and duplicate IDs are rejected", () => {
  const doc = addRunPlan(emptyRunPlans(pack), plan("first", 2));
  assert.throws(() => addRunPlan(doc, plan("first", 1)), /duplicate/);
  const bad = structuredClone(doc);
  bad.plans[0].objectives.push({ type: "mission", id: "javascript:alert(1)" });
  assert.throws(() => validateRunPlans(bad), /Invalid plan objective/);
});
test("run-plan limits and content binding reject unsafe expansion", () => {
  let doc = emptyRunPlans(pack);
  for (let index = 0; index < 8; index++)
    doc = addRunPlan(doc, plan(`plan-${index}`, 1));
  assert.throws(() => addRunPlan(doc, plan("ninth", 1)), /Too many run plans/);
  const wrongPack = {
    packId: "official:other",
    contentVersion: "v1",
    inventory: {},
    reserves: {},
  };
  assert.throws(() => evaluateRunReadiness(doc, wrongPack), /pack mismatch/);
});
test("invalid calendar dates are rejected", () => {
  const bad = plan("bad-date", 1);
  bad.date = "2026-02-30";
  assert.throws(
    () => addRunPlan(emptyRunPlans(pack), bad),
    /Invalid plan date/,
  );
});
test("recorded prerequisite chains expose missing links and terminate cycles", () => {
  const fixture = {
    objectives: [
      {
        id: "objective:a",
        name: "A",
        prerequisites: ["objective:b"],
        requirements: [{ itemId: "item:x", quantity: 2 }],
      },
      {
        id: "objective:b",
        name: "B",
        prerequisites: ["objective:a", "objective:missing"],
      },
    ],
    items: [{ id: "item:x", name: "X" }],
  };
  const result = traceRunPrerequisites(fixture, [{ id: "objective:a" }]);
  assert.deepEqual(
    result.nodes.map((node) => node.id),
    ["objective:a", "objective:b", "objective:missing", "item:x"],
  );
  assert.equal(result.nodes[2].type, "unresolved");
  assert.equal(result.truncated, false);
  assert.equal(
    traceRunPrerequisites(fixture, [{ id: "objective:a" }], { maxNodes: 2 })
      .truncated,
    true,
  );
});
test("recorded recipe links distinguish retained tools and unknown ingredients", () => {
  const pack = {
    objectives: [
      { id: "mission:a", name: "A", requirements: [{ itemId: "item:out" }] },
    ],
    items: ["out", "part", "tool"].map((name) => ({
      id: `item:${name}`,
      name,
    })),
    recipes: [
      {
        id: "recipe:out",
        name: "Build output",
        output: { itemId: "item:out", quantity: 1 },
        ingredientsKnown: true,
        inputs: [
          { itemId: "item:part", quantity: 2, consumption: "consumed" },
          { itemId: "item:tool", quantity: 1, consumption: "retained" },
        ],
      },
    ],
  };
  const known = traceRunPrerequisites(pack, [{ id: "mission:a" }]);
  assert.deepEqual(
    known.nodes.map((node) => node.id),
    ["mission:a", "item:out", "recipe:out", "item:part", "item:tool"],
  );
  assert.deepEqual(
    known.nodes.find((node) => node.id === "item:part") &&
      (({ parentId, depth, quantity }) => ({ parentId, depth, quantity }))(
        known.nodes.find((node) => node.id === "item:part"),
      ),
    { parentId: "recipe:out", depth: 3, quantity: 2 },
  );
  assert.equal(known.nodes.at(-1).consumption, "retained");
  pack.objectives[0].requirements.push({
    itemId: "item:tool",
    quantity: 2,
    consumption: "consumed",
  });
  const repeated = traceRunPrerequisites(pack, [{ id: "mission:a" }]);
  assert.deepEqual(
    repeated.nodes
      .filter((node) => node.id === "item:tool")
      .map((node) => node.consumption),
    ["retained", "consumed"],
  );
  pack.objectives[0].requirements.pop();
  pack.recipes[0].ingredientsKnown = false;
  const unknown = traceRunPrerequisites(pack, [{ id: "mission:a" }]);
  assert.equal(
    unknown.nodes.find((node) => node.type === "recipe").ingredientsKnown,
    false,
  );
  assert.equal(
    unknown.nodes.some((node) => node.id === "item:part"),
    false,
  );
});
test("hidden saved objectives never expose their names in prerequisite traversal", () => {
  const pack = {
    objectives: [
      { id: "secret:mission", name: "Hidden secret", spoiler: true },
    ],
    items: [],
    recipes: [],
  };
  const result = traceRunPrerequisites(pack, [{ id: "secret:mission" }]);
  assert.equal(result.nodes[0].name, "Spoiler-protected record");
  assert.equal(JSON.stringify(result).includes("Hidden secret"), false);
});
test("selected key uses add required access keys once without guessing possible links", () => {
  const uses = [
    {
      id: "outer",
      keyId: "key:outer",
      locationName: "Hospital",
      status: "reported",
      requiredUses: [],
      possibleUses: [],
    },
    {
      id: "inner",
      keyId: "key:inner",
      locationName: "Hospital",
      status: "reported",
      requiredUses: ["outer"],
      possibleUses: ["other"],
    },
  ];
  const result = keyPackingForUses(["inner", "outer"], uses, [
    { id: "key:outer", name: "Outer" },
    { id: "key:inner", name: "Inner" },
  ]);
  assert.deepEqual(
    result.keys.map((row) => row.name),
    ["Outer", "Inner"],
  );
  assert.deepEqual(result.unresolved, []);
  const shared = keyPackingForUses(
    ["first", "second"],
    [
      {
        id: "first",
        keyId: "key:shared",
        locationName: "Room A",
        requiredUses: [],
      },
      {
        id: "second",
        keyId: "key:shared",
        locationName: "Room B",
        requiredUses: [],
      },
    ],
    [{ id: "key:shared", name: "Shared key" }],
  );
  assert.equal(shared.keys.length, 1);
  assert.deepEqual(shared.keys[0].locationNames, ["Room A", "Room B"]);
});
test("route stops only add a unique exact sourced key use", () => {
  const locations = [
    { id: "a", name: "Exact room" },
    { id: "b", name: "Ambiguous room" },
    { id: "c", name: "Unlinked area" },
  ];
  const uses = [
    {
      id: "exact",
      locationId: "a",
      locationName: "Exact room",
      sources: ["source"],
    },
    {
      id: "unsourced",
      locationId: "c",
      locationName: "Unlinked area",
      sources: [],
    },
    {
      id: "one",
      locationId: "b",
      locationName: "Ambiguous room",
      sources: ["source"],
    },
    {
      id: "two",
      locationId: "b",
      locationName: "Ambiguous room",
      sources: ["source"],
    },
  ];
  assert.deepEqual(keyUsesForStops(["a", "a", "b", "c"], locations, uses), {
    matched: ["exact"],
    ambiguous: ["Ambiguous room"],
    unlinked: ["Unlinked area"],
  });
  assert.deepEqual(
    keyUsesForStops(["a"], locations, [
      { id: "area-only", locationName: "Exact room", sources: ["source"] },
    ]).matched,
    [],
  );
});
