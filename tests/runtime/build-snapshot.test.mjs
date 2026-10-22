import test from "node:test";
import assert from "node:assert/strict";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, relative, basename, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import * as author from "../../scripts/author-store.mjs";
import {
  readCatalog,
  serializeCatalog,
  bundledSources,
  catalogAssetPath,
} from "../../scripts/catalog.mjs";
import { prepareBundledAssets } from "../../scripts/bundled-assets.mjs";

const source = fileURLToPath(new URL("../..", import.meta.url));
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
const key = "a4-synthetic";
const lockPath = ".author-state/current.lock";
const headerPath = `content/catalog/${key}/pack.json`;
const paths = {
  manifest: "content/catalog/manifest.json",
  alpha: `content/catalog/${key}/items/a4_alpha.json`,
  beta: `content/catalog/${key}/items/a4_beta.json`,
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function chunk(type, data) {
  const typed = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const value of typed) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const size = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, typed, checksum]);
}
// Original one-pixel software fixtures, not game artwork.
function png(version) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from([0, Number(version), 0, 0, 255]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
function pack(version = "0", mediaVersion = version) {
  const bytes = png(mediaVersion);
  return {
    schemaVersion: 1,
    id: "a4:synthetic",
    contentVersion: version,
    game: { id: "fictional-training", mode: "test", build: "synthetic-only" },
    title: "SYNTHETIC A4 CONSISTENCY FIXTURE",
    description: "Original software fixture, not game facts.",
    coverage: { expectedTotal: null, note: "Fictional" },
    sources: [],
    items: ["alpha", "beta"].map((name) => ({
      id: `a4:${name}`,
      name: `SYNTHETIC ${name} revision ${version}`,
      kind: "item",
      category: "material",
      description: "Original software fixture.",
      aliases: [],
      unit: "count",
      sourceIds: [],
      status: "fictional",
      stats: [],
      assetId: "a4:pixel",
    })),
    recipes: [],
    objectives: [],
    guides: [],
    maps: [],
    locations: [],
    claims: [],
    assets: [
      {
        id: "a4:pixel",
        path: "assets/pixel.png",
        mime: "image/png",
        bytes: bytes.length,
        width: 1,
        height: 1,
        sha256: hash(bytes),
        rightsHolder: "Original fixture author",
        license: "CC0-1.0",
        sourceUrl: "https://example.invalid/original-fixture",
        attribution: "Original fictional fixture, not game artwork",
        redistributionAllowed: true,
      },
    ],
  };
}
const mediaPath = catalogAssetPath(key, "items", "a4:pixel", "image/png");
function revision(version) {
  const files = serializeCatalog({
    entries: [
      {
        key,
        pack: pack(version),
        assetSources: {
          "a4:pixel": { category: "items", sourcePath: mediaPath },
        },
      },
    ],
    schema,
  });
  files.set(mediaPath, png(version));
  return files;
}
async function put(root, path, bytes) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), bytes);
}
async function fixture(t, { build = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), "dmz-build-snapshot-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  if (build) {
    for (const part of ["scripts", "src", "schemas"])
      await cp(join(source, part), join(root, part), { recursive: true });
    await put(
      root,
      "content/site.json",
      await readFile(join(source, "content/site.json")),
    );
  }
  await put(root, "schemas/pack.schema.json", JSON.stringify(schema));
  for (const [path, bytes] of revision("0")) await put(root, path, bytes);
  await put(root, "dist/last-good.txt", "SYNTHETIC OLD reader\n");
  return root;
}
async function noLock(root) {
  await assert.rejects(readFile(join(root, lockPath)), { code: "ENOENT" });
}
async function tree(root, folder = ".author-state") {
  const files = new Map();
  for (const entry of await readdir(join(root, folder), {
    withFileTypes: true,
  })) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) {
      for (const [name, bytes] of await tree(root, path))
        files.set(name, bytes);
    } else files.set(path, await readFile(join(root, path)));
  }
  return files;
}
async function capture(root) {
  return author.withRepositorySnapshot({ root }, async () => {
    const catalog = await readCatalog({ root, schema });
    const bundled = await prepareBundledAssets({
      root,
      packs: catalog.packs,
      schema,
      assetSources: bundledSources(catalog.entries),
      sourceFiles: catalog.files,
    });
    return { catalog, bundled };
  });
}
async function save(store, version, expectedRevision, mediaVersion = version) {
  return store.save({
    packKey: key,
    expectedRevision,
    pack: pack(version, mediaVersion),
    uploads: [
      {
        assetId: "a4:pixel",
        category: "items",
        base64: png(mediaVersion).toString("base64"),
      },
    ],
  });
}
const summary = (value) => ({
  version: value.contentVersion,
  alpha: value.items[0].name,
  beta: value.items[1].name,
});

