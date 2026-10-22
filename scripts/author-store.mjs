import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  opendir,
  readdir,
  rename,
  unlink,
} from "node:fs/promises";
import { resolve, join, dirname, relative, sep, parse } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { LIMITS, parseBounded } from "../src/content/limits.mjs";
import { validatePack } from "../src/content/validate.mjs";
import { imageInfo, bytesFromBase64 } from "../src/content/portable.mjs";
import { validatePNGPixelStream } from "../src/content/bundled-assets.mjs";

export const AUTHOR_LIMITS = Object.freeze({
  requestBytes: 20 * 1024 * 1024,
  uploadBytes: 8 * 1024 * 1024,
  uploads: 32,
  transactionBytes: 64 * 1024 * 1024,
  transactionFiles: 25000,
});
const STATE = ".author-state",
  JOURNAL = `${STATE}/journal.json`,
  LOCK = `${STATE}/current.lock`;
const slug = "[a-z0-9]+(?:-[a-z0-9]+)*",
  id = "[a-z][a-z0-9-]*_[a-z0-9][a-z0-9-]*";
const groups =
  "sources|items|weapons|recipes|objectives|guides|maps|locations|claims|assets";
const categories =
  "items|weapons|recipes|objectives|guides|maps|locations|other";
const paths = [
  /^content\/catalog\/manifest\.json$/,
  new RegExp(`^content/catalog/${slug}/pack\\.json$`),
  new RegExp(`^content/catalog/${slug}/(?:${groups})/${id}\\.json$`),
  new RegExp(
    `^media/${slug}/(?:${categories})/${id}/(?:original|thumbnail)\\.(?:png|jpg|jpeg|webp)$`,
  ),
  new RegExp(`^media/${slug}/ORIGIN\\.txt$`),
];
const legacyPaths = [
  new RegExp(`^content/packs/${slug}\\.json$`),
  /^content\/assets\/[a-z][a-z0-9-]*_[a-z0-9][a-z0-9-]*\/(?:ORIGIN\.txt|assets\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp))$/,
];
const digest = (bytes) =>
  bytes === null ? null : createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (v) => Buffer.from(JSON.stringify(v, null, 2) + "\n");
