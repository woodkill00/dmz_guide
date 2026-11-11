import test from "node:test";
import assert from "node:assert/strict";
import { fixtureCatalog, loadFixturePack } from "../helpers/catalog.mjs";
import { allRecords, renderDetail } from "../../src/ui/render.mjs";
import { itemMapAreas } from "../../src/domain/item-map-areas.mjs";
import { itemOverview } from "../../src/ui/item-summary.mjs";
import { renderItemMapAreas } from "../../src/ui/item-map-areas.mjs";
import { itemIcon } from "../../src/ui/item-workspace.mjs";

test("IP-1–7 every unprotected catalog item has one complete linked shell without mutating content", () => {
  for (const { pack } of fixtureCatalog.entries) {
    const before = JSON.stringify(pack);
    for (const record of allRecords([pack]).filter(
      (record) => record.recordType === "item" && !record.spoiler,
    )) {
      const html = renderDetail(record, [pack]);
      assert.equal((html.match(/<h1>/g) || []).length, 1, record.id);
      for (const key of ["overview", "find", "crafting", "uses", "sources"]) {
        assert.equal(
          (html.match(new RegExp(`id="item-${key}"`, "g")) || []).length,
          1,
          record.id,
        );
        assert(html.includes(`href="#item-${key}"`), record.id);
      }
      assert.equal(
        (html.match(/data-build-control/g) || []).length,
        1,
        record.id,
      );
      assert(html.includes(encodeURIComponent(record.pack.id)), record.id);
      assert(html.includes(encodeURIComponent(record.id)), record.id);
      assert.equal(
        html.includes("Statistics &amp; measurement context"),
        !!record.stats?.length,
        record.id,
      );
      assert(html.includes("Sources &amp; verification"), record.id);
    }
    assert.equal(JSON.stringify(pack), before);
  }
});

test("IP-8 Ballistic Fabric links source-mentioned catalog areas without inventing coordinates", () => {
  const pack = loadFixturePack("official-starter");
  const item = pack.items.find(
    (item) => item.id === "mw4:ingredient-ballistic-fabric",
  );
  const areas = itemMapAreas(item, pack, itemOverview(item, pack));
  assert(areas.some((area) => area.name === "Chang-san Air Base"));
  assert(areas.some((area) => area.name === "Songdo Wharf"));
  for (const area of areas) {
    assert.equal(new URL(area.mapURL).searchParams.get("area"), area.name);
    assert.equal(new URL(area.mapURL).searchParams.get("tool"), "explore");
    assert(!Object.hasOwn(area, "coordinates"));
    assert.match(area.basis, /mentioned/);
  }
  assert.match(
    renderItemMapAreas(
      { ...item, description: "No locations listed", sourceIds: [] },
      pack,
    ),
    /No named map area recorded/,
  );
});

test("IP-8 area matching uses complete names, excludes protected places, preserves explicit associations", () => {
  const pack = loadFixturePack("official-starter");
  const item = {
    ...pack.items[0],
    id: "custom:test",
    sourceIds: [],
    description: "Chang-san Air Baseball is unrelated.",
  };
  const location = pack.locations.find(
    (location) => location.name === "Chang-san Air Base",
  );
  assert.equal(
    itemMapAreas(item, { ...pack, locations: [location] }).length,
    0,
  );
  const linked = { ...location, itemIds: [item.id] };
  assert.equal(
    itemMapAreas(item, { ...pack, locations: [linked] })[0].basis,
    "Recorded item/location association",
  );
  assert.equal(
    itemMapAreas(item, { ...pack, locations: [{ ...linked, spoiler: true }] })
      .length,
    0,
  );
  assert.equal(
    itemMapAreas({ ...item, spoiler: true }, { ...pack, locations: [linked] })
      .length,
    0,
  );
  const unsafe = { ...linked, name: '<img src=x onerror="bad()">' };
  const html = renderItemMapAreas(item, { ...pack, locations: [unsafe] });
  assert(!html.includes("<img src=x"));
  assert(html.includes("&lt;img"));
});

test("IP-1 explicit icon fallback never hydrates protected artwork", () => {
  const pack = loadFixturePack("official-starter");
  assert.match(itemIcon({ ...pack.items[0], pack }), /Image needed/);
  const html = itemIcon({ ...pack.items[0], pack, spoiler: true });
  assert(!html.includes("data-inventory-icon"));
  assert.match(html, /Protected/);
});
