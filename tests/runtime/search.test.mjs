import { test } from "node:test";
import assert from "node:assert/strict";
import { recordSearchText } from "../../src/ui/render.mjs";
test("catalog and private reader search typed weapon stats and guide body without spoiler leaks", () => {
  const record = {
    name: "Fixture rifle",
    category: "weapons",
    body: "Reload instructions",
    stats: [
      {
        label: "Damage at range",
        metric: "damage",
        value: 17,
        unit: "HP",
        status: "fictional",
        context: { rangeMeters: 25 },
      },
    ],
  };
  const text = recordSearchText(record);
  for (const q of ["damage at range", "17", "hp", "reload instructions", "25"])
    assert(text.includes(q));
  assert(!recordSearchText({ ...record, spoiler: true }).includes("damage"));
  assert.equal(
    recordSearchText({ ...record, spoiler: true }),
    "spoiler-protected record",
  );
});

import { readFileSync } from "node:fs";
import {
  allRecords,
  displayRecord,
  renderCard,
  renderDetail,
} from "../../src/ui/render.mjs";
const demo = JSON.parse(
  readFileSync(
    new URL("../../content/packs/demo-training.json", import.meta.url),
  ),
);
function relayFixture() {
  const pack = structuredClone(demo);
  pack.objectives.push({
    ...structuredClone(pack.objectives[0]),
    id: "demo:hidden-relay",
    name: "Hidden relay activation",
    description: "Secret relay instructions.",
    spoiler: true,
    prerequisites: [],
    effects: [],
  });
  pack.objectives[0].description = "Start with Hidden relay activation.";
  return pack;
}

test("cross-record relay prose is absent from public cards, details and private-list search projections", () => {
  const pack = relayFixture();
  const bench = allRecords([pack]).find((r) => r.id === "demo:bench-unlock");
  assert.equal(bench.spoiler, false, "regression concerns a nonspoiler record");
  for (const [surface, text] of [
    ["public card", renderCard(bench)],
    ["public detail", renderDetail(bench, [pack])],
    ["public search", recordSearchText(bench)],
    ["private list description", displayRecord(bench).description],
    ["private list search", recordSearchText(displayRecord(bench))],
  ]) {
    assert(!text.toLowerCase().includes("hidden relay activation"), surface);
    assert.match(text, /spoiler-protected content/i, surface);
  }
  assert.equal(
    pack.objectives[0].description,
    "Start with Hidden relay activation.",
  );
  assert.equal(recordSearchText(bench).includes("unlock training bench"), true);
});

test("nonspoiler source, claim and stat metadata cannot reintroduce the hidden relay label", () => {
  const pack = relayFixture();
  pack.sources[0].title = "Notes on Hidden relay activation";
  pack.sources[0].supports = "Hidden relay activation is an invented fixture.";
  pack.sources[0].url = "https://example.com/Hidden%20relay%20activation";
  pack.claims.push({
    id: "claim:relay-fixture",
    entityId: "demo:bench-unlock",
    field: "Hidden relay activation",
    value: "Hidden relay activation",
    locator: "Hidden relay activation appendix",
    sourceId: pack.sources[0].id,
    status: "fictional",
  });
  const rifle = pack.items.find((r) => r.id === "demo:rifle");
  rifle.stats[0].label = "Hidden relay activation measurement";
  rifle.stats[0].context.method = "Measured during Hidden relay activation";
  const records = allRecords([pack]);
  for (const id of ["demo:bench-unlock", "demo:rifle"]) {
    const record = records.find((r) => r.id === id);
    const detail = renderDetail(record, [pack]);
    assert(!detail.toLowerCase().includes("hidden relay activation"), id);
    assert(!detail.includes("Hidden%20relay%20activation"), `${id} URL`);
    assert(
      !recordSearchText(record).includes("hidden relay activation"),
      `${id} search`,
    );
  }
});
