import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { hashBytes } from "../../src/content/portable.mjs";
import { parseRecoveryDraft } from "../../src/content/studio-recovery.mjs";

const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
// Original synthetic 1x1 RGBA PNG, generated from [18, 52, 86, 255], not game art.
const base64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQMgn7DwAClAGcHVtGXwAAAABJRU5ErkJggg==";
const raster = Buffer.from(base64, "base64");
const pack = loadFixturePack("demo-training");
pack.assets = [
  {
    id: "demo:category-fixture",
    path: "assets/category-fixture.png",
    mime: "image/png",
    sha256: await hashBytes(raster),
    bytes: raster.length,
    width: 1,
    height: 1,
    rightsHolder: "Synthetic fixture author",
    license: "CC0-1.0",
    sourceUrl: "https://example.invalid/original-category-fixture",
    attribution: "Original synthetic test pixel",
    redistributionAllowed: true,
  },
];
pack.items[0].assetId = pack.assets[0].id;
const template = {
  format: "dmz-repository-draft-recovery",
  version: 1,
  warning: "Synthetic category-shape fixture",
  packKey: "demo-training",
  expectedRevision: "a".repeat(64),
  pack,
  uploads: [{ assetId: pack.assets[0].id, base64, category: "other" }],
};
function fixture(category) {
  const data = structuredClone(template);
  data.uploads[0].category = category;
  let decodeCalls = 0;
  const currentPack = structuredClone(pack);
  return {
    data,
    text: JSON.stringify(data),
    decodeCalls: () => decodeCalls,
    options: {
      destination: "existing",
      key: data.packKey,
      currentPack,
      assetSources: {},
      entries: [{ key: data.packKey, pack: currentPack }],
      decodeRaster: async (bytes, mime) => {
        decodeCalls++;
        assert.equal(mime, "image/png");
        // Decode the actual known fixture's sole IDAT, rather than stub dimensions.
        const png = Buffer.from(bytes);
        assert.deepEqual(png, raster);
        assert.equal(png.toString("ascii", 37, 41), "IDAT");
        const length = png.readUInt32BE(33);
        assert.deepEqual(
          inflateSync(png.subarray(41, 41 + length)),
          Buffer.from([0, 18, 52, 86, 255]),
        );
        return {
          width: png.readUInt32BE(16),
          height: png.readUInt32BE(20),
          mime,
        };
      },
    },
  };
}
const categories = [
  "items",
  "weapons",
  "recipes",
  "objectives",
  "guides",
  "maps",
  "locations",
  "other",
];
for (const category of categories) {
  test(`FR-006 recovery accepts exact category ${JSON.stringify(category)}`, async () => {
    const f = fixture(category);
    const before = structuredClone(f.options.currentPack);
    const result = await parseRecoveryDraft(f.text, schema, f.options);
    assert.equal(f.decodeCalls(), 1);
    assert.equal(JSON.stringify(f.data), f.text);
    assert.deepEqual(f.options.currentPack, before);
    assert.deepEqual(result.pack, pack);
    assert.notEqual(result.pack, f.options.currentPack);
    assert.deepEqual(result.payloads, [{ assetId: pack.assets[0].id, base64 }]);
    assert.equal(Object.hasOwn(result, "uploads"), false);
    assert.equal(Object.hasOwn(result.payloads[0], "category"), false);
  });
}
const malformed = [
  null,
  true,
  false,
  0,
  1,
  -1,
  1.5,
  {},
  { category: "other" },
  { 0: "other", length: 1 },
  { toString: "other" },
  [],
  [null],
  [0],
  [true],
  [{}],
  ["other", "items"],
  [["other"], ["items"]],
  ["other", null],
  "",
  "OTHER",
  "unknown",
  "../other",
  "other/items",
  ...categories.flatMap((category) => [
    [category],
    [[category]],
    ` ${category}`,
    `${category} `,
    `${category}\n`,
    `${category}\r`,
    `${category}\r\n`,
  ]),
  "\nother",
  "other\t",
  "other\nitems",
  "other\u2028",
  "other\u2029",
];
for (const category of malformed) {
  test(`FR-006 recovery rejects malformed category ${JSON.stringify(category)}`, async () => {
    const f = fixture(category);
    const before = structuredClone(f.options.currentPack);
    await assert.rejects(
      () => parseRecoveryDraft(f.text, schema, f.options),
      /^Error: Invalid recovery picture category$/,
    );
    assert.equal(f.decodeCalls(), 0);
    assert.equal(JSON.stringify(f.data), f.text);
    assert.deepEqual(f.options.currentPack, before);
  });
}
