import test from "node:test";
import assert from "node:assert/strict";
import {
  groupMapCategories,
  mapCategoryType,
} from "../src/map/category-groups.ts";

test("named fortress sites collapse to one type across declared groups and known source IDs", () => {
  const input = [
    {
      sourceId: "official",
      categoryId: "dmz_fortress_siteA",
      path: ["Fortresses", "SYNTHETIC Site A"],
    },
    {
      sourceId: "official",
      categoryId: "dmz_fortress_siteB",
      path: ["Fortresses", "SYNTHETIC Site B"],
    },
    {
      sourceId: "mapgenie",
      categoryId: "mapgenie-28411",
      path: ["Points of Interest", "Fortress"],
    },
  ];
  const original = structuredClone(input),
    groups = groupMapCategories(input);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, "Fortresses");
  assert.equal(groups[0].members.length, 3);
  assert.deepEqual(input, original);
});
test("station aliases merge, while different facility types remain distinct", () => {
  const groups = groupMapCategories([
    {
      sourceId: "official",
      categoryId: "dmz_gasStation",
      path: ["Facilities", "Gas Station"],
    },
    {
      sourceId: "codmunity",
      categoryId: "gas-station",
      path: ["Gas stations"],
    },
    { sourceId: "other", categoryId: "external-gas", path: ["Gas Stations"] },
    {
      sourceId: "official",
      categoryId: "dmz_policeStation",
      path: ["Police Station"],
    },
  ]);
  assert.deepEqual(
    groups.map((g) => [g.id, g.members.length]),
    [
      ["gas", 3],
      ["police", 1],
    ],
  );
});
test("Keys ancestor wins over a room name and never creates one type per key location", () => {
  const groups = groupMapCategories([
    {
      sourceId: "source",
      categoryId: "room-a",
      path: ["Keys", "SYNTHETIC Site A"],
    },
    { sourceId: "source", categoryId: "room-b", path: ["Keys", "Hospital"] },
    { sourceId: "codcentral", categoryId: "key", path: ["Keys"] },
  ]);
  assert.deepEqual(
    groups.map((g) => [g.id, g.members.length]),
    [["keys", 3]],
  );
});
test("missions and recipes retain their declared type rather than their individual leaf", () => {
  assert.equal(
    mapCategoryType({
      categoryId: "x",
      path: ["DMZ Orders", "SYNTHETIC Page"],
    }),
    "missions",
  );
  assert.equal(
    mapCategoryType({
      categoryId: "x",
      path: ["3D Printer Recipes", "Backpacks"],
    }),
    "recipes",
  );
});
test("major/minor location labels combine and arbitrary new source labels remain Other", () => {
  const groups = groupMapCategories([
    {
      sourceId: "official",
      categoryId: "poiLabel",
      path: ["Place names", "POI"],
    },
    {
      sourceId: "official",
      categoryId: "poiLabelSecondary",
      path: ["Place names", "Minor POI"],
    },
    {
      sourceId: "future",
      categoryId: "unknown",
      path: ["SYNTHETIC Individual Location"],
    },
  ]);
  assert.deepEqual(
    groups.map((g) => [g.id, g.members.length]),
    [
      ["poi", 2],
      ["other", 1],
    ],
  );
});
test("each original source/category pair is admitted once and empty input is empty", () => {
  const category = { sourceId: "one", categoryId: "safe", path: ["Safes"] };
  assert.deepEqual(groupMapCategories([category, category])[0].members, [
    { sourceId: "one", categoryId: "safe" },
  ]);
  assert.deepEqual(groupMapCategories([]), []);
});

test("prototype-like category IDs remain unknown types", () => {
  assert.equal(
    mapCategoryType({ categoryId: "constructor", path: ["SYNTHETIC unknown"] }),
    "other",
  );
});
