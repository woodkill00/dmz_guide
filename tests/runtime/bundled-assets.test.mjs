import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import {
  prepareBundledAssets,
  writeBundledAssets,
} from "../../scripts/bundled-assets.mjs";
import {
  bundledAssetURL,
  loadBundledManifest,
  loadBundledPayloads,
  validateBundledManifest,
  decodeBundledRaster,
  validatePNGPixelStream,
} from "../../src/content/bundled-assets.mjs";
import { hashBytes } from "../../src/content/portable.mjs";
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
const template = JSON.parse(
  await readFile(
    new URL("../../content/packs/demo-training.json", import.meta.url),
  ),
);
function crc(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let n = 0; n < 8; n++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const h = Buffer.alloc(4),
    t = Buffer.from(type),
    c = Buffer.alloc(4);
  h.writeUInt32BE(data.length);
  c.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([h, t, data, c]);
}
// Original programmatic pixels, not game artwork.
function png(width = 8, height = 6, animation = false) {
  const h = Buffer.alloc(13);
  h.writeUInt32BE(width);
  h.writeUInt32BE(height, 4);
  h[8] = 8;
  h[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", h),
    ...(animation ? [chunk("acTL", Buffer.alloc(8))] : []),
    chunk("IDAT", deflateSync(Buffer.alloc((width * 4 + 1) * height, 0))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
async function fixture(t, options = {}) {
  const root = await mkdtemp(join(tmpdir(), "dmz-bundled-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bytes = options.bytes || png();
  const pack = structuredClone(template);
  pack.assets = [
    {
      id: "demo:original",
      path: "assets/original.png",
      mime: "image/png",
      bytes: bytes.length,
      width: 8,
      height: 6,
      sha256: await hashBytes(bytes),
      rightsHolder: "Original fixture author",
      license: "CC0-1.0",
      sourceUrl: "https://example.invalid/original-fixture",
      attribution: "Original fictional fixture, not game artwork",
      redistributionAllowed: true,
    },
  ];
  pack.items[0].assetId = pack.assets[0].id;
  const dir = join(root, "content/assets/demo_training-pack/assets");
  await mkdir(dir, { recursive: true });
  const file = join(dir, "original.png");
  await writeFile(file, bytes);
  return { root, bytes, pack, file };
}
const decodeRaster = async () => ({ width: 8, height: 6 });
const response = (bytes, type = "image/png") =>
  new Response(bytes, { headers: { "Content-Type": type } });
test("build validates and copies only listed originals; browser bytes remain portable", async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.root, "private.txt"), "never publish");
  const prepared = await prepareBundledAssets({
    root: f.root,
    packs: [f.pack],
    schema,
  });
  const dist = join(f.root, "dist");
  await writeBundledAssets({ dist, ...prepared });
  const url = bundledAssetURL(f.pack, "demo:original", prepared.manifest);
  assert.match(
    url,
    /^\/assets\/bundled\/demo_training-pack\/[a-f0-9]{64}\.png$/,
  );
  assert.deepEqual(await readFile(join(dist, url)), f.bytes);
  await assert.rejects(() => readFile(join(dist, "private.txt")));
  const payloads = await loadBundledPayloads(f.pack, {
    manifest: prepared.manifest,
    baseURL: "https://local.test",
    fetchImpl: async (u) => {
      assert.equal(u, "https://local.test" + url);
      return response(f.bytes);
    },
    decodeRaster,
  });
  assert.equal(payloads[0].assetId, "demo:original");
  assert.deepEqual(Buffer.from(payloads[0].base64, "base64"), f.bytes);
});
test("build rejects absent file, symlink file and every symlink ancestor", async (t) => {
  const f = await fixture(t);
  await rm(f.file);
  await assert.rejects(
    () => prepareBundledAssets({ root: f.root, packs: [f.pack], schema }),
    /ENOENT|missing/i,
  );
  const outside = join(f.root, "outside.png");
  await writeFile(outside, f.bytes);
  await symlink(outside, f.file);
  await assert.rejects(
    () => prepareBundledAssets({ root: f.root, packs: [f.pack], schema }),
    /symlink/i,
  );
  await rm(f.file);
  await rm(join(f.root, "content/assets/demo_training-pack/assets"), {
    recursive: true,
  });
  await symlink(
    f.root,
    join(f.root, "content/assets/demo_training-pack/assets"),
  );
  await assert.rejects(
    () => prepareBundledAssets({ root: f.root, packs: [f.pack], schema }),
    /symlink/i,
  );
  const link = f.root + "-link";
  await symlink(f.root, link);
  t.after(() => rm(link, { force: true }));
  await assert.rejects(
    () => prepareBundledAssets({ root: link, packs: [f.pack], schema }),
    /symlink/i,
  );
});
test("build rejects rights, traversal, wrong MIME/extension/hash/bytes/dimensions and animation", async (t) => {
  const f = await fixture(t);
  for (const change of [
    { redistributionAllowed: false },
    { path: "assets/../original.png" },
    { mime: "image/jpeg" },
    { path: "assets/original.jpg" },
    { sha256: "0".repeat(64) },
    { bytes: f.bytes.length + 1 },
    { width: 7 },
  ]) {
    const pack = structuredClone(f.pack);
    Object.assign(pack.assets[0], change);
    await assert.rejects(() =>
      prepareBundledAssets({ root: f.root, packs: [pack], schema }),
    );
  }
  await writeFile(f.file, png(8, 6, true));
  f.pack.assets[0].bytes = (await readFile(f.file)).length;
  f.pack.assets[0].sha256 = await hashBytes(await readFile(f.file));
  await assert.rejects(
    () => prepareBundledAssets({ root: f.root, packs: [f.pack], schema }),
    /animation/,
  );
});
test("cross-pack same paths are isolated; case collisions and global limits fail", async (t) => {
  const f = await fixture(t);
  const p = structuredClone(f.pack);
  p.id = "demo-training:pack";
  await mkdir(join(f.root, "content/assets/demo-training_pack/assets"), {
    recursive: true,
  });
  await writeFile(
    join(f.root, "content/assets/demo-training_pack/assets/original.png"),
    f.bytes,
  );
  const prepared = await prepareBundledAssets({
    root: f.root,
    packs: [f.pack, p],
    schema,
  });
  assert.notEqual(
    bundledAssetURL(f.pack, "demo:original", prepared.manifest),
    bundledAssetURL(p, "demo:original", prepared.manifest),
  );
  const duplicate = structuredClone(f.pack);
  duplicate.assets.push({
    ...duplicate.assets[0],
    id: "demo:other",
    path: "assets/ORIGINAL.png",
  });
  await assert.rejects(
    () => prepareBundledAssets({ root: f.root, packs: [duplicate], schema }),
    /collid|duplicate/i,
  );
  const m = structuredClone(prepared.manifest);
  m.packs[0].assets[0].bytes = 2097152;
  m.packs[0].assets[0].width = 2048;
  m.packs[0].assets[0].height = 2048;
  for (let n = 1; n < 5; n++)
    m.packs[0].assets.push({
      ...m.packs[0].assets[0],
      assetId: `demo:pixel${n}`,
      path: `assets/pixel${n}.png`,
    });
  assert.throws(() => validateBundledManifest(m), /total|aggregate/i);
});
test("manifest rejects unknown keys, duplicates, bad version, external URL and stale pack", async (t) => {
  const f = await fixture(t);
  const { manifest } = await prepareBundledAssets({
    root: f.root,
    packs: [f.pack],
    schema,
  });
  for (const edit of [
    (m) => (m.version = 2),
    (m) => (m.secret = "x"),
    (m) => m.packs.push(m.packs[0]),
    (m) => (m.packs[0].assets[0].url = "https://attacker.invalid/a.png"),
  ]) {
    const m = structuredClone(manifest);
    edit(m);
    assert.throws(() => validateBundledManifest(m));
  }
  const changed = structuredClone(f.pack);
  changed.contentVersion = "2.0.0";
  assert.throws(
    () => bundledAssetURL(changed, "demo:original", manifest),
    /version/i,
  );
  changed.contentVersion = f.pack.contentVersion;
  changed.assets[0].sha256 = "0".repeat(64);
  assert.throws(
    () => bundledAssetURL(changed, "demo:original", manifest),
    /metadata/i,
  );
  await assert.rejects(
    () =>
      loadBundledManifest({
        baseURL: "https://local.test",
        fetchImpl: async () =>
          response('{"version":1,"version":1}', "application/json"),
      }),
    /Duplicate/i,
  );
});
test("fetch fails closed on redirects, MIME mismatch, overflow, hash mismatch, missing decode", async (t) => {
  const f = await fixture(t);
  const { manifest } = await prepareBundledAssets({
    root: f.root,
    packs: [f.pack],
    schema,
  });
  for (const fetchImpl of [
    async () => response(f.bytes, "image/jpeg"),
    async () => response(Buffer.concat([f.bytes, Buffer.from([0])])),
    async () => response(Buffer.alloc(f.bytes.length)),
    async () => {
      const r = response(f.bytes);
      Object.defineProperty(r, "redirected", { value: true });
      return r;
    },
  ])
    await assert.rejects(() =>
      loadBundledPayloads(f.pack, {
        manifest,
        fetchImpl,
        baseURL: "https://local.test",
        decodeRaster,
      }),
    );
  await assert.rejects(
    () =>
      loadBundledPayloads(f.pack, {
        manifest,
        baseURL: "https://local.test",
        fetchImpl: async () => response(f.bytes),
        decodeRaster: async () => ({ width: 1, height: 1 }),
      }),
    /decoded dimensions/,
  );
});
test("stream deadline, cancellation and declared-length limit stop unbounded response", async (t) => {
  const f = await fixture(t);
  const { manifest } = await prepareBundledAssets({
    root: f.root,
    packs: [f.pack],
    schema,
  });
  const options = {
    manifest,
    baseURL: "https://local.test",
    decodeRaster,
    timeoutMs: 20,
  };
  await assert.rejects(
    () =>
      loadBundledPayloads(f.pack, {
        ...options,
        fetchImpl: async () =>
          new Response(new ReadableStream({ start() {} }), {
            headers: { "Content-Type": "image/png" },
          }),
      }),
    /timed out/i,
  );
  const controller = new AbortController();
  controller.abort();
  let fetched = false;
  await assert.rejects(
    () =>
      loadBundledPayloads(f.pack, {
        ...options,
        signal: controller.signal,
        fetchImpl: async () => {
          fetched = true;
          return response(f.bytes);
        },
      }),
    /cancel/i,
  );
  assert.equal(fetched, false);
  await assert.rejects(
    () =>
      loadBundledPayloads(f.pack, {
        ...options,
        fetchImpl: async () =>
          new Response(f.bytes, {
            headers: {
              "Content-Type": "image/png",
              "Content-Length": "99999999",
            },
          }),
      }),
    /byte limit/i,
  );
});
test("prepared-byte mutation and output symlinks cannot publish arbitrary files", async (t) => {
  const f = await fixture(t),
    prepared = await prepareBundledAssets({
      root: f.root,
      packs: [f.pack],
      schema,
    });
  prepared.files[0].bytes[0] = 0;
  await assert.rejects(
    () => writeBundledAssets({ dist: join(f.root, "dist"), ...prepared }),
    /signature|changed|Unsupported/,
  );
  const valid = await prepareBundledAssets({
      root: f.root,
      packs: [f.pack],
      schema,
    }),
    dist = join(f.root, "output"),
    outside = join(f.root, "unrelated");
  await mkdir(dist);
  await mkdir(outside);
  await symlink(outside, join(dist, "assets"));
  await assert.rejects(() => writeBundledAssets({ dist, ...valid }), /symlink/);
  await assert.rejects(() =>
    readFile(
      join(
        outside,
        "bundled/demo_training-pack",
        f.pack.assets[0].sha256 + ".png",
      ),
    ),
  );
});
test("manifest and streamed JSON bounds reject before asset fetch", async (t) => {
  const f = await fixture(t),
    { manifest } = await prepareBundledAssets({
      root: f.root,
      packs: [f.pack],
      schema,
    });
  const tooMany = structuredClone(manifest);
  tooMany.packs = Array.from({ length: 33 }, (_, i) => ({
    ...tooMany.packs[0],
    packId: `demo:pack${i}`,
  }));
  assert.throws(() => validateBundledManifest(tooMany), /pack count/);
  const huge = JSON.stringify({ ...manifest, untrusted: "x".repeat(1048577) });
  await assert.rejects(
    () =>
      loadBundledManifest({
        baseURL: "https://local.test",
        fetchImpl: async () => response(huge, "application/json"),
      }),
    /byte limit/,
  );
  const p = structuredClone(f.pack);
  p.contentVersion = "private-change";
  let requests = 0;
  await assert.rejects(
    () =>
      loadBundledPayloads(p, {
        manifest,
        baseURL: "https://local.test",
        fetchImpl: async () => {
          requests++;
          return response(f.bytes);
        },
        decodeRaster,
      }),
    /version/,
  );
  assert.equal(requests, 0);
});
test("many tiny stream chunks use bounded storage; empty chunks reject", async (t) => {
  const f = await fixture(t),
    { manifest } = await prepareBundledAssets({
      root: f.root,
      packs: [f.pack],
      schema,
    });
  const bytes = new TextEncoder().encode(
    " ".repeat(10000) + JSON.stringify(manifest),
  );
  let offset = 0;
  const streamed = await loadBundledManifest({
    baseURL: "https://local.test",
    fetchImpl: async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            if (offset === bytes.length) return controller.close();
            controller.enqueue(bytes.slice(offset, ++offset));
          },
        }),
        { headers: { "content-type": "application/json" } },
      ),
  });
  assert.deepEqual(streamed, manifest);
  await assert.rejects(
    () =>
      loadBundledManifest({
        baseURL: "https://local.test",
        fetchImpl: async () =>
          new Response(
            new ReadableStream({
              pull(controller) {
                controller.enqueue(new Uint8Array());
              },
            }),
            { headers: { "content-type": "application/json" } },
          ),
      }),
    /empty/,
  );
});

