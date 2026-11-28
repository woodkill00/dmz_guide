import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadFixturePack } from "../helpers/catalog.mjs";
test("113 explicit item-page rarities do not invent recipes or scope", async () => {
  const { rows } = JSON.parse(
    await readFile("content/references/rarity-dmzcodex-20261128.json", "utf8"),
  );
  const pack = loadFixturePack("official-starter");
  assert.equal(rows.length, 5);
  for (const r of rows) {
    const item = pack.items.find((i) => i.id === r.itemId);
    assert.equal(item.rarity, r.evidence.fieldValue);
    assert.equal(item.rarity, r.rarity);
    assert.equal(item.status, "observed");
    assert(item.sourceIds.includes(r.sourceId));
    assert.equal(
      pack.recipes.some((v) => v.output.itemId === r.itemId),
      false,
    );
  }
});
test("113 key rarity reports retain exact identities, observed status and source scope", async () => {
  const proof = JSON.parse(
    await readFile(
      "content/references/key-rarity-codcentral-20261128.json",
      "utf8",
    ),
  );
  const pack = loadFixturePack("official-starter");
  assert.equal(proof.rows.length, 53);
  assert.equal(new Set(proof.rows.map((r) => r.itemId)).size, 53);
  const manual = {
    "mw4:key-air-base-armory-card-single-use": "key-air-base-armory-card",
    "mw4:key-x01-chol-min-stash-room": "x01-key-chol-mins-stash-room",
    "mw4:key-x01-small-test-chamber": "x01-small-test-chamber",
    "mw4:key-x01-superintendent-office": "x01-key-superintendents-office",
  };
  assert.equal(proof.source.id, "source:codcentral-key-rarity-20261128");
  for (const row of proof.rows) {
    const item = pack.items.find((i) => i.id === row.itemId);
    assert.equal(item.rarity, row.rarity);
    assert.equal(item.status, "observed");
    assert(item.sourceIds.includes(proof.source.id));
    assert(
      row.sourceMarkers.some((m) => m.id === manual[row.itemId]) ||
        row.existingMarkerReferences.length ||
        row.sourceMarkers.some((m) => m.id === "key-" + row.existingKeyId),
    );
    assert(row.sourceMarkers.every((m) => m.rarity === row.rarity));
  }
  assert.equal(
    pack.items.find((i) => i.id === "mw4:key-hospital-chemical-lab").rarity,
    "Rare",
  );
  assert.equal(
    pack.items.find((i) => i.id === "mw4:key-x01-audit-room").rarity,
    "Epic",
  );
  assert.equal(
    pack.items.find((i) => i.id === "mw4:key-x01-archive-closet").rarity,
    undefined,
  );
});
