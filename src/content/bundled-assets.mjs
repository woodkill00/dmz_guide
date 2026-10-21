import {
  ID,
  LIMITS,
  PUBLISHED_LIMITS,
  assert,
  parseBounded,
  boundedWalk,
} from "./limits.mjs";
import {
  TRANSFER_LIMITS,
  base64FromBytes,
  validatePayloads,
  imageInfo,
} from "./portable.mjs";
export const BUNDLED_LIMITS = Object.freeze({
  manifestBytes: 1048576,
  packs: PUBLISHED_LIMITS.packs,
  assets: PUBLISHED_LIMITS.siteAssets,
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
    bytes = 0;
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
      Array.isArray(pack.assets) &&
        pack.assets.length <= PUBLISHED_LIMITS.assets,
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
      count++;
      assert(
        bytes <= PUBLISHED_LIMITS.totalAssetBytes &&
          count <= BUNDLED_LIMITS.assets,
        "Bundled aggregate byte/entry limit exceeded",
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
// PNG codecs may recover corrupt streams. Verify the exact filtered pixel stream first.
export async function validatePNGPixelStream(
  bytes,
  signal,
  deadline = performance.now() + TRANSFER_LIMITS.decodeMs,
) {
  deadline = Math.min(deadline, performance.now() + TRANSFER_LIMITS.decodeMs);
  assert(Number.isFinite(deadline), "Invalid PNG validation deadline");
  const info = imageInfo(bytes);
  assert(info.mime === "image/png", "PNG pixel validation requires PNG bytes");
  const check = () => {
    assert(!signal?.aborted, "Bundled decode cancelled");
    assert(performance.now() <= deadline, "Bundled image decode timed out");
  };
  check();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[bytes[25]],
    bits = channels * bytes[24];
  const passes = (
    bytes[28]
      ? [
          [0, 0, 8, 8],
          [4, 0, 8, 8],
          [0, 4, 4, 8],
          [2, 0, 4, 4],
          [0, 2, 2, 4],
          [1, 0, 2, 2],
          [0, 1, 1, 2],
        ]
      : [[0, 0, 1, 1]]
  )
    .map(([x, y, dx, dy]) => ({
      width: Math.max(0, Math.ceil((info.width - x) / dx)),
      rows: Math.max(0, Math.ceil((info.height - y) / dy)),
    }))
    .filter((pass) => pass.width && pass.rows)
    .map((pass) => ({
      rows: pass.rows,
      rowBytes: 1 + Math.ceil((pass.width * bits) / 8),
    }));
  const expected = passes.reduce(
    (sum, pass) => sum + pass.rows * pass.rowBytes,
    0,
  );
  assert(
    Number.isSafeInteger(expected) &&
      expected > 0 &&
      expected <= LIMITS.pixels * 8 + LIMITS.dimension * 8,
    "PNG inflated geometry limit exceeded",
  );
  const isIDAT = (offset) =>
    bytes[offset + 4] === 73 &&
    bytes[offset + 5] === 68 &&
    bytes[offset + 6] === 65 &&
    bytes[offset + 7] === 84;
  let compressedSize = 0;
  for (let offset = 8; offset + 12 <= bytes.length; ) {
    check();
    const length = view.getUint32(offset);
    let crc = 0xffffffff;
    for (let i = offset + 4; i < offset + 8 + length; i++) {
      if ((i & 16383) === 0) check();
      crc ^= bytes[i];
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    assert(
      (crc ^ 0xffffffff) >>> 0 === view.getUint32(offset + 8 + length),
      "PNG chunk CRC mismatch",
    );
    if (isIDAT(offset)) compressedSize += length;
    offset += length + 12;
  }
  assert(
    compressedSize > 0 && compressedSize <= LIMITS.assetBytes,
    "PNG compressed byte limit exceeded",
  );
  const compressed = new Uint8Array(compressedSize);
  let written = 0;
  for (let offset = 8; offset + 12 <= bytes.length; ) {
    const length = view.getUint32(offset);
    if (isIDAT(offset)) {
      compressed.set(bytes.subarray(offset + 8, offset + 8 + length), written);
      written += length;
    }
    offset += length + 12;
  }
  assert(
    typeof globalThis.DecompressionStream === "function",
    "Strict PNG validation requires browser DecompressionStream support; keep the readable reference fallback",
  );
  let inflater;
  try {
    inflater = new DecompressionStream("deflate");
  } catch {
    throw new Error(
      "Strict PNG validation requires browser zlib support; keep the readable reference fallback",
    );
  }
  // Backpressure plus 1KiB compressed pulls avoids queuing a whole-file expansion at once.
  let inputOffset = 0,
    reader,
    timer,
    abort,
    stopped = false;
  const source = new ReadableStream({
    pull(controller) {
      if (stopped || inputOffset === compressed.length) {
        controller.close();
        return;
      }
      const end = Math.min(inputOffset + 1024, compressed.length);
      controller.enqueue(compressed.subarray(inputOffset, end));
      inputOffset = end;
    },
  });
  const cancel = () => {
    stopped = true;
    void reader?.cancel().catch(() => {});
  };
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => {
        cancel();
        reject(new Error("Bundled image decode timed out"));
      },
      Math.max(1, deadline - performance.now()),
    );
    abort = () => {
      cancel();
      reject(new Error("Bundled decode cancelled"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
  try {
    await Promise.race([
      timeout,
      (async () => {
        reader = source.pipeThrough(inflater).getReader();
        let total = 0,
          passIndex = 0,
          row = 0,
          rowOffset = 0;
        while (true) {
          check();
          const { done, value } = await reader.read();
          check();
          assert(!stopped, "Bundled decode cancelled");
          if (done) break;
          assert(
            value instanceof Uint8Array && value.length > 0,
            "Invalid PNG inflated stream chunk",
          );
          assert(
            total + value.length <= expected,
            "PNG inflated pixel stream exceeds exact geometry",
          );
          let offset = 0;
          while (offset < value.length) {
            check();
            const pass = passes[passIndex];
            assert(pass, "PNG inflated pixel stream exceeds pass geometry");
            if (rowOffset === 0)
              assert(value[offset] <= 4, "Invalid PNG scanline filter");
            const take = Math.min(
              value.length - offset,
              pass.rowBytes - rowOffset,
            );
            offset += take;
            rowOffset += take;
            if (rowOffset === pass.rowBytes) {
              rowOffset = 0;
              row++;
              if (row === pass.rows) {
                passIndex++;
                row = 0;
              }
            }
          }
          total += value.length;
        }
        assert(
          total === expected && passIndex === passes.length && rowOffset === 0,
          "PNG inflated pixel stream is shorter than exact geometry",
        );
      })(),
    ]);
  } catch (error) {
    if (/cancelled|timed out|PNG/.test(error.message)) throw error;
    throw new Error("PNG zlib integrity validation failed: " + error.message);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    cancel();
  }
  return info;
}
export async function decodeBundledRaster(bytes, mime, signal, sharedDeadline) {
  const deadline = Math.min(
    sharedDeadline ?? Infinity,
    performance.now() + TRANSFER_LIMITS.decodeMs,
  );
  const info = imageInfo(bytes);
  assert(info.mime === mime, "Bundled raster MIME mismatch");
  assert(!signal?.aborted, "Bundled decode cancelled");
  assert(
    typeof globalThis.createImageBitmap === "function",
    "Browser raster decoder required",
  );
  if (mime === "image/png")
    await validatePNGPixelStream(bytes, signal, deadline);
  assert(!signal?.aborted, "Bundled decode cancelled");
  assert(performance.now() <= deadline, "Bundled image decode timed out");
  // Materialize decoded pixels, not just dimensions from a lazily decoded Image.
  const work = createImageBitmap(new Blob([bytes], { type: mime }));
  let timer, abort, bitmap;
  try {
    bitmap = await Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Bundled image decode timed out")),
          Math.max(1, deadline - performance.now()),
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
    Array.isArray(pack.assets) && pack.assets.length <= PUBLISHED_LIMITS.assets,
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
    decodeRaster: options.decodeRaster
      ? async (bytes, mime, signal) => {
          const deadline = performance.now() + TRANSFER_LIMITS.decodeMs;
          if (mime === "image/png")
            await validatePNGPixelStream(bytes, signal, deadline);
          assert(!signal?.aborted, "Bundled decode cancelled");
          assert(
            performance.now() <= deadline,
            "Bundled image decode timed out",
          );
          return options.decodeRaster(bytes, mime, signal, deadline);
        }
      : decodeBundledRaster,
    signal: options.signal,
  });
  return payloads;
}
