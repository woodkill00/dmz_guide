import * as fs from "node:fs/promises";
import {
  resolve,
  join,
  extname,
  parse,
  relative as pathRelative,
  sep,
} from "node:path";
import { createHash } from "node:crypto";
import { MAP_ENTRIES } from "../src/domain/map-routes.mjs";
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const payload = /\.(?:html|js|mjs|css|json|svg|png|webp|woff2?|txt)$/;
export const bundleRoot = (root) => join(root, ".local", "unified-map", "dist");
export async function safeFile(root, relative, limit) {
  if (
    !relative ||
    relative.includes("\\") ||
    relative.split("/").some((p) => !p || p.startsWith(".")) ||
    relative.includes("update-authorization.local.json")
  )
    throw Error("Unsafe map path");
  const base = resolve(root);
  let ancestor = parse(base).root;
  for (const segment of pathRelative(ancestor, base).split(sep)) {
    ancestor = join(ancestor, segment);
    const info = await fs.lstat(ancestor);
    if (info.isSymbolicLink() || !info.isDirectory())
      throw Error("Linked map root ancestor");
  }
  let path = base;
  const segments = relative.split("/");
  for (let i = 0; i < segments.length; i++) {
    path = join(path, segments[i]);
    const info = await fs.lstat(path);
    if (
      info.isSymbolicLink() ||
      (i < segments.length - 1 && !info.isDirectory())
    )
      throw Error("Linked map path");
  }
  const handle = await fs.open(path, "r");
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > limit) throw Error("Map file limit");
    const buffer = Buffer.alloc(Math.min(info.size + 1, limit + 1));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead !== info.size || bytesRead > limit)
      throw Error("Map changed during read");
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}
export async function sourceFingerprint(root) {
  const files = [];
  async function walk(relative) {
    const info = await fs.lstat(join(root, relative));
    if (info.isSymbolicLink() || !info.isDirectory())
      throw Error("Linked map source root");
    for (const entry of (
      await fs.readdir(join(root, relative), { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      if (
        entry.name.startsWith(".") ||
        ["node_modules", "dist", "public", "test-results"].includes(entry.name)
      )
        continue;
      const path = relative + "/" + entry.name;
      if (entry.isSymbolicLink()) throw Error("Linked map source refused");
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile())
        files.push([path, digest(await fs.readFile(join(root, path)))]);
    }
  }
  await walk("tools/hajin-map/src");
  await walk("tools/hajin-map/server");
  await walk("src");
  for (const path of [
    "tools/hajin-map/vite.config.mjs",
    "tools/hajin-map/package.json",
    "tools/hajin-map/package-lock.json",
    ...MAP_ENTRIES.map((n) => "tools/hajin-map/" + n),
  ])
    files.push([path, digest(await fs.readFile(join(root, path)))]);
  for (const path of [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
  ])
    try {
      files.push([
        path,
        digest(await fs.readFile(join(root, "tools/hajin-map", path))),
      ]);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  return digest(JSON.stringify(files));
}
export async function createManifest(directory, sourceFingerprint) {
  const files = {};
  let total = 0;
  async function walk(prefix = "") {
    for (const entry of await fs.readdir(join(directory, prefix), {
      withFileTypes: true,
    })) {
      const path = prefix + entry.name;
      if (entry.isSymbolicLink()) throw Error("Linked build refused");
      if (entry.isDirectory()) await walk(path + "/");
      else {
        if (
          !payload.test(path) ||
          (extname(path) === ".html" && !MAP_ENTRIES.includes(path))
        )
          throw Error("Unexpected map payload");
        const bytes = await safeFile(directory, path, 32 * 1024 * 1024);
        total += bytes.length;
        if (Object.keys(files).length >= 2048 || total > 128 * 1024 * 1024)
          throw Error("Map bundle limit");
        files[path] = { bytes: bytes.length, sha256: digest(bytes) };
      }
    }
  }
  await walk();
  for (const name of MAP_ENTRIES)
    if (!files[name]) throw Error("Missing map entry " + name);
  const manifest = {
    kind: "dmz-unified-map-bundle",
    version: 1,
    base: "/map/",
    sourceFingerprint,
    entries: MAP_ENTRIES,
    files,
  };
  await fs.writeFile(
    join(directory, "unified-map.json"),
    JSON.stringify(manifest) + "\n",
  );
  return manifest;
}
export async function validateBundle(directory, { fingerprint } = {}) {
  const raw = await safeFile(directory, "unified-map.json", 1024 * 1024),
    m = JSON.parse(raw);
  if (
    Object.keys(m).sort().join() !==
      ["base", "entries", "files", "kind", "sourceFingerprint", "version"]
        .sort()
        .join() ||
    m.kind !== "dmz-unified-map-bundle" ||
    m.version !== 1 ||
    m.base !== "/map/" ||
    !/^[a-f0-9]{64}$/.test(m.sourceFingerprint) ||
    JSON.stringify(m.entries) !== JSON.stringify(MAP_ENTRIES) ||
    !m.files ||
    Array.isArray(m.files)
  )
    throw Error("Invalid map manifest");
  let total = 0;
  const entries = Object.entries(m.files);
  if (entries.length > 2048) throw Error("Map bundle count");
  for (const [path, info] of entries) {
    if (
      !payload.test(path) ||
      (extname(path) === ".html" && !MAP_ENTRIES.includes(path)) ||
      Object.keys(info).sort().join() !== "bytes,sha256" ||
      !Number.isInteger(info.bytes) ||
      info.bytes < 0 ||
      info.bytes > 32 * 1024 * 1024 ||
      !/^[a-f0-9]{64}$/.test(info.sha256)
    )
      throw Error("Invalid payload record");
    total += info.bytes;
    if (total > 128 * 1024 * 1024) throw Error("Map bundle bytes");
    const bytes = await safeFile(directory, path, 32 * 1024 * 1024);
    if (bytes.length !== info.bytes || digest(bytes) !== info.sha256)
      throw Error("Map payload changed");
  }
  for (const entry of MAP_ENTRIES)
    if (!m.files[entry]) throw Error("Missing entry");
  return {
    manifest: m,
    bundleId: digest(raw),
    fresh: !fingerprint || fingerprint === m.sourceFingerprint,
  };
}
