import { open, mkdir, rename, unlink, readdir, lstat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { assertSafePath, readCatalogFile, catalogJSON } from "./catalog.mjs";
import { withRepositorySnapshot, AuthorError } from "./author-store.mjs";
import { optionalBytes as readOptional, digest } from "./page-documents.mjs";
import {
  validatePageTarget,
  pageKey,
  exact,
  stableJSON,
  pageAssets,
} from "../src/domain/page-document.mjs";
import { validatePageRecovery } from "../src/domain/page-recovery.mjs";
import { parseBounded, assert } from "../src/content/limits.mjs";
import { base64FromBytes } from "../src/content/portable.mjs";

const ROOTS = [
    ".author-state/page-checkpoints",
    ".author-state/page-history",
    ".author-state/page-refresh",
  ],
  MAX = 256 * 1024 * 1024;
const optionalBytes = (root, path, max = 20975616) =>
  readOptional(root, path, max);
const id32 = (value) =>
  assert(
    typeof value === "string" && /^[a-f0-9]{32}$/.test(value),
    "Invalid local operation identity",
  );
const hash = (value) =>
  value === null || (typeof value === "string" && /^[a-f0-9]{64}$/.test(value));
const conflict = (message) => {
  throw new AuthorError("CHECKPOINT_CONFLICT", message, 409);
};
const decode = (bytes, max = 20971520) =>
  parseBounded(Buffer.from(bytes).toString("utf8"), max, {
    depth: 24,
    nodes: 60000,
    string: 2796204,
  });
async function pathsUnder(root, base) {
  const found = new Map();
  if (!(await assertSafePath(root, base, { optional: true, directory: true })))
    return found;
  const walk = async (rel) => {
    for (const item of await readdir(join(root, rel), {
      withFileTypes: true,
    })) {
      assert(
        !item.isSymbolicLink(),
        "Local editor state cannot contain symlinks",
      );
      const path = rel + "/" + item.name;
      if (item.isDirectory()) {
        assert(
          base === ROOTS[1] && rel === base && /^[a-f0-9]{64}$/.test(item.name),
          "Unknown editor state directory retained",
        );
        await walk(path);
      } else {
        assert(
          item.isFile() &&
            /^(?:[a-f0-9]{32}|[a-f0-9]{64}(?:\.previous)?|active)\.json(?:\.[a-f0-9]{32}\.tmp)?$/.test(
              item.name,
            ),
          "Unknown editor state file retained",
        );
        await assertSafePath(root, path);
        found.set(path, (await lstat(join(root, path))).size);
        assert(found.size <= 4096, "Local editor state file limit reached");
      }
    }
  };
  await walk(base);
  return found;
}
export async function editorStateQuota(root, changes = new Map(), limit = MAX) {
  const all = new Map();
  for (const base of ROOTS)
    for (const [p, n] of await pathsUnder(root, base)) all.set(p, n);
  for (const [p, b] of changes)
    if (ROOTS.some((base) => p.startsWith(base + "/"))) {
      if (b === null) all.delete(p);
      else all.set(p, b.length);
    }
  assert(
    all.size <= 4096 && [...all.values()].reduce((a, b) => a + b, 0) <= limit,
    "Local editor recovery storage is full. Export and explicitly prune old checkpoints/revisions.",
  );
}
async function atomic(root, path, bytes, limit = MAX) {
  await assertSafePath(root, path, { optional: true });
  await mkdir(dirname(join(root, path)), { recursive: true });
  await assertSafePath(root, dirname(path), { directory: true });
  const temporary = path + "." + randomBytes(16).toString("hex") + ".tmp";
  await editorStateQuota(root, new Map([[temporary, bytes]]), limit);
  const file = await open(join(root, temporary), "wx");
  try {
    await file.writeFile(bytes);
    await file.sync();
  } finally {
    await file.close();
  }
  await assertSafePath(root, path, { optional: true });
  await rename(join(root, temporary), join(root, path));
}
const checkpointPath = async (target) =>
  `${ROOTS[0]}/${await pageKey(validatePageTarget(target))}.json`;
async function checkedRecovery(root, value, target) {
  await validatePageRecovery(value);
  assert(
    stableJSON(value.target) === stableJSON(target) &&
      value.checkoutId === digest(Buffer.from(resolve(root))),
    "Recovery belongs to another checkout or page",
  );
  return value;
}
async function checkpointEnvelope(root, bytes, target) {
  const e = decode(bytes);
  exact(e, "version target checkoutId writerId updatedAt value");
  assert(
    e.version === 1 &&
      typeof e.updatedAt === "string" &&
      !Number.isNaN(Date.parse(e.updatedAt)),
    "Unsupported checkpoint envelope",
  );
  id32(e.writerId);
  await checkedRecovery(root, e.value, target);
  assert(
    e.checkoutId === e.value.checkoutId &&
      stableJSON(e.target) === stableJSON(target),
    "Checkpoint owner mismatch",
  );
  return e;
}
function descriptor(bytes, e) {
  return bytes
    ? {
        revision: digest(bytes),
        writerId: e?.writerId || null,
        updatedAt: e?.updatedAt || null,
        dirty: e?.value.dirty ?? true,
        invalid: !e,
      }
    : null;
}

export async function validateHistorySnapshot(root, value, target) {
  exact(value, "version id target createdAt kind value referencedAssets");
  id32(value.id);
  assert(
    value.version === 1 &&
      ["before", "after"].includes(value.kind) &&
      typeof value.createdAt === "string" &&
      !Number.isNaN(Date.parse(value.createdAt)),
    "Unsupported revision snapshot",
  );
  assert(
    stableJSON(value.target) === stableJSON(target),
    "Revision target mismatch",
  );
  await checkedRecovery(root, value.value, target);
  assert(
    value.value.dirty === false && value.value.operation === null,
    "Revision cannot contain an active Save",
  );
  assert(
    Array.isArray(value.referencedAssets) && value.referencedAssets.length <= 9,
    "Invalid revision picture references",
  );
  const ids = new Set();
  for (const r of value.referencedAssets) {
    exact(r, "id sha256");
    assert(
      typeof r.id === "string" &&
        r.id.length <= 100 &&
        hash(r.sha256) &&
        !ids.has(r.id),
      "Invalid revision picture reference",
    );
    ids.add(r.id);
  }
  assert(
    catalogJSON(value).length <= 12 * 1024 * 1024,
    "Revision snapshot exceeds12MiB",
  );
  return value;
}
async function historyEntries(root, target) {
  const key = await pageKey(validatePageTarget(target)),
    dir = `${ROOTS[1]}/${key}`;
  if (!(await assertSafePath(root, dir, { optional: true, directory: true })))
    return [];
  const list = [];
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    assert(
      entry.isFile() &&
        !entry.isSymbolicLink() &&
        /^[a-f0-9]{32}\.json$/.test(entry.name),
      "Unknown revision file retained",
    );
    assert(list.length < 5, "Revision retention requires inspection");
    const path = dir + "/" + entry.name,
      bytes = Buffer.from(await readCatalogFile(root, path, 12 * 1024 * 1024));
    const value = await validateHistorySnapshot(
      root,
      decode(bytes, 12 * 1024 * 1024),
      target,
    );
    assert(entry.name === value.id + ".json", "Revision filename mismatch");
    list.push({ path, bytes, value });
  }
  return list.sort(
    (a, b) =>
      a.value.createdAt.localeCompare(b.value.createdAt) ||
      a.value.id.localeCompare(b.value.id),
  );
}
export async function captureEditorRevision(
  root,
  state,
  catalog,
  { id, kind, uploads = [], createdAt = new Date().toISOString() },
) {
  const ids = [
    ...new Set(
      [
        ...pageAssets(state.document),
        state.record.assetId,
        ...(state.record.assetIds || []),
      ].filter(Boolean),
    ),
  ];
  assert(ids.length <= 9, "Revision picture count exceeds9");
  const retained = [],
    referencedAssets = [];
  for (const assetId of ids) {
    const asset = state.pack.assets.find((a) => a.id === assetId);
    assert(asset, "Revision picture is outside its library");
    const eligible =
      asset.mime === "image/png" &&
      asset.redistributionAllowed === true &&
      asset.rightsHolder &&
      asset.license &&
      asset.attribution &&
      asset.width <= 2048 &&
      asset.height <= 2048 &&
      asset.bytes <= 2097152;
    if (!eligible) {
      referencedAssets.push({ id: assetId, sha256: asset.sha256 || null });
      continue;
    }
    const prepared = uploads.find((u) => u.asset.id === assetId);
    if (prepared) {
      retained.push(prepared);
      continue;
    }
    const entry = catalog.entries.find((e) => e.pack.id === state.pack.id),
      source = entry?.assetSources?.[assetId]?.sourcePath;
    const bytes =
      source &&
      (catalog.files.get(source) ||
        (await readCatalogFile(root, source, 2097152)));
    assert(
      bytes,
      "Revision picture bytes unavailable; original state retained",
    );
    retained.push({ asset, base64: base64FromBytes(bytes) });
  }
  const value = {
    version: 1,
    dirty: false,
    target: state.target,
    checkoutId: digest(Buffer.from(resolve(root))),
    baseRevision: state.repositoryRevision,
    baseDocumentRevision: state.document.revision,
    fingerprint: state.fingerprint,
    document: structuredClone(state.document),
    record: structuredClone(state.record),
    contentVersion: state.pack.contentVersion,
    uploads: retained,
    operation: null,
  };
  const result = {
    version: 1,
    id,
    target: state.target,
    createdAt,
    kind,
    value,
    referencedAssets,
  };
  return validateHistorySnapshot(root, result, state.target);
}
export async function prepareRevisionPlan(
  root,
  target,
  beforeSnapshot,
  afterSnapshot,
) {
  const existing = await historyEntries(root, target),
    before = new Map(existing.map((x) => [x.path, x.bytes])),
    after = new Map(before);
  const additions = existing.length
    ? [afterSnapshot]
    : [beforeSnapshot, afterSnapshot];
  const key = await pageKey(target),
    all = [
      ...existing.map((e) => ({ path: e.path, value: e.value })),
      ...additions.map((value) => ({
        path: `${ROOTS[1]}/${key}/${value.id}.json`,
        value,
      })),
    ].sort(
      (a, b) =>
        a.value.createdAt.localeCompare(b.value.createdAt) ||
        a.value.id.localeCompare(b.value.id),
    );
  for (const e of additions) {
    const path = `${ROOTS[1]}/${key}/${e.id}.json`;
    assert(!before.has(path), "Revision identity already exists");
    before.set(path, null);
    after.set(path, catalogJSON(e));
  }
  for (const e of all.slice(0, Math.max(0, all.length - 5)))
    after.set(e.path, null);
  await editorStateQuota(root, after);
  return { before, after };
}

