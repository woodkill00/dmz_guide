import { test } from "node:test";
import assert from "node:assert/strict";
import { rarityItems } from "../../src/domain/rarity-items.mjs";
import {
  renderTrackItems,
  featurePages,
} from "../../src/ui/track-items-page.mjs";
import { quickTrackerPage } from "../../src/ui/quick-tracker.mjs";
import {
  features,
  navigationConfig,
  validateNavigationConfig,
} from "../../src/ui/feature-registry.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
const fixture = () => ({
  id: "fixture:rarities",
  title: "FICTIONAL FIXTURE",
  items: [
    { id: "a", name: "Zebra", rarity: "Common" },
    { id: "b", name: "alpha", rarity: "Common" },
    { id: "c", name: "Uncommon item", rarity: "Uncommon" },
    { id: "d", name: "Rare item", rarity: "Rare" },
    { id: "e", name: "Epic item", rarity: "Epic" },
    { id: "f", name: "Legend item", rarity: "Legendary" },
    { id: "g", name: "Ultra item", rarity: "Ultra" },
    { id: "h", name: "Unknown item" },
    { id: "i", name: "Unique item", rarity: "Unique" },
  ],
  recipes: [],
  objectives: [],
  guides: [],
  maps: [],
  locations: [],
});
test("recorded rarity order and alphabetical names preserve every visible identity without mutation", () => {
  const p = fixture(),
    before = JSON.stringify(p),
    groups = rarityItems(p);
  assert.deepEqual(
    groups.map((g) => g.label),
    [
      "Common",
      "Uncommon",
      "Rare",
      "Epic",
      "Legendary",
      "Ultra",
      "Unique",
      "Not recorded",
    ],
  );
  assert.deepEqual(
    groups[0].items.map((row) => row.item.name),
    ["alpha", "Zebra"],
  );
  assert.equal(groups.flatMap((g) => g.items).length, p.items.length);
  assert.equal(JSON.stringify(p), before);
  assert.throws(
    () => rarityItems({ ...p, items: [...p.items, p.items[0]] }),
    /Duplicate/,
  );
});
test("protected identities, names and rarity labels never enter directory metadata", () => {
  const p = fixture();
  p.items.push({
    id: "secret",
    name: "Secret Alloy",
    rarity: "Legendary",
    spoiler: true,
  });
  p.items[0].name = "Secret Alloy shard";
  p.items[1].rarity = "Secret Alloy";
  const groups = rarityItems(p);
  assert.ok(!JSON.stringify(groups).includes("Secret Alloy"));
  assert.equal(groups.find((g) => g.label === "Not recorded").items.length, 2);
});
test("all303 starter items occur once in their recorded groups and keep exact pack-specific links", () => {
  const p = loadFixturePack("official-starter"),
    before = JSON.stringify(p),
    groups = rarityItems(p);
  assert.equal(groups.flatMap((g) => g.items).length, 303);
  assert.deepEqual(
    groups.map((g) => [g.label, g.items.length]),
    [
      ["Common", 16],
      ["Uncommon", 29],
      ["Rare", 29],
      ["Epic", 25],
      ["Legendary", 23],
      ["Ultra", 137],
      ["Not recorded", 44],
    ],
  );
  const html = renderTrackItems([p]);
  assert.equal((html.match(/data-track-item=/g) || []).length, 303);
  assert.ok(html.includes("pack=official%3Amw4-dmz-starter&amp;id="));
  assert.equal(JSON.stringify(p), before);
  assert.equal(
    featurePages([p])[0].path,
    features.find((f) => f.id === "track-items").path,
  );
});
test("tracker tabs resolve stable registry IDs with Items current and the parent planner accessible", () => {
  for (const tab of navigationConfig.trackerTabs)
    assert.ok(features.some((f) => f.id === tab.id));
  const wrapped = quickTrackerPage({
    page: "track-items",
    body: "Original content",
  });
  assert.match(
    wrapped.body,
    /data-tracker-feature="track-items" aria-current="page">Items/,
  );
  assert.ok(wrapped.body.endsWith("Original content"));
  const parent = quickTrackerPage({ page: "planner", body: "Goals" });
  assert.ok(parent.body.includes('data-tracker-feature="track-items"'));
  assert.ok(!parent.body.includes('aria-current="page"'));
  const clone = structuredClone(navigationConfig);
  clone.trackerTabs[1].label = clone.trackerTabs[0].label;
  assert.throws(() => validateNavigationConfig(clone), /unique/);
});