test("public spoiler picture alt stays generic before explicit disclosure", async () => {
  const { allRecords, renderDetail, setBundledAssets } = await import(
    "../../src/ui/render.mjs"
  );
  const pack = JSON.parse(
    await readFile("content/packs/bundled-pictures.json", "utf8"),
  );
  pack.maps[0].spoiler = true;
  const { manifest } = await prepareBundledAssets({
    root: process.cwd(),
    packs: [pack],
    schema,
  });
  setBundledAssets(manifest);
  try {
    const record = allRecords([pack]).find((r) => r.recordType === "map");
    const html = renderDetail(record, [pack]);
    const alt = html.match(/data-public-image[^>]*alt="([^"]*)"/)[1];
    assert(!alt.includes(record.name));
    assert.match(alt, /Spoiler-protected/);
    assert(html.includes('<details class="spoiler-content">'));
    assert(
      html.includes(record.name),
      "The explicitly revealable heading remains useful",
    );
  } finally {
    setBundledAssets(null);
  }
});

function mockBitmapDecoder(t, implementation) {
  const previous = Object.getOwnPropertyDescriptor(
    globalThis,
    "createImageBitmap",
  );
  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    writable: true,
    value: implementation,
  });
  t.after(() => {
    if (previous)
      Object.defineProperty(globalThis, "createImageBitmap", previous);
    else delete globalThis.createImageBitmap;
  });
}
test("bundled bitmap decoder returns actual pixel dimensions and closes successful bitmap", async (t) => {
  const bytes = png();
  let calls = 0,
    closed = 0;
  mockBitmapDecoder(t, async (blob) => {
    calls++;
    assert(blob instanceof Blob);
    assert.equal(blob.type, "image/png");
    assert.equal(blob.size, bytes.length);
    return {
      width: 8,
      height: 6,
      close() {
        closed++;
      },
    };
  });
  assert.deepEqual(await decodeBundledRaster(bytes, "image/png"), {
    width: 8,
    height: 6,
  });
  assert.equal(calls, 1);
  assert.equal(closed, 1);
});
test("bundled bitmap decoder aborts and closes a bitmap that resolves late", async (t) => {
  let finish,
    closed = 0;
  mockBitmapDecoder(
    t,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new AbortController();
  const pending = decodeBundledRaster(
    Uint8Array.from([
      255, 216, 255, 192, 0, 11, 8, 0, 6, 0, 8, 1, 1, 17, 0, 255, 217,
    ]),
    "image/jpeg",
    controller.signal,
  );
  const rejected = assert.rejects(pending, /cancelled/);
  controller.abort();
  await rejected;
  assert.equal(closed, 0);
  finish({
    width: 8,
    height: 6,
    close() {
      closed++;
    },
  });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(closed, 1);
});
test("bundled bitmap decoder enforces five-second timeout and closes late success", async (t) => {
  let finish,
    fire,
    milliseconds,
    closed = 0;
  mockBitmapDecoder(
    t,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  t.mock.method(globalThis, "setTimeout", (callback, duration) => {
    fire = callback;
    milliseconds = duration;
    return 1;
  });
  t.mock.method(globalThis, "clearTimeout", () => {});
  const pending = decodeBundledRaster(
    Uint8Array.from([
      255, 216, 255, 192, 0, 11, 8, 0, 6, 0, 8, 1, 1, 17, 0, 255, 217,
    ]),
    "image/jpeg",
  );
  const rejected = assert.rejects(pending, /timed out/);
  assert(milliseconds > 4900 && milliseconds <= 5000);
  fire();
  await rejected;
  assert.equal(closed, 0);
  finish({
    width: 8,
    height: 6,
    close() {
      closed++;
    },
  });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(closed, 1);
});
test("bundled bitmap decoder rejects pre-aborted work without starting codec", async (t) => {
  let calls = 0;
  mockBitmapDecoder(t, async () => {
    calls++;
    throw new Error("Codec must not start");
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => decodeBundledRaster(png(), "image/png", controller.signal),
    /cancelled/,
  );
  assert.equal(calls, 0);
});

function pixelPNG({
  width = 8,
  height = 6,
  depth = 8,
  color = 6,
  interlace = 0,
  raw,
  compressed,
} = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = depth;
  header[9] = color;
  header[12] = interlace;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
  const passes = interlace
    ? [
        [0, 0, 8, 8],
        [4, 0, 8, 8],
        [0, 4, 4, 8],
        [2, 0, 4, 4],
        [0, 2, 2, 4],
        [1, 0, 2, 2],
        [0, 1, 1, 2],
      ]
    : [[0, 0, 1, 1]];
  const rows = [];
  for (const [x, y, dx, dy] of passes) {
    const w = Math.max(0, Math.ceil((width - x) / dx)),
      h = Math.max(0, Math.ceil((height - y) / dy));
    if (!w || !h) continue;
    for (let row = 0; row < h; row++) {
      const bytes = Buffer.alloc(1 + Math.ceil((w * channels * depth) / 8));
      bytes[0] = row % 5;
      rows.push(bytes);
    }
  }
  const scanlines = raw ?? Buffer.concat(rows);
  const bytes = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    ...(color === 3
      ? [chunk("PLTE", Buffer.from([0, 0, 0, 255, 255, 255]))]
      : []),
    chunk("IDAT", compressed ?? deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return { bytes, raw: scanlines };
}
test("strict PNG supports every legal bit-depth/color combination and Adam7 geometry", async () => {
  for (const [color, depths] of [
    [0, [1, 2, 4, 8, 16]],
    [2, [8, 16]],
    [3, [1, 2, 4, 8]],
    [4, [8, 16]],
    [6, [8, 16]],
  ])
    for (const depth of depths)
      for (const interlace of [0, 1]) {
        const { bytes } = pixelPNG({
          width: 9,
          height: 7,
          color,
          depth,
          interlace,
        });
        assert.deepEqual(await validatePNGPixelStream(bytes), {
          mime: "image/png",
          width: 9,
          height: 7,
        });
      }
  const adam = pixelPNG({ interlace: 1 });
  assert.equal(adam.raw.length, 204);
  await validatePNGPixelStream(adam.bytes);
  const small = pixelPNG({ width: 1, height: 1, interlace: 1 });
  assert.equal(small.raw.length, 5);
  await validatePNGPixelStream(small.bytes);
});
test("strict PNG rejects CRC, invalid zlib/checksum, filters and exact-size under/overrun", async () => {
  const { bytes, raw } = pixelPNG();
  const crcBad = Buffer.from(bytes);
  crcBad[29] ^= 1;
  await assert.rejects(() => validatePNGPixelStream(crcBad), /CRC/);
  const invalidZlib = pixelPNG({
    compressed: Buffer.alloc(deflateSync(raw).length),
  }).bytes;
  await assert.rejects(() => validatePNGPixelStream(invalidZlib), /zlib/);
  const wrongAdler = Buffer.from(deflateSync(raw));
  wrongAdler[wrongAdler.length - 1] ^= 1;
  await assert.rejects(
    () => validatePNGPixelStream(pixelPNG({ compressed: wrongAdler }).bytes),
    /zlib/,
  );
  const invalidFilter = Buffer.from(raw);
  invalidFilter[0] = 5;
  await assert.rejects(
    () => validatePNGPixelStream(pixelPNG({ raw: invalidFilter }).bytes),
    /filter/,
  );
  await assert.rejects(
    () => validatePNGPixelStream(pixelPNG({ raw: raw.subarray(0, -1) }).bytes),
    /shorter/,
  );
  await assert.rejects(
    () =>
      validatePNGPixelStream(
        pixelPNG({ raw: Buffer.concat([raw, Buffer.from([0])]) }).bytes,
      ),
    /exceeds/,
  );
  await assert.rejects(
    () => validatePNGPixelStream(pixelPNG({ interlace: 1, raw }).bytes),
    /shorter|filter/,
  );
  const trailing = Buffer.concat([deflateSync(raw), Buffer.from([1, 2, 3])]);
  await assert.rejects(
    () => validatePNGPixelStream(pixelPNG({ compressed: trailing }).bytes),
    /zlib/,
  );
});
test("strict PNG rejects a compressed expansion bomb without retaining raw output", async () => {
  const compressed = deflateSync(Buffer.alloc(4 * 1024 * 1024));
  assert(compressed.length < 8192);
  await assert.rejects(
    () =>
      validatePNGPixelStream(
        pixelPNG({ width: 1, height: 1, compressed }).bytes,
      ),
    /exceeds/,
  );
});
test("strict PNG rejects missing native capability and cancelled work clearly", async (t) => {
  const original = globalThis.DecompressionStream;
  t.after(() => {
    globalThis.DecompressionStream = original;
  });
  globalThis.DecompressionStream = undefined;
  await assert.rejects(
    () => validatePNGPixelStream(pixelPNG().bytes),
    /requires browser DecompressionStream/,
  );
  globalThis.DecompressionStream = original;
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => validatePNGPixelStream(pixelPNG().bytes, controller.signal),
    /cancelled/,
  );
});
test("strict PNG bounds stalled inflater by timeout and cancels its reader", async (t) => {
  const original = globalThis.DecompressionStream;
  let cancelled = 0,
    fire;
  globalThis.DecompressionStream = class {
    constructor() {
      return {
        readable: new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
        writable: new WritableStream({ write() {} }),
      };
    }
  };
  t.after(() => {
    globalThis.DecompressionStream = original;
  });
  t.mock.method(globalThis, "setTimeout", (callback) => {
    fire = callback;
    return 1;
  });
  t.mock.method(globalThis, "clearTimeout", () => {});
  const pending = validatePNGPixelStream(pixelPNG().bytes);
  const rejected = assert.rejects(pending, /timed out/);
  fire();
  await rejected;
  await Promise.resolve();
  assert.equal(cancelled, 1);
});
test("strict PNG preflight cannot be bypassed with a supplied bundled decoder", async (t) => {
  const f = await fixture(t);
  const { manifest } = await prepareBundledAssets({
    root: f.root,
    packs: [f.pack],
    schema,
  });
  const bytes = pixelPNG({ compressed: Buffer.alloc(10) }).bytes;
  f.pack.assets[0].bytes = bytes.length;
  f.pack.assets[0].sha256 = await hashBytes(bytes);
  const entry = manifest.packs[0].assets[0];
  entry.bytes = bytes.length;
  entry.sha256 = f.pack.assets[0].sha256;
  entry.url = entry.url.replace(/[a-f0-9]{64}/, entry.sha256);
  let calls = 0;
  await assert.rejects(
    () =>
      loadBundledPayloads(f.pack, {
        manifest,
        baseURL: "https://local.test",
        fetchImpl: async () => response(bytes),
        decodeRaster: async () => {
          calls++;
          return { width: 8, height: 6 };
        },
      }),
    /zlib/,
  );
  assert.equal(calls, 0);
  await writeFile(f.file, bytes);
  await assert.rejects(
    () => prepareBundledAssets({ root: f.root, packs: [f.pack], schema }),
    /zlib/,
  );
});
test("strict PNG preserves valid split and empty contiguous IDAT chunks", async () => {
  const { bytes, raw } = pixelPNG();
  const compressed = deflateSync(raw);
  const split = Buffer.concat([
    bytes.subarray(0, 8),
    chunk("IHDR", bytes.subarray(16, 29)),
    chunk("IDAT", Buffer.alloc(0)),
    ...Array.from(compressed, (byte) => chunk("IDAT", Buffer.from([byte]))),
    chunk("IDAT", Buffer.alloc(0)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  assert.deepEqual(await validatePNGPixelStream(split), {
    mime: "image/png",
    width: 8,
    height: 6,
  });
});
test("strict PNG cancellation stops an in-progress stalled inflater", async (t) => {
  const original = globalThis.DecompressionStream;
  let cancelled = 0;
  globalThis.DecompressionStream = class {
    constructor() {
      return {
        readable: new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
        writable: new WritableStream({ write() {} }),
      };
    }
  };
  t.after(() => {
    globalThis.DecompressionStream = original;
  });
  const controller = new AbortController();
  const pending = validatePNGPixelStream(pixelPNG().bytes, controller.signal);
  const rejected = assert.rejects(pending, /cancelled/);
  controller.abort();
  await rejected;
  await Promise.resolve();
  assert.equal(cancelled, 1);
});