test(
  "FR-009: snapshot normalizes root aliases into the existing serial queue",
  { timeout: 10000 },
  async (t) => {
    const root = await fixture(t);
    let entered, release;
    const started = new Promise((resolve) => (entered = resolve));
    const held = new Promise((resolve) => (release = resolve));
    const first = author.withRepositorySnapshot({ root }, async () => {
      entered();
      await held;
    });
    await started;
    const aliases = [
      relative(process.cwd(), root),
      `${root}${sep}..${sep}${basename(root)}${sep}.`,
    ];
    let calls = 0;
    const pending = aliases.map((alias) =>
      author.withRepositorySnapshot({ root: alias }, async () => {
        calls++;
        return JSON.parse(await readFile(join(root, lockPath))).pid;
      }),
    );
    const completed = Promise.all(pending);
    // Attach rejection handling before yielding, so a broken alias cannot create an unhandled rejection.
    completed.catch(() => {});
    try {
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(calls, 0);
    } finally {
      release();
    }
    await first;
    assert.deepEqual(await completed, [process.pid, process.pid]);
    await noLock(root);
  },
);

for (const throws of [false, true]) {
  test(`FR-009: snapshot releases its own token on ${throws ? "exception" : "success"}`, async (t) => {
    const root = await fixture(t),
      error = new Error("Synthetic snapshot failure");
    const operation = author.withRepositorySnapshot({ root }, async () => {
      const lock = JSON.parse(await readFile(join(root, lockPath)));
      assert.equal(lock.pid, process.pid);
      assert.match(lock.token, /^[a-f0-9]{48}$/);
      if (throws) throw error;
      return "captured";
    });
    if (throws) await assert.rejects(operation, (actual) => actual === error);
    else assert.equal(await operation, "captured");
    await noLock(root);
    assert.equal(
      await author.withRepositorySnapshot({ root }, () => "next"),
      "next",
    );
  });
  test(`FR-009: ${throws ? "throwing" : "successful"} callback never releases a replacement owner's token`, async (t) => {
    const root = await fixture(t),
      replacement = Buffer.from("SYNTHETIC other owner\n");
    const operation = author.withRepositorySnapshot({ root }, async () => {
      await writeFile(join(root, lockPath), replacement);
      if (throws) throw new Error("Synthetic failure after replacement");
    });
    if (throws) await assert.rejects(operation, /Synthetic failure/);
    else await operation;
    assert.deepEqual(await readFile(join(root, lockPath)), replacement);
  });
}

for (const state of ["live", "dead", "unverifiable"]) {
  test(
    `FR-009: existing ${state} lock is refused immediately and preserved`,
    { timeout: 10000 },
    async (t) => {
      const root = await fixture(t);
      if (state === "dead") {
        const module = new URL(
          "../../scripts/author-store.mjs",
          import.meta.url,
        ).href;
        const result = spawnSync(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            `import { withRepositorySnapshot } from ${JSON.stringify(module)}; await withRepositorySnapshot({ root: process.argv[1] }, () => process.exit(29));`,
            root,
          ],
          { encoding: "utf8", timeout: 5000 },
        );
        assert.equal(result.status, 29, result.stderr);
        assert.equal(
          (await author.inspectRecovery({ root })).lock.state,
          "dead",
        );
      } else {
        await put(
          root,
          lockPath,
          state === "live"
            ? JSON.stringify({
                version: 1,
                pid: process.pid,
                processStart: new Date().toISOString(),
                token: "a".repeat(48),
              })
            : "unverifiable lock\n",
        );
      }
      const before = await tree(root);
      let entered = false;
      await assert.rejects(
        author.withRepositorySnapshot({ root }, () => {
          entered = true;
        }),
        { code: "REPOSITORY_BUSY" },
      );
      assert.equal(entered, false);
      assert.deepEqual(await tree(root), before);
    },
  );
}

