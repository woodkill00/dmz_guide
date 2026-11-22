import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { allKeys, keyAccess } from "../../src/content/key-access.mjs";
import {
  keyReferences,
  keyMapRoster,
  validateKeyReferences,
  validateKeyInventory,
} from "../../src/content/key-reference.mjs";
import { keyItemReference } from "../../src/domain/key-item-links.mjs";
import {
  itemSection,
  inventoryFamily,
} from "../../src/domain/inventory-items.mjs";
import { featurePages } from "../../src/ui/keys-page.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { previewContentRebind } from "../../src/domain/profile-preview.mjs";
const pack = loadFixturePack("official-starter");
test("106 exactly80 canonical keys,66Hajin/14X01 and each source named marker accounted", () => {
  assert.equal(allKeys.length, 80);
  assert.equal(
    keyReferences.records.filter((r) => r.mapId === "x01").length,
    14,
  );
  assert.equal(
    keyReferences.records.filter((r) => !r.markers.length).length,
    16,
  );
  for (const s of keyMapRoster.sources)
    for (const m of s.markers)
      assert.equal(
        keyReferences.records.filter(
          (r) =>
            r.mapId === s.mapId &&
            r.markers.some((n) => n.provider === s.provider && n.id === m.id),
        ).length,
        1,
      );
  assert.equal(
    createHash("sha256")
      .update(readFileSync("tools/hajin-map/src/x01/dmzhub-snapshot.json"))
      .digest("hex"),
    keyMapRoster.sources.find((s) => s.mapId === "x01").sha256,
  );
  assert(validateKeyInventory(pack));
});
test("106 rejects ambiguous or cross-map IDs, duplicates, invalid floors and missing room coverage", () => {
  for (const mutate of [
    (r) => r.records.push(r.records[0]),
    (r) => (r.records[1].itemId = r.records[0].itemId),
    (r) =>
      (r.records.find(
        (r) => r.markers.length && r.mapId === "x01",
      ).markers[0].floor = 2),
    (r) =>
      (r.records.find((r) => r.mapId === "x01" && r.markers.length).mapId =
        "hajin"),
    (r) =>
      (r.records.find((r) => r.markers.length && r.mapId === "x01").markers =
        []),
    (r) => (r.records[0].extra = "unexpected"),
  ]) {
    const v = structuredClone(keyReferences);
    mutate(v);
    assert.throws(() => validateKeyReferences(v));
  }
});
test("106 every key has one inventory identity, directory page, region and truthful map destination", () => {
  const pages = featurePages();
  assert.equal(pages.length, 81);
  for (const r of keyReferences.records) {
    const item = pack.items.find((i) => i.id === r.itemId);
    assert(item);
    assert.equal(inventoryFamily(item), "Keys");
    assert.equal(
      itemSection(item),
      r.mapId === "x01" ? "Keys · X01" : "Keys · Hajin",
    );
    assert.equal(keyItemReference(item.id).keyId, r.keyId);
    const p = pages.find((p) => p.path === `/keys/${r.keyId}/`);
    assert(p);
    if (r.mapId === "x01") {
      assert(p.body.includes("/map/x01/"));
      assert(!p.body.includes("/map/?key-grid="));
      for (const m of r.markers)
        assert(p.body.includes(`floor=${m.floor}&amp;marker=${m.id}`));
    }
  }
  assert(keyItemReference("__proto__") === null);
  for (const [id, alias] of [
    ["x01-small-test-chamber", "Engineering Access Card"],
    ["x01-audit-room", "Audit Officer Access Card"],
  ]) {
    assert(allKeys.find((k) => k.id === id).aliases.includes(alias));
    assert.equal(allKeys.filter((k) => k.name === alias).length, 0);
  }
  assert(
    !keyReferences.records.find((r) => r.keyId === "x01-archive-closet").markers
      .length,
  );
});
test("106 additive catalog rebind preserves existing IDs, cash and stock; hospital chain remains", () => {
  const newIds = new Set(
    keyReferences.records
      .map((r) => r.itemId)
      .filter((id) => id.startsWith("mw4:key-")),
  );
  const previous = structuredClone(pack);
  previous.contentVersion = "2026.11.14.4";
  previous.items = previous.items.filter((i) => !newIds.has(i.id));
  const p = newProfile(previous);
  p.inventory["mw4:tcno-key-shopping-drc-locker"] = 4;
  const cash = previous.items.find((i) => i.kind === "currency").id;
  p.inventory[cash] = 6209662;
  const before = structuredClone(p),
    preview = previewContentRebind(p, pack, previous);
  assert.deepEqual(p, before);
  assert.equal(preview.candidate.inventory[cash], 6209662);
  assert.equal(
    preview.candidate.inventory["mw4:tcno-key-shopping-drc-locker"],
    4,
  );
  assert(
    !Object.hasOwn(preview.candidate.inventory, "mw4:key-x01-archive-closet"),
  );
  assert(
    keyAccess.uses
      .filter((u) => u.keyId === "hospital-chemical-lockers")
      .every((u) =>
        u.requiredUses.some((id) => id.startsWith("hospital-chemical-lab--")),
      ),
  );
});
