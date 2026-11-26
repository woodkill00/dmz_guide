import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, symlink } from "node:fs/promises";
import { join } from "node:path";
import { pageEditorFixture } from "../helpers/page-editor.mjs";
import {
  createPageEditorTools,
  editorStateQuota,
} from "../../scripts/page-editor-tools.mjs";
import { pageKey, newPageId } from "../../src/domain/page-document.mjs";
import { digest } from "../../scripts/page-documents.mjs";
import { withRepositorySnapshot } from "../../scripts/author-store.mjs";
import { deflateSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { createPageEditorStore } from "../../scripts/page-editor-store.mjs";
import { createAuthorStore } from "../../scripts/author-store.mjs";
const id = () => newPageId("o").slice(2);
const recovery = (s) =>
  structuredClone({
    version: 1,
    dirty: true,
    target: s.target,
    checkoutId: s.checkoutId,
    baseRevision: s.repositoryRevision,
    baseDocumentRevision: s.document.revision,
    fingerprint: s.fingerprint,
    document: s.document,
    record: s.record,
    contentVersion: s.pack.contentVersion,
    uploads: [],
    operation: null,
  });
const get = async (f, action, target, extra = {}) => {
  const q = new URLSearchParams({
    action,
    ...(target ? { target: JSON.stringify(target) } : {}),
    ...extra,
  });
  const r = await fetch(f.app.url + "/api/page-edits/tools?" + q, {
    headers: f.headers,
  });
  assert.equal(r.status, 200, await r.clone().text());
  return r.json();
};
test("094 checkpoint storage refuses a junction without touching its target", async (t) => {
  const f = await pageEditorFixture();
  try {
    const dest = join(f.root, "untouched"),
      link = join(f.root, ".author-state/page-checkpoints");
    await mkdir(dest);
    await writeFile(join(dest, "sentinel.txt"), "retain");
    await mkdir(join(f.root, ".author-state"), { recursive: true });
    try {
      await symlink(
        dest,
        link,
        process.platform === "win32" ? "junction" : "dir",
      );
    } catch (e) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(e.code)) {
        t.skip("Platform does not permit directory links");
        return;
      }
      throw e;
    }
    const s = await f.get("test:order");
    await assert.rejects(
      () =>
        f.post("/api/page-edits/tools", {
          action: "checkpoint-save",
          target: s.target,
          expectedRevision: null,
          writerId: id(),
          value: recovery(s),
        }),
      /symlink|regular|directory/i,
    );
    assert.equal(await readFile(join(dest, "sentinel.txt"), "utf8"), "retain");
  } finally {
    await f.close();
  }
});
test("094 checkpoint preserves an unattached normalized PNG larger than 1MiB and enforces API authority", async () => {
  const f = await pageEditorFixture();
  try {
    const chunk = (type, data) => {
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
    };
    const header = Buffer.alloc(13),
      pixels = randomBytes(512 * (512 * 4 + 1));
    header.writeUInt32BE(512);
    header.writeUInt32BE(512, 4);
    header[8] = 8;
    header[9] = 6;
    for (let row = 0; row < 512; row++) pixels[row * (512 * 4 + 1)] = 0;
    const png = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(pixels)),
      chunk("IEND", Buffer.alloc(0)),
    ]);
    assert(png.length > 1048576);
    const state = await f.get("test:order"),
      value = recovery(state);
    value.uploads = [
      {
        asset: {
          id: "test:unattached-picture",
          path: "assets/test/unattached.png",
          mime: "image/png",
          sha256: digest(png),
          bytes: png.length,
          width: 512,
          height: 512,
          rightsHolder: "Software test",
          license: "Original fixture",
          sourceUrl: "https://example.com/synthetic",
          attribution: "Synthetic normalized random pixels",
          redistributionAllowed: true,
        },
        base64: png.toString("base64"),
      },
    ];
    const request = {
      action: "checkpoint-save",
      target: state.target,
      expectedRevision: null,
      writerId: id(),
      value,
    };
    const endpoint = f.app.url + "/api/page-edits/tools";
    for (const headers of [
      { "Content-Type": "application/json" },
      { ...f.headers, Origin: "https://example.com" },
    ]) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });
      assert.equal(response.status, 403);
    }
    const saved = await f.post("/api/page-edits/tools", request);
    const restored = await get(f, "checkpoint", state.target, {
      id: saved.revision,
    });
    assert.equal(restored.value.uploads[0].base64, png.toString("base64"));
    assert.equal(restored.value.record.assetId, undefined);
    assert.equal((await f.get("test:order")).pack.assets.length, 0);
  } finally {
    await f.close();
  }
});