for (const phase of ["prepared", "applied", "committed"]) {
  test(`FR-009: pending ${phase} journal and all recovery bytes remain unchanged`, async (t) => {
    const root = await fixture(t);
    await assert.rejects(
      author.applyFilePlan({
        root,
        before: revision("0"),
        after: revision("1"),
        failpoint: (at) => {
          if (at === phase) throw new Error("Synthetic interruption");
        },
      }),
      { code: "RECOVERY_REQUIRED" },
    );
    const before = await tree(root);
    const managed = new Map(
      await Promise.all(
        [...revision("0").keys()].map(async (path) => [
          path,
          await readFile(join(root, path)),
        ]),
      ),
    );
    let entered = false;
    await assert.rejects(
      author.withRepositorySnapshot({ root }, () => {
        entered = true;
      }),
      { code: "RECOVERY_REQUIRED" },
    );
    assert.equal(entered, false);
    assert.deepEqual(await tree(root), before);
    for (const [path, bytes] of managed)
      assert.deepEqual(await readFile(join(root, path)), bytes);
    await noLock(root);
  });
}

test(
  "FR-009: separate-process author save and recovery cannot enter a held snapshot",
  { timeout: 10000 },
  async (t) => {
    const root = await fixture(t);
    const store = await author.createAuthorStore({ root, schema }),
      initial = await store.read();
    const module = new URL("../../scripts/author-store.mjs", import.meta.url)
      .href;
    await author.withRepositorySnapshot({ root }, async () => {
      const before = await readFile(join(root, lockPath));
      const code = `import { createAuthorStore, recoverRepository } from ${JSON.stringify(module)};
const root = process.argv[1], store = await createAuthorStore({ root });
for (const operation of [() => store.save(${JSON.stringify({ packKey: key, expectedRevision: initial.revision, pack: pack("1") })}), () => recoverRepository({ root, apply: true })]) {
 try { await operation(); process.exitCode = 1; }
 catch (error) { if (error.code !== 'REPOSITORY_BUSY') throw error; console.log(error.code); }
}`;
      const result = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", code, root],
        { encoding: "utf8", timeout: 5000 },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(result.stdout.trim().split(/\r?\n/), [
        "REPOSITORY_BUSY",
        "REPOSITORY_BUSY",
      ]);
      assert.deepEqual(await readFile(join(root, lockPath)), before);
      assert.deepEqual(
        summary((await readCatalog({ root, schema })).packs[0]),
        summary(pack("0")),
      );
    });
    await noLock(root);
    await save(store, "1", initial.revision);
  },
);

test(
  "FR-009: raw catalog and bundled media are captured without recursive store queues",
  { timeout: 10000 },
  async (t) => {
    const root = await fixture(t),
      snapshot = await capture(root);
    await noLock(root);
    const store = await author.createAuthorStore({ root, schema });
    await save(store, "1", snapshot.catalog.revision);
    assert.deepEqual(summary(snapshot.catalog.packs[0]), summary(pack("0")));
    assert.deepEqual(Buffer.from(snapshot.bundled.files[0].bytes), png("0"));
    assert.equal(
      snapshot.bundled.manifest.packs[0].assets[0].sha256,
      hash(png("0")),
    );
    assert.deepEqual(await readFile(join(root, mediaPath)), png("1"));
  },
);