const queues = new Map();
const activeReads = new Map();
export class AuthorError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
const check = (ok, message, code = "INVALID_CONTENT", status = 422) => {
  if (!ok) throw new AuthorError(code, message, status);
};
export function isManagedPath(path, { legacy = false } = {}) {
  return (
    typeof path === "string" &&
    path.length <= 400 &&
    [...paths, ...(legacy ? legacyPaths : [])].some((re) => re.test(path)) &&
    !path
      .split("/")
      .some((p) => /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))
  );
}
async function exists(path) {
  try {
    return await lstat(path);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
async function safePath(
  root,
  rel,
  { createParents = false, directory = false } = {},
) {
  const target = resolve(root, rel),
    relation = relative(root, target);
  check(
    relation &&
      relation !== ".." &&
      !relation.startsWith(".." + sep) &&
      !parse(relation).root,
    "Unsafe repository path",
  );
  let current = parse(root).root;
  for (const part of relative(current, root).split(sep).filter(Boolean)) {
    current = join(current, part);
    const info = await lstat(current);
    check(
      info.isDirectory() && !info.isSymbolicLink(),
      "Repository path contains a symlink or non-directory",
    );
  }
  const parts = relation.split(sep);
  for (let i = 0; i < parts.length; i++) {
    const parent = current;
    const siblings = await readdir(parent);
    check(
      !siblings.some(
        (s) => s !== parts[i] && s.toLowerCase() === parts[i].toLowerCase(),
      ),
      "Case-colliding repository path",
    );
    current = join(parent, parts[i]);
    const last = i === parts.length - 1;
    let info = await exists(current);
    if (!info && (!last || directory) && createParents) {
      try {
        await mkdir(current);
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
      }
      info = await lstat(current);
    }
    if (!info) return target;
    check(
      !info.isSymbolicLink() &&
        (last && !directory ? info.isFile() : info.isDirectory()),
      "Repository path is not a regular file or directory",
    );
  }
  return target;
}
async function bytesAt(root, rel, limit = AUTHOR_LIMITS.transactionBytes) {
  const path = await safePath(root, rel),
    info = await exists(path);
  if (!info) return null;
  check(
    info.isFile() && info.size <= limit,
    "Repository file exceeds safety limit",
    "LIMIT_EXCEEDED",
    413,
  );
  const handle = await open(
    path,
    constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
  );
  try {
    const stat = await handle.stat();
    check(
      stat.isFile() && stat.size <= limit,
      "Repository file changed or exceeds limit",
    );
    const buffer = Buffer.alloc(stat.size + 1);
    let total = 0;
    while (total < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        total,
        buffer.length - total,
        null,
      );
      if (!bytesRead) break;
      total += bytesRead;
    }
    check(
      total === stat.size,
      "Repository file changed during its bounded read",
      "RECOVERY_CONFLICT",
      409,
    );
    await safePath(root, rel);
    return buffer.subarray(0, total);
  } finally {
    await handle.close();
  }
}
async function syncDirectory(path) {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY);
    await handle.sync();
  } catch (e) {
    if (
      !(
        process.platform === "win32" &&
        ["EPERM", "EACCES", "EINVAL", "EISDIR", "ENOTSUP"].includes(e.code)
      )
    )
      throw e;
  } finally {
    await handle?.close();
  }
}
async function durableCreate(root, rel, bytes) {
  const path = await safePath(root, rel, { createParents: true });
  const handle = await open(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      (constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await syncDirectory(dirname(path));
}
async function removeFile(root, rel) {
  const p = await safePath(root, rel);
  await unlink(p);
  await syncDirectory(dirname(p));
}
async function serial(root, operation) {
  const previous = queues.get(root) || Promise.resolve();
  const pending = Promise.allSettled([
    previous,
    ...(activeReads.get(root) || []),
  ]).then(operation);
  queues.set(root, pending);
  try {
    return await pending;
  } finally {
    if (queues.get(root) === pending) queues.delete(root);
  }
}
async function sharedRead(root, operation) {
  const previous = queues.get(root) || Promise.resolve();
  const pending = previous.catch(() => {}).then(operation);
  const readers = activeReads.get(root) || new Set();
  activeReads.set(root, readers);
  readers.add(pending);
  try {
    return await pending;
  } finally {
    readers.delete(pending);
    if (!readers.size && activeReads.get(root) === readers)
      activeReads.delete(root);
  }
}
async function acquireLock(root) {
  const owner = {
    version: 1,
    pid: process.pid,
    processStart: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    token: randomBytes(24).toString("hex"),
  };
  const bytes = jsonBytes(owner);
  try {
    await durableCreate(root, LOCK, bytes);
  } catch (e) {
    if (e.code === "EEXIST")
      throw new AuthorError(
        "REPOSITORY_BUSY",
        "Another Studio writer or interrupted lock exists. Use author:recover to inspect it.",
        409,
      );
    throw e;
  }
  return async () => {
    if (digest(await bytesAt(root, LOCK)) === digest(bytes))
      await removeFile(root, LOCK);
  };
}
async function withLock(root, operation) {
  return serial(root, async () => {
    const release = await acquireLock(root);
    try {
      return await operation();
    } finally {
      await release();
    }
  });
}
// Capture raw catalog/media bytes only. Queued store operations must not be
// called inside this boundary: they would wait for the lock already held here.
export async function withRepositorySnapshot({ root }, operation) {
  root = resolve(root);
  return withLock(root, async () => {
    const recovery = await inspectRecovery({ root });
    check(
      !recovery.pending,
      "An interrupted save requires author:recover",
      "RECOVERY_REQUIRED",
      409,
    );
    return operation();
  });
}
function validatePlan(before, after, markerPath) {
  check(
    before instanceof Map && after instanceof Map,
    "Internal file plan requires Maps",
  );
  const names = [...new Set([...before.keys(), ...after.keys()])].sort();
  check(
    names.length <= AUTHOR_LIMITS.transactionFiles,
    "Too many changed files",
    "LIMIT_EXCEEDED",
    413,
  );
  let bytes = 0;
  const changed = [];
  for (const path of names) {
    check(
      isManagedPath(path, { legacy: true }) &&
        before.has(path) &&
        after.has(path),
      "File plan contains an unapproved or incomplete path",
    );
    const old = before.get(path),
      next = after.get(path);
    check(
      (old === null || old instanceof Uint8Array) &&
        (next === null || next instanceof Uint8Array),
      "Invalid file plan bytes",
    );
    check(
      paths.some((re) => re.test(path)) || next === null,
      "Legacy files may only be retired",
    );
    if (digest(old) === digest(next)) continue;
    bytes += (old?.length || 0) + (next?.length || 0);
    changed.push({
      path,
      beforeHash: digest(old),
      afterHash: digest(next),
      beforeBytes: old?.length || 0,
      afterBytes: next?.length || 0,
    });
  }
  check(
    bytes <= AUTHOR_LIMITS.transactionBytes,
    "Change exceeds the recoverable transaction limit; save a smaller batch",
    "LIMIT_EXCEEDED",
    413,
  );
  check(
    markerPath === "content/catalog/manifest.json",
    "Invalid publication marker",
  );
  changed.sort(
    (a, b) =>
      (a.path === markerPath) - (b.path === markerPath) ||
      (a.afterHash === null) - (b.afterHash === null) ||
      Number(!a.path.startsWith("media/")) -
        Number(!b.path.startsWith("media/")) ||
      a.path.localeCompare(b.path),
  );
  return changed;
}
async function verifyExpected(root, entry, hash) {
  check(
    digest(await bytesAt(root, entry.path)) === hash,
    "A managed file changed independently. Nothing will overwrite that change.",
    "RECOVERY_CONFLICT",
    409,
  );
}
async function install(
  root,
  tx,
  index,
  entry,
  direction,
  expectedHash,
  failpoint,
) {
  const hash = entry[`${direction}Hash`];
  if (hash === null) {
    await failpoint?.("before-publish", index);
    await verifyExpected(root, entry, expectedHash);
    if (await exists(join(root, entry.path)))
      await removeFile(root, entry.path);
    return;
  }
  const blob = `${STATE}/transactions/${tx}/${direction}/${index}.bin`;
  const bytes = await bytesAt(root, blob);
  check(
    bytes !== null && digest(bytes) === hash,
    "Recovery backup is missing or changed",
    "RECOVERY_CONFLICT",
    409,
  );
  const temporary = `${STATE}/transactions/${tx}/install-${index}-${randomBytes(6).toString("hex")}.tmp`;
  await durableCreate(root, temporary, bytes);
  const target = await safePath(root, entry.path, { createParents: true });
  await failpoint?.("before-publish", index);
  await verifyExpected(root, entry, expectedHash);
  await rename(join(root, temporary), target);
  await syncDirectory(dirname(target));
}
async function applyPlanLocked({
  root,
  before,
  after,
  markerPath = "content/catalog/manifest.json",
  failpoint,
}) {
  check(
    !(await bytesAt(root, JOURNAL)),
    "An interrupted save requires author:recover before writing",
    "RECOVERY_REQUIRED",
    409,
  );
  const entries = validatePlan(before, after, markerPath);
  // Verify the complete supplied snapshot, including unchanged files.
  for (const [path, bytes] of before) {
    check(isManagedPath(path, { legacy: true }), "Unapproved snapshot path");
    await verifyExpected(root, { path }, digest(bytes));
  }
  if (!entries.length) return { transactionId: null, paths: [] };
  const transactionId = randomBytes(16).toString("hex");
  for (const [i, e] of entries.entries()) {
    if (e.beforeHash !== null)
      await durableCreate(
        root,
        `${STATE}/transactions/${transactionId}/before/${i}.bin`,
        before.get(e.path),
      );
    if (e.afterHash !== null)
      await durableCreate(
        root,
        `${STATE}/transactions/${transactionId}/after/${i}.bin`,
        after.get(e.path),
      );
  }
  const journal = {
    format: "dmz-author-transaction",
    version: 1,
    transactionId,
    markerPath,
    entries,
  };
  await durableCreate(root, JOURNAL, jsonBytes(journal));
  try {
    await failpoint?.("prepared", -1);
    for (const [i, entry] of entries.entries()) {
      await verifyExpected(root, entry, entry.beforeHash);
      await install(
        root,
        transactionId,
        i,
        entry,
        "after",
        entry.beforeHash,
        failpoint,
      );
      await failpoint?.("applied", i);
    }
    for (const entry of entries)
      await verifyExpected(root, entry, entry.afterHash);
    await durableCreate(
      root,
      `${STATE}/transactions/${transactionId}/outcome.json`,
      jsonBytes({
        state: "committed",
        transactionId,
        paths: entries.map(({ path, beforeHash, afterHash }) => ({
          path,
          beforeHash,
          afterHash,
        })),
      }),
    );
    await failpoint?.("committed", entries.length);
    await removeFile(root, JOURNAL);
    return { transactionId, paths: entries.map((e) => e.path) };
  } catch (e) {
    if (e instanceof AuthorError) throw e;
    throw new AuthorError(
      "RECOVERY_REQUIRED",
      "Save was interrupted. Your draft and repository recovery files are retained; run author:recover.",
      409,
    );
  }
}
export async function applyFilePlan(options) {
  const root = resolve(options.root);
  return withLock(root, () => applyPlanLocked({ ...options, root }));
}
async function loadJournal(root) {
  const bytes = await bytesAt(root, JOURNAL, 8 * 1024 * 1024);
  if (!bytes) return null;
  const j = parseBounded(bytes.toString("utf8"), 8 * 1024 * 1024, {
    depth: 8,
    nodes: 300000,
    string: 1000,
  });
  check(
    j.format === "dmz-author-transaction" &&
      j.version === 1 &&
      /^[a-f0-9]{32}$/.test(j.transactionId) &&
      j.markerPath === "content/catalog/manifest.json" &&
      Array.isArray(j.entries) &&
      j.entries.length <= AUTHOR_LIMITS.transactionFiles,
    "Unsupported recovery journal",
    "RECOVERY_CONFLICT",
    409,
  );
  const seen = new Set();
  let total = 0;
  for (const e of j.entries) {
    check(
      isManagedPath(e.path, { legacy: true }) &&
        !seen.has(e.path.toLowerCase()),
      "Unsafe recovery path",
      "RECOVERY_CONFLICT",
      409,
    );
    seen.add(e.path.toLowerCase());
    for (const direction of ["before", "after"]) {
      check(
        e[`${direction}Hash`] === null ||
          /^[a-f0-9]{64}$/.test(e[`${direction}Hash`]),
        "Invalid recovery hash",
        "RECOVERY_CONFLICT",
        409,
      );
      check(
        Number.isInteger(e[`${direction}Bytes`]) && e[`${direction}Bytes`] >= 0,
        "Invalid recovery byte count",
        "RECOVERY_CONFLICT",
        409,
      );
      total += e[`${direction}Bytes`];
    }
    check(
      paths.some((re) => re.test(e.path)) || e.afterHash === null,
      "Invalid legacy recovery operation",
      "RECOVERY_CONFLICT",
      409,
    );
  }
  check(
    total <= AUTHOR_LIMITS.transactionBytes,
    "Recovery exceeds bounded size",
    "RECOVERY_CONFLICT",
    409,
  );
  return { journal: j, revision: digest(bytes) };
}
async function lockStatus(root) {
  const bytes = await bytesAt(root, LOCK, 4096);
  if (!bytes) return null;
  let owner;
  try {
    owner = parseBounded(bytes.toString("utf8"), 4096);
  } catch {
    return { state: "unknown", hash: digest(bytes) };
  }
  if (
    !Number.isInteger(owner.pid) ||
    owner.pid < 1 ||
    !/^[a-f0-9]{48}$/.test(owner.token) ||
    typeof owner.processStart !== "string"
  )
    return { state: "unknown", hash: digest(bytes) };
  let state = "live";
  try {
    process.kill(owner.pid, 0);
  } catch (e) {
    state = e.code === "ESRCH" ? "dead" : "unknown";
  }
  return { state, pid: owner.pid, hash: digest(bytes) };
}
export async function inspectRecovery({ root }) {
  root = resolve(root);
  const loaded = await loadJournal(root),
    lock = await lockStatus(root);
  if (!loaded)
    return {
      pending: false,
      lock: lock && { state: lock.state, pid: lock.pid },
    };
  const { journal, revision } = loaded,
    conflicts = [];
  for (const [i, e] of journal.entries.entries()) {
    const hash = digest(await bytesAt(root, e.path));
    if (hash !== e.beforeHash && hash !== e.afterHash) conflicts.push(e.path);
    for (const direction of ["before", "after"])
      if (e[`${direction}Hash`] !== null) {
        const backup = await bytesAt(
          root,
          `${STATE}/transactions/${journal.transactionId}/${direction}/${i}.bin`,
        );
        check(
          backup !== null &&
            backup.length === e[`${direction}Bytes`] &&
            digest(backup) === e[`${direction}Hash`],
          "Recovery backup is missing or changed",
          "RECOVERY_CONFLICT",
          409,
        );
      }
  }
  return {
    pending: true,
    transactionId: journal.transactionId,
    revision,
    paths: journal.entries.map((e) => e.path),
    conflicts,
    lock: lock && { state: lock.state, pid: lock.pid },
  };
}
export async function recoverRepository({
  root,
  apply = false,
  expectedRecoveryRevision,
}) {
  root = resolve(root);
  const preview = await inspectRecovery({ root });
  if (!apply) return preview;
  check(
    !preview.conflicts?.length,
    "Recovery stopped because a managed file changed independently",
    "RECOVERY_CONFLICT",
    409,
  );
  if (expectedRecoveryRevision)
    check(
      preview.revision === expectedRecoveryRevision,
      "Recovery state changed; preview again",
      "STALE_REVISION",
      409,
    );
  const lock = await lockStatus(root);
  if (lock) {
    check(
      lock.state === "dead",
      "Recovery cannot reclaim a live or unverified process lock",
      "REPOSITORY_BUSY",
      409,
    );
    check(
      digest(await bytesAt(root, LOCK)) === lock.hash,
      "Lock changed during recovery",
      "REPOSITORY_BUSY",
      409,
    );
    await removeFile(root, LOCK);
  }
  return withLock(root, async () => {
    const fresh = await inspectRecovery({ root });
    check(
      !fresh.conflicts?.length && fresh.revision === preview.revision,
      "Recovery state changed; preview again",
      "RECOVERY_CONFLICT",
      409,
    );
    const loaded = await loadJournal(root);
    if (!loaded) return { recovered: false, pending: false };
    const { journal } = loaded;
    const outcome = await bytesAt(
      root,
      `${STATE}/transactions/${journal.transactionId}/outcome.json`,
      8 * 1024 * 1024,
    );
    let committed = false;
    if (outcome) {
      const receipt = parseBounded(outcome.toString("utf8"), 8 * 1024 * 1024);
      check(
        receipt.state === "committed" &&
          receipt.transactionId === journal.transactionId &&
          Array.isArray(receipt.paths) &&
          receipt.paths.length === journal.entries.length &&
          receipt.paths.every(
            (item, i) =>
              item &&
              item.path === journal.entries[i].path &&
              item.beforeHash === journal.entries[i].beforeHash &&
              item.afterHash === journal.entries[i].afterHash,
          ),
        "Recovery outcome receipt is invalid or changed",
        "RECOVERY_CONFLICT",
        409,
      );
      committed = true;
    }
    for (const [i, e] of [...journal.entries.entries()].reverse()) {
      const current = digest(await bytesAt(root, e.path));
      const target = committed ? e.afterHash : e.beforeHash;
      if (current === target) continue;
      check(
        current === (committed ? e.beforeHash : e.afterHash),
        "Recovery found an independent change",
        "RECOVERY_CONFLICT",
        409,
      );
      await install(
        root,
        journal.transactionId,
        i,
        e,
        committed ? "after" : "before",
        current,
      );
    }
    for (const e of journal.entries)
      await verifyExpected(root, e, committed ? e.afterHash : e.beforeHash);
    await removeFile(root, JOURNAL);
    return {
      recovered: true,
      pending: false,
      transactionId: journal.transactionId,
      outcome: committed ? "committed" : "rolled-back",
    };
  });
}
export async function validateAuthorPNG(bytes) {
  const info = imageInfo(bytes);
  check(
    info.mime === "image/png",
    "New pictures must be browser-normalized PNG",
  );
  const safeChunks = new Set([
    "IHDR",
    "PLTE",
    "tRNS",
    "IDAT",
    "IEND",
    "sRGB",
    "gAMA",
    "cHRM",
  ]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let at = 8; at + 12 <= bytes.length; ) {
    const size = view.getUint32(at),
      type = Buffer.from(bytes.subarray(at + 4, at + 8)).toString("ascii");
    check(
      safeChunks.has(type),
      "PNG contains unsupported embedded metadata; normalize the picture again",
    );
    at += size + 12;
  }
  await validatePNGPixelStream(bytes);
  return { ...info, bytes: bytes.length, sha256: digest(bytes) };
}
export async function createAuthorStore({ root, schema }) {
  root = resolve(root);
  const {
    readCatalog,
    readCatalogAsset,
    serializeCatalog,
    catalogAssetPath,
    catalogJSON,
  } = await import("./catalog.mjs");
  if (!schema) {
    const schemaBytes = await bytesAt(
      root,
      "schemas/pack.schema.json",
      1024 * 1024,
    );
    check(schemaBytes !== null, "Repository schema is missing");
    schema = parseBounded(
      new TextDecoder("utf-8", { fatal: true }).decode(schemaBytes),
      1024 * 1024,
    );
  }
  const snapshot = async () => {
    const recovery = await inspectRecovery({ root });
    check(
      !recovery.pending,
      "An interrupted save requires author:recover",
      "RECOVERY_REQUIRED",
      409,
    );
    return readCatalog({ root, schema });
  };
  const store = {
    schema,
    async read() {
      const state = await snapshot();
      return {
        schema,
        revision: state.revision,
        entries: state.entries,
        recovery: null,
      };
    },
    async media(packKey, assetId) {
      const { asset, bytes, sourcePath } = await readCatalogAsset({
        root,
        schema,
        packKey,
        assetId,
      });
      check(
        isManagedPath(sourcePath) &&
          bytes &&
          digest(bytes) === asset.sha256 &&
          bytes.length === asset.bytes,
        "Picture source has changed",
      );
      return { bytes, mime: asset.mime };
    },
    async save(input) {
      return withLock(root, async () => {
        check(
          input &&
            Object.keys(input).every((k) =>
              ["packKey", "expectedRevision", "pack", "uploads"].includes(k),
            ),
          "Unknown save field or private data",
        );
        check(
          typeof input.packKey === "string" &&
            new RegExp(`^${slug}$`).test(input.packKey) &&
            input.packKey.length <= 80,
          "Invalid catalog key",
        );
        const current = await snapshot();
        check(
          typeof input.expectedRevision === "string" &&
            current.revision === input.expectedRevision,
          "The repository changed. Export your draft or reload after reviewing your changes.",
          "STALE_REVISION",
          409,
        );
        const pack = structuredClone(input.pack),
          existing = current.entries.find((e) => e.key === input.packKey);
        check(
          !existing || pack.id === existing.pack.id,
          "Existing catalog identity cannot change",
        );
        check(
          !current.entries.some(
            (e) => e.key !== input.packKey && e.pack.id === pack.id,
          ),
          "Catalog ID already exists",
        );
        validatePack(pack, schema, { profile: "published" });
        check(
          !existing ||
            digest(catalogJSON(pack)) === digest(catalogJSON(existing.pack)) ||
            pack.contentVersion !== existing.pack.contentVersion,
          "Change the content version when saving changed public content",
        );
        const uploads = input.uploads || [];
        check(
          Array.isArray(uploads) && uploads.length <= AUTHOR_LIMITS.uploads,
          "Upload batch exceeds picture count",
          "LIMIT_EXCEEDED",
          413,
        );
        const assetSources = {},
          uploaded = new Map(),
          seen = new Set();
        let total = 0;
        for (const upload of uploads) {
          check(
            upload &&
              Object.keys(upload).every((k) =>
                [
                  "assetId",
                  "base64",
                  "category",
                  "parentAssetId",
                  "variant",
                ].includes(k),
              ),
            "Unknown upload field",
          );
          check(!seen.has(upload.assetId), "Duplicate upload ID");
          seen.add(upload.assetId);
          const asset = pack.assets.find((a) => a.id === upload.assetId);
          check(asset, "Upload does not match a catalog picture");
          check(
            new RegExp(`^(?:${categories})$`).test(upload.category),
            "Invalid picture category",
          );
          check(
            upload.variant === undefined || upload.variant === "thumbnail",
            "Invalid derivative variant",
          );
          check(
            upload.parentAssetId === undefined ||
              (upload.variant === "thumbnail" &&
                upload.parentAssetId !== asset.id &&
                pack.assets.some((a) => a.id === upload.parentAssetId)),
            "Invalid thumbnail parent",
          );
          const bytes = bytesFromBase64(upload.base64);
          total += bytes.length;
          check(
            total <= AUTHOR_LIMITS.uploadBytes,
            "Upload batch exceeds 8 MiB",
            "LIMIT_EXCEEDED",
            413,
          );
          const actual = await validateAuthorPNG(bytes);
          check(
            ["mime", "width", "height", "bytes", "sha256"].every(
              (k) => actual[k] === asset[k],
            ),
            "Picture metadata does not match normalized PNG bytes",
          );
          assetSources[asset.id] = {
            sourcePath: catalogAssetPath(
              input.packKey,
              upload.category,
              asset.id,
              asset.mime,
              upload.variant || "original",
            ),
            category: upload.category,
            ...(upload.parentAssetId
              ? { parentAssetId: upload.parentAssetId, variant: "thumbnail" }
              : {}),
          };
          uploaded.set(assetSources[asset.id].sourcePath, bytes);
        }
        for (const asset of pack.assets) {
          check(
            asset.redistributionAllowed === true &&
              ["rightsHolder", "license", "attribution"].every(
                (k) => typeof asset[k] === "string" && asset[k].trim(),
              ),
            "Every public picture requires distribution rights and attribution",
          );
          if (!assetSources[asset.id]) {
            const source = existing?.assetSources[asset.id];
            check(
              source && isManagedPath(source.sourcePath),
              "New picture is missing its uploaded pixels",
            );
            const bytes = current.files.get(source.sourcePath);
            check(
              bytes &&
                digest(bytes) === asset.sha256 &&
                bytes.length === asset.bytes,
              "Existing picture bytes changed or need re-uploading",
            );
            const info = imageInfo(bytes);
            check(
              ["mime", "width", "height"].every((k) => info[k] === asset[k]),
              "Existing picture metadata mismatch",
            );
            assetSources[asset.id] = structuredClone(source);
          }
        }
        const entry = { key: input.packKey, pack, assetSources };
        const entries = current.entries.filter((e) => e.key !== input.packKey);
        entries.push(entry);
        entries.sort((a, b) => a.key.localeCompare(b.key));
        const after = await serializeCatalog({
          entries,
          schema,
          provenance: current.provenance || new Map(),
        });
        for (const e of entries)
          for (const source of Object.values(e.assetSources))
            after.set(
              source.sourcePath,
              uploaded.get(source.sourcePath) ||
                current.files.get(source.sourcePath),
            );
        for (const [path, bytes] of current.provenance || [])
          after.set(path, bytes);
        const before = new Map(current.files);
        for (const path of after.keys())
          if (!before.has(path)) before.set(path, null);
        for (const path of before.keys())
          if (!after.has(path)) after.set(path, null);
        const result = await applyPlanLocked({ root, before, after });
        const saved = await snapshot();
        return {
          ok: true,
          revision: saved.revision,
          paths: result.paths,
          transactionId: result.transactionId,
          entry: saved.entries.find((e) => e.key === input.packKey),
        };
      });
    },
    async changes() {
      const state = await snapshot();
      const known = new Set(
        [...state.files.keys()].filter((p) => isManagedPath(p)),
      );
      let historyTruncated = false;
      let historyBudget = 8 * 1024 * 1024;
      // Completed receipts retain deleted managed paths across author restarts.
      const transactionFolder = await safePath(root, `${STATE}/transactions`, {
        directory: true,
      });
      if (await exists(transactionFolder)) {
        const transactions = (await readdir(transactionFolder)).filter((name) =>
          /^[a-f0-9]{32}$/.test(name),
        );
        historyTruncated = transactions.length > 1000;
        if (transactions.length <= 1000)
          for (const tx of transactions) {
            const receipt = `${STATE}/transactions/${tx}/outcome.json`;
            const receiptPath = await safePath(root, receipt);
            const receiptStat = await exists(receiptPath);
            if (receiptStat && receiptStat.size > historyBudget) {
              historyTruncated = true;
              break;
            }
            const bytes = await bytesAt(root, receipt, historyBudget);
            if (!bytes) continue;
            historyBudget -= bytes.length;
            const outcome = parseBounded(
              bytes.toString("utf8"),
              8 * 1024 * 1024,
            );
            if (
              outcome.state !== "committed" ||
              outcome.transactionId !== tx ||
              !Array.isArray(outcome.paths)
            )
              continue;
            for (const item of outcome.paths)
              if (
                isManagedPath(item.path) &&
                [item.beforeHash, item.afterHash].every(
                  (h) => h === null || /^[a-f0-9]{64}$/.test(h),
                )
              )
                known.add(item.path);
          }
      }
      const inventory = [...known].sort();
      const files = [];
      let truncated = historyTruncated;
      try {
        const hooks = await safePath(root, `${STATE}/empty-hooks`, {
          createParents: true,
          directory: true,
        });
        for (let i = 0; i < inventory.length; i += 100) {
          const batch = inventory.slice(i, i + 100),
            prefix = [
              "--no-optional-locks",
              "--literal-pathspecs",
              "-c",
              "core.fsmonitor=false",
              "-c",
              `core.hooksPath=${hooks}`,
            ];
          const cleanEnvironment = Object.fromEntries(
            Object.entries(process.env).filter(
              ([key]) => !key.startsWith("GIT_"),
            ),
          );
          const options = {
            cwd: root,
            shell: false,
            timeout: 5000,
            maxBuffer: 1024 * 1024,
            env: {
              ...cleanEnvironment,
              GIT_OPTIONAL_LOCKS: "0",
              GIT_PAGER: "cat",
              GIT_EXTERNAL_DIFF: "",
              GIT_LITERAL_PATHSPECS: "1",
            },
          };
          // ls-files never hashes worktree bytes through configured clean filters.
          const { stdout } = await promisify(execFile)(
            "git",
            [...prefix, "ls-files", "--stage", "-z", "--", ...batch],
            options,
          );
          const indexed = new Map();
          for (const item of stdout.split("\0").filter(Boolean)) {
            const match =
              /^(\d+) ([a-f0-9]{40}|[a-f0-9]{64}) ([0-3])\t(.+)$/.exec(item);
            if (match && batch.includes(match[4]))
              indexed.set(match[4], { hash: match[2], stage: match[3] });
          }
          const staged = await promisify(execFile)(
            "git",
            [
              ...prefix,
              "diff",
              "--cached",
              "--name-only",
              "--no-ext-diff",
              "--no-textconv",
              "--ignore-submodules=all",
              "-z",
              "--",
              ...batch,
            ],
            options,
          );
          const stagedNames = new Set(staged.stdout.split("\0"));
          for (const path of batch) {
            const bytes = state.files.get(path),
              index = indexed.get(path);
            let status = stagedNames.has(path) ? "staged" : "";
            if (!bytes && index) status = "deleted";
            else if (bytes && !index) status = "untracked";
            else if (bytes && index) {
              const blob = createHash(
                index.hash.length === 40 ? "sha1" : "sha256",
              )
                .update(`blob ${bytes.length}\0`)
                .update(bytes)
                .digest("hex");
              if (blob !== index.hash)
                status = status ? "staged and modified" : "modified";
              if (index.stage !== "0") status = "conflict";
            } else if (stagedNames.has(path)) status = "staged deletion";
            if (status) files.push({ path, status });
            if (files.length >= 1000) {
              truncated = true;
              break;
            }
          }
          if (files.length >= 1000) break;
        }
        return { files, truncated, gitAvailable: true };
      } catch {
        return {
          files: [],
          truncated: false,
          gitAvailable: false,
          message:
            "Git review unavailable. Review the saved file paths with your usual Git tools.",
        };
      }
    },
  };
  // Readers run together, but never overlap a cooperative writer. Internal
  // snapshots stay unqueued so a transaction can validate without deadlocking.
  return {
    ...store,
    read: () => sharedRead(root, () => store.read()),
    media: (packKey, assetId) =>
      sharedRead(root, () => store.media(packKey, assetId)),
    changes: () => sharedRead(root, () => store.changes()),
  };
}

// Point-in-time evidence for manual archival review only. Receipts are also used
// by changes() to track deleted paths, so eligible never means safe to delete.
export async function inspectRecoveryStorage({ root }) {
  root = resolve(root);
  const result = {
    complete: true,
    transactionCount: 0,
    fileCount: 0,
    bytes: 0,
    transactions: [],
    warnings: [],
  };
  const observed = new Map();
  let readBytes = 0,
    entryCount = 0;
  const stamp = (s) => `${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}:${s.ctimeMs}`;
  const uncertain = (message) => {
    result.complete = false;
    result.warnings.push(message);
  };
  async function stat(path) {
    const info = await lstat(path);
    if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory()))
      throw new Error("Unsupported recovery path type");
    if (observed.has(path) && observed.get(path) !== stamp(info))
      throw new Error("Recovery path changed during inspection");
    observed.set(path, stamp(info));
    return info;
  }
  async function read(path, limit) {
    const info = await stat(path);
    if (
      !info.isFile() ||
      info.size > limit ||
      readBytes + info.size > 128 * 1024 * 1024
    )
      throw new Error("Recovery read limit reached");
    const handle = await open(
      path,
      constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
    );
    try {
      if (stamp(await handle.stat()) !== stamp(info))
        throw new Error("Recovery file changed during inspection");
      const bytes = Buffer.alloc(info.size + 1);
      let total = 0;
      while (total < bytes.length) {
        const part = await handle.read(
          bytes,
          total,
          bytes.length - total,
          total,
        );
        if (!part.bytesRead) break;
        total += part.bytesRead;
      }
      if (total !== info.size || stamp(await handle.stat()) !== stamp(info))
        throw new Error("Recovery file changed during inspection");
      readBytes += total;
      return bytes.subarray(0, total);
    } finally {
      await handle.close();
    }
  }
  async function list(path) {
    const info = await stat(path);
    if (!info.isDirectory())
      throw new Error("Recovery directory is not a directory");
    const names = [],
      folded = new Set();
    const dir = await opendir(path);
    for await (const entry of dir) {
      if (++entryCount > 55000) throw new Error("Recovery entry limit reached");
      if (folded.has(entry.name.toLowerCase()))
        throw new Error("Case-colliding recovery path");
      folded.add(entry.name.toLowerCase());
      names.push(entry.name);
      if (names.length > 50000)
        throw new Error("Recovery directory limit reached");
    }
    return names.sort();
  }
  try {
    // Validate ancestors without creating paths or traversing symlinks.
    let ancestor = parse(root).root;
    for (const part of relative(ancestor, root).split(sep).filter(Boolean)) {
      ancestor = join(ancestor, part);
      const info = await lstat(ancestor);
      if (!info.isDirectory() || info.isSymbolicLink())
        throw new Error("Unsafe recovery root");
    }
    const state = join(root, STATE);
    if (!(await exists(state))) return result;
    await stat(state);
    const blockers = [];
    for (const name of ["journal.json", "current.lock"]) {
      const path = join(state, name);
      if (await exists(path)) {
        await read(path, 8 * 1024 * 1024);
        blockers.push(`${name} exists; pending or locked state`);
      }
    }
    const folder = join(state, "transactions");
    if (!(await exists(folder))) {
      result.warnings.push(...blockers);
      return result;
    }
    const transactions = await list(folder);
    if (transactions.length > 1000)
      throw new Error("Recovery transaction limit reached; totals are partial");
    for (const transactionId of transactions) {
      if (!/^[a-f0-9]{32}$/.test(transactionId))
        throw new Error("Unsupported retained transaction name");
      const tx = {
        transactionId,
        fileCount: 0,
        bytes: 0,
        archiveEligible: false,
        reasons: [...blockers],
      };
      result.transactions.push(tx);
      result.transactionCount++;
      const base = join(folder, transactionId),
        files = new Map();
      async function walk(path, prefix = "", depth = 0) {
        if (depth > 3) throw new Error("Recovery depth limit reached");
        for (const name of await list(path)) {
          const file = join(path, name),
            rel = prefix + name,
            info = await stat(file);
          if (info.isDirectory()) await walk(file, rel + "/", depth + 1);
          else {
            if (++result.fileCount > 50000)
              throw new Error("Recovery file limit reached");
            tx.fileCount++;
            tx.bytes += info.size;
            result.bytes += info.size;
            files.set(rel, file);
          }
        }
      }
      await walk(base);
      try {
        if (!files.has("outcome.json")) throw new Error("No completed receipt");
        const receipt = parseBounded(
          (await read(files.get("outcome.json"), 8 * 1024 * 1024)).toString(
            "utf8",
          ),
          8 * 1024 * 1024,
        );
        if (
          receipt.state !== "committed" ||
          receipt.transactionId !== transactionId ||
          !Array.isArray(receipt.paths) ||
          !receipt.paths.length ||
          receipt.paths.length > AUTHOR_LIMITS.transactionFiles
        )
          throw new Error("Invalid completed receipt");
        const expected = new Set(["outcome.json"]),
          paths = new Set();
        for (const [i, item] of receipt.paths.entries()) {
          if (
            !item ||
            !isManagedPath(item.path, { legacy: true }) ||
            paths.has(item.path)
          )
            throw new Error("Invalid receipt path");
          if (item.beforeHash === null && item.afterHash === null)
            throw new Error("Receipt has no before or after content");
          paths.add(item.path);
          for (const direction of ["before", "after"]) {
            const hash = item[`${direction}Hash`];
            if (hash === null) continue;
            if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash))
              throw new Error("Invalid receipt digest");
            const name = `${direction}/${i}.bin`;
            expected.add(name);
            if (
              !files.has(name) ||
              digest(await read(files.get(name), 64 * 1024 * 1024)) !== hash
            )
              throw new Error("Retained backup missing or changed");
          }
        }
        if (
          files.size !== expected.size ||
          [...files.keys()].some((name) => !expected.has(name))
        )
          throw new Error("Unexpected retained files");
        tx.archiveEligible = !tx.reasons.length;
      } catch (error) {
        tx.reasons.push(error.message);
        if (/limit|changed during/.test(error.message))
          uncertain(error.message);
      }
    }
    for (const [path, expected] of observed) {
      if (stamp(await lstat(path)) !== expected)
        throw new Error("Recovery state changed during inspection");
    }
  } catch (error) {
    uncertain(error.message);
  }
  if (!result.complete)
    for (const tx of result.transactions) {
      tx.archiveEligible = false;
      tx.reasons.push("Incomplete or changing inventory; totals are partial");
    }
  result.warnings.push(
    "Archival eligibility is manual-review evidence only, never deletion permission. Retain receipts needed for repository history.",
  );
  return result;
}
