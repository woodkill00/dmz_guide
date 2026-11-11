import test from "node:test";
import assert from "node:assert/strict";
import { parseTcnoBundle } from "../../scripts/lib/tcno-data.mjs";
import { renderTcnoItemIntel } from "../../src/ui/tcno-item-intel.mjs";
import intel from "../../src/content/tcno-item-intel.json" with { type: "json" };
import { loadFixturePack } from "../helpers/catalog.mjs";
const pack = loadFixturePack("official-starter");
test("provider parser extracts only static literals and rejects execution", () => {
  assert.equal(
    parseTcnoBundle(
      'var x={items:JSON.parse(`{"a":{"name":"safe"}}`),unlocks:[],fobUpgrades:[]}',
    ).items.a.name,
    "safe",
  );
  for (const extra of [
    'items:fetch("https://example.com")',
    "items:(()=>{throw 1})()",
    "items:{__proto__:{x:1}}",
    'items:{["x"]:1}',
  ])
    assert.throws(() =>
      parseTcnoBundle(`var x={${extra},unlocks:[],fobUpgrades:[]}`),
    );
  assert.throws(() => parseTcnoBundle(" ".repeat(2_000_001)));
});
test("all 256 source identities map to catalog records; collectibles remain separate", () => {
  assert.equal(Object.keys(intel.items).length, 256);
  assert.equal(Object.keys(intel.mapping).length, 256);
  for (const id of Object.values(intel.mapping)) {
    const item = pack.items.find((i) => i.id === id);
    assert(item, id);
    assert(item.sourceIds.includes(intel.sourceId));
  }
  const equipment = pack.items.find((i) => i.name === "Recon Drone"),
    blueprint = pack.items.find((i) => i.name === "Recon Drone Blueprint");
  assert.notEqual(equipment.id, blueprint.id);
  assert.equal(equipment.rarity, "Rare");
  assert.equal(blueprint.rarity, "Ultra");
  assert.equal(Object.keys(intel.upgradeMap).length, 34);
  assert.equal(intel.unlocks.length, 157);
});
test("item details expose reported loot and linked recipe/prerequisite references", () => {
  const item = pack.items.find((i) => i.name === "Ballistic Fabric");
  const html = renderTcnoItemIntel(
    item,
    pack,
    (id) =>
      `<a href="/local/?id=${encodeURIComponent(id)}">${pack.guides.find((g) => g.id === id)?.title || pack.items.find((i) => i.id === id)?.name || id}</a>`,
  );
  assert(html.includes("Chang-san Air Base"));
  assert(html.includes("Duffel bags"));
  assert(html.includes("Where it can be looted"));
  assert(html.includes("current game build not independently verified"));
  assert(html.includes("Listed requirements"));
  assert(!html.includes("[object Object]"));
  assert.equal(
    renderTcnoItemIntel(item, { ...pack, id: "other:pack" }, () => ""),
    "",
  );
  const id = Object.keys(intel.items).find(
    (id) => !intel.items[id].lootSources?.length,
  );
  const unknown = pack.items.find((i) => i.id === intel.mapping[id]);
  assert(
    renderTcnoItemIntel(unknown, pack, () => "").includes(
      "Loot sources are not listed",
    ),
  );
});

test("failed staged import restores exact previous files and removes only newly created records", async (t) => {
  const { mkdtemp, writeFile, readFile, rm } = await import("node:fs/promises"),
    { tmpdir } = await import("node:os"),
    { join } = await import("node:path");
  const { applyTcnoChanges } = await import("../../scripts/lib/tcno-apply.mjs");
  const root = await mkdtemp(join(tmpdir(), "tcno-transaction-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const a = join(root, "old.json"),
    b = join(root, "new.json");
  await writeFile(a, "original");
  await assert.rejects(
    applyTcnoChanges(
      root,
      [
        { file: a, text: "new" },
        { file: b, text: "new" },
      ],
      {
        writer: async (file, bytes) => {
          await writeFile(file, bytes);
          if (file === b) throw Error("synthetic EIO");
        },
      },
    ),
    /previous files restored/,
  );
  assert.equal(await readFile(a, "utf8"), "original");
  await assert.rejects(readFile(b), { code: "ENOENT" });
  if (process.platform === "win32")
    await assert.rejects(
      applyTcnoChanges(root, [{ file: "Z:\\tcno-outside.json", text: "x" }]),
      /outside workspace/,
    );
  await assert.rejects(
    applyTcnoChanges(root, [
      { file: join(root, "..", "outside.json"), text: "x" },
    ]),
    /outside workspace/,
  );
});