test("094 a dead refresh owner is reconciled after restart and active shutdown joins its child", async () => {
  const f = await pageEditorFixture();
  let tools;
  try {
    const job = {
      version: 1,
      id: id(),
      state: "running",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      operationId: null,
      message: "Synthetic crashed owner",
      ownerPid: 2147483647,
      childPid: null,
    };
    const dir = join(f.root, ".author-state/page-refresh");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, job.id + ".json"), JSON.stringify(job));
    await writeFile(join(dir, "active.json"), JSON.stringify(job));
    let terminated = 0,
      rejectRun;
    tools = createPageEditorTools({
      root: f.root,
      pageStore: {},
      runBuild: () => ({
        pid: null,
        done: new Promise((_, reject) => (rejectRun = reject)),
        terminate: async () => {
          terminated++;
          rejectRun(Error("Synthetic stopped child"));
        },
      }),
    });
    assert.equal(
      (await tools.get("refresh", undefined, job.id)).state,
      "interrupted",
    );
    const next = await tools.post({
      action: "refresh",
      savedOperationId: null,
      requestId: id(),
    });
    await tools.close();
    assert(
      terminated >= 1,
      "Shutdown must terminate and join the active child",
    );
    assert.equal(
      (await tools.get("refresh", undefined, next.id)).state,
      "interrupted",
    );
    assert.equal((await f.get("test:order")).document.revision, 0);
  } finally {
    await tools?.close();
    await f.close();
  }
});
test("094 disk checkpoints CAS/current+previous/corrupt export and explicit clear retain canonical files", async () => {
  const f = await pageEditorFixture();
  try {
    const state = await f.get("test:order"),
      value = recovery(state),
      writerId = id();
    assert.equal((await get(f, "checkpoint", state.target)).revision, null);
    const first = await f.post("/api/page-edits/tools", {
      action: "checkpoint-save",
      target: state.target,
      expectedRevision: null,
      writerId,
      value,
    });
    value.record.description = "Synthetic unfinished checkpoint";
    const second = await f.post("/api/page-edits/tools", {
      action: "checkpoint-save",
      target: state.target,
      expectedRevision: first.revision,
      writerId,
      value,
    });
    const metadata = await get(f, "checkpoint", state.target);
    assert.equal(metadata.previous.revision, first.revision);
    assert.equal(metadata.current.revision, second.revision);
    await assert.rejects(
      () =>
        f.post("/api/page-edits/tools", {
          action: "checkpoint-save",
          target: state.target,
          expectedRevision: first.revision,
          writerId: id(),
          value,
        }),
      /Another browser/,
    );
    assert.equal(
      (await get(f, "checkpoint", state.target, { id: first.revision })).value
        .record.description,
      state.record.description,
    );
    assert.equal(
      (await f.get("test:order")).record.description,
      state.record.description,
    );
    const path = join(
        f.root,
        ".author-state/page-checkpoints",
        (await pageKey(state.target)) + ".json",
      ),
      raw = await readFile(path),
      bad = JSON.parse(raw);
    bad.version = 999;
    await writeFile(path, JSON.stringify(bad));
    const badRevision = digest(await readFile(path));
    assert.equal(
      (await get(f, "checkpoint", state.target)).current.invalid,
      true,
    );
    await assert.rejects(
      () =>
        f.post("/api/page-edits/tools", {
          action: "checkpoint-save",
          target: state.target,
          expectedRevision: badRevision,
          writerId,
          value,
        }),
      /Unsupported checkpoint/,
    );
    assert.match(
      (await get(f, "checkpoint-export", state.target, { id: badRevision }))
        .text,
      /999/,
    );
    await f.post("/api/page-edits/tools", {
      action: "checkpoint-clear",
      target: state.target,
      expectedRevision: badRevision,
      confirmed: true,
    });
    assert.equal((await get(f, "checkpoint", state.target)).revision, null);
  } finally {
    await f.close();
  }
});
test("094 canonical saves atomically retain original/newest five revisions and replay adds none", async () => {
  const f = await pageEditorFixture();
  try {
    let last;
    for (let i = 1; i <= 6; i++) {
      const s = await f.get("test:order");
      s.document.sections[0].title = "Synthetic revision " + i;
      const p = await f.post("/api/page-edits/preview", {
        target: s.target,
        record: s.record,
        contentVersion: s.pack.contentVersion,
        document: s.document,
        uploads: [],
        repositoryRevision: s.repositoryRevision,
        pageRevision: s.pageRevision,
      });
      last = {
        operationId: id(),
        target: s.target,
        expectedRevision: p.expectedRevision,
        expectedDocumentRevision: p.expectedDocumentRevision,
        previewDigest: p.previewDigest,
      };
      await f.post("/api/page-edits/commit", last);
    }
    const history = await get(f, "history", last.target);
    assert.equal(history.snapshots.length, 5);
    assert.deepEqual(
      history.snapshots.map((s) => s.revision),
      [2, 3, 4, 5, 6],
    );
    assert.equal(history.snapshots.at(-1).id, last.operationId);
    await f.post("/api/page-edits/commit", last);
    assert.deepEqual(await get(f, "history", last.target), history);
    const old = await get(f, "history", last.target, {
      id: history.snapshots[0].id,
    });
    assert.equal(old.value.document.sections[0].title, "Synthetic revision 2");
    assert.equal(
      (await f.get("test:order")).document.sections[0].title,
      "Synthetic revision 6",
    );
  } finally {
    await f.close();
  }
});
test("094 local-state quotas and unknown files fail closed without deletion", async () => {
  const f = await pageEditorFixture();
  try {
    await assert.rejects(
      () =>
        editorStateQuota(
          f.root,
          new Map([
            [
              ".author-state/page-checkpoints/" + "0".repeat(64) + ".json",
              Buffer.alloc(100),
            ],
          ]),
          20,
        ),
      /storage is full/,
    );
    await mkdir(join(f.root, ".author-state/page-checkpoints"), {
      recursive: true,
    });
    const path = join(f.root, ".author-state/page-checkpoints/unknown.txt");
    await writeFile(path, "retain");
    await assert.rejects(() => editorStateQuota(f.root), /Unknown/);
    assert.equal(await readFile(path, "utf8"), "retain");
  } finally {
    await f.close();
  }
});
test("094 refresh attempts deduplicate, serialize across tool instances, retry and time out without canonical Save", async () => {
  const f = await pageEditorFixture(),
    runners = [];
  const launch = () => {
    let done, fail;
    const promise = new Promise((resolve, reject) => {
      done = resolve;
      fail = reject;
    });
    const runner = {
      pid: null,
      done: promise,
      terminate: async () => fail(Error("Synthetic interrupted build")),
      resolve: done,
      reject: fail,
    };
    runners.push(runner);
    return runner;
  };
  const tools = createPageEditorTools({
      root: f.root,
      pageStore: { statusForRefresh: async () => ({ state: "committed" }) },
      runBuild: launch,
      deadline: 10000,
    }),
    other = createPageEditorTools({
      root: f.root,
      pageStore: {},
      runBuild: launch,
    });
  const wait = async (instance) => {
    for (let i = 0; i < 100; i++) {
      const row = await instance();
      if (row.state !== "running") return row;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw Error("Synthetic refresh did not finish");
  };
  try {
    const request = {
      action: "refresh",
      savedOperationId: null,
      requestId: id(),
    };
    const first = await tools.post(request);
    assert.equal(first.state, "running");
    assert.equal((await tools.post(request)).id, first.id);
    assert.equal(runners.length, 1);
    await assert.rejects(
      () => other.post({ ...request, requestId: id() }),
      /already running/,
    );
    runners[0].reject(Error("Synthetic failed build"));
    assert.equal(
      (await wait(() => tools.get("refresh", undefined, first.id))).state,
      "failed",
    );
    assert.equal((await tools.post(request)).state, "failed");
    assert.equal(runners.length, 1);
    const second = await tools.post({ ...request, requestId: id() });
    runners[1].resolve();
    assert.equal(
      (await wait(() => tools.get("refresh", undefined, second.id))).state,
      "succeeded",
    );
    const timed = createPageEditorTools({
      root: f.root,
      pageStore: {},
      runBuild: launch,
      deadline: 20,
    });
    try {
      const row = await timed.post({ ...request, requestId: id() });
      assert.equal(
        (await wait(() => timed.get("refresh", undefined, row.id))).state,
        "failed",
      );
    } finally {
      await timed.close();
    }
    assert.equal((await f.get("test:order")).document.revision, 0);
  } finally {
    await tools.close();
    await other.close();
    await f.close();
  }
});

test("109 refresh verifies the saved receipt after a background checkpoint snapshot releases", async () => {
  const f = await pageEditorFixture();
  let tools, release, held;
  try {
    const s = await f.get("test:order");
    s.document.sections[0].title = "Synthetic refresh race";
    const p = await f.post("/api/page-edits/preview", {
      target: s.target,
      record: s.record,
      contentVersion: s.pack.contentVersion,
      document: s.document,
      uploads: [],
      repositoryRevision: s.repositoryRevision,
      pageRevision: s.pageRevision,
    });
    const operationId = id();
    await f.post("/api/page-edits/commit", {
      operationId,
      target: s.target,
      expectedRevision: p.expectedRevision,
      expectedDocumentRevision: p.expectedDocumentRevision,
      previewDigest: p.previewDigest,
    });
    const pageStore = createPageEditorStore({
      root: f.root,
      store: await createAuthorStore({ root: f.root }),
    });
    let entered;
    const ready = new Promise((resolve) => (entered = resolve));
    held = withRepositorySnapshot({ root: f.root }, () => {
      entered();
      return new Promise((resolve) => (release = resolve));
    });
    await ready;
    assert.equal((await pageStore.status(operationId)).state, "unresolved");
    let launched = 0;
    tools = createPageEditorTools({
      root: f.root,
      pageStore,
      runBuild: () => {
        launched++;
        return {
          pid: null,
          done: Promise.resolve(),
          terminate: async () => {},
        };
      },
    });
    const admitted = tools.post({
      action: "refresh",
      savedOperationId: operationId,
      requestId: id(),
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
      launched,
      0,
      "Refresh cannot bypass the held repository snapshot",
    );
    release();
    await held;
    const job = await admitted;
    let final;
    for (let i = 0; i < 100; i++) {
      final = await tools.get("refresh", undefined, job.id);
      if (final.state !== "running") break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(final.state, "succeeded");
    assert.equal(launched, 1);
    assert.equal(
      (await f.get("test:order")).document.revision,
      1,
      "Refresh does not submit another canonical Save",
    );
    assert.equal((await pageStore.status(operationId)).state, "committed");
  } finally {
    release?.();
    await held;
    await tools?.close();
    await f.close();
  }
});

test("094 shutdown joins refresh admission queued behind the repository lock and never spawns afterward", async () => {
  const f = await pageEditorFixture();
  let launched = 0,
    release,
    entered;
  const ready = new Promise((resolve) => (entered = resolve));
  const held = withRepositorySnapshot({ root: f.root }, () => {
    entered();
    return new Promise((resolve) => (release = resolve));
  });
  const tools = createPageEditorTools({
    root: f.root,
    pageStore: {},
    runBuild: () => {
      launched++;
      throw Error("Unexpected post-shutdown spawn");
    },
  });
  try {
    await ready;
    const pending = tools.post({
      action: "refresh",
      savedOperationId: null,
      requestId: id(),
    });
    const rejected = assert.rejects(pending, /closing/);
    await new Promise((r) => setTimeout(r, 20));
    let closed = false;
    const closing = tools.close().then(() => (closed = true));
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(closed, false);
    release();
    await held;
    await rejected;
    await closing;
    assert.equal(launched, 0);
  } finally {
    release?.();
    await held;
    await tools.close();
    await f.close();
  }
});
