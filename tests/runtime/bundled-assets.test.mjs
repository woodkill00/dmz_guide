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
