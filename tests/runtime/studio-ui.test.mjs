import test from "node:test";
import { readFile } from "node:fs/promises";
import { renderStudioPage } from "../../src/ui/studio-page.mjs";
import assert from "node:assert/strict";
import { recordUses } from "../../src/client/studio-media.mjs";
import { GROUPS } from "../../src/content/portable.mjs";
const empty = () => Object.fromEntries(GROUPS.map((group) => [group, []]));

// Synthetic relationships, not game facts. Every reference relationship enforced
// by validatePack must be visible before the Studio offers a draft removal.
for (const [name, group, record, path] of [
  ["map location", "locations", { mapId: "test:target" }, "locations.0.mapId"],
  ["primary picture", "items", { assetId: "test:target" }, "items.0.assetId"],
  [
    "additional picture",
    "guides",
    { assetIds: ["test:target"] },
    "guides.0.assetIds.0",
  ],
  [
    "item evidence",
    "items",
    { sourceIds: ["test:target"] },
    "items.0.sourceIds.0",
  ],
  [
    "stat evidence",
    "items",
    { stats: [{ sourceIds: ["test:target"] }] },
    "items.0.stats.0.sourceIds.0",
  ],
  [
    "claim evidence",
    "claims",
    { sourceId: "test:target" },
    "claims.0.sourceId",
  ],
  ["claim entity", "claims", { entityId: "test:target" }, "claims.0.entityId"],
  [
    "recipe ingredient",
    "recipes",
    { inputs: [{ itemId: "test:target" }] },
    "recipes.0.inputs.0.itemId",
  ],
  [
    "recipe output",
    "recipes",
    { output: { itemId: "test:target" } },
    "recipes.0.output.itemId",
  ],
  [
    "objective requirement",
    "objectives",
    { requirements: [{ itemId: "test:target" }] },
    "objectives.0.requirements.0.itemId",
  ],
  [
    "objective gate",
    "objectives",
    { prerequisites: ["test:target"] },
    "objectives.0.prerequisites.0",
  ],
  [
    "recipe gate",
    "recipes",
    { prerequisites: ["test:target"] },
    "recipes.0.prerequisites.0",
  ],
  [
    "guide relation",
    "guides",
    { relatedIds: ["test:target"] },
    "guides.0.relatedIds.0",
  ],
  [
    "location item",
    "locations",
    { itemIds: ["test:target"] },
    "locations.0.itemIds.0",
  ],
]) {
  test(`Studio removal usage includes ${name}`, () => {
    const pack = empty();
    pack[group].push({ id: "test:dependent", ...record });
    assert.deepEqual(recordUses(pack, "test:target"), [
      { group, index: 0, id: "test:dependent", name: "test:dependent", path },
    ]);
  });
}
test("Studio usage does not mistake labels, body text or own IDs for references", () => {
  const pack = empty();
  pack.items.push({
    id: "test:target",
    name: "test:target",
    description: "test:target",
  });
  pack.guides.push({ id: "test:guide", body: "test:target" });
  assert.deepEqual(recordUses(pack, "test:target"), []);
});
test("Studio thumbnail parents are visible in where-used and deletion previews", () => {
  const pack = empty();
  pack.assets.push({ id: "test:original" }, { id: "test:thumb" });
  assert.deepEqual(
    recordUses(pack, "test:original", {
      "test:thumb": { parentAssetId: "test:original", variant: "thumbnail" },
    }),
    [
      {
        group: "assets",
        index: 1,
        id: "test:thumb",
        name: "test:thumb",
        path: "assets.1.parentAssetId",
      },
    ],
  );
});

test("Studio defaults dark and offers the standalone persisted theme toggle", async () => {
  const html = renderStudioPage();
  assert.match(html, /<html lang="en" data-theme="dark">/);
  assert.match(
    html,
    /id="theme-toggle"[^>]+aria-label="Switch to light theme"/,
  );
  assert.match(html, /src="\/assets\/src\/client\/theme.mjs"/);
  const css = await readFile(
    new URL("../../src/ui/studio.css", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(css, /prefers-color-scheme/);
  assert.match(css, /:root\[data-theme="light"\]/);
});
