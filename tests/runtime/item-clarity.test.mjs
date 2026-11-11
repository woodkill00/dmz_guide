import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { allRecords, renderDetail } from "../../src/ui/render.mjs";
import { itemOverview } from "../../src/ui/item-summary.mjs";
const pack = loadFixturePack("official-starter");
test("all 303 item pages consolidate overview, uses and evidence without removing real stats", () => {
  const items = allRecords([pack]).filter((r) => r.recordType === "item");
  assert.equal(items.length, 303);
  const names = new Set();
  for (const r of items) {
    const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    assert(!names.has(key), r.id);
    names.add(key);
    assert(!r.description.includes("TroubleChute reference:"), r.id);
    const html = renderDetail(r, [pack]);
    assert.equal((html.match(/<h2>Overview<\/h2>/g) || []).length, 1, r.id);
    assert.equal((html.match(/<h2>Item uses<\/h2>/g) || []).length, 1, r.id);
    assert(!html.includes("Known upgrade uses"));
    assert(!html.includes("No numeric statistics verified for this record"));
    assert.equal(
      html.includes("Statistics &amp; measurement context"),
      !!r.stats.length,
      r.id,
    );
    assert(html.includes("Sources &amp; verification"));
    assert(html.includes("data-build-control"));
  }
});
test("source summary appears once; distinct original notes remain inspectable and inert", () => {
  const r = allRecords([pack]).find(
      (r) => r.id === "mw4:ingredient-ballistic-fabric",
    ),
    o = itemOverview(r, pack);
  const html = renderDetail(r, [pack]);
  assert(o.summary.includes("Chang-san Air Base"));
  assert.equal(html.split(o.summary).length - 1, 1);
  assert(o.notes.some((n) => n.includes("GameRant")));
  assert(html.includes("Additional notes"));
  const custom = {
    ...r,
    id: "custom:item",
    description: "<script>bad()</script>",
    sourceIds: [],
  };
  assert(
    renderDetail(custom, [
      { ...pack, items: [...pack.items, custom] },
    ]).includes("&lt;script&gt;bad()&lt;/script&gt;"),
  );
});

test("authored item descriptions stay primary while provider text remains available", () => {
  const r = pack.items.find((i) => i.id === "mw4:ingredient-ballistic-fabric"),
    o = itemOverview(
      { ...r, description: "My own identification notes." },
      pack,
    );
  assert.equal(o.summary, "My own identification notes.");
  assert(o.notes.some((n) => n.includes("Chang-san Air Base")));
});

test("notes appended to an old placeholder remain readable", () => {
  const r = pack.items.find((i) => i.id === "mw4:ingredient-ballistic-fabric"),
    description =
      "TroubleChute-listed item. Current-build behavior is not independently verified. My identification notes.";
  assert.equal(itemOverview({ ...r, description }, pack).summary, description);
});
