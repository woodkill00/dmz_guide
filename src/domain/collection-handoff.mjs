import { assert, ID, boundedWalk } from "../content/limits.mjs";
export function validateCollectionHandoff(plan) {
  boundedWalk(plan, { depth: 8, nodes: 12000, string: 240 });
  const exact = (value, names) =>
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join() === names.sort().join();
  const id = (value) =>
    typeof value === "string" && value.length <= 100 && ID.test(value);
  assert(
    exact(plan, [
      "kind",
      "version",
      "packId",
      "contentVersion",
      "createdAt",
      "scope",
      "items",
    ]) &&
      plan.kind === "dmz-collection-plan" &&
      plan.version === 1 &&
      id(plan.packId) &&
      typeof plan.contentVersion === "string" &&
      plan.contentVersion.length <= 80 &&
      typeof plan.createdAt === "string" &&
      plan.createdAt.length <= 40 &&
      Number.isFinite(Date.parse(plan.createdAt)) &&
      ["unfinished", "builds"].includes(plan.scope),
    "Invalid collection plan identity",
  );
  assert(
    Array.isArray(plan.items) &&
      plan.items.length > 0 &&
      plan.items.length <= 128 &&
      new Set(plan.items.map((row) => row.itemId)).size === plan.items.length,
    "Choose 1–128 distinct collection items",
  );
  for (const row of plan.items) {
    assert(
      exact(row, ["itemId", "name", "needed", "minimum", "areas"]) &&
        id(row.itemId) &&
        typeof row.name === "string" &&
        row.name.length > 0 &&
        row.name.length <= 160 &&
        Number.isSafeInteger(row.needed) &&
        row.needed > 0 &&
        row.needed <= 1e12 &&
        typeof row.minimum === "boolean" &&
        Array.isArray(row.areas) &&
        row.areas.length <= 32,
      "Invalid collection plan item",
    );
    assert(
      new Set(row.areas.map((area) => area.id)).size === row.areas.length,
      "Duplicate collection area",
    );
    for (const area of row.areas)
      assert(
        exact(area, ["id", "name"]) &&
          id(area.id) &&
          typeof area.name === "string" &&
          area.name.length > 0 &&
          area.name.length <= 120,
        "Invalid collection area",
      );
  }
  assert(
    new TextEncoder().encode(JSON.stringify(plan)).length <= 200000,
    "Collection plan is too large",
  );
  return plan;
}

export function validateRunPlanHandoff(value) {
  boundedWalk(value, { depth: 5, nodes: 500, string: 240 });
  const exact = (record, names) =>
    record &&
    typeof record === "object" &&
    !Array.isArray(record) &&
    Object.keys(record).sort().join() === names.sort().join();
  const text = (entry, max = 120) =>
    typeof entry === "string" &&
    entry.length > 0 &&
    entry.length <= max &&
    !/[\u0000-\u001f\u007f]/.test(entry);
  assert(
    exact(value, [
      "kind",
      "version",
      "packId",
      "contentVersion",
      "planId",
      "name",
      "createdAt",
      "objectiveIds",
      "stops",
    ]) &&
      value.kind === "dmz-run-plan-handoff" &&
      value.version === 1 &&
      text(value.packId) &&
      text(value.contentVersion) &&
      text(value.planId) &&
      text(value.name, 80) &&
      text(value.createdAt, 40) &&
      Number.isFinite(Date.parse(value.createdAt)),
    "Invalid run-plan handoff",
  );
  assert(
    Array.isArray(value.objectiveIds) &&
      value.objectiveIds.length <= 32 &&
      value.objectiveIds.every((id) => text(id)) &&
      new Set(value.objectiveIds).size === value.objectiveIds.length,
    "Invalid handoff objectives",
  );
  assert(
    Array.isArray(value.stops) &&
      value.stops.length <= 64 &&
      value.stops.every(
        (stop) =>
          exact(stop, ["id", "name"]) && text(stop.id) && text(stop.name, 120),
      ) &&
      new Set(value.stops.map((stop) => stop.id)).size === value.stops.length,
    "Invalid handoff stops",
  );
  assert(
    value.objectiveIds.length + value.stops.length > 0,
    "Choose an objective or stop for the map",
  );
  assert(
    new TextEncoder().encode(JSON.stringify(value)).length <= 20000,
    "Run-plan handoff is too large",
  );
  return value;
}
