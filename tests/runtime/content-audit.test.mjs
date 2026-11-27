import test from "node:test";
import assert from "node:assert/strict";
import { summarizeContent } from "../../scripts/content-audit.mjs";

test("111 navigation coverage never borrows unrelated or protected mission rosters", () => {
  const index = {
    version: 1,
    eligibleCount: 0,
    indexedCount: 0,
    limited: false,
    entries: [],
  };
  const pack = {
    id: "test:synthetic-orders",
    sources: [],
    objectives: [
      {
        id: "test:x01",
        name: "Synthetic X01 task",
        track: "dmz-order",
        orderSet: "x01",
        orderPage: 1,
      },
    ],
  };
  let maps = summarizeContent([pack], index).missions[0].maps;
  assert.equal(maps[0].navigationPagesWithRoster, 0);
  assert.equal(maps[1].navigationPagesWithRoster, 1);
  pack.objectives.push({
    id: "mw4:order-gear-up",
    name: "Synthetic public task",
    track: "dmz-order",
  });
  maps = summarizeContent([pack], index).missions[0].maps;
  assert.equal(maps[0].navigationPagesWithRoster, 1);
  pack.objectives[1].spoiler = true;
  assert.equal(
    summarizeContent([pack], index).missions[0].maps[0]
      .navigationPagesWithRoster,
    0,
  );
});

test("111 content summary counts only public admitted records and keeps caps honest", () => {
  const index = {
    version: 1,
    eligibleCount: 1,
    indexedCount: 0,
    limited: true,
    entries: [],
  };
  const packs = [
    {
      id: "test:public",
      sources: [],
      items: [
        { id: "item", name: "Synthetic item" },
        { id: "secret", name: "Protected", spoiler: true },
      ],
      recipes: [],
      objectives: [],
    },
    { id: "fixture:excluded", items: [{ id: "example" }] },
  ];
  const before = JSON.stringify(packs);
  const report = summarizeContent(packs, index);
  assert.equal(report.counts.items, 1);
  assert.equal(report.excludedPacks, 1);
  assert.equal(report.limited, true);
  assert.equal(report.eligibleGaps, 1);
  assert.equal(report.indexedGaps, 0);
  assert.equal(JSON.stringify(packs), before);
  assert.ok(!JSON.stringify(report).includes("Protected"));
});
