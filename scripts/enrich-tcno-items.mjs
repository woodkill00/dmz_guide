import { ensureLootTypeGuides } from "../src/domain/loot-types.mjs";
import { applyTcnoChanges } from "./lib/tcno-apply.mjs";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { readCatalog, catalogJSON } from "./catalog.mjs";
import { validatePack } from "../src/content/validate.mjs";
const root = resolve(import.meta.dirname, ".."),
  dir = resolve(root, "content/catalog/official-starter");
const read = async (p) => JSON.parse(await readFile(resolve(root, p), "utf8"));
const snapshot = await read("content/references/tcno-items-20261110.json");
assert.equal(snapshot.source, "https://tools.tcno.co/dmz/fob");
assert.equal(Object.keys(snapshot.items).length, 256);
assert.equal(snapshot.fobUpgrades.length, 34);
const schema = await read("schemas/pack.schema.json");
const catalog = await readCatalog({ root, schema });
const pack = structuredClone(
  catalog.entries.find((e) => e.key === "official-starter").pack,
);
const original = new Map(pack.items.map((i) => [i.id, structuredClone(i)]));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases = {
  Cash: "DMZ Cash",
  "Fulton Marker": "Fulton Drop Marker",
  "Armor Plate": "Armor Plate",
  "Nylon Cloth": "Nylon Cloth",
  Frag: "Frag Grenade",
  Smoke: "Smoke Grenade",
  Molotov: "Molotov Cocktail",
  "Impact Warheads": "Impact Warhead",
  Decoy: "Decoy Grenade",
  Trophy: "Trophy System",
  Stimpistol: "Revive Pistol",
  Binoculars: "Spotter Scope",
  Railgun: "Railgun Sentry",
};
const sourceId = "source:tcno-items-20261110",
  mapping = {},
  added = [],
  conflicts = [];
for (const item of Object.values(snapshot.items)) {
  assert(
    typeof item.id === "string" &&
      typeof item.name === "string" &&
      item.name.length <= 120,
  );
  assert(
    !item.lootSources ||
      (item.lootSources.length <= 100 &&
        item.lootSources.every(
          (s) => typeof s === "string" && s.length <= 500,
        )),
  );
  const collectible = snapshot.unlocks.find(
    (u) => u.id === item.id && ["blueprint", "manual"].includes(u.kind),
  );
  const name = collectible?.name || aliases[item.name] || item.name;
  const candidates = pack.items.filter((i) =>
    [i.name, ...(i.aliases || [])].some((n) => norm(n) === norm(name)),
  );
  assert(candidates.length <= 1, "Ambiguous item: " + item.name);
  let target = candidates[0];
  if (!target) {
    target = {
      id: "mw4:tcno-item-" + item.id,
      name,
      kind: "item",
      category: collectible
        ? collectible.kind === "manual"
          ? "Weapon Manuals"
          : "Blueprints"
        : item.category || "Misc",
      unit: "count",
      description:
        "TroubleChute-listed item. Current-build behavior is not independently verified.",
      aliases: [],
      stats: [],
      status: "observed",
      sourceIds: [],
    };
    pack.items.push(target);
    added.push(target.id);
  }
  if (item.rarity && target.rarity && norm(item.rarity) !== norm(target.rarity))
    conflicts.push({
      id: target.id,
      field: "rarity",
      existing: target.rarity,
      reported: item.rarity,
    });
  if (item.rarity && !target.rarity) target.rarity = item.rarity;
  if (
    !collectible &&
    item.name !== target.name &&
    !target.aliases.includes(item.name)
  )
    target.aliases.push(item.name);
  target.sourceIds = [...new Set([...target.sourceIds, sourceId])];
  const marker = "\n\nTroubleChute reference:";
  const prior = target.description.split(marker)[0];
  const generic = [
    "Source-reported item reference; current-build behavior is not independently verified.",
    "TroubleChute-listed item. Current-build behavior is not independently verified.",
  ].includes(prior.trim());
  target.description = generic && item.description ? item.description : prior;
  assert(target.description.length <= 4000, "Description limit: " + target.id);
  mapping[item.id] = target.id;
}
const old = await read("content/references/tcno-fob-20261110.json");
const upgradeMap = {};
for (const row of snapshot.fobUpgrades) {
  const oldRow = old.rows.find((r) => r.id === row.id);
  assert(oldRow, "New upgrade needs review: " + row.id);
  const requirements = row.requirements.map((r) => ({
    name: snapshot.items[r.itemId]?.name,
    quantity: r.amount,
  }));
  assert.deepEqual(
    requirements,
    oldRow.requirements.map((r) => ({ name: r.name, quantity: r.quantity })),
    "Changed upgrade costs: " + row.id,
  );
  assert.equal(
    row.description,
    oldRow.description,
    "Changed effect: " + row.id,
  );
  assert.deepEqual(
    row.requiredUpgradeIds,
    oldRow.prerequisites.map((p) => p.href.split("#")[1]),
    "Changed prerequisites: " + row.id,
  );
  const roman = [
    "",
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
    "XII",
    "XIII",
  ];
  const objective = pack.objectives.find(
    (o) =>
      o.track === "dmz-upgrade" &&
      norm(o.name) ===
        norm(row.name.replace(/ (\d+)$/, (_, n) => " " + roman[+n])),
  );
  assert(objective, "Upgrade identity: " + row.id);
  upgradeMap[row.id] = objective.id;
  objective.sourceIds = [...new Set([...objective.sourceIds, sourceId])];
}
for (const row of snapshot.fobUpgrades) {
  const objective = pack.objectives.find((o) => o.id === upgradeMap[row.id]);
  assert.deepEqual(
    objective.requirements.map((r) => ({ id: r.itemId, q: r.quantity })),
    row.requirements.map((r) => ({ id: mapping[r.itemId], q: r.amount })),
    "Catalog upgrade costs conflict: " + row.id,
  );
  assert.deepEqual(
    objective.prerequisites,
    row.requiredUpgradeIds.map((id) => upgradeMap[id]),
    "Catalog upgrade prerequisites conflict: " + row.id,
  );
}
pack.sources = pack.sources.filter((s) => s.id !== sourceId);
pack.sources.push({
  id: sourceId,
  title: "TroubleChute: item descriptions, loot sources and unlock references",
  url: snapshot.source,
  type: "community",
  publishedAt: "Not stated",
  reviewedAt: snapshot.reviewed,
  supports:
    "256 provider item records, 157 unlock references and 34 FOB upgrades. Reported descriptions, rarity and loot-container types; not guaranteed loot or independently verified current-build mechanics.",
  provenance: {
    kind: "web",
    captureDate: snapshot.reviewed,
    buildStatus: "unknown",
    observationKey: "tcno-items-20261110",
    lineageKey: "tcno-dmz",
  },
});
if (
  pack.contentVersion.localeCompare("2026.11.10.4", undefined, {
    numeric: true,
  }) < 0
)
  pack.contentVersion = "2026.11.10.4";
