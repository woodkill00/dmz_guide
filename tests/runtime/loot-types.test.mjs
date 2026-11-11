import test from "node:test";
import assert from "node:assert/strict";
import intel from "../../src/content/tcno-item-intel.json" with { type: "json" };
import {
  ensureLootTypeGuides,
  lootTypeId,
  LOOT_TYPES_INDEX,
} from "../../src/domain/loot-types.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { renderTcnoItemIntel } from "../../src/ui/tcno-item-intel.mjs";
test("all loot types have stable catalog pages and deduplicated item associations", () => {
  const pack = loadFixturePack("official-starter");
  const names = ensureLootTypeGuides(pack, intel);
  assert.equal(names.length, 20);
  assert.equal(
    pack.guides.find((g) => g.id === LOOT_TYPES_INDEX).relatedIds.length,
    20,
  );
  for (const name of names) {
    const guide = pack.guides.find((g) => g.id === lootTypeId(name));
    const ids = [
      ...new Set(
        Object.values(intel.items)
          .filter((i) => i.lootSources?.includes(name))
          .map((i) => intel.mapping[i.id]),
      ),
    ];
    assert.deepEqual(guide.relatedIds, ids);
    assert.equal(guide.category, "locations");
    assert.equal(guide.relatedIds.length, new Set(guide.relatedIds).size);
  }
  const i = pack.items.find((i) => i.name === "Ballistic Fabric");
  const html = renderTcnoItemIntel(
    i,
    pack,
    (id) => `<a href="/guides/${id.replace(":", "--")}/">${id}</a>`,
  );
  assert(html.includes("loot-type-duffel-bags"));
  assert(html.includes("loot-type-buttons"));
});
test("source refresh retains authored text, title, photo references and custom relations", () => {
  const pack = loadFixturePack("official-starter"),
    g = pack.guides.find((g) => g.id === lootTypeId("Duffel bags"));
  g.title = "My bag examples";
  g.body = "Player-authored identification notes";
  g.assetId = "test:primary";
  g.assetIds = ["test:extra"];
  g.imageDescriptions = [
    { assetId: "test:primary", text: "Example bag", decorative: false },
  ];
  g.relatedIds.push("custom:relation");
  const before = structuredClone(g);
  ensureLootTypeGuides(pack, intel);
  assert.deepEqual(g, before);
  const snapshot = JSON.stringify(pack);
  ensureLootTypeGuides(pack, intel);
  assert.equal(JSON.stringify(pack), snapshot);
});
