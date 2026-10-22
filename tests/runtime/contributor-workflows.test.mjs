import { deflateSync } from "node:zlib";
import { hashBytes, base64FromBytes } from "../../src/content/portable.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { renderStudioPage } from "../../src/ui/studio-page.mjs";
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
const envelope = () => ({
  format: "dmz-repository-draft-recovery",
  version: 1,
  warning: "Unvalidated draft",
  packKey: "demo-training",
  expectedRevision: "a".repeat(64),
  pack: loadFixturePack("demo-training"),
  uploads: [],
});
const options = (data) => ({
  destination: "existing",
  key: data.packKey,
  currentPack: data.pack,
  assetSources: {},
  entries: [{ key: data.packKey, pack: data.pack }],
});
const parser = async () =>
  (await import("../../src/content/studio-recovery.mjs")).parseRecoveryDraft;
test("recovery preview preserves input and validates existing identity", async () => {
  const parse = await parser(),
    data = envelope(),
    text = JSON.stringify(data);
  const result = await parse(text, schema, options(data));
  assert.deepEqual(result.pack, data.pack);
  assert.equal(JSON.stringify(data), text);
  assert.equal(result.historicalRevision, data.expectedRevision);
  for (const patch of [
    { format: "loose" },
    { version: 2 },
    { packKey: "../escape" },
    { expectedRevision: "invalid" },
    { unexpected: true },
  ])
    await assert.rejects(() =>
      parse(JSON.stringify({ ...data, ...patch }), schema, options(data)),
    );
  await assert.rejects(() =>
    parse(JSON.stringify(data.pack), schema, options(data)),
  );
  await assert.rejects(() =>
    parse(text, schema, { ...options(data), key: "other" }),
  );
  await assert.rejects(() =>
    parse(text, schema, { ...options(data), destination: "new" }),
  );
  await assert.rejects(() =>
    parse(text, schema, {
      ...options(data),
      currentPack: { ...data.pack, id: "other:pack" },
    }),
  );
});
test("recovery rejects hostile shape, duplicate keys, bounds and abort", async () => {
  const parse = await parser(),
    data = envelope(),
    opts = options(data);
  for (const text of [
    '{"__proto__":{}}',
    '{"version":1,"version":1}',
    " ".repeat(20 * 1024 * 1024 + 1),
    JSON.stringify({ ...data, uploads: Array(33).fill({}) }),
    JSON.stringify({ ...data, pack: { ...data.pack, profile: {} } }),
  ])
    await assert.rejects(() => parse(text, schema, opts));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() =>
    parse(JSON.stringify(data), schema, { ...opts, signal: controller.signal }),
  );
});
test("Studio exposes stable navigation, explicit review version and distinct recovery input", () => {
  const html = renderStudioPage();
  for (const id of [
    "studio-nav",
    "workflow-summary",
    "review-version",
    "apply-review-version",
    "import-recovery",
    "studio-authoring",
    "studio-review",
    "studio-pictures",
    "studio-recovery",
  ])
    assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /Private editor/);
  assert.match(html, /not published/i);
});
test("role diagnostics exist independently of optional developer tooling", async () => {
  const { diagnose } = await import("../../scripts/diagnose.mjs");
  const reader = await diagnose({
    role: "reader",
    root: "/nonexistent-fixture",
    host: "0.0.0.0",
  });
  assert(reader.some((x) => x.level === "BLOCKER" && /build/i.test(x.message)));
  assert(reader.some((x) => x.level === "WARN" && /loopback/i.test(x.message)));
  await assert.rejects(() => diagnose({ role: "unknown" }));
});

