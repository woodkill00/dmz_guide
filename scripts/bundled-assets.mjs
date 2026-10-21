import { lstat, open, realpath, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import {
  resolve,
  dirname,
  join,
  relative,
  parse,
  isAbsolute,
  sep,
} from "node:path";
import { LIMITS, assert, boundedWalk } from "../src/content/limits.mjs";
import { validatePack } from "../src/content/validate.mjs";
import { imageInfo, hashBytes } from "../src/content/portable.mjs";
import {
  validateBundledManifest,
  bundledPackKey,
  bundledFileURL,
  BUNDLED_LIMITS,
} from "../src/content/bundled-assets.mjs";
async function noSymlinks(path, { file = false } = {}) {
  const absolute = resolve(path),
    root = parse(absolute).root,
    parts = relative(root, absolute).split(/[\\/]/).filter(Boolean);
  let current = root;
  assert(
    !(await lstat(root)).isSymbolicLink(),
    "Source root symlink forbidden",
  );
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    const s = await lstat(current);
    assert(!s.isSymbolicLink(), `Source symlink forbidden: ${current}`);
    assert(
      i === parts.length - 1 && file ? s.isFile() : s.isDirectory(),
      "Bundled source must be regular file under real directories",
    );
  }
}
async function makeDirectories(path) {
  const absolute = resolve(path),
    root = parse(absolute).root;
  let current = root;
  for (const part of relative(root, absolute).split(/[\\/]/).filter(Boolean)) {
    current = join(current, part);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      try {
        await mkdir(current);
      } catch (creation) {
        if (creation.code !== "EEXIST") throw creation;
      }
      stat = await lstat(current);
    }
    assert(
      !stat.isSymbolicLink() && stat.isDirectory(),
      "Bundled output directory symlink or non-directory forbidden",
    );
  }
}
async function sourceBytes(root, file, expected) {
  await noSymlinks(root);
  await noSymlinks(file, { file: true });
  const rel = relative(await realpath(root), await realpath(file));
  assert(
    rel && !isAbsolute(rel) && !rel.startsWith(".." + sep) && rel !== "..",
    "Bundled source containment failed",
  );
  const handle = await open(
    file,
    constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
  );
  try {
    const stat = await handle.stat();
    assert(
      stat.isFile() && stat.size === expected && stat.size <= LIMITS.assetBytes,
      "Bundled source byte count mismatch or limit exceeded",
    );
    const buffer = new Uint8Array(expected + 1);
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
    assert(total === expected, "Bundled source actual byte count mismatch");
    await noSymlinks(file, { file: true });
    return buffer.slice(0, total);
  } finally {
    await handle.close();
  }
}
export async function prepareBundledAssets({ root, packs, schema }) {
  root = resolve(root);
  assert(
    Array.isArray(packs) && packs.length <= BUNDLED_LIMITS.packs,
    "Bundled pack count limit exceeded",
  );
  const manifest = { format: "dmz-bundled-assets", version: 1, packs: [] },
    files = [];
  for (const pack of packs) {
    boundedWalk(pack);
    assert(
      new TextEncoder().encode(JSON.stringify(pack)).length <= LIMITS.packBytes,
      "Pack byte limit exceeded",
    );
    validatePack(pack, schema);
    const assets = pack.assets.map((a) => ({
      assetId: a.id,
      path: a.path,
      mime: a.mime,
      sha256: a.sha256,
      bytes: a.bytes,
      width: a.width,
      height: a.height,
      url: bundledFileURL(pack.id, a),
    }));
    manifest.packs.push({
      packId: pack.id,
      contentVersion: pack.contentVersion,
      assets,
    });
  }
  // Validate all declared caps and paths before touching any source bytes.
  validateBundledManifest(manifest);
  for (const pack of packs) {
    for (const asset of pack.assets) {
      assert(
        asset.redistributionAllowed === true &&
          ["rightsHolder", "license", "attribution"].every(
            (k) => typeof asset[k] === "string" && asset[k].trim(),
          ),
        "Bundled asset redistribution rights required",
      );
      const file = join(
          root,
          "content/assets",
          bundledPackKey(pack.id),
          asset.path,
        ),
        bytes = await sourceBytes(root, file, asset.bytes),
        info = imageInfo(bytes);
      assert(
        info.mime === asset.mime &&
          info.width === asset.width &&
          info.height === asset.height,
        "Bundled raster signature/dimensions mismatch",
      );
      assert(
        (await hashBytes(bytes)) === asset.sha256,
        "Bundled raster hash mismatch",
      );
      files.push({ url: bundledFileURL(pack.id, asset), bytes });
    }
  }
  return { manifest, files };
}
export async function writeBundledAssets({ dist, manifest, files }) {
  validateBundledManifest(manifest);
  const expected = new Map(
    manifest.packs.flatMap((p) => p.assets.map((a) => [a.url, a])),
  );
  assert(
    Array.isArray(files) && files.length <= BUNDLED_LIMITS.assets,
    "Invalid prepared files",
  );
  const staged = new Map();
  for (const file of files) {
    const asset = expected.get(file.url);
    assert(
      asset &&
        file.bytes instanceof Uint8Array &&
        file.bytes.length === asset.bytes,
      "Unexpected prepared bundled file",
    );
    const info = imageInfo(file.bytes);
    assert(
      info.mime === asset.mime &&
        info.width === asset.width &&
        info.height === asset.height &&
        (await hashBytes(file.bytes)) === asset.sha256,
      "Prepared bundled file changed after validation",
    );
    staged.set(file.url, file.bytes);
  }
  assert(expected.size === staged.size, "Missing prepared bundled file");
  dist = resolve(dist);
  await makeDirectories(dist);
  for (const [url, bytes] of staged) {
    const file = join(dist, url);
    const rel = relative(dist, file);
    assert(
      rel && !isAbsolute(rel) && !rel.startsWith(".." + sep) && rel !== "..",
      "Unsafe bundled output",
    );
    await makeDirectories(dirname(file));
    await writeFile(file, bytes, { flag: "wx" });
  }
  const manifestFile = join(dist, "assets/content/bundled-assets.json");
  await makeDirectories(dirname(manifestFile));
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2), {
    flag: "wx",
  });
}
