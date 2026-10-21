import { lstat, readdir, opendir, open } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, join, dirname, relative, parse, sep } from "node:path";
import { createHash } from "node:crypto";
import {
  ID,
  LIMITS,
  PUBLISHED_LIMITS,
  assert,
  parseBounded,
} from "../src/content/limits.mjs";
import { validatePack } from "../src/content/validate.mjs";
import { GROUPS, imageInfo, hashBytes } from "../src/content/portable.mjs";
import { validatePNGPixelStream } from "../src/content/bundled-assets.mjs";

export const CATALOG_FORMAT = "dmz-catalog";
export const CATALOG_MANIFEST = "content/catalog/manifest.json";
export const MEDIA_CATEGORIES = Object.freeze([
  "items",
  "weapons",
  "recipes",
  "objectives",
  "guides",
  "maps",
  "locations",
  "other",
]);
const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const encode = (value) => new TextEncoder().encode(value);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exact = (value, required, optional = []) => {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    "Expected catalog object",
  );
  assert(
    required.every((key) => Object.hasOwn(value, key)) &&
      Object.keys(value).every((key) =>
        [...required, ...optional].includes(key),
      ),
    "Unexpected or missing catalog fields",
  );
};
const keyOf = (key) => {
  assert(
    typeof key === "string" &&
      key.length <= 100 &&
      KEY.test(key) &&
      !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(key),
    "Invalid catalog pack key",
  );
  return key;
};
const idKey = (id) => {
  assert(
    typeof id === "string" && id.length <= 100 && ID.test(id),
    "Invalid catalog record ID",
  );
  return id.replace(":", "_");
};
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  return value;
}
export function catalogJSON(value) {
  return encode(JSON.stringify(stable(value), null, 2) + "\n");
}
export function catalogRecordPath(key, group, record) {
  keyOf(key);
  assert(GROUPS.includes(group), "Unknown catalog group");
  assert(record && typeof record === "object", "Catalog record required");
  const folder =
    group === "items" && record.kind === "weapon" ? "weapons" : group;
  return `content/catalog/${key}/${folder}/${idKey(record.id)}.json`;
}
export function catalogAssetPath(
  key,
  category,
  id,
  mime,
  variant = "original",
) {
  keyOf(key);
  assert(MEDIA_CATEGORIES.includes(category), "Unknown media category");
  assert(Object.hasOwn(EXTENSIONS, mime), "Unsupported media MIME");
  assert(
    ["original", "thumbnail"].includes(variant),
    "Unsupported media variant",
  );
  return `media/${key}/${category}/${idKey(id)}/${variant}.${EXTENSIONS[mime]}`;
}
function sourceInfo(key, asset, source, pack) {
  exact(source, ["sourcePath", "category"], ["parentAssetId", "variant"]);
  const variant = source.variant ?? "original";
  assert(
    source.sourcePath ===
      catalogAssetPath(key, source.category, asset.id, asset.mime, variant),
    "Media source path must match generated catalog path",
  );
  if (variant === "thumbnail") {
    assert(
      typeof source.parentAssetId === "string" &&
        source.parentAssetId !== asset.id &&
        pack.assets.some((a) => a.id === source.parentAssetId),
      "Thumbnail parent asset unavailable",
    );
  } else
    assert(
      !Object.hasOwn(source, "parentAssetId"),
      "Original image cannot have a thumbnail parent",
    );
  return source;
}
function provenanceEntries(provenance, entries) {
  assert(provenance instanceof Map, "Provenance must be a Map");
  const keys = new Set(entries.map((entry) => entry.key));
  return [...provenance]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, bytes]) => {
      const match = /^media\/([a-z0-9-]+)\/ORIGIN\.txt$/.exec(path);
      assert(match && keys.has(match[1]), "Unsupported provenance path");
      assert(
        bytes instanceof Uint8Array &&
          bytes.length > 0 &&
          bytes.length <= 65536,
        "Provenance text byte limit exceeded",
      );
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { path, sha256: digest(bytes) };
    });
}
export function serializeCatalog({ entries, schema, provenance = new Map() }) {
  assert(
    Array.isArray(entries) &&
      entries.length > 0 &&
      entries.length <= PUBLISHED_LIMITS.packs,
    "Invalid catalog pack count",
  );
  const files = new Map(),
    keys = new Set(),
    ids = new Set();
  let records = 0,
    assets = 0,
    assetBytes = 0,
    metadataBytes = 0;
  const add = (path, value) => {
    const bytes = catalogJSON(value);
    assert(!files.has(path), "Duplicate catalog path");
    metadataBytes += bytes.length;
    assert(
      metadataBytes <= LIMITS.packBytes,
      "Catalog metadata byte limit exceeded",
    );
    files.set(path, bytes);
  };
  for (const entry of entries) {
    const { key, pack, assetSources = {} } = entry;
    keyOf(key);
    assert(
      !keys.has(key) && !ids.has(pack.id),
      "Duplicate catalog pack key or ID",
    );
    keys.add(key);
    ids.add(pack.id);
    if (schema) validatePack(pack, schema, { profile: "published" });
    assert(
      encode(JSON.stringify(pack)).length <= LIMITS.packBytes,
      "Published pack byte limit exceeded",
    );
    const header = Object.fromEntries(
      Object.entries(pack).filter(([field]) => !GROUPS.includes(field)),
    );
    const order = Object.fromEntries(
      GROUPS.map((group) => [group, pack[group].map((record) => record.id)]),
    );
    add(`content/catalog/${key}/pack.json`, { pack: header, order });
    assert(
      Object.keys(assetSources).length === pack.assets.length,
      "Catalog asset source membership mismatch",
    );
    for (const group of GROUPS)
      for (const record of pack[group]) {
        assert(
          ++records <= LIMITS.records,
          "Catalog total record limit exceeded",
        );
        if (group === "assets") {
          assert(
            ++assets <= PUBLISHED_LIMITS.siteAssets,
            "Published site asset count limit exceeded",
          );
          assetBytes += record.bytes;
          assert(
            assetBytes <= PUBLISHED_LIMITS.totalAssetBytes,
            "Published site byte limit exceeded",
          );
          add(catalogRecordPath(key, group, record), {
            asset: record,
            ...sourceInfo(key, record, assetSources[record.id], pack),
          });
        } else add(catalogRecordPath(key, group, record), record);
      }
  }
  add(CATALOG_MANIFEST, {
    format: CATALOG_FORMAT,
    version: 1,
    packs: entries.map(({ key, pack }) => ({ key, id: pack.id })),
    provenance: provenanceEntries(provenance, entries),
  });
  return files;
}
export async function assertSafePath(
  root,
  path,
  { optional = false, directory = false } = {},
) {
  root = resolve(root);
  const target = resolve(root, path);
  assert(
    target !== root && target.startsWith(root + sep),
    "Catalog path escapes repository",
  );
  let current = parse(target).root;
  const parts = relative(current, target).split(sep).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (optional && error.code === "ENOENT") return null;
      throw error;
    }
    assert(!stat.isSymbolicLink(), "Catalog symlink forbidden");
    assert(
      i === parts.length - 1 && !directory ? stat.isFile() : stat.isDirectory(),
      "Catalog source must be a regular file under directories",
    );
  }
  return target;
}
export async function readCatalogFile(root, path, maxBytes) {
  const target = await assertSafePath(root, path);
  const handle = await open(
    target,
    constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
  );
  try {
    const stat = await handle.stat();
    assert(
      stat.isFile() && stat.size <= maxBytes,
      "Catalog source byte limit exceeded",
    );
    const buffer = new Uint8Array(stat.size + 1);
    let total = 0;
    while (total < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        total,
        buffer.length - total,
        null,
      );
      if (!bytesRead) break;
      total += bytesRead;
    }
    assert(total === stat.size, "Catalog source changed during read");
    await assertSafePath(root, path);
    return buffer.slice(0, total);
  } finally {
    await handle.close();
  }
}
async function treeFiles(root, folder, limit = LIMITS.records + 100) {
  const files = [];
  let visited = 0;
  async function visit(path, depth = 0) {
    assert(
      depth <= 8 && ++visited <= limit * 4 + 100,
      "Catalog directory traversal limit exceeded",
    );
    let stat;
    try {
      stat = await lstat(join(root, path));
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    assert(!stat.isSymbolicLink(), "Catalog symlink forbidden");
    if (stat.isDirectory()) {
      const directory = await opendir(join(root, path));
      for await (const entry of directory)
        await visit(`${path}/${entry.name}`, depth + 1);
    } else {
      assert(stat.isFile(), "Nonregular catalog file forbidden");
      assert(files.length < limit, "Catalog file count exceeded");
      files.push(path);
    }
  }
  if (
    !(await assertSafePath(root, folder, { optional: true, directory: true }))
  )
    return files;
  await visit(folder);
  return files.sort();
}
function parseFile(bytes) {
  return parseBounded(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
export function catalogRevision(files) {
  const hash = createHash("sha256");
  for (const [path, bytes] of [...files].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  ))
    hash.update(path).update("\0").update(digest(bytes)).update("\0");
  return hash.digest("hex");
}
export function assembleCatalog({ files, schema }) {
  assert(
    files instanceof Map &&
      files.size <= LIMITS.records + PUBLISHED_LIMITS.packs + 1,
    "Invalid canonical metadata inventory",
  );
  let metadataBytes = 0,
    records = 0,
    assetCount = 0,
    assetBytes = 0;
  for (const [path, bytes] of files) {
    assert(
      typeof path === "string" &&
        path.startsWith("content/catalog/") &&
        bytes instanceof Uint8Array,
      "Invalid canonical metadata entry",
    );
    metadataBytes += bytes.length;
    assert(
      metadataBytes <= LIMITS.packBytes,
      "Catalog metadata byte limit exceeded",
    );
  }
  const used = new Set([CATALOG_MANIFEST]),
    keys = new Set(),
    ids = new Set();
  const manifest = parseFile(files.get(CATALOG_MANIFEST));
  exact(manifest, ["format", "version", "packs", "provenance"]);
  assert(
    manifest.format === CATALOG_FORMAT && manifest.version === 1,
    "Unsupported canonical catalog version",
  );
  assert(
    Array.isArray(manifest.packs) &&
      manifest.packs.length > 0 &&
      manifest.packs.length <= PUBLISHED_LIMITS.packs,
    "Invalid canonical pack count",
  );
  const entries = manifest.packs.map((member) => {
    exact(member, ["key", "id"]);
    const { key, id } = member;
    keyOf(key);
    idKey(id);
    assert(!keys.has(key) && !ids.has(id), "Duplicate catalog pack key or ID");
    keys.add(key);
    ids.add(id);
    const headerPath = `content/catalog/${key}/pack.json`;
    used.add(headerPath);
    const descriptor = parseFile(files.get(headerPath));
    exact(descriptor, ["pack", "order"]);
    exact(descriptor.order, GROUPS);
    assert(
      descriptor.pack.id === id &&
        !GROUPS.some((group) => Object.hasOwn(descriptor.pack, group)),
      "Catalog pack identity or fields mismatch",
    );
    const pack = { ...descriptor.pack },
      assetSources = {};
    for (const group of GROUPS) {
      const order = descriptor.order[group];
      assert(
        Array.isArray(order) &&
          order.length <= LIMITS.records &&
          new Set(order).size === order.length,
        "Invalid catalog ordered membership",
      );
      records += order.length;
      assert(records <= LIMITS.records, "Catalog total record limit exceeded");
      pack[group] = order.map((id) => {
        let path = catalogRecordPath(key, group, { id });
        if (group === "items") {
          const weaponPath = catalogRecordPath(key, group, {
            id,
            kind: "weapon",
          });
          assert(
            files.has(path) !== files.has(weaponPath),
            "Item must exist in exactly one item/weapon directory",
          );
          if (files.has(weaponPath)) path = weaponPath;
        }
        assert(
          files.has(path) && !used.has(path),
          "Missing or duplicate canonical record file",
        );
        used.add(path);
        const source = parseFile(files.get(path));
        const record = group === "assets" ? source.asset : source;
        assert(
          record?.id === id && path === catalogRecordPath(key, group, record),
          "Catalog record identity/directory mismatch",
        );
        if (group === "assets") {
          exact(
            source,
            ["asset", "sourcePath", "category"],
            ["parentAssetId", "variant"],
          );
          assetSources[id] = Object.fromEntries(
            Object.entries(source).filter(([key]) => key !== "asset"),
          );
        }
        return record;
      });
    }
    validatePack(pack, schema, { profile: "published" });
    for (const asset of pack.assets) {
      sourceInfo(key, asset, assetSources[asset.id], pack);
      assetCount++;
      assetBytes += asset.bytes;
    }
    assert(
      assetCount <= PUBLISHED_LIMITS.siteAssets &&
        assetBytes <= PUBLISHED_LIMITS.totalAssetBytes,
      "Published site media limit exceeded",
    );
    return { key, pack, assetSources };
  });
  assert(used.size === files.size, "Unknown canonical metadata files");
  assert(
    Array.isArray(manifest.provenance) &&
      manifest.provenance.length <= entries.length,
    "Invalid provenance inventory",
  );
  const origins = new Set();
  for (const item of manifest.provenance) {
    exact(item, ["path", "sha256"]);
    const match = /^media\/([a-z0-9-]+)\/ORIGIN\.txt$/.exec(item.path);
    assert(
      match &&
        keys.has(match[1]) &&
        /^[a-f0-9]{64}$/.test(item.sha256) &&
        !origins.has(item.path),
      "Invalid provenance descriptor",
    );
    origins.add(item.path);
  }
  return { entries, packs: entries.map(({ pack }) => pack), manifest };
}
export async function readCatalog({ root, schema, selectedAsset }) {
  if (selectedAsset) {
    exact(selectedAsset, ["packKey", "assetId"]);
    keyOf(selectedAsset.packKey);
    idKey(selectedAsset.assetId);
  }
  root = resolve(root);
  assert(
    !(await assertSafePath(root, ".author-state/journal.json", {
      optional: true,
    })),
    "Repository recovery pending; run author:recover before reading or building",
  );
  assert(
    (await treeFiles(root, "content/packs")).length === 0 &&
      (await treeFiles(root, "content/assets")).length === 0,
    "Legacy content remains; complete explicit catalog migration first",
  );
  const catalogPaths = await treeFiles(root, "content/catalog");
  const files = new Map();
  let metadataBytes = 0,
    recordCount = 0;
  const readJSON = async (path) => {
    const bytes = await readCatalogFile(
      root,
      path,
      LIMITS.packBytes - metadataBytes,
    );
    metadataBytes += bytes.length;
    files.set(path, bytes);
    return parseFile(bytes);
  };
  const manifest = await readJSON(CATALOG_MANIFEST);
  exact(manifest, ["format", "version", "packs", "provenance"]);
  assert(
    manifest.format === CATALOG_FORMAT && manifest.version === 1,
    "Unsupported canonical catalog version",
  );
  assert(
    Array.isArray(manifest.packs) &&
      manifest.packs.length > 0 &&
      manifest.packs.length <= PUBLISHED_LIMITS.packs,
    "Invalid canonical pack count",
  );
  const entries = [];
  for (const member of manifest.packs) {
    exact(member, ["key", "id"]);
    keyOf(member.key);
    idKey(member.id);
    const descriptor = await readJSON(
      `content/catalog/${member.key}/pack.json`,
    );
    exact(descriptor, ["pack", "order"]);
    exact(descriptor.order, GROUPS);
    assert(
      descriptor.pack.id === member.id &&
        !GROUPS.some((group) => Object.hasOwn(descriptor.pack, group)),
      "Catalog header identity or fields mismatch",
    );
    const pack = { ...descriptor.pack },
      assetSources = {};
    for (const group of GROUPS) {
      const order = descriptor.order[group];
      assert(
        Array.isArray(order) &&
          order.length <= LIMITS.records &&
          new Set(order).size === order.length,
        "Invalid catalog ordered membership",
      );
      assert(
        recordCount + order.length <= LIMITS.records,
        "Catalog total record limit exceeded",
      );
      recordCount += order.length;
      pack[group] = [];
      for (const id of order) {
        let path = catalogRecordPath(member.key, group, { id });
        if (group === "items") {
          const weapon = catalogRecordPath(member.key, group, {
            id,
            kind: "weapon",
          });
          const normalExists = await assertSafePath(root, path, {
            optional: true,
          });
          const weaponExists = await assertSafePath(root, weapon, {
            optional: true,
          });
          assert(
            Boolean(normalExists) !== Boolean(weaponExists),
            "Item must exist in exactly one item/weapon directory",
          );
          if (weaponExists) path = weapon;
        }
        const source = await readJSON(path);
        const record = group === "assets" ? source.asset : source;
        assert(
          record?.id === id &&
            path === catalogRecordPath(member.key, group, record),
          "Catalog record identity/directory mismatch",
        );
        pack[group].push(record);
        if (group === "assets") {
          exact(
            source,
            ["asset", "sourcePath", "category"],
            ["parentAssetId", "variant"],
          );
          assetSources[id] = Object.fromEntries(
            Object.entries(source).filter(([key]) => key !== "asset"),
          );
        }
      }
    }
    validatePack(pack, schema, { profile: "published" });
    entries.push({ key: member.key, pack, assetSources });
  }
  const provenance = new Map();
  assert(
    Array.isArray(manifest.provenance) &&
      manifest.provenance.length <= entries.length,
    "Invalid provenance inventory",
  );
  for (const item of manifest.provenance) {
    exact(item, ["path", "sha256"]);
    assert(
      /^media\/[a-z0-9-]+\/ORIGIN\.txt$/.test(item.path) &&
        /^[a-f0-9]{64}$/.test(item.sha256),
      "Unsafe provenance descriptor",
    );
    assert(!provenance.has(item.path), "Duplicate provenance source");
    const bytes = await readCatalogFile(root, item.path, 65536);
    assert(digest(bytes) === item.sha256, "Provenance hash mismatch");
    provenance.set(item.path, bytes);
    files.set(item.path, bytes);
  }
  const serialized = serializeCatalog({ entries, schema, provenance });
  const listed = catalogPaths;
  assert(
    listed.length === serialized.size &&
      listed.every((path) => serialized.has(path)),
    "Unknown or missing canonical source files",
  );
  for (const entry of entries)
    for (const asset of entry.pack.assets) {
      if (
        selectedAsset &&
        (entry.key !== selectedAsset.packKey ||
          asset.id !== selectedAsset.assetId)
      )
        continue;
      const source = sourceInfo(
        entry.key,
        asset,
        entry.assetSources[asset.id],
        entry.pack,
      );
      const bytes = await readCatalogFile(root, source.sourcePath, asset.bytes);
      await validateCatalogRaster(asset, bytes);
      assert(!files.has(source.sourcePath), "Duplicate canonical media path");
      files.set(source.sourcePath, bytes);
    }
  // A writer may start after the initial guard. Fail rather than publish a mixed snapshot.
  assert(
    !(await assertSafePath(root, ".author-state/journal.json", {
      optional: true,
    })),
    "Repository changed during read; recovery or retry required",
  );
  for (const [path, bytes] of files) {
    if (!path.startsWith("content/catalog/") && !path.endsWith("/ORIGIN.txt"))
      continue;
    const current = await readCatalogFile(root, path, bytes.length);
    assert(
      digest(current) === digest(bytes),
      "Catalog source changed during snapshot; retry",
    );
  }
  const finalPaths = await treeFiles(root, "content/catalog");
  assert(
    finalPaths.length === catalogPaths.length &&
      finalPaths.every((path, index) => path === catalogPaths[index]),
    "Catalog inventory changed during snapshot; retry",
  );
  assert(
    !(await assertSafePath(root, ".author-state/journal.json", {
      optional: true,
    })),
    "Repository changed during read; recovery or retry required",
  );
  return {
    packs: entries.map(({ pack }) => pack),
    entries,
    provenance,
    files,
    revision: selectedAsset ? null : catalogRevision(files),
  };
}
export async function readCatalogAsset({ root, schema, packKey, assetId }) {
  const snapshot = await readCatalog({
    root,
    schema,
    selectedAsset: { packKey, assetId },
  });
  const entry = snapshot.entries.find((entry) => entry.key === packKey);
  const asset = entry?.pack.assets.find((asset) => asset.id === assetId);
  assert(asset, "Requested public image unavailable");
  const sourcePath = entry.assetSources[assetId].sourcePath;
  return { asset, bytes: snapshot.files.get(sourcePath), sourcePath };
}
export async function validateCatalogRaster(asset, bytes) {
  const info = imageInfo(bytes);
  assert(
    bytes.length === asset.bytes &&
      info.mime === asset.mime &&
      info.width === asset.width &&
      info.height === asset.height &&
      (await hashBytes(bytes)) === asset.sha256,
    "Canonical asset bytes/metadata mismatch",
  );
  if (info.mime === "image/png") await validatePNGPixelStream(bytes);
}
export function bundledSources(entries) {
  return new Map(
    entries.flatMap(({ pack, assetSources }) =>
      pack.assets.map((asset) => [
        `${pack.id}\0${asset.id}`,
        assetSources[asset.id].sourcePath,
      ]),
    ),
  );
}
export async function planCatalogMigration({ root, schema }) {
  root = resolve(root);
  assert(
    !(await assertSafePath(root, CATALOG_MANIFEST, { optional: true })),
    "Canonical catalog already exists; migration is not an overwrite operation",
  );
  assert(
    (await treeFiles(root, "content/catalog")).length === 0 &&
      (await treeFiles(root, "media")).length === 0,
    "Migration destination contains files; preserve them and resolve before migration",
  );
  const legacyFiles = await treeFiles(root, "content/packs");
  assert(
    legacyFiles.length > 0 && legacyFiles.length <= PUBLISHED_LIMITS.packs,
    "No legacy packs or too many packs",
  );
  const before = new Map(),
    after = new Map(),
    entries = [],
    provenance = new Map(),
    expectedMedia = new Set();
  for (const path of legacyFiles) {
    const match = /^content\/packs\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/.exec(
      path,
    );
    assert(match, "Unexpected legacy pack file");
    const bytes = await readCatalogFile(root, path, LIMITS.packBytes),
      pack = parseFile(bytes);
    validatePack(pack, schema, { profile: "published" });
    before.set(path, bytes);
    after.set(path, null);
    const key = match[1],
      assetSources = {};
    for (const asset of pack.assets) {
      const old = `content/assets/${pack.id.replace(":", "_")}/${asset.path}`;
      assert(!expectedMedia.has(old), "Duplicate legacy media source");
      expectedMedia.add(old);
      const pixels = await readCatalogFile(root, old, LIMITS.assetBytes);
      await validateCatalogRaster(asset, pixels);
      const users = GROUPS.filter((group) => group !== "assets").flatMap(
        (group) =>
          pack[group]
            .filter(
              (record) =>
                record.assetId === asset.id ||
                record.assetIds?.includes(asset.id),
            )
            .map((record) =>
              group === "items" && record.kind === "weapon" ? "weapons" : group,
            ),
      );
      const category =
        users.length &&
        users.every((group) => group === users[0]) &&
        MEDIA_CATEGORIES.includes(users[0])
          ? users[0]
          : "other";
      const sourcePath = catalogAssetPath(key, category, asset.id, asset.mime);
      assetSources[asset.id] = { category, sourcePath };
      before.set(old, pixels);
      after.set(old, null);
      before.set(sourcePath, null);
      after.set(sourcePath, pixels);
    }
    const oldOrigin = `content/assets/${pack.id.replace(":", "_")}/ORIGIN.txt`;
    if (await assertSafePath(root, oldOrigin, { optional: true })) {
      const bytes = await readCatalogFile(root, oldOrigin, 65536),
        path = `media/${key}/ORIGIN.txt`;
      expectedMedia.add(oldOrigin);
      before.set(oldOrigin, bytes);
      after.set(oldOrigin, null);
      before.set(path, null);
      after.set(path, bytes);
      provenance.set(path, bytes);
    }
    entries.push({ key, pack, assetSources });
  }
  const actualMedia = await treeFiles(root, "content/assets");
  assert(
    actualMedia.length === expectedMedia.size &&
      actualMedia.every((path) => expectedMedia.has(path)),
    "Unexpected legacy media files; migration will not remove unknown files",
  );
  const metadata = serializeCatalog({ entries, schema, provenance });
  const reconstructed = assembleCatalog({ files: metadata, schema }).packs;
  assert(
    JSON.stringify(stable(reconstructed)) ===
      JSON.stringify(stable(entries.map(({ pack }) => pack))),
    "Migration changed ordered runtime content",
  );
  for (const [path, bytes] of metadata) {
    before.set(path, null);
    after.set(path, bytes);
  }
  return {
    before,
    after,
    entries,
    provenance,
    packs: entries.map(({ pack }) => pack),
    sourceRevision: catalogRevision(
      new Map([...before].filter(([, bytes]) => bytes)),
    ),
    markerPath: CATALOG_MANIFEST,
  };
}