if (!pack.coverage.note.includes("256 TroubleChute item identities"))
  pack.coverage.note +=
    " Item-reference capture reviewed 2026-11-10: 256 TroubleChute item identities, 157 reported unlock references and reported loot-container types where listed; provider coverage only, not complete-game verification.";
const lootTypes = ensureLootTypeGuides(pack, {
  items: snapshot.items,
  mapping,
  sourceId,
});
validatePack(pack, schema, { profile: "published" });
const intel = {
  packId: pack.id,
  sourceId,
  source: snapshot.source,
  reviewed: snapshot.reviewed,
  sha256: snapshot.sha256,
  mapping,
  upgradeMap,
  items: snapshot.items,
  unlocks: snapshot.unlocks,
};
const report = {
  mode: process.argv.includes("--apply") ? "apply" : "preview",
  providerItems: 256,
  matched: 256 - added.length,
  added: added.map((id) => ({
    id,
    name: pack.items.find((i) => i.id === id).name,
  })),
  rarityConflicts: conflicts,
  verifiedUnchangedUpgrades: 34,
  unlockReferences: snapshot.unlocks.length,
  lootTypes: lootTypes.length,
};
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--apply")) {
  const pending = [];
  const stage = async (file, text) =>
    pending.push({
      file,
      text: file.startsWith(dir)
        ? Buffer.from(catalogJSON(JSON.parse(text))).toString("utf8")
        : text,
    });
  const manifest = await read("content/catalog/official-starter/pack.json");
  const files = new Map();
  for (const folder of ["items", "weapons", "objectives", "sources", "guides"])
    for (const file of await readdir(resolve(dir, folder)))
      if (file.endsWith(".json")) {
        const value = JSON.parse(
          await readFile(resolve(dir, folder, file), "utf8"),
        );
        files.set(value.id, resolve(dir, folder, file));
      }
  for (const item of pack.items)
    if (
      !original.has(item.id) ||
      JSON.stringify(original.get(item.id)) !== JSON.stringify(item)
    )
      await stage(
        files.get(item.id) ||
          resolve(dir, "items", item.id.replaceAll(":", "_") + ".json"),
        JSON.stringify(item, null, 2) + "\n",
      );
  for (const objective of pack.objectives.filter((o) =>
    Object.values(upgradeMap).includes(o.id),
  ))
    await stage(
      files.get(objective.id),
      JSON.stringify(objective, null, 2) + "\n",
    );
  await stage(
    resolve(dir, "sources", sourceId.replaceAll(":", "_") + ".json"),
    JSON.stringify(
      pack.sources.find((s) => s.id === sourceId),
      null,
      2,
    ) + "\n",
  );
  for (const guide of pack.guides.filter(
    (g) => g.id === "mw4:loot-types" || g.id.startsWith("mw4:loot-type-"),
  ))
    await stage(
      files.get(guide.id) ||
        resolve(dir, "guides", guide.id.replaceAll(":", "_") + ".json"),
      JSON.stringify(guide, null, 2) + "\n",
    );
  manifest.order.guides = pack.guides.map((g) => g.id);
  manifest.order.items = pack.items.map((i) => i.id);
  manifest.order.sources = pack.sources.map((s) => s.id);
  manifest.pack.contentVersion = pack.contentVersion;
  manifest.pack.coverage = pack.coverage;
  await stage(
    resolve(dir, "pack.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await stage(
    resolve(root, "src/content/tcno-item-intel.json"),
    JSON.stringify(intel, null, 2) + "\n",
  );
  console.error(JSON.stringify(await applyTcnoChanges(root, pending)));
}
