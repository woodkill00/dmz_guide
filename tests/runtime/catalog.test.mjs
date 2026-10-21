import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  rename,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fixtureCatalog, loadFixturePack } from "../helpers/catalog.mjs";
import {
  readCatalog,
  readCatalogAsset,
  serializeCatalog,
  assembleCatalog,
  catalogRecordPath,
  catalogAssetPath,
  catalogJSON,
  planCatalogMigration,
  bundledSources,
} from "../../scripts/catalog.mjs";
import { validatePack } from "../../src/content/validate.mjs";
import { LIMITS, PUBLISHED_LIMITS } from "../../src/content/limits.mjs";
import { exportContent } from "../../src/content/portable.mjs";
import {
  bundledFileURL,
  validateBundledManifest,
  loadBundledPayloads,
} from "../../src/content/bundled-assets.mjs";
const schema = JSON.parse(await readFile("schemas/pack.schema.json", "utf8"));
async function temp(t) {
  const root = await mkdtemp(join(tmpdir(), "dmz-catalog-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function writeMap(root, files) {
  for (const [path, bytes] of files) {
    if (bytes === null) {
      await rm(join(root, path), { force: true });
      continue;
    }
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  }
}
async function fixture(t) {
  const root = await temp(t);
  await writeMap(root, fixtureCatalog.files);
  return root;
}
const entryClone = () => structuredClone(fixtureCatalog.entries);
function scalableEntry(count = 1000) {
  const pack = loadFixturePack("demo-training"),
    original = loadFixturePack("bundled-pictures").assets[0];
  const key = "scale",
    assetSources = {};
  pack.assets = Array.from({ length: count }, (_, i) => {
    const id = `demo:scale-${i}`,
      asset = { ...original, id, path: `assets/scale-${i}.png` };
    assetSources[id] = {
      category: "other",
      sourcePath: catalogAssetPath(key, "other", id, asset.mime),
    };
    return asset;
  });
  return { key, pack, assetSources };
}
test("canonical snapshot preserves all ordered packs and serializes deterministically", async (t) => {
  const root = await fixture(t),
    snapshot = await readCatalog({ root, schema });
  assert.deepEqual(snapshot.packs, fixtureCatalog.packs);
  assert.equal(snapshot.revision, fixtureCatalog.revision);
  const first = serializeCatalog({ ...snapshot, schema }),
    second = serializeCatalog({ ...snapshot, schema });
  assert.deepEqual(first, second);
  assert.deepEqual(
    assembleCatalog({ files: first, schema }).packs,
    fixtureCatalog.packs,
  );
  assert(first.has("content/catalog/demo-training/weapons/demo_rifle.json"));
  assert(!first.has("content/catalog/demo-training/items/demo_rifle.json"));
  assert.equal(
    snapshot.packs.find((p) => p.id === "demo:training-pack").items[0].id,
    "demo:wire",
  );
  assert(snapshot.provenance.size === 1);
});
test("generated paths reject traversal, Windows devices, bad categories and identities", () => {
  for (const key of [
    "../x",
    "CON",
    "con",
    "nul",
    "prn",
    "aux",
    "com1",
    "lpt9",
    "a/b",
    "x.",
  ])
    assert.throws(() => catalogRecordPath(key, "items", { id: "demo:one" }));
  assert.throws(() =>
    catalogAssetPath("okay", "../../x", "demo:one", "image/png"),
  );
  assert.throws(() => catalogAssetPath("okay", "items", "../one", "image/png"));
  assert.throws(() =>
    catalogAssetPath("okay", "items", "demo:one", "image/svg+xml"),
  );
});
test("canonical membership, duplicate order and immutable identity fail closed", async (t) => {
  const root = await fixture(t);
  await writeMap(
    root,
    new Map([
      [
        "content/catalog/demo-training/items/demo_unlisted.json",
        catalogJSON({ id: "demo:unlisted" }),
      ],
    ]),
  );
  await assert.rejects(
    () => readCatalog({ root, schema }),
    /Unknown or missing/,
  );
  await rm(
    join(root, "content/catalog/demo-training/items/demo_unlisted.json"),
  );
  const path = "content/catalog/demo-training/pack.json",
    descriptor = JSON.parse(await readFile(join(root, path), "utf8"));
  descriptor.order.items.push(descriptor.order.items[0]);
  await writeMap(root, new Map([[path, catalogJSON(descriptor)]]));
  await assert.rejects(() => readCatalog({ root, schema }), /membership/);
});
test("canonical rejects source traversal, symlinks, changed media and provenance", async (t) => {
  const root = await fixture(t),
    entry = fixtureCatalog.entries.find((entry) => entry.pack.assets.length),
    asset = entry.pack.assets[0];
  const path = catalogRecordPath(entry.key, "assets", asset),
    descriptor = JSON.parse(await readFile(join(root, path), "utf8"));
  const original = structuredClone(descriptor);
  descriptor.sourcePath = "../secret.png";
  await writeMap(root, new Map([[path, catalogJSON(descriptor)]]));
  await assert.rejects(
    () => readCatalog({ root, schema }),
    /generated catalog path/,
  );
  await writeMap(root, new Map([[path, catalogJSON(original)]]));
  const media = join(root, original.sourcePath),
    old = media + ".outside";
  await rename(media, old);
  await symlink(old, media);
  await assert.rejects(() => readCatalog({ root, schema }), /symlink/);
  await rm(media);
  await rename(old, media);
  const bytes = await readFile(media);
  bytes[bytes.length - 1] ^= 1;
  await writeFile(media, bytes);
  await assert.rejects(
    () => readCatalog({ root, schema }),
    /metadata mismatch/,
  );
});
test("pending recovery and ambiguous legacy data block public snapshots", async (t) => {
  const root = await fixture(t);
  await writeMap(
    root,
    new Map([
      [".author-state/journal.json", catalogJSON({ state: "applying" })],
    ]),
  );
  await assert.rejects(() => readCatalog({ root, schema }), /recovery pending/);
  await rm(join(root, ".author-state/journal.json"));
  await writeMap(
    root,
    new Map([["content/packs/stray.json", catalogJSON({})]]),
  );
  await assert.rejects(() => readCatalog({ root, schema }), /Legacy content/);
});
test("metadata bytes and directory depth are bounded before unbounded traversal", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "content/catalog/manifest.json"),
    " ".repeat(LIMITS.packBytes + 1),
  );
  await assert.rejects(() => readCatalog({ root, schema }), /byte limit/);
  await writeMap(
    root,
    new Map([
      [
        "content/catalog/manifest.json",
        fixtureCatalog.files.get("content/catalog/manifest.json"),
      ],
    ]),
  );
  await mkdir(join(root, "content/catalog", ...Array(10).fill("deep")), {
    recursive: true,
  });
  await assert.rejects(() => readCatalog({ root, schema }), /traversal limit/);
});
test("1000 published metadata assets work while portable budgets stay unchanged", async (t) => {
  const entry = scalableEntry();
  assert.doesNotThrow(() =>
    validatePack(entry.pack, schema, { profile: "published" }),
  );
  assert.throws(() => validatePack(entry.pack, schema), /Too many assets/);
  assert.throws(() => exportContent(entry.pack, schema), /Too many assets/);
  const files = serializeCatalog({ entries: [entry], schema });
  assert.equal(assembleCatalog({ files, schema }).packs[0].assets.length, 1000);
  const root = await temp(t),
    originalEntry = fixtureCatalog.entries.find(
      (entry) => entry.pack.assets.length,
    );
  const bytes = fixtureCatalog.files.get(
    originalEntry.assetSources[originalEntry.pack.assets[0].id].sourcePath,
  );
  for (const asset of entry.pack.assets)
    files.set(entry.assetSources[asset.id].sourcePath, bytes);
  await writeMap(root, files);
  assert.equal(
    (await readCatalog({ root, schema })).packs[0].assets.length,
    1000,
  );
  assert.throws(
    () => serializeCatalog({ entries: [scalableEntry(1001)], schema }),
    /too many|Too many/,
  );
  const over = scalableEntry(129);
  for (const asset of over.pack.assets) asset.bytes = LIMITS.assetBytes;
  assert.throws(
    () => validatePack(over.pack, schema, { profile: "published" }),
    /Total asset/,
  );
  assert.equal(PUBLISHED_LIMITS.totalAssetBytes, 256 * 1024 * 1024);
  assert.equal(LIMITS.assets, 32);
  assert.equal(LIMITS.totalAssetBytes, 8 * 1024 * 1024);
});
test("single selected bundled image loads from a published pack larger than portable size", async () => {
  const { pack } = scalableEntry(33),
    asset = pack.assets[0];
  const manifest = {
    format: "dmz-bundled-assets",
    version: 1,
    packs: [
      {
        packId: pack.id,
        contentVersion: pack.contentVersion,
        assets: pack.assets.map((a) => ({
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
  };
  validateBundledManifest(manifest);
  const original = fixtureCatalog.entries.find(
      (entry) => entry.pack.assets.length,
    ),
    bytes = fixtureCatalog.files.get(
      original.assetSources[original.pack.assets[0].id].sourcePath,
    );
  let reads = 0;
  const payloads = await loadBundledPayloads(pack, {
    manifest,
    assetIds: [asset.id],
    baseURL: "https://local.test",
    fetchImpl: async () => {
      reads++;
      return new Response(bytes, { headers: { "content-type": asset.mime } });
    },
    decodeRaster: async () => ({ width: asset.width, height: asset.height }),
  });
  assert.equal(reads, 1);
  assert.equal(payloads.length, 1);
  await assert.rejects(
    () =>
      loadBundledPayloads(pack, { manifest, baseURL: "https://local.test" }),
    /selected bundled assets/,
  );
});
test("additional picture IDs are unique, bounded and reference existing assets", () => {
  const pack = loadFixturePack("bundled-pictures"),
    item = pack.items[0];
  item.assetIds = [pack.assets[1].id];
  assert.doesNotThrow(() => validatePack(pack, schema));
  item.assetIds.push(item.assetIds[0]);
  assert.throws(() => validatePack(pack, schema), /unique/);
  item.assetIds = ["demo:missing"];
  assert.throws(() => validatePack(pack, schema), /reference/);
  item.assetIds = Array(9).fill(pack.assets[0].id);
  assert.throws(() => validatePack(pack, schema), /too many/);
});
test("explicit migration previews exact ordered equivalence and preserves provenance without writes", async (t) => {
  const root = await temp(t),
    originals = new Map();
  for (const entry of fixtureCatalog.entries) {
    originals.set(`content/packs/${entry.key}.json`, catalogJSON(entry.pack));
    for (const asset of entry.pack.assets)
      originals.set(
        `content/assets/${entry.pack.id.replace(":", "_")}/${asset.path}`,
        fixtureCatalog.files.get(entry.assetSources[asset.id].sourcePath),
      );
    const origin = fixtureCatalog.provenance.get(
      `media/${entry.key}/ORIGIN.txt`,
    );
    if (origin)
      originals.set(
        `content/assets/${entry.pack.id.replace(":", "_")}/ORIGIN.txt`,
        origin,
      );
  }
  await writeMap(root, originals);
  const plan = await planCatalogMigration({ root, schema });
  assert.deepEqual(plan.packs, fixtureCatalog.packs);
  assert.equal(plan.provenance.size, 1);
  await assert.rejects(
    () => readFile(join(root, "content/catalog/manifest.json")),
    /ENOENT/,
  );
  await writeMap(root, plan.after);
  assert.deepEqual(
    (await readCatalog({ root, schema })).packs,
    fixtureCatalog.packs,
  );
  assert.equal(bundledSources(plan.entries).size, 2);
});
test("migration refuses unknown legacy files rather than deleting them", async (t) => {
  const root = await temp(t);
  await writeMap(
    root,
    new Map([
      [
        "content/packs/demo-training.json",
        catalogJSON(loadFixturePack("demo-training")),
      ],
      [
        "content/assets/private.txt",
        new TextEncoder().encode("not migration input"),
      ],
    ]),
  );
  await assert.rejects(
    () => planCatalogMigration({ root, schema }),
    /Unexpected legacy media/,
  );
  assert.equal(
    await readFile(join(root, "content/assets/private.txt"), "utf8"),
    "not migration input",
  );
});

test("targeted media reader reads only selected bytes and returns no write snapshot", async (t) => {
  const root = await fixture(t);
  const entry = fixtureCatalog.entries.find(
    (entry) => entry.pack.assets.length,
  );
  const [first, second] = entry.pack.assets;
  await writeFile(
    join(root, entry.assetSources[second.id].sourcePath),
    new Uint8Array([0]),
  );
  const result = await readCatalogAsset({
    root,
    schema,
    packKey: entry.key,
    assetId: first.id,
  });
  assert.equal(result.asset.id, first.id);
  assert.equal(result.bytes.length, first.bytes);
  assert(!Object.hasOwn(result, "revision"));
  await assert.rejects(() =>
    readCatalogAsset({ root, schema, packKey: entry.key, assetId: second.id }),
  );
  await assert.rejects(
    () =>
      readCatalogAsset({
        root,
        schema,
        packKey: entry.key,
        assetId: "demo:missing",
      }),
    /unavailable/,
  );
});
test("canonical root symlinks and changed provenance are rejected", async (t) => {
  const root = await fixture(t),
    link = root + "-link";
  await symlink(root, link);
  t.after(() => rm(link, { force: true }));
  await assert.rejects(() => readCatalog({ root: link, schema }), /symlink/);
  const [path] = fixtureCatalog.provenance.keys();
  await writeFile(join(root, path), "Changed provenance");
  await assert.rejects(
    () => readCatalog({ root, schema }),
    /Provenance hash mismatch/,
  );
});
