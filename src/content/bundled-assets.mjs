import { ID, LIMITS, assert, parseBounded, boundedWalk } from "./limits.mjs";
import {
  TRANSFER_LIMITS,
  base64FromBytes,
  validatePayloads,
  imageInfo,
} from "./portable.mjs";
export const BUNDLED_LIMITS = Object.freeze({
  manifestBytes: 1048576,
  packs: 32,
  assets: 1024,
  depth: 8,
  nodes: 20000,
  string: 1000,
  timeoutMs: 5000,
});
export const BUNDLED_MANIFEST_URL = "/assets/content/bundled-assets.json";
const metadata = ["path", "mime", "sha256", "bytes", "width", "height"];
const extensions = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const exact = (v, keys, label) =>
  assert(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).length === keys.length &&
      keys.every((k) => Object.hasOwn(v, k)),
    `Invalid bundled ${label} fields`,
  );
export function bundledPackKey(id) {
  assert(
    typeof id === "string" && id.length <= 100 && ID.test(id),
    "Invalid bundled pack ID",
  );
  return id.replace(":", "_");
}
export function bundledFileURL(packId, asset) {
  assert(
    /^[a-f0-9]{64}$/.test(asset.sha256) &&
      Object.hasOwn(extensions, asset.mime),
    "Invalid bundled hash/MIME",
  );
  return `/assets/bundled/${bundledPackKey(packId)}/${asset.sha256}.${extensions[asset.mime]}`;
}
export function validateBundledManifest(manifest) {
  boundedWalk(manifest, {
    depth: BUNDLED_LIMITS.depth,
    nodes: BUNDLED_LIMITS.nodes,
    string: BUNDLED_LIMITS.string,
  });
  assert(
    new TextEncoder().encode(JSON.stringify(manifest)).length <=
      BUNDLED_LIMITS.manifestBytes,
    "Bundled manifest byte limit exceeded",
  );
  exact(manifest, ["format", "version", "packs"], "manifest");
  assert(
    manifest.format === "dmz-bundled-assets" && manifest.version === 1,
    "Unsupported bundled manifest version",
  );
  assert(
    Array.isArray(manifest.packs) &&
      manifest.packs.length <= BUNDLED_LIMITS.packs,
    "Bundled pack count limit exceeded",
  );
  const packs = new Set();
  let count = 0,
    bytes = 0,
    pixels = 0;
  for (const pack of manifest.packs) {
    exact(pack, ["packId", "contentVersion", "assets"], "pack");
    bundledPackKey(pack.packId);
    assert(!packs.has(pack.packId), "Duplicate bundled pack ID");
    packs.add(pack.packId);
    assert(
      typeof pack.contentVersion === "string" &&
        pack.contentVersion.length > 0 &&
        pack.contentVersion.length <= 100,
      "Invalid bundled content version",
    );
    assert(
      Array.isArray(pack.assets) && pack.assets.length <= LIMITS.assets,
      "Bundled asset count limit exceeded",
    );
    const ids = new Set(),
      paths = new Set();
    for (const asset of pack.assets) {
      exact(asset, ["assetId", ...metadata, "url"], "asset");
      assert(
        typeof asset.assetId === "string" &&
          asset.assetId.length <= 100 &&
          ID.test(asset.assetId),
        "Invalid bundled asset ID",
      );
      assert(!ids.has(asset.assetId), "Duplicate bundled asset ID");
      ids.add(asset.assetId);
      assert(
        typeof asset.path === "string" &&
          /^assets\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(asset.path),
        "Unsafe bundled asset path",
      );
      assert(
        !paths.has(asset.path.toLowerCase()),
        "Duplicate or case-colliding bundled path",
      );
      paths.add(asset.path.toLowerCase());
      assert(
        asset.path.endsWith("." + extensions[asset.mime]) ||
          (asset.mime === "image/jpeg" && asset.path.endsWith(".jpeg")),
        "Bundled extension/MIME mismatch",
      );
      assert(
        Number.isInteger(asset.bytes) &&
          asset.bytes > 0 &&
          asset.bytes <= LIMITS.assetBytes,
        "Bundled asset byte limit exceeded",
      );
      assert(
        Number.isInteger(asset.width) &&
          Number.isInteger(asset.height) &&
          asset.width > 0 &&
          asset.height > 0 &&
          asset.width <= LIMITS.dimension &&
          asset.height <= LIMITS.dimension &&
          asset.width * asset.height <= LIMITS.pixels,
        "Bundled dimension/pixel limit exceeded",
      );
      assert(
        asset.url === bundledFileURL(pack.packId, asset),
        "Bundled URL must match immutable local allowlist",
      );
      bytes += asset.bytes;
      pixels += asset.width * asset.height;
      count++;
      assert(
        bytes <= LIMITS.totalAssetBytes &&
          pixels <= TRANSFER_LIMITS.totalPixels &&
          count <= BUNDLED_LIMITS.assets,
        "Bundled aggregate byte/pixel/entry limit exceeded",
      );
    }
  }
  return manifest;
}
function matchingPack(pack, manifest) {
  validateBundledManifest(manifest);
  const entry = manifest.packs.find((p) => p.packId === pack.id);
  assert(
    entry && entry.contentVersion === pack.contentVersion,
    "Bundled pack/version unavailable; keep the readable reference fallback",
  );
  assert(Array.isArray(pack.assets), "Invalid pack assets");
  return entry;
}
function matchingAsset(pack, assetId, manifest) {
  const entry = matchingPack(pack, manifest),
    source = pack.assets.find((a) => a.id === assetId),
    asset = entry.assets.find((a) => a.assetId === assetId);
  assert(
    source && asset && metadata.every((k) => asset[k] === source[k]),
    "Bundled asset metadata unavailable or changed",
  );
  assert(
    source.redistributionAllowed === true &&
      ["rightsHolder", "license", "attribution"].every(
        (k) => typeof source[k] === "string" && source[k].trim(),
      ),
    "Bundled asset rights required",
  );
  return asset;
}
export function bundledAssetURL(pack, assetId, manifest) {
  return matchingAsset(pack, assetId, manifest).url;
}
function originURL(baseURL) {
  const current = globalThis.location?.href;
  const u = new URL(baseURL || current || "http://localhost");
  assert(
    ["http:", "https:"].includes(u.protocol) && !u.username && !u.password,
    "Bundled assets require a same-origin local HTTP server",
  );
  if (current)
    assert(
      u.origin === new URL(current).origin,
      "External bundled asset origin forbidden",
    );
  return u.origin;
}
async function readLocal(path, limit, mime, options = {}) {
  const origin = originURL(options.baseURL),
    url = new URL(path, origin).href;
  assert(
    path.startsWith("/") &&
      !path.startsWith("//") &&
      new URL(url).origin === origin,
    "Unsafe bundled fetch URL",
  );
  assert(!options.signal?.aborted, "Bundled load cancelled");
  const timeout = options.timeoutMs ?? BUNDLED_LIMITS.timeoutMs;
  assert(
    Number.isInteger(timeout) &&
      timeout > 0 &&
      timeout <= BUNDLED_LIMITS.timeoutMs,
    "Invalid bundled timeout",
  );
  const controller = new AbortController();
  const expires = performance.now() + timeout;
  let reader, timer, abort;
  let stopped = false;
  const deadline = new Promise((_, reject) => {
    const fail = (message) => {
      stopped = true;
      controller.abort();
      void reader?.cancel().catch(() => {});
      reject(new Error(message));
    };
    timer = setTimeout(() => fail("Bundled image load timed out"), timeout);
    abort = () => fail("Bundled load cancelled");
    options.signal?.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([
      deadline,
      (async () => {
        const response = await (options.fetchImpl || globalThis.fetch)(url, {
          signal: controller.signal,
          redirect: "error",
          credentials: "same-origin",
          cache: "no-store",
        });
        assert(!stopped, "Bundled load cancelled");
        assert(
          response.ok &&
            !response.redirected &&
            (!response.url || response.url === url),
          "Bundled response failed or redirected",
        );
        assert(
          response.headers
            .get("content-type")
            ?.split(";")[0]
            .trim()
            .toLowerCase() === mime,
          "Bundled response MIME mismatch",
        );
        const declared = response.headers.get("content-length");
        if (declared !== null)
          assert(
            /^\d+$/.test(declared) && Number(declared) <= limit,
            "Bundled response byte limit exceeded",
          );
        assert(
          response.body?.getReader,
          "Bounded bundled response stream required",
        );
        reader = response.body.getReader();
        const bytes = new Uint8Array(limit);
        let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          assert(!stopped, "Bundled load cancelled");
          if (done) break;
          assert(
            value instanceof Uint8Array && value.length > 0,
            "Invalid or empty bundled response chunk",
          );
          assert(performance.now() <= expires, "Bundled image load timed out");
          assert(
            total + value.length <= limit,
            "Bundled response byte limit exceeded",
          );
          bytes.set(value, total);
          total += value.length;
        }
        return bytes.slice(0, total);
      })(),
    ]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
    controller.abort();
    void reader?.cancel().catch(() => {});
  }
}
export async function loadBundledManifest(options = {}) {
  const bytes = await readLocal(
    BUNDLED_MANIFEST_URL,
    BUNDLED_LIMITS.manifestBytes,
    "application/json",
    options,
  );
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return validateBundledManifest(
    parseBounded(text, BUNDLED_LIMITS.manifestBytes, {
      depth: BUNDLED_LIMITS.depth,
      nodes: BUNDLED_LIMITS.nodes,
      string: BUNDLED_LIMITS.string,
    }),
  );
}
export async function decodeBundledRaster(bytes, mime, signal) {
  const info = imageInfo(bytes);
  assert(info.mime === mime, "Bundled raster MIME mismatch");
  assert(!signal?.aborted, "Bundled decode cancelled");
  assert(
    typeof globalThis.createImageBitmap === "function",
    "Browser raster decoder required",
  );
  // Materialize decoded pixels, not just dimensions from a lazily decoded Image.
  const work = createImageBitmap(new Blob([bytes], { type: mime }));
  let timer, abort, bitmap;
  try {
    bitmap = await Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Bundled image decode timed out")),
          TRANSFER_LIMITS.decodeMs,
        );
        abort = () => reject(new Error("Bundled decode cancelled"));
        signal?.addEventListener("abort", abort, { once: true });
      }),
    ]);
    assert(!signal?.aborted, "Bundled decode cancelled");
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    if (bitmap) bitmap.close();
    else
      work.then(
        (lateBitmap) => lateBitmap.close(),
        () => {},
      );
  }
}
export async function loadBundledPayloads(pack, options = {}) {
  assert(
    Array.isArray(pack.assets) && pack.assets.length <= LIMITS.assets,
    "Invalid pack assets",
  );
  if (!pack.assets.length) return [];
  const manifest = options.manifest || (await loadBundledManifest(options)),
    ids = options.assetIds ?? pack.assets.map((a) => a.id);
  assert(
    Array.isArray(ids) &&
      ids.length <= LIMITS.assets &&
      new Set(ids).size === ids.length,
    "Invalid selected bundled assets",
  );
  const assets = ids.map((id) => matchingAsset(pack, id, manifest)),
    payloads = [];
  let total = 0,
    pixels = 0;
  for (const asset of assets) {
    total += asset.bytes;
    pixels += asset.width * asset.height;
    assert(
      total <= LIMITS.totalAssetBytes && pixels <= TRANSFER_LIMITS.totalPixels,
      "Bundled aggregate byte/pixel limit exceeded",
    );
    const bytes = await readLocal(asset.url, asset.bytes, asset.mime, options);
    payloads.push({ assetId: asset.assetId, base64: base64FromBytes(bytes) });
  }
  await validatePayloads(pack, payloads, {
    complete: options.assetIds === undefined,
    decodeRaster: options.decodeRaster || decodeBundledRaster,
    signal: options.signal,
  });
  return payloads;
}