// Original 1x1 RGBA raster generated from first principles, not game artwork.
function crc(b) {
  let c = 0xffffffff;
  for (const n of b) {
    c ^= n;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, sum]);
}
function png(width = 1, height = 1) {
  const h = Buffer.alloc(13);
  h.writeUInt32BE(width, 0);
  h.writeUInt32BE(height, 4);
  h[8] = 8;
  h[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", h),
    chunk(
      "IDAT",
      deflateSync(
        width === 1 && height === 1
          ? Buffer.from([0, 18, 52, 86, 255])
          : Buffer.alloc((width * 4 + 1) * height),
      ),
    ),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
async function fixture() {
  const bytes = png(),
    p = loadFixturePack("demo-training");
  p.assets = [
    {
      id: "demo:original",
      path: "assets/original.png",
      mime: "image/png",
      sha256: await hashBytes(bytes),
      bytes: bytes.length,
      width: 1,
      height: 1,
      rightsHolder: "Test author",
      license: "CC0-1.0",
      sourceUrl: "https://example.invalid/original-fixture",
      attribution: "Original test pixel",
      redistributionAllowed: true,
    },
  ];
  p.items[0].assetId = p.assets[0].id;
  return {
    p,
    payloads: [{ assetId: p.assets[0].id, base64: base64FromBytes(bytes) }],
  };
}
const decoder = async (_bytes, mime) => ({ width: 1, height: 1, mime });

test("recovery validates actual uploaded bytes and rejects missing/changed source or rights", async () => {
  const parse = await parser(),
    { p, payloads } = await fixture(),
    data = {
      ...envelope(),
      pack: p,
      uploads: payloads.map((x) => ({ ...x, category: "other" })),
    },
    opts = { ...options(data), decodeRaster: decoder };
  await parse(JSON.stringify(data), schema, opts);
  for (const mutate of [
    (d) => d.uploads.push(d.uploads[0]),
    (d) => (d.uploads[0].base64 = "AAAA"),
    (d) => (d.pack.assets[0].sha256 = "0".repeat(64)),
    (d) => d.pack.assets[0].bytes++,
    (d) => d.pack.assets[0].width++,
    (d) => (d.pack.assets[0].redistributionAllowed = false),
    (d) => (d.uploads[0].category = "../escape"),
  ]) {
    const changed = structuredClone(data);
    mutate(changed);
    await assert.rejects(() => parse(JSON.stringify(changed), schema, opts));
  }
  const referenced = { ...data, uploads: [] };
  await assert.rejects(() => parse(JSON.stringify(referenced), schema, opts));
  const sourceOpts = {
    ...opts,
    assetSources: { [p.assets[0].id]: { path: "trusted-local-path" } },
  };
  await parse(JSON.stringify(referenced), schema, sourceOpts);
  const changed = structuredClone(referenced);
  changed.pack.assets[0].sha256 = "0".repeat(64);
  await assert.rejects(() =>
    parse(JSON.stringify(changed), schema, sourceOpts),
  );
  const rightsDrift = structuredClone(referenced);
  rightsDrift.pack.assets[0].rightsHolder = "Different claimed owner";
  await assert.rejects(() =>
    parse(JSON.stringify(rightsDrift), schema, sourceOpts),
  );
  const controller = new AbortController();
  await assert.rejects(() =>
    parse(JSON.stringify(data), schema, {
      ...opts,
      signal: controller.signal,
      decodeRaster: async () => {
        controller.abort();
        return { width: 1, height: 1 };
      },
    }),
  );
});

test("reader startup gives bounded missing-build and occupied-port errors without moving origin", async (t) => {
  const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises"),
    { tmpdir } = await import("node:os"),
    { join } = await import("node:path"),
    { spawn } = await import("node:child_process"),
    { createServer } = await import("node:net");
  const root = await mkdtemp(join(tmpdir(), "dmz-startup-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "scripts"));
  await writeFile(
    join(root, "scripts/serve.mjs"),
    await readFile(new URL("../../scripts/serve.mjs", import.meta.url)),
  );
  async function run(port) {
    return new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [join(root, "scripts/serve.mjs"), "--port", String(port)],
        { env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" } },
      );
      let output = "";
      child.stdout.on("data", (b) => (output += b));
      child.stderr.on("data", (b) => (output += b));
      const timer = setTimeout(() => {
        child.kill();
        reject(Error("Startup did not terminate"));
      }, 3000);
      child.on("error", reject);
      child.on("exit", (code) => {
        clearTimeout(timer);
        resolve({ code, output });
      });
    });
  }
  const missing = await run(4173);
  assert.equal(missing.code, 1);
  assert.match(missing.output, /Reader build is missing/);
  await mkdir(join(root, "dist"));
  await writeFile(join(root, "dist/index.html"), "Synthetic reader fixture");
  const occupied = createServer();
  await new Promise((resolve, reject) => {
    occupied.once("error", reject);
    occupied.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve) => occupied.close(resolve)));
  const conflict = await run(occupied.address().port);
  assert.equal(conflict.code, 1);
  assert.match(conflict.output, /already in use/);
  assert.match(conflict.output, /No port was changed/);
  assert.doesNotMatch(conflict.output, /DMZ Guide: http/);
});
