import { test } from "node:test";
import assert from "node:assert/strict";
import { wzstatsRows } from "../server/wzstats.mjs";
const state = (pins: any[]) => ({ synthetic: { b: { map: "hajin", pins } } });
test("112 WZStats optional titles retain explicit source fields and distinguish loot from operator starts", () => {
  const input = state([
    { id: "named", title: "SYNTHETIC named", type: "safe", x: 100, y: 200 },
    {
      id: "door",
      type: "door",
      map: "hajin",
      place: "hospital",
      x: 300,
      y: 400,
      det: { floor: "basement" },
    },
    {
      id: "loot",
      type: "spawn",
      itemId: "synthetic-kit",
      place: "array",
      x: 500,
      y: 600,
    },
  ]);
  const before = JSON.stringify(input),
    rows = wzstatsRows(input);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].title, "SYNTHETIC named");
  assert.equal(rows[1].title, "Door · hospital");
  assert.equal(rows[1].floor, "basement");
  assert.equal(rows[2].category, "loot-items");
  assert.match(rows[2].title, /synthetic kit/);
  assert(!/spawn/i.test(rows[2].title));
  assert.equal(rows[0].x, 108);
  assert.equal(rows[0].y, 216);
  assert.equal(JSON.stringify(input), before);
});
test("112 WZStats rejects ambiguous datasets, foreign maps, malformed optional fields and coordinates", () => {
  const pin = { id: "synthetic", type: "safe", x: 100, y: 200 };
  for (const change of [
    { title: {} },
    { map: "x01" },
    { type: [] },
    { note: {} },
    { x: "100" },
    { x: 1001 },
    { det: { floor: {} } },
    { itemId: {} },
    { place: "x".repeat(121) },
  ])
    assert.throws(() => wzstatsRows(state([{ ...pin, ...change }])));
  assert.throws(() =>
    wzstatsRows({
      one: { b: { map: "hajin", pins: [pin] } },
      two: { b: { map: "hajin", pins: [pin] } },
    }),
  );
});
