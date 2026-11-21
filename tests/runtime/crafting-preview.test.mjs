import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCraftPreview } from "../../src/ui/crafting-preview.mjs";
import { dashboardTile } from "../../src/ui/dashboard-page.mjs";
import {
  itemSummaryMarkup,
  buildRow,
} from "../../src/client/build-collect-view.mjs";
import { useCell } from "../../src/client/compact-lists.mjs";
import { renderItemRow, allRecords, recordUrl } from "../../src/ui/render.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
const fixture = () => ({
  id: "fixture:preview",
  items: [
    { id: "a", name: "Fixture input" },
    ...Array.from({ length: 10 }, (_, n) => ({
      id: `o${n}`,
      name: `Fixture output ${n}`,
    })),
  ],
  recipes: Array.from({ length: 10 }, (_, n) => ({
    id: `r${n}`,
    name: `Recipe ${n}`,
    inputs: [{ itemId: "a", quantity: 1 }],
    output: { itemId: `o${n}`, quantity: 1 },
  })),
  objectives: [],
  guides: [],
  locations: [],
  maps: [],
});

test("previews are bounded, distinct, pack-scoped and spoiler-safe without changing content", () => {
  const pack = fixture();
  pack.recipes = Array.from({ length: 10 }, (_, n) => ({
    id: `r${n}`,
    name: `Fixture recipe ${n}`,
    inputs: [{ itemId: "a", quantity: 1 }],
    output: { itemId: `o${n}`, quantity: 1 },
    prerequisites: [],
  }));
  pack.recipes.push({ ...pack.recipes[0], id: "duplicate" });
  const before = JSON.stringify(pack),
    html = renderCraftPreview(pack, "a");
  assert.ok(html.includes("Used to craft <span>10</span>"));
  assert.equal((html.match(/class="item-craft-button"/g) || []).length, 8);
  assert.ok(html.includes("All 10 products"));
  const native = renderCraftPreview(pack, "a", { referenceURL: recordUrl });
  assert.ok(native.includes('class="craft-preview-more" href="/items/a/"'));
  const privateLinks = renderCraftPreview(pack, "a", {
    referenceURL: (item) => `/local/?pack=${item.pack.id}&id=${item.id}`,
  });
  assert.ok(
    privateLinks.includes(
      'class="craft-preview-more" href="/local/?pack=fixture:preview&amp;id=a"',
    ),
  );
  assert.ok(html.includes("/local/?pack=fixture%3Apreview&amp;id=a"));
  assert.ok(!html.includes('<details class="craft-preview" open'));
  assert.equal(JSON.stringify(pack), before);
  assert.equal(renderCraftPreview(pack, "missing"), "");
  assert.equal(renderCraftPreview(pack, "o0"), "");
  const secret = fixture();
  secret.items[1].spoiler = true;
  secret.recipes = [
    {
      id: "r",
      name: "Fixture recipe",
      inputs: [{ itemId: "a", quantity: 1 }],
      output: { itemId: "o0", quantity: 1 },
    },
  ];
  assert.equal(renderCraftPreview(secret, "a"), "");
});
test("preview contains only distinct visible outputs, with a bounded full-list escape", () => {
  const p = fixture();
  p.recipes.push({ ...p.recipes[0], id: "alias" });
  const before = JSON.stringify(p),
    html = renderCraftPreview(p, "a");
  assert.ok(html.includes("Used to craft <span>10</span>"));
  assert.equal((html.match(/class="item-craft-button"/g) || []).length, 8);
  assert.ok(html.includes("All 10 products"));
  const native = renderCraftPreview(p, "a", { referenceURL: recordUrl });
  assert.ok(native.includes('class="craft-preview-more" href="/items/a/"'));
  const privateLinks = renderCraftPreview(p, "a", {
    referenceURL: (item) => `/local/?pack=${item.pack.id}&id=${item.id}`,
  });
  assert.ok(
    privateLinks.includes(
      'class="craft-preview-more" href="/local/?pack=fixture:preview&amp;id=a"',
    ),
  );
  assert.ok(html.includes("/local/?pack=fixture%3Apreview&amp;id=o0"));
  assert.ok(!html.includes("Recipe 0"));
  assert.ok(!html.includes("<details open"));
  assert.equal(JSON.stringify(p), before);
});
test("hidden endpoints and unrelated items stay absent; hostile output names are inert", () => {
  const p = fixture();
  p.items[1].spoiler = true;
  p.items[2].name = "<script>bad</script>";
  const html = renderCraftPreview(p, "a");
  assert.ok(!html.includes("id=o0"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.equal(renderCraftPreview(p, "o0"), "");
  assert.equal(renderCraftPreview(p, "unknown"), "");
  assert.equal(renderCraftPreview(p, "o9"), "");
});
test("all explicit tile/list adapters add previews outside the main controls", () => {
  const p = loadFixturePack("official-starter"),
    item = p.items.find((i) => i.id === "mw4:synthetics"),
    r = { ...item, remaining: 3, required: 4, held: 1, packId: p.id };
  const views = [
    dashboardTile(r, p, "builds", "k"),
    itemSummaryMarkup([r], p, {
      key: "preview",
      title: "Fixture",
      describe: () => "Fixture",
    }),
    buildRow(r, p),
    useCell([], "crafts", r.id, p),
    renderItemRow(allRecords([p]).find((i) => i.id === r.id)),
  ];
  for (const html of views) {
    assert.ok(html.includes(`data-craft-preview="${r.id}"`));
    assert.ok(!html.includes('<button type="button" class="craft-preview"'));
  }
  assert.ok(views[0].includes("</button><details"));
  assert.ok(views[4].includes("/items/"));
});