function fixedBuild(root, onOutput) {
  const child = spawn(process.execPath, [join(root, "scripts/build.mjs")], {
    cwd: root,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", onOutput);
  child.stderr.on("data", onOutput);
  const done = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0
        ? resolve()
        : reject(
            Error(
              signal
                ? "Build interrupted"
                : "Build failed; saved repository content is retained",
            ),
          ),
    );
  });
  return {
    pid: child.pid || null,
    done,
    terminate: async () => {
      if (child.exitCode !== null || child.signalCode) return;
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
      try {
        await done.catch(() => {});
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
const alive = (pid) => {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code !== "ESRCH";
  }
};
function validJob(job) {
  exact(
    job,
    "version id state startedAt finishedAt operationId message ownerPid childPid",
  );
  id32(job.id);
  if (job.operationId !== null) id32(job.operationId);
  assert(
    job.version === 1 &&
      ["running", "succeeded", "failed", "interrupted"].includes(job.state) &&
      typeof job.message === "string" &&
      job.message.length <= 65536 &&
      typeof job.startedAt === "string" &&
      (job.finishedAt === null || typeof job.finishedAt === "string") &&
      Number.isInteger(job.ownerPid) &&
      (job.childPid === null || Number.isInteger(job.childPid)),
    "Invalid refresh receipt retained",
  );
  return job;
}

export function createPageEditorTools({
  root,
  pageStore,
  runBuild = fixedBuild,
  deadline = 300000,
  quota = MAX,
}) {
  root = resolve(root);
  let child = null,
    completion = null,
    closing = false;
  const admissions = new Set();
  const locked = (fn) => withRepositorySnapshot({ root }, fn);
  const activePath = `${ROOTS[2]}/active.json`,
    jobPath = (id) => {
      id32(id);
      return `${ROOTS[2]}/${id}.json`;
    };
  async function writeJob(job) {
    const data = catalogJSON(validJob(job));
    await editorStateQuota(
      root,
      new Map([
        [jobPath(job.id), data],
        [activePath, data],
      ]),
      quota,
    );
    await atomic(root, jobPath(job.id), data, quota);
    await atomic(root, activePath, data, quota);
  }
  async function readJob(id) {
    const bytes = await optionalBytes(root, jobPath(id));
    assert(bytes, "Refresh attempt not found; do not repeat an uncertain Save");
    return validJob(decode(bytes, 131072));
  }
  async function activeJob() {
    const bytes = await optionalBytes(root, activePath);
    if (!bytes) return null;
    const job = validJob(decode(bytes, 131072));
    if (
      job.state === "running" &&
      job.ownerPid !== process.pid &&
      !alive(job.ownerPid) &&
      !alive(job.childPid)
    ) {
      const next = {
        ...job,
        state: "interrupted",
        finishedAt: new Date().toISOString(),
        message:
          "Previous refresh owner stopped. Inspect any interrupted build before retrying.",
      };
      await writeJob(next);
      return next;
    }
    return job;
  }
  async function refresh(input) {
    exact(input, "savedOperationId requestId");
    id32(input.requestId);
    if (input.savedOperationId !== null) {
      id32(input.savedOperationId);
      assert(
        (await pageStore.status(input.savedOperationId)).state === "committed",
        "Refresh requires a confirmed saved operation",
      );
    }
    assert(!closing, "Editor is closing; retry refresh after restart");
    const admission = locked(async () => {
      assert(!closing, "Editor is closing; refresh admission cancelled");
      const prior = await optionalBytes(root, jobPath(input.requestId));
      if (prior) {
        const job = validJob(decode(prior, 131072));
        assert(
          job.operationId === input.savedOperationId,
          "Refresh request identity mismatch",
        );
        return job;
      }
      const active = await activeJob();
      if (active?.state === "running")
        throw new AuthorError(
          "REFRESH_BUSY",
          `Refresh ${active.id} is already running; retry after it finishes`,
          409,
        );
      assert(
        !(await assertSafePath(root, ".build-state/current.lock", {
          optional: true,
        })),
        "A build is active or needs recovery; previous reader retained",
      );
      assert(
        !(await optionalBytes(
          root,
          ".author-state/page-operations/active.json",
        )),
        "Resolve the pending Save before refreshing",
      );
      const job = {
        version: 1,
        id: input.requestId,
        state: "running",
        startedAt: new Date().toISOString(),
        finishedAt: null,
        operationId: input.savedOperationId,
        message: "Refreshing local reader…",
        ownerPid: process.pid,
        childPid: null,
      };
      await writeJob(job);
      let output = "";
      try {
        assert(!closing, "Editor is closing; refresh launch cancelled");
        child = runBuild(root, (chunk) => {
          output = (output + String(chunk)).slice(-65536);
        });
        assert(
          child && child.done && typeof child.terminate === "function",
          "Invalid fixed build runner",
        );
        child.done.catch(() => {});
        job.childPid = child.pid || null;
        await writeJob(job);
      } catch (e) {
        await child?.terminate();
        child = null;
        const failed = {
          ...job,
          state: "failed",
          finishedAt: new Date().toISOString(),
          message: String(e.message).slice(0, 65536),
        };
        await writeJob(failed);
        return failed;
      }
      const owned = child;
      let timer;
      completion = (async () => {
        let terminal;
        try {
          await Promise.race([
            owned.done,
            new Promise(
              (_, reject) =>
                (timer = setTimeout(
                  () =>
                    reject(
                      Error(
                        "Reader refresh timed out; saved files and previous reader are retained",
                      ),
                    ),
                  deadline,
                )),
            ),
          ]);
          terminal = {
            ...job,
            state: "succeeded",
            finishedAt: new Date().toISOString(),
            message:
              "Local reader updated. Refresh your reader tab to see the saved content.",
          };
        } catch (e) {
          await owned.terminate();
          terminal = {
            ...job,
            state: closing ? "interrupted" : "failed",
            finishedAt: new Date().toISOString(),
            message: (e.message + (output ? "\n" + output : "")).slice(
              0,
              65536,
            ),
          };
        } finally {
          clearTimeout(timer);
          if (child === owned) child = null;
        }
        await locked(() => writeJob(terminal));
        return terminal;
      })();
      completion.catch(() => {});
      return job;
    });
    admissions.add(admission);
    try {
      return await admission;
    } finally {
      admissions.delete(admission);
    }
  }
  async function get(action, target, id) {
    if (action === "refresh") {
      if (id) id32(id);
      return locked(async () => {
        const active = await activeJob();
        return id ? readJob(id) : active;
      });
    }
    validatePageTarget(target);
    return locked(async () => {
      if (action === "checkpoint") {
        const path = await checkpointPath(target),
          bytes = await optionalBytes(root, path),
          previous = await optionalBytes(
            root,
            path.replace(/\.json$/, ".previous.json"),
          );
        let currentValue = null,
          previousValue = null;
        try {
          if (bytes)
            currentValue = await checkpointEnvelope(root, bytes, target);
        } catch {}
        try {
          if (previous)
            previousValue = await checkpointEnvelope(root, previous, target);
        } catch {}
        if (id) {
          assert(hash(id) && id !== null, "Invalid checkpoint revision");
          const selected =
            bytes && digest(bytes) === id
              ? bytes
              : previous && digest(previous) === id
                ? previous
                : null;
          if (!selected)
            conflict(
              "Checkpoint changed; reload its description before restoring",
            );
          return {
            revision: id,
            value: (await checkpointEnvelope(root, selected, target)).value,
          };
        }
        return {
          revision: bytes ? digest(bytes) : null,
          current: descriptor(bytes, currentValue),
          previous: descriptor(previous, previousValue),
        };
      }
      if (action === "checkpoint-export") {
        assert(hash(id) && id !== null, "Invalid checkpoint revision");
        const path = await checkpointPath(target);
        for (const p of [path, path.replace(/\.json$/, ".previous.json")]) {
          const bytes = await optionalBytes(root, p);
          if (bytes && digest(bytes) === id)
            return { revision: id, text: bytes.toString("utf8") };
        }
        conflict("Checkpoint changed; original export retained");
      }
      if (action === "history") {
        const rows = await historyEntries(root, target);
        if (id) {
          id32(id);
          const row = rows.find((r) => r.value.id === id);
          assert(row, "Revision no longer retained; current draft unchanged");
          return row.value;
        }
        return {
          snapshots: rows.map(({ value, bytes }) => ({
            id: value.id,
            createdAt: value.createdAt,
            kind: value.kind,
            revision: value.value.document.revision,
            bytes: bytes.length,
            referencedAssets: value.referencedAssets.length,
          })),
        };
      }
      throw Error("Unknown editor tools read");
    });
  }
  async function post(input) {
    assert(
      input && typeof input.action === "string",
      "Choose an editor tool action",
    );
    const { action, ...value } = input;
    if (action === "refresh") return refresh(value);
    if (action === "checkpoint-save") {
      exact(value, "target expectedRevision writerId value");
      validatePageTarget(value.target);
      id32(value.writerId);
      assert(hash(value.expectedRevision), "Invalid checkpoint base");
      await checkedRecovery(root, value.value, value.target);
      return locked(async () => {
        const active = await optionalBytes(
          root,
          ".author-state/page-operations/active.json",
        );
        if (active)
          assert(
            decode(active, 1024).operationId ===
              value.value.operation?.operationId,
            "Resolve pending Save before checkpointing another draft",
          );
        const path = await checkpointPath(value.target),
          previousPath = path.replace(/\.json$/, ".previous.json"),
          old = await optionalBytes(root, path),
          prior = await optionalBytes(root, previousPath);
        if ((old ? digest(old) : null) !== value.expectedRevision)
          conflict(
            "Another browser changed this disk checkpoint. Compare/export before replacing it.",
          );
        if (old) await checkpointEnvelope(root, old, value.target);
        if (prior) await checkpointEnvelope(root, prior, value.target);
        const envelope = {
            version: 1,
            target: value.target,
            checkoutId: value.value.checkoutId,
            writerId: value.writerId,
            updatedAt: new Date().toISOString(),
            value: value.value,
          },
          bytes = catalogJSON(envelope);
        await editorStateQuota(
          root,
          new Map([
            [path, bytes],
            [previousPath, old],
          ]),
          quota,
        );
        const temporary = path + "." + randomBytes(16).toString("hex") + ".tmp";
        if (old)
          await editorStateQuota(root, new Map([[temporary, old]]), quota);
        await editorStateQuota(
          root,
          new Map([
            [previousPath, old],
            [temporary, bytes],
          ]),
          quota,
        );
        if (old) await atomic(root, previousPath, old, quota);
        await atomic(root, path, bytes, quota);
        return {
          revision: digest(bytes),
          updatedAt: envelope.updatedAt,
          writerId: value.writerId,
        };
      });
    }
    if (action === "checkpoint-clear") {
      exact(value, "target expectedRevision confirmed");
      assert(value.confirmed === true, "Confirm clearing this checkpoint");
      validatePageTarget(value.target);
      return locked(async () => {
        assert(
          !(await optionalBytes(
            root,
            ".author-state/page-operations/active.json",
          )),
          "Resolve the pending Save before clearing recovery checkpoints",
        );
        const path = await checkpointPath(value.target),
          bytes = await optionalBytes(root, path);
        if ((bytes ? digest(bytes) : null) !== value.expectedRevision)
          conflict("Checkpoint changed; clearing was cancelled");
        for (const p of [path, path.replace(/\.json$/, ".previous.json")])
          if (await assertSafePath(root, p, { optional: true }))
            await unlink(join(root, p));
        return { cleared: true };
      });
    }
    if (action === "history-prune") {
      exact(value, "target ids confirmed");
      assert(
        value.confirmed === true &&
          Array.isArray(value.ids) &&
          value.ids.length <= 5,
        "Confirm removing selected local revisions",
      );
      value.ids.forEach(id32);
      return locked(async () => {
        assert(
          !(await optionalBytes(
            root,
            ".author-state/page-operations/active.json",
          )),
          "Resolve the pending Save before pruning revisions",
        );
        const entries = await historyEntries(root, value.target);
        for (const id of value.ids)
          assert(
            entries.some((e) => e.value.id === id),
            "Revision changed; reload before pruning",
          );
        for (const e of entries.filter((e) => value.ids.includes(e.value.id)))
          await unlink(join(root, e.path));
        return { pruned: value.ids.length };
      });
    }
    throw Error("Unknown editor tool action");
  }
  return {
    get,
    post,
    async close() {
      closing = true;
      await Promise.allSettled([...admissions]);
      if (child) await child.terminate();
      await completion?.catch(() => {});
    },
  };
}
