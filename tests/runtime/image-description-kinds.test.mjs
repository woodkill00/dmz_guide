import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { validatePack } from "../../src/content/validate.mjs";
import { imageDescription } from "../../src/content/image-description.mjs";
import {
  base64FromBytes,
  buildTransfer,
  exportContent,
  hashBytes,
  parseTransfer,
} from "../../src/content/portable.mjs";

const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
const resolveSchema = (value) =>
  value.$ref
    ? value.$ref
        .slice(2)
        .split("/")
        .reduce((node, key) => node[key], schema)
    : value;
const imageGroups = Object.entries(schema.properties)
  .filter(
    ([, value]) =>
      value.type === "array" &&
      (value.items.anyOf || [value.items]).some(
        (variant) => resolveSchema(variant).properties?.imageDescriptions,
      ),
  )
  .map(([group]) => group);
const primaryId = "demo:kind-primary";
const additionalId = "demo:kind-additional";
const modes = ["described", "other-description", "decorative", "legacy"];

// Original 1x1 RGBA test pixel generated from first principles, not game art.
function pngChunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(1, 0);
header.writeUInt32BE(1, 4);
header[8] = 8;
header[9] = 6;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk("IHDR", header),
  pngChunk("IDAT", deflateSync(Buffer.from([0, 18, 52, 86, 255]))),
  pngChunk("IEND", Buffer.alloc(0)),
]);
const digest = await hashBytes(png);
const payloads = [primaryId, additionalId].map((assetId) => ({
  assetId,
  base64: base64FromBytes(png),
}));

function fixture(group) {
  const pack = loadFixturePack("demo-training");
  pack.assets = [primaryId, additionalId].map((id, index) => ({
    id,
    path: `assets/kind-${index}.png`,
    mime: "image/png",
    sha256: digest,
    bytes: png.length,
    width: 1,
    height: 1,
    rightsHolder: "Synthetic fixture author",
    license: "CC0-1.0",
    sourceUrl: "https://example.invalid/image-kind-fixture",
    attribution: "Original synthetic test pixel, not game artwork",
    redistributionAllowed: true,
  }));
  const template = pack[group][0];
  assert.ok(template, `Missing fictional ${group} fixture`);
  const records = modes.map((mode) => {
    const record = structuredClone(template);
    record.id = `demo:kind-${group}-${mode}`;
    record.assetId = primaryId;
    record.assetIds = [additionalId];
    delete record.imageDescriptions;
    if (mode !== "legacy")
      record.imageDescriptions = [primaryId, additionalId].map(
        (assetId, index) => ({
          assetId,
          text:
            mode === "decorative"
              ? ""
              : `Synthetic ${group} ${mode} ${index ? "additional" : "primary"} <picture>`,
          decorative: mode === "decorative",
        }),
      );
    return record;
  });
  pack[group].push(...records);
  return { pack, records };
}

// The portable boundary requires an injected decoder. This test double verifies
// the exact synthetic bytes passed to it; it is not browser-decoding evidence.
function decoderProbe() {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async decodeRaster(bytes, mime) {
      calls++;
      assert.equal(mime, "image/png");
      assert.deepEqual(Buffer.from(bytes), png);
      return { width: 1, height: 1 };
    },
  };
}

function assertMeaning(pack, group, expected) {
  for (const original of expected) {
    const record = pack[group].find(({ id }) => id === original.id);
    assert.deepEqual(record, original);
    assert.equal(record.assetId, primaryId);
    assert.deepEqual(record.assetIds, [additionalId]);
    for (const assetId of [primaryId, additionalId]) {
      const usage = original.imageDescriptions?.find(
        (entry) => entry.assetId === assetId,
      );
      assert.equal(
        imageDescription(record, assetId, "Synthetic fixture"),
        usage
          ? usage.text
          : "Synthetic fixture — picture (description not provided)",
      );
    }
    assert.equal(
      Object.hasOwn(record, "imageDescriptions"),
      Object.hasOwn(original, "imageDescriptions"),
      "Legacy omission must not become invented metadata",
    );
  }
  assert.notEqual(
    expected[0].imageDescriptions[0].text,
    expected[1].imageDescriptions[0].text,
    "The same asset has two distinct record-specific meanings",
  );
}

