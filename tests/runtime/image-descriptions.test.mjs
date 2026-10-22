import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { validatePack } from "../../src/content/validate.mjs";
import { allRecords, renderDetail } from "../../src/ui/render.mjs";
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
function fixture() {
  const pack = loadFixturePack("demo-training");
  const assetId = "demo:picture";
  pack.assets.push({
    id: assetId,
    path: "assets/picture.png",
    mime: "image/png",
    sha256: "a".repeat(64),
    bytes: 83,
    width: 8,
    height: 6,
    rightsHolder: "Synthetic fixture author",
    license: "CC0-1.0",
    attribution: "Synthetic rights attribution",
    redistributionAllowed: true,
    sourceUrl: "https://example.invalid/fixture",
  });
  const item = pack.items[0];
  item.assetId = assetId;
  item.imageDescriptions = [
    { assetId, text: "A synthetic <blue> training square", decorative: false },
  ];
  return { pack, item, assetId };
}
test("usage-specific image description survives validation and transfer", () => {
  const { pack } = fixture();
  assert.doesNotThrow(() => validatePack(pack, schema));
  assert.deepEqual(
    JSON.parse(JSON.stringify(pack)).items[0].imageDescriptions,
    pack.items[0].imageDescriptions,
  );
});
test("renderer uses escaped description rather than rights attribution", () => {
  const { pack, item } = fixture();
  const record = allRecords([pack]).find((r) => r.id === item.id);
  const html = renderDetail(record, [pack], { imageURL: () => "/fixture.png" });
  assert.match(html, /alt="A synthetic &lt;blue&gt; training square"/);
  assert.doesNotMatch(html, /alt="[^"]*rights-cleared/);
});
test("decorative usage has empty alt, legacy still loads", () => {
  const { pack, item } = fixture();
  item.imageDescriptions[0] = {
    assetId: item.assetId,
    text: "",
    decorative: true,
  };
  assert.doesNotThrow(() => validatePack(pack, schema));
  assert.match(
    renderDetail(
      allRecords([pack]).find((r) => r.id === item.id),
      [pack],
      { imageURL: () => "/fixture.png" },
    ),
    /alt=""/,
  );
  delete item.imageDescriptions;
  assert.doesNotThrow(() => validatePack(pack, schema));
});
test("malformed, detached, duplicate, conflicting and excessive descriptions fail", () => {
  for (const mutate of [
    (d) => (d.text = " "),
    (d) => (d.text = "x".repeat(1001)),
    (d) => (d.decorative = true),
    (d) => (d.assetId = "fixture:missing"),
    (d) => (d.extra = true),
  ]) {
    const { pack, item } = fixture();
    mutate(item.imageDescriptions[0]);
    assert.throws(() => validatePack(pack, schema));
  }
  const { pack, item } = fixture();
  item.imageDescriptions.push({ ...item.imageDescriptions[0] });
  assert.throws(() => validatePack(pack, schema));
});