// Test-only scheduling barriers wrap real I/O. They never return invented bytes.
const preload = `import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { relative } from 'node:path';
const gates = JSON.parse(process.env.SNAPSHOT_GATES || '[]'), counts = new Map();
async function barrier(event, path, count) {
 const gate = gates.find(g => !g.used && g.event === event && (g.path === path || (g.path === '@output' && path.endsWith('/index.html'))) && g.count === count);
 if (!gate) return;
 gate.used = true;
 await new Promise(resolve => {
  const listener = message => { if (message?.resume !== gate.id) return; process.off('message', listener); resolve(); };
  process.on('message', listener); process.send({ gate: gate.id });
 });
}
const open = fs.open, write = fs.writeFile;
fs.open = async function(path, ...args) {
 const rel = relative(process.cwd(), String(path)).replaceAll('\\\\', '/');
 const count = (counts.get(rel) || 0) + 1; counts.set(rel, count);
 await barrier('open', rel, count);
 const handle = await open.call(this, path, ...args), close = handle.close.bind(handle);
 handle.close = async () => { const result = await close(); await barrier('close', rel, count); return result; };
 return handle;
};
fs.writeFile = async function(path, ...args) {
 await barrier('write', String(path).replaceAll('\\\\', '/'), 1);
 return write.call(this, path, ...args);
};
syncBuiltinESMExports();`;
async function build(root, gates = [], onGate = async () => {}) {
  const script = join(root, "snapshot-preload.mjs");
  await writeFile(script, preload);
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", pathToFileURL(script).href, "scripts/build.mjs"],
      {
        cwd: root,
        env: { ...process.env, SNAPSHOT_GATES: JSON.stringify(gates) },
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      },
    );
    let stdout = "",
      stderr = "",
      failure;
    const seen = [],
      timer = setTimeout(() => {
        failure = new Error("Synthetic build barrier timed out");
        child.kill();
      }, 20000);
    child.stdout.on("data", (bytes) => {
      stdout = (stdout + bytes).slice(-65536);
    });
    child.stderr.on("data", (bytes) => {
      stderr = (stderr + bytes).slice(-65536);
    });
    child.on("error", (error) => {
      failure = error;
    });
    child.on("message", (message) => {
      if (!message?.gate) return;
      seen.push(message.gate);
      Promise.resolve()
        .then(() => onGate(message.gate, child))
        .then(() => {
          if (child.connected) child.send({ resume: message.gate }, () => {});
        })
        .catch((error) => {
          failure = error;
          child.kill();
        });
    });
    child.on("close", (status, signal) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else resolve({ status, signal, stdout, stderr, seen });
    });
  });
}
const gate = (id, event, path, count = 1) => ({ id, event, path, count });
async function built(root) {
  const output = JSON.parse(
    await readFile(join(root, `dist/assets/content/packs/${key}.json`)),
  );
  for (const name of ["alpha", "beta"])
    assert.match(
      await readFile(join(root, `dist/items/a4--${name}/index.html`), "utf8"),
      new RegExp(summary(output)[name]),
    );
  const manifest = JSON.parse(
    await readFile(join(root, "dist/assets/content/bundled-assets.json")),
  );
  const asset = manifest.packs[0].assets[0];
  const bytes = await readFile(join(root, "dist", asset.url));
  assert.equal(hash(bytes), output.assets[0].sha256);
  assert.deepEqual(bytes, png(output.contentVersion));
  return summary(output);
}

for (const sequence of ["single save", "ABA saves"]) {
  test(
    `FR-009: actual build excludes ${sequence} at the original read barriers and releases before output`,
    { timeout: 30000 },
    async (t) => {
      const root = await fixture(t, { build: true });
      const store = await author.createAuthorStore({ root, schema }),
        initial = await store.read();
      const gates = [gate("commit-1", "open", paths.beta)];
      if (sequence === "ABA saves")
        gates.push(
          gate("commit-0", "open", paths.manifest, 2),
          gate("commit-1-again", "close", paths.alpha, 2),
        );
      gates.push(gate("render", "write", "@output"));
      const result = await build(root, gates, async (id) => {
        if (id === "render") {
          await noLock(root);
          await save(store, "1", initial.revision);
        } else {
          const before = await readFile(join(root, lockPath));
          await assert.rejects(
            // Keep referenced media constant for the original metadata ABA
            // sequence; the successful post-capture save changes the pixels.
            save(store, id === "commit-0" ? "0" : "1", initial.revision, "0"),
            { code: "REPOSITORY_BUSY" },
          );
          assert.deepEqual(await readFile(join(root, lockPath)), before);
        }
      });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(
        result.seen,
        gates.map((entry) => entry.id),
      );
      assert.deepEqual(await built(root), summary(pack("0")));
      assert.deepEqual(
        summary((await store.read()).entries[0].pack),
        summary(pack("1")),
      );
      await noLock(root);
    },
  );
}

