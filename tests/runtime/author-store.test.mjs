import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { deflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  applyFilePlan,
  inspectRecovery,
  recoverRepository,
  createAuthorStore,
  validateAuthorPNG,
  isManagedPath,
} from "../../scripts/author-store.mjs";
import { serializeCatalog, readCatalog } from "../../scripts/catalog.mjs";
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
const manifest = "content/catalog/manifest.json",
  record = "content/catalog/test/pack.json";
const b = (s) => Buffer.from(s);
function pack() {
  return {
    schemaVersion: 1,
    id: "test:catalog",
    contentVersion: "1",
    game: { id: "fictional-training", mode: "test", build: "test" },
    title: "Fictional test",
    description: "Original software fixture",
    coverage: { expectedTotal: null, note: "Fictional" },
    sources: [],
    items: [],
    recipes: [],
    objectives: [],
    guides: [],
    maps: [],
    locations: [],
    claims: [],
    assets: [],
  };
}
async function rootFor(t) {
  const root = await mkdtemp(join(tmpdir(), "dmz-author-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function put(root, path, bytes) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), bytes);
}
async function fixture(t) {
  const root = await rootFor(t),
    entry = { key: "test", pack: pack(), assetSources: {} };
  const files = serializeCatalog({ entries: [entry], schema });
  for (const [path, bytes] of files) await put(root, path, bytes);
  return { root, store: await createAuthorStore({ root, schema }) };
}
function chunk(type, data) {
  let crc = 0xffffffff;
  const typed = Buffer.concat([Buffer.from(type), data]);
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
function png(extra = []) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2);
  header.writeUInt32BE(2, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    ...extra,
    chunk("IDAT", deflateSync(Buffer.alloc(18))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
test("FR-005: staged file plans publish last marker and preserve unrelated files", async (t) => {
  const root = await rootFor(t);
  await put(root, "unrelated.txt", b("private"));
  const order = [];
  const result = await applyFilePlan({
    root,
    before: new Map([
      [manifest, null],
      [record, null],
    ]),
    after: new Map([
      [manifest, b("manifest")],
      [record, b("record")],
    ]),
    failpoint: async (phase, i) => {
      if (phase === "applied")
        order.push(
          i === 0 ? await readFile(join(root, record), "utf8") : "marker",
        );
    },
  });
  assert.deepEqual(order, ["record", "marker"]);
  assert.equal(result.paths.at(-1), manifest);
  assert.equal(await readFile(join(root, "unrelated.txt"), "utf8"), "private");
  assert.equal((await inspectRecovery({ root })).pending, false);
});
for (const stop of ["prepared", "applied", "committed"])
  test(`FR-005: interruption at ${stop} is recoverable and bounded`, async (t) => {
    const root = await rootFor(t);
    await put(root, record, b("before"));
    await assert.rejects(
      applyFilePlan({
        root,
        before: new Map([
          [record, b("before")],
          [manifest, null],
        ]),
        after: new Map([
          [record, b("after")],
          [manifest, b("new marker")],
        ]),
        failpoint: (phase) => {
          if (phase === stop) throw new Error("simulated interruption");
        },
      }),
      { code: "RECOVERY_REQUIRED" },
    );
    const preview = await recoverRepository({ root });
    assert.equal(preview.pending, true);
    assert.deepEqual(preview.conflicts, []);
    const result = await recoverRepository({
      root,
      apply: true,
      expectedRecoveryRevision: preview.revision,
    });
    assert.equal(
      result.outcome,
      stop === "committed" ? "committed" : "rolled-back",
    );
    assert.equal(
      await readFile(join(root, record), "utf8"),
      stop === "committed" ? "after" : "before",
    );
    assert.equal((await inspectRecovery({ root })).pending, false);
  });
for (const stop of ["prepared", "applied", "committed"])
  test(`FR-005: real process exit at ${stop} leaves a dead lock and recoverable journal`, async (t) => {
    const root = await rootFor(t);
    await put(root, record, b("before"));
    const module = new URL("../../scripts/author-store.mjs", import.meta.url)
      .href;
    const script = `import { applyFilePlan } from ${JSON.stringify(module)}; await applyFilePlan({ root: process.argv[1], before: new Map([[${JSON.stringify(record)},Buffer.from('before')],[${JSON.stringify(manifest)},null]]), after: new Map([[${JSON.stringify(record)},Buffer.from('after')],[${JSON.stringify(manifest)},Buffer.from('marker')]]), failpoint: (phase) => { if (phase === ${JSON.stringify(stop)}) process.exit(29); } });`;
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          ["--input-type=module", "-e", script, root],
          { stdio: "pipe" },
        ),
      (e) => e.status === 29,
    );
    const preview = await recoverRepository({ root });
    assert.equal(preview.lock.state, "dead");
    assert.equal(preview.pending, true);
    const result = await recoverRepository({
      root,
      apply: true,
      expectedRecoveryRevision: preview.revision,
    });
    assert.equal(
      result.outcome,
      stop === "committed" ? "committed" : "rolled-back",
    );
    assert.equal(
      await readFile(join(root, record), "utf8"),
      stop === "committed" ? "after" : "before",
    );
    assert.equal((await inspectRecovery({ root })).lock, null);
  });
test("FR-005: recovery never overwrites independently changed bytes", async (t) => {
  const root = await rootFor(t);
  await put(root, record, b("before"));
  await assert.rejects(
    applyFilePlan({
      root,
      before: new Map([[record, b("before")]]),
      after: new Map([[record, b("after")]]),
      failpoint: () => {
        throw new Error("stop");
      },
    }),
  );
  await put(root, record, b("external editor"));
  await assert.rejects(recoverRepository({ root, apply: true }), {
    code: "RECOVERY_CONFLICT",
  });
  assert.equal(await readFile(join(root, record), "utf8"), "external editor");
  assert.equal((await inspectRecovery({ root })).pending, true);
});
test("FR-005: final publish guard detects edits made while staged bytes are being prepared", async (t) => {
  const root = await rootFor(t);
  await put(root, record, b("before"));
  await assert.rejects(
    applyFilePlan({
      root,
      before: new Map([[record, b("before")]]),
      after: new Map([[record, b("after")]]),
      failpoint: async (phase) => {
        if (phase === "before-publish")
          await put(root, record, b("external during install"));
      },
    }),
    { code: "RECOVERY_CONFLICT" },
  );
  assert.equal(
    await readFile(join(root, record), "utf8"),
    "external during install",
  );
});
test("FR-008: traversal, arbitrary writes, symlinks and case collisions are rejected", async (t) => {
  const root = await rootFor(t);
  for (const path of [
    "../escape",
    "package.json",
    "content/catalog/CON/pack.json",
    "media/test/other/test_id/evil.svg",
  ]) {
    assert.equal(isManagedPath(path), false);
    await assert.rejects(
      applyFilePlan({
        root,
        before: new Map([[path, null]]),
        after: new Map([[path, b("bad")]]),
      }),
    );
  }
  await put(root, "content/catalog/Test/pack.json", b("outside"));
  await assert.rejects(
    applyFilePlan({
      root,
      before: new Map([[record, null]]),
      after: new Map([[record, b("bad")]]),
    }),
    /Case-colliding/,
  );
  await rm(join(root, "content"), { recursive: true });
  await mkdir(join(root, "outside"));
  try {
    await symlink(
      join(root, "outside"),
      join(root, "content"),
      process.platform === "win32" ? "junction" : "dir",
    );
  } catch (e) {
    if (e.code === "EPERM")
      return t.skip("Platform does not permit test symlinks");
    throw e;
  }
  await assert.rejects(
    applyFilePlan({
      root,
      before: new Map([[record, null]]),
      after: new Map([[record, b("bad")]]),
    }),
    /symlink|regular/,
  );
});
test("FR-005: stale before bytes and live locks are never overwritten", async (t) => {
  const root = await rootFor(t);
  await put(root, record, b("external"));
  await assert.rejects(
    applyFilePlan({
      root,
      before: new Map([[record, null]]),
      after: new Map([[record, b("bad")]]),
    }),
    { code: "RECOVERY_CONFLICT" },
  );
  await put(
    root,
    ".author-state/current.lock",
    b(
      JSON.stringify({
        pid: process.pid,
        processStart: "test",
        token: "a".repeat(48),
      }),
    ),
  );
  await assert.rejects(recoverRepository({ root, apply: true }), {
    code: "REPOSITORY_BUSY",
  });
  await assert.rejects(
    applyFilePlan({ root, before: new Map(), after: new Map() }),
    { code: "REPOSITORY_BUSY" },
  );
});
test("FR-008: recovery rejects modified backup bytes", async (t) => {
  const root = await rootFor(t);
  await put(root, record, b("before"));
  await assert.rejects(
    applyFilePlan({
      root,
      before: new Map([[record, b("before")]]),
      after: new Map([[record, b("after")]]),
      failpoint: () => {
        throw new Error("stop");
      },
    }),
  );
  const tx = (await readdir(join(root, ".author-state/transactions")))[0];
  await put(
    root,
    `.author-state/transactions/${tx}/before/0.bin`,
    b("tampered"),
  );
  await assert.rejects(inspectRecovery({ root }), {
    code: "RECOVERY_CONFLICT",
  });
});
test("FR-008: recovery rejects an outcome receipt inconsistent with its journal", async (t) => {
  const root = await rootFor(t);
  const target = record,
    marker = manifest;
  const before = new Map([
    [target, null],
    [marker, null],
  ]);
  const after = new Map([
    [target, b("new")],
    [marker, b("manifest")],
  ]);
  await assert.rejects(
    applyFilePlan({
      root,
      before,
      after,
      failpoint: (phase) => {
        if (phase === "committed") throw new Error("Interrupted");
      },
    }),
  );
  const journal = JSON.parse(
    await readFile(join(root, ".author-state/journal.json")),
  );
  await put(
    root,
    `.author-state/transactions/${journal.transactionId}/outcome.json`,
    b(
      JSON.stringify({
        state: "committed",
        transactionId: journal.transactionId,
        paths: [],
      }),
    ),
  );
  await assert.rejects(
    recoverRepository({ root, apply: true }),
    /outcome receipt/,
  );
  assert.equal((await readFile(join(root, target))).toString(), "new");
  assert(await readFile(join(root, ".author-state/journal.json")));
});
test("FR-008: malformed, oversized and out-of-scope journals fail closed", async (t) => {
  const root = await rootFor(t);
  for (const content of [
    b("{broken"),
    Buffer.alloc(8 * 1024 * 1024 + 1),
    b(
      JSON.stringify({
        format: "dmz-author-transaction",
        version: 1,
        transactionId: "a".repeat(32),
        markerPath: manifest,
        entries: [
          {
            path: "package.json",
            beforeHash: null,
            afterHash: "a".repeat(64),
            beforeBytes: 0,
            afterBytes: 1,
          },
        ],
      }),
    ),
  ]) {
    await put(root, ".author-state/journal.json", content);
    await assert.rejects(inspectRecovery({ root }));
  }
});
test("FR-008: schema reads are bounded and never follow a symlink", async (t) => {
  const root = await rootFor(t);
  await put(root, "schemas/pack.schema.json", Buffer.alloc(1024 * 1024 + 1));
  await assert.rejects(createAuthorStore({ root }), { code: "LIMIT_EXCEEDED" });
  await rm(join(root, "schemas/pack.schema.json"));
  await put(root, "outside.json", b('{"private":"must not be exposed"}'));
  try {
    await symlink(
      join(root, "outside.json"),
      join(root, "schemas/pack.schema.json"),
    );
  } catch (e) {
    if (e.code === "EPERM")
      return t.skip("Platform does not permit test file symlinks");
    throw e;
  }
  await assert.rejects(createAuthorStore({ root }), /symlink|regular/);
});
for (const which of ["journal", "backup", "target"])
  test(`FR-008: symlinked ${which} cannot be used for recovery`, async (t) => {
    const root = await rootFor(t);
    await put(root, record, b("before"));
    await put(root, "outside.txt", b("unrelated"));
    await assert.rejects(
      applyFilePlan({
        root,
        before: new Map([[record, b("before")]]),
        after: new Map([[record, b("after")]]),
        failpoint: () => {
          throw new Error("stop");
        },
      }),
    );
    const tx = (await readdir(join(root, ".author-state/transactions")))[0];
    const target =
      which === "journal"
        ? ".author-state/journal.json"
        : which === "backup"
          ? `.author-state/transactions/${tx}/before/0.bin`
          : record;
    await rm(join(root, target));
    try {
      await symlink(join(root, "outside.txt"), join(root, target));
    } catch (e) {
      if (e.code === "EPERM")
        return t.skip("Platform does not permit file symlinks");
      throw e;
    }
    await assert.rejects(inspectRecovery({ root }), /symlink|regular/);
    assert.equal(
      await readFile(join(root, "outside.txt"), "utf8"),
      "unrelated",
    );
  });
test("FR-008: normalized PNG pixels pass and hidden metadata/corruption fail", async () => {
  assert.equal((await validateAuthorPNG(png())).width, 2);
  await assert.rejects(
    validateAuthorPNG(png([chunk("tEXt", b("hidden secret"))])),
    /metadata/,
  );
  const corrupt = png();
  corrupt[corrupt.length - 1] ^= 1;
  await assert.rejects(validateAuthorPNG(corrupt), /CRC/);
  await assert.rejects(
    validateAuthorPNG(b("<svg onload='attack()'/>")),
    /Unsupported/,
  );
});
test("FR-003/005/010: save persists, enforces versions/stale guards and rejects private data", async (t) => {
  const { root, store } = await fixture(t),
    before = await store.read();
  const changed = structuredClone(before.entries[0].pack);
  changed.title = "Changed fixture";
  await assert.rejects(
    store.save({
      packKey: "test",
      expectedRevision: before.revision,
      pack: changed,
    }),
    /content version/,
  );
  changed.contentVersion = "2";
  const result = await store.save({
    packKey: "test",
    expectedRevision: before.revision,
    pack: changed,
  });
  assert.equal(result.entry.pack.title, "Changed fixture");
  assert.notEqual(result.revision, before.revision);
  assert.equal(
    (await readCatalog({ root, schema })).packs[0].title,
    "Changed fixture",
  );
  await assert.rejects(
    store.save({
      packKey: "test",
      expectedRevision: before.revision,
      pack: changed,
    }),
    { code: "STALE_REVISION" },
  );
  await assert.rejects(
    store.save({
      packKey: "test",
      expectedRevision: result.revision,
      pack: changed,
      inventory: {},
    }),
    /private data/,
  );
  const bad = { ...changed, contentVersion: "3", inventory: {} };
  await assert.rejects(
    store.save({
      packKey: "test",
      expectedRevision: result.revision,
      pack: bad,
    }),
    /unexpected field/,
  );
});
test("FR-006/007: image bytes persist separately and dangling picture references fail", async (t) => {
  const { root, store } = await fixture(t),
    before = await store.read(),
    next = structuredClone(before.entries[0].pack),
    bytes = png();
  next.contentVersion = "2";
  next.assets.push({
    id: "test:picture",
    path: "assets/picture.png",
    mime: "image/png",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    width: 2,
    height: 2,
    rightsHolder: "Test author",
    license: "CC0-1.0",
    sourceUrl: "https://example.invalid/test",
    attribution: "Original fictional fixture",
    redistributionAllowed: true,
  });
  next.items.push({
    id: "test:item",
    name: "Fictional item",
    sourceIds: [],
    status: "fictional",
    kind: "item",
    category: "fixture",
    unit: "count",
    description: "Original test",
    aliases: [],
    stats: [],
    assetId: "test:picture",
  });
  const saved = await store.save({
    packKey: "test",
    expectedRevision: before.revision,
    pack: next,
    uploads: [
      {
        assetId: "test:picture",
        category: "items",
        base64: bytes.toString("base64"),
      },
    ],
  });
  assert.deepEqual(
    Buffer.from((await store.media("test", "test:picture")).bytes),
    bytes,
  );
  assert.deepEqual(
    await readFile(
      join(root, saved.entry.assetSources["test:picture"].sourcePath),
    ),
    bytes,
  );
  const bad = structuredClone(saved.entry.pack);
  bad.contentVersion = "3";
  bad.assets = [];
  await assert.rejects(
    store.save({
      packKey: "test",
      expectedRevision: saved.revision,
      pack: bad,
    }),
    /Unknown assets reference/,
  );
});
test("FR-011: Git summary includes managed changes, excludes unknown files and does not execute filters", async (t) => {
  const { root, store } = await fixture(t);
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "content"], { cwd: root });
  await put(root, "media/unrelated-private.txt", b("never show"));
  await put(root, ".env", b("secret"));
  const state = await store.read(),
    next = structuredClone(state.entries[0].pack);
  next.contentVersion = "2";
  next.title = "Changed";
  await store.save({
    packKey: "test",
    expectedRevision: state.revision,
    pack: next,
  });
  const summary = await store.changes();
  assert.equal(summary.gitAvailable, true);
  assert(summary.files.some((f) => f.path === record));
  assert(summary.files.every((f) => isManagedPath(f.path)));
  assert(!JSON.stringify(summary).includes("unrelated-private"));
  await put(
    root,
    "trap.cjs",
    b(
      "require('node:fs').writeFileSync('UNSAFE_HELPER_RAN','unexpected'); process.exit(1);",
    ),
  );
  for (const [key, value] of [
    ["filter.trap.clean", "node trap.cjs"],
    ["filter.trap.smudge", "node trap.cjs"],
    ["diff.trap.textconv", "node trap.cjs"],
    ["diff.external", "node trap.cjs"],
    ["core.fsmonitor", "node trap.cjs"],
  ])
    execFileSync("git", ["config", key, value], { cwd: root });
  await put(
    root,
    ".gitattributes",
    b(
      "content/catalog/** filter=trap diff=trap\nmedia/** filter=trap diff=trap\n",
    ),
  );
  const guarded = await store.changes();
  assert.equal(guarded.gitAvailable, true);
  await assert.rejects(readFile(join(root, "UNSAFE_HELPER_RAN")), {
    code: "ENOENT",
  });
});
test("FR-011: completed receipts retain deleted managed paths across store restart", async (t) => {
  const { root, store } = await fixture(t);
  execFileSync("git", ["init", "-q"], { cwd: root });
  let state = await store.read(),
    next = structuredClone(state.entries[0].pack);
  next.contentVersion = "2";
  next.items.push({
    id: "test:removed",
    name: "Fictional removed item",
    sourceIds: [],
    status: "fictional",
    kind: "item",
    category: "test",
    unit: "count",
    description: "Original test",
    aliases: [],
    stats: [],
  });
  await store.save({
    packKey: "test",
    expectedRevision: state.revision,
    pack: next,
  });
  execFileSync("git", ["add", "content"], { cwd: root });
  state = await store.read();
  next = structuredClone(state.entries[0].pack);
  next.contentVersion = "3";
  next.items = [];
  await store.save({
    packKey: "test",
    expectedRevision: state.revision,
    pack: next,
  });
  const restarted = await createAuthorStore({ root, schema });
  const summary = await restarted.changes();
  assert(
    summary.files.some(
      (file) =>
        file.path === "content/catalog/test/items/test_removed.json" &&
        file.status === "deleted",
    ),
  );
});
test("FR-011: receipt history has one total byte budget and reports truncation", async (t) => {
  const { root, store } = await fixture(t);
  execFileSync("git", ["init", "-q"], { cwd: root });
  for (const character of ["a", "b"]) {
    const transactionId = character.repeat(32);
    await put(
      root,
      `.author-state/transactions/${transactionId}/outcome.json`,
      b(
        " ".repeat(4 * 1024 * 1024 + 1) +
          JSON.stringify({ state: "committed", transactionId, paths: [] }),
      ),
    );
  }
  const summary = await store.changes();
  assert.equal(summary.gitAvailable, true);
  assert.equal(summary.truncated, true);
  assert(summary.files.some((file) => file.path === manifest));
});
test("FR-005/011: cooperative reads wait for an in-flight save instead of seeing its journal", async (t) => {
  const { root, store } = await fixture(t);
  const alias = await createAuthorStore({ root: `${root}/./`, schema });
  execFileSync("git", ["init", "-q"], { cwd: root });
  const before = await readCatalog({ root, schema });
  const entries = structuredClone(before.entries);
  entries[0].pack.contentVersion = "2";
  entries[0].pack.title = "Complete committed snapshot";
  const after = serializeCatalog({ entries, schema });
  let prepared, release;
  const preparedSignal = new Promise((resolve) => {
    prepared = resolve;
  });
  const releaseSignal = new Promise((resolve) => {
    release = resolve;
  });
  const write = applyFilePlan({
    root,
    before: before.files,
    after,
    failpoint: async (phase) => {
      if (phase === "prepared") {
        prepared();
        await releaseSignal;
      }
    },
  });
  await preparedSignal;
  let settled = false;
  const reads = Promise.all(
    [alias.read(), store.changes()].map((promise) =>
      promise.catch((error) => ({ error })),
    ),
  ).then((results) => {
    settled = true;
    return results;
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const settledWhileWriting = settled;
  release();
  await write;
  const [snapshot, changes] = await reads;
  assert.equal(
    settledWhileWriting,
    false,
    "Reads must not inspect an active cooperative transaction",
  );
  assert.equal(snapshot.entries[0].pack.title, "Complete committed snapshot");
  assert.equal(changes.gitAvailable, true);
  const committed = await readCatalog({ root, schema });
  const nextEntries = structuredClone(committed.entries);
  nextEntries[0].pack.contentVersion = "3";
  let earlierReadCompleted = false;
  const earlierRead = store.changes().then((summary) => {
    earlierReadCompleted = true;
    return summary;
  });
  const nextWrite = applyFilePlan({
    root,
    before: committed.files,
    after: serializeCatalog({ entries: nextEntries, schema }),
    failpoint: (phase) => {
      if (phase === "prepared")
        assert.equal(
          earlierReadCompleted,
          true,
          "A writer must wait for readers that arrived before it",
        );
    },
  });
  const laterRead = store.read();
  await Promise.all([earlierRead, nextWrite]);
  assert.equal((await laterRead).entries[0].pack.contentVersion, "3");
  const third = await readCatalog({ root, schema });
  const thirdEntries = structuredClone(third.entries);
  thirdEntries[0].pack.contentVersion = "4";
  const failedReader = assert.rejects(alias.media("test", "test:missing"));
  const thirdWrite = applyFilePlan({
    root,
    before: third.files,
    after: serializeCatalog({ entries: thirdEntries, schema }),
  });
  const afterFailure = store.read();
  await Promise.all([failedReader, thirdWrite]);
  assert.equal(
    (await afterFailure).entries[0].pack.contentVersion,
    "4",
    "A failed earlier reader cannot poison a later write or reader",
  );
});