test("SC001 inventory covers every schema-supported image-bearing collection", () => {
  assert.deepEqual(imageGroups, [
    "items",
    "recipes",
    "objectives",
    "guides",
    "maps",
    "locations",
  ]);
  assert.ok(schema.$defs.item.properties.kind.enum.includes("weapon"));
  assert.equal(Object.hasOwn(schema.properties, "weapons"), false);
});

for (const group of imageGroups) {
  test(`${group}: described, decorative and legacy usage survives both portable round trips`, async () => {
    const { pack, records } = fixture(group);
    const before = structuredClone(pack);
    assert.doesNotThrow(() => validatePack(pack, schema));
    const reference = await parseTransfer(exportContent(pack, schema), schema);
    assert.equal(reference.selfContained, false);
    assert.deepEqual(reference.payloads, []);
    assert.deepEqual(reference.pack, before);
    assertMeaning(reference.pack, group, records);

    const decoder = decoderProbe();
    const text = await buildTransfer(pack, payloads, schema, decoder);
    const imported = await parseTransfer(text, schema, decoder);
    assert.equal(decoder.calls, payloads.length * 2);
    assert.equal(imported.selfContained, true);
    assert.deepEqual(imported.payloads, payloads);
    assert.deepEqual(imported.pack, before);
    assertMeaning(imported.pack, group, records);
    assert.deepEqual(pack, before, "Export/import must not mutate the source");
  });

  test(`${group}: malformed image metadata fails shared validation and portable boundaries`, async (t) => {
    const cases = [
      ["detached primary", (r) => delete r.assetId, /attached picture/],
      [
        "unknown description asset",
        (r) => (r.imageDescriptions[0].assetId = "demo:missing"),
        /attached picture/,
      ],
      [
        "duplicate description",
        (r) => r.imageDescriptions.push({ ...r.imageDescriptions[0] }),
        /Duplicate image description/,
      ],
      [
        "decorative with text",
        (r) => (r.imageDescriptions[0].decorative = true),
        /Decorative pictures require empty text/,
      ],
      [
        "whitespace description",
        (r) => (r.imageDescriptions[0].text = " \t\n "),
        /meaningful pictures require a description/,
      ],
      [
        "overlong description",
        (r) => (r.imageDescriptions[0].text = "x".repeat(1001)),
        /text too long/,
      ],
      [
        "numeric text",
        (r) => (r.imageDescriptions[0].text = 42),
        /invalid type/,
      ],
      [
        "string decorative flag",
        (r) => (r.imageDescriptions[0].decorative = "false"),
        /invalid type/,
      ],
      [
        "non-array metadata",
        (r) => (r.imageDescriptions = { ...r.imageDescriptions[0] }),
        /invalid type/,
      ],
      [
        "missing text",
        (r) => delete r.imageDescriptions[0].text,
        /missing text/,
      ],
      [
        "unexpected field",
        (r) => (r.imageDescriptions[0].extra = true),
        /unexpected field extra/,
      ],
    ];
    for (const [label, mutate, error] of cases)
      await t.test(label, async () => {
        const { pack, records } = fixture(group);
        assert.doesNotThrow(() => validatePack(pack, schema));
        mutate(records[0]);
        const decoder = decoderProbe();
        assert.throws(() => validatePack(pack, schema), error);
        assert.throws(() => exportContent(pack, schema), error);
        await assert.rejects(
          () => buildTransfer(pack, payloads, schema, decoder),
          error,
        );
        await assert.rejects(
          () => parseTransfer(JSON.stringify(pack), schema, decoder),
          error,
        );
        await assert.rejects(
          () =>
            parseTransfer(
              JSON.stringify({
                format: "dmz-picture-pack",
                version: 1,
                pack,
                payloads,
              }),
              schema,
              decoder,
            ),
          error,
        );
        assert.equal(decoder.calls, 0, "Reject metadata before decoding");
      });
  });
}