test(
  "FR-009: actual build refuses an active writer and preserves its lock and journal",
  { timeout: 30000 },
  async (t) => {
    const root = await fixture(t, { build: true });
    let entered, release;
    const prepared = new Promise((resolve) => (entered = resolve));
    const held = new Promise((resolve) => (release = resolve));
    const writer = author.applyFilePlan({
      root,
      before: revision("0"),
      after: revision("1"),
      failpoint: async (phase) => {
        if (phase === "prepared") {
          entered();
          await held;
        }
      },
    });
    await prepared;
    try {
      const before = await tree(root);
      const result = await build(root);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /Another Studio writer or interrupted lock/);
      assert.match(result.stderr, /OLD/);
      assert.deepEqual(await tree(root), before);
      assert.equal(
        await readFile(join(root, "dist/last-good.txt"), "utf8"),
        "SYNTHETIC OLD reader\n",
      );
    } finally {
      release();
      await writer;
    }
    await noLock(root);
    assert.deepEqual(
      summary((await readCatalog({ root, schema })).packs[0]),
      summary(pack("1")),
    );
  },
);

test(
  "FR-009: actual build refuses pending recovery without touching OLD or recovery material",
  { timeout: 30000 },
  async (t) => {
    const root = await fixture(t, { build: true });
    await assert.rejects(
      author.applyFilePlan({
        root,
        before: revision("0"),
        after: revision("1"),
        failpoint: (phase, index) => {
          if (phase === "applied" && index === 0)
            throw new Error("Synthetic interruption");
        },
      }),
      { code: "RECOVERY_REQUIRED" },
    );
    const before = await tree(root),
      result = await build(root);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /interrupted save.*author:recover/i);
    assert.match(result.stderr, /OLD/);
    assert.doesNotMatch(result.stdout, /Built \d/);
    assert.deepEqual(await tree(root), before);
    assert.equal(
      await readFile(join(root, "dist/last-good.txt"), "utf8"),
      "SYNTHETIC OLD reader\n",
    );
  },
);

test(
  "FR-009: a crashed snapshot leaves an owned lock that a later snapshot never reclaims",
  { timeout: 30000 },
  async (t) => {
    const root = await fixture(t, { build: true });
    const result = await build(
      root,
      [gate("crash", "open", paths.beta)],
      async (_, child) => {
        child.kill();
      },
    );
    assert.notEqual(result.status, 0);
    assert.equal((await author.inspectRecovery({ root })).lock.state, "dead");
    const before = await tree(root);
    await assert.rejects(capture(root), { code: "REPOSITORY_BUSY" });
    assert.deepEqual(await tree(root), before);
    assert.equal(
      await readFile(join(root, "dist/last-good.txt"), "utf8"),
      "SYNTHETIC OLD reader\n",
    );
  },
);

test(
  "FR-009: snapshot locking preserves catalog guards against non-cooperating edits",
  { timeout: 30000 },
  async (t) => {
    const root = await fixture(t, { build: true });
    const result = await build(
      root,
      [gate("external", "open", paths.beta)],
      async () => {
        await writeFile(join(root, headerPath), revision("1").get(headerPath));
      },
    );
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Catalog source changed during snapshot/);
    assert.equal(
      await readFile(join(root, "dist/last-good.txt"), "utf8"),
      "SYNTHETIC OLD reader\n",
    );
    await noLock(root);
  },
);
