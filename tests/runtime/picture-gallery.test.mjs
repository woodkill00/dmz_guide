import test from "node:test";
import assert from "node:assert/strict";
import { renderDetail, setBundledAssets } from "../../src/ui/render.mjs";
import { bundledFileURL } from "../../src/content/bundled-assets.mjs";

const asset = (id, character) => ({
  id,
  path: `assets/${id.split(":")[1]}.png`,
  mime: "image/png",
  sha256: character.repeat(64),
  bytes: 83,
  width: 8,
  height: 6,
  rightsHolder: "Fixture author",
  license: "CC0-1.0",
  attribution: "Original fictional artwork",
  redistributionAllowed: true,
  sourceUrl: "https://example.invalid/fixture",
});
function fixture() {
  const assets = [asset("demo:primary", "a"), asset("demo:extra", "b")];
  const pack = {
    id: "demo:gallery",
    contentVersion: "1",
    title: "Gallery fixture",
    game: { id: "fictional-training", mode: "fixture", build: "1" },
    sources: [],
    items: [],
    recipes: [],
    objectives: [],
    guides: [],
    maps: [],
    locations: [],
    claims: [],
    assets,
  };
  const record = {
    id: "demo:record",
    name: "Fictional item",
    kind: "item",
    category: "fixture",
    status: "fictional",
    description: "No game facts",
    sourceIds: [],
    spoiler: false,
    assetId: assets[0].id,
    assetIds: [assets[1].id, assets[0].id],
    recordType: "item",
    pack,
  };
  pack.items.push(record);
  setBundledAssets({
    format: "dmz-bundled-assets",
    version: 1,
    packs: [
      {
        packId: pack.id,
        contentVersion: pack.contentVersion,
        assets: assets.map((a) => ({
          assetId: a.id,
          path: a.path,
          mime: a.mime,
          sha256: a.sha256,
          bytes: a.bytes,
          width: a.width,
          height: a.height,
          url: bundledFileURL(pack.id, a),
        })),
      },
    ],
  });
  return { pack, record };
}
test("public primary and additional illustrations deduplicate and remain lazy", () => {
  const { pack, record } = fixture();
  const html = renderDetail(record, [pack]);
  assert.equal((html.match(/data-public-image/g) || []).length, 2);
  assert.equal((html.match(/loading="lazy"/g) || []).length, 2);
  assert.match(html, /primary rights-cleared illustration/);
  assert.match(html, /additional rights-cleared illustration/);
  assert.equal(
    (html.match(/Image availability does not verify game facts/g) || []).length,
    2,
  );
  setBundledAssets(null);
});
test("additional images stay inside spoiler disclosure and missing IDs fail soft in renderer", () => {
  const { pack, record } = fixture();
  record.spoiler = true;
  record.assetIds.push("demo:missing");
  const html = renderDetail(record, [pack]);
  assert(
    html.indexOf('class="spoiler-content"') < html.indexOf("data-public-image"),
  );
  assert.equal((html.match(/data-public-image/g) || []).length, 2);
  setBundledAssets(null);
});
