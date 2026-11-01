import { mkdir, open, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { assertSafePath, readCatalogFile } from "./catalog.mjs";
import { parseBounded } from "../src/content/limits.mjs";
import {
  codRoot,
  COD_PATH,
  codBytes,
  codHash,
  codIntel,
  readCodmunity,
} from "../src/content/codmunity.mjs";
import {
  COD_URLS,
  emptyCodmunity,
  validateCodmunity,
  codFacts,
  codCoverage,
  codDiff,
  validateMonitor,
} from "../src/domain/codmunity.mjs";
import definitions from "../src/domain/codmunity-metrics.json" with { type: "json" };
import { parseComparator } from "./codmunity-parser.mjs";
const PROPOSAL = ".local/codmunity-proposal.json",
  MONITOR = ".local/codmunity-monitor.json",
  LOCK = ".local/codmunity-writer.lock";
const decode = (bytes) =>
  new TextDecoder("utf-8", { fatal: true }).decode(bytes);
async function local(root) {
  if (
    !(await assertSafePath(root, ".local", { optional: true, directory: true }))
  )
    await mkdir(join(root, ".local"));
  await assertSafePath(root, ".local", { directory: true });
}
async function atomic(root, path, bytes) {
  await assertSafePath(root, path, { optional: true });
  const temp = join(root, path + "." + randomBytes(8).toString("hex") + ".tmp");
  let handle;
  try {
    handle = await open(temp, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await assertSafePath(root, path, { optional: true });
    await rename(temp, join(root, path));
  } finally {
    await handle?.close();
    await unlink(temp).catch(() => {});
  }
}
async function locked(root, work) {
  await local(root);
  await assertSafePath(root, LOCK, { optional: true });
  const h = await open(join(root, LOCK), "wx", 0o600);
  try {
    await h.writeFile(String(process.pid));
    await h.close();
    return await work();
  } finally {
    await h.close().catch(() => {});
    await unlink(join(root, LOCK));
  }
}
async function optionalJSON(root, path, max = 2 * 1024 * 1024) {
  if (!(await assertSafePath(root, path, { optional: true }))) return null;
  const bytes = await readCatalogFile(root, path, max);
  return {
    value: parseBounded(decode(bytes), max, {
      depth: 16,
      nodes: 50000,
      string: 1000,
    }),
    hash: codHash(bytes),
  };
}
export async function fetchComparator(mode, { signal } = {}) {
  if (!Object.hasOwn(COD_URLS, mode)) throw Error("Unknown comparator");
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, 20000);
  try {
    const response = await fetch(COD_URLS[mode], {
      redirect: "error",
      signal: controller.signal,
      headers: { "User-Agent": "DMZGuideLocal/1.0", Accept: "text/html" },
    });
    if (
      !response.ok ||
      !/^text\/html(?:;|$)/i.test(response.headers.get("content-type") || "")
    )
      throw Error("Comparator HTTP or content type failure");
    const parts = [];
    let bytes = 0;
    for await (const part of response.body) {
      bytes += part.length;
      if (bytes > 2 * 1024 * 1024) {
        controller.abort();
        throw Error("Comparator byte limit exceeded");
      }
      parts.push(part);
    }
    return decode(Buffer.concat(parts));
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
function probeResult(snapshot, db) {
  return {
    coverage: codCoverage(snapshot, db),
    sourceDate: snapshot.sourceDate,
    sourceHash: snapshot.sourceHash,
    warning: snapshot.warning,
  };
}
async function writeMonitor(root, next) {
  validateMonitor(next);
  const previous = (await optionalJSON(root, MONITOR, 16384))?.value;
  const old = previous ? validateMonitor(previous) : null;
  if (old && Date.parse(old.latestAttempt) > Date.parse(next.latestAttempt))
    return old;
  if (
    old?.lastSuccess &&
    (!next.lastSuccess ||
      Date.parse(old.lastSuccess.time) > Date.parse(next.lastSuccess.time))
  )
    next.lastSuccess = old.lastSuccess;
  await atomic(root, MONITOR, codBytes(next));
  return next;
}
export async function monitorCodmunity(
  root = codRoot,
  { fetcher = fetchComparator, signal, now = new Date().toISOString() } = {},
) {
  return locked(root, async () => {
    await local(root);
    const rawPrior = (await optionalJSON(root, MONITOR, 16384))?.value;
    const prior = rawPrior ? validateMonitor(rawPrior) : null;
    try {
      const db = await codIntel(root),
        s = parseComparator(
          await fetcher("dmz", { signal }),
          "dmz",
          db,
          definitions,
          { now },
        );
      const result = {
        latestAttempt: now,
        error: null,
        lastSuccess: { time: now, result: probeResult(s, db) },
      };
      return await writeMonitor(root, result);
    } catch (error) {
      const result = {
        latestAttempt: now,
        error: String(error.message || error).slice(0, 500),
        lastSuccess: prior?.lastSuccess || null,
      };
      const stored = await writeMonitor(root, result);
      if (signal?.aborted) throw error;
      return stored;
    }
  });
}
export async function checkCodmunity(
  root = codRoot,
  { fetcher = fetchComparator, signal } = {},
) {
  return locked(root, async () => {
    const db = await codIntel(root),
      before = await readCodmunity(root, db),
      content = emptyCodmunity(),
      controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const timer = setTimeout(abort, 45000);
    const now = new Date().toISOString();
    try {
      for (const mode of ["mw4", "dmz"])
        content.modes[mode] = parseComparator(
          await fetcher(mode, { signal: controller.signal }),
          mode,
          db,
          definitions,
          { now },
        );
      validateCodmunity(content, db, definitions);
      const proposal = { version: 1, baseRevision: before.revision, content };
      await writeMonitor(root, {
        latestAttempt: now,
        error: null,
        lastSuccess: {
          time: now,
          result: probeResult(content.modes.dmz, db),
        },
      });
      await atomic(root, PROPOSAL, codBytes(proposal));
      return {
        unchanged: codFacts(before.value) === codFacts(content),
        diff: codDiff(before.value, content, db),
      };
    } catch (error) {
      const rawPrior = (await optionalJSON(root, MONITOR, 16384))?.value;
      const prior = rawPrior ? validateMonitor(rawPrior) : null;
      await writeMonitor(root, {
        latestAttempt: now,
        error: String(error.message || error).slice(0, 500),
        lastSuccess: prior?.lastSuccess || null,
      });
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  });
}
async function readProposal(root, db) {
  const found = await optionalJSON(root, PROPOSAL);
  if (!found) return null;
  const p = found.value;
  if (
    !p ||
    Object.keys(p).sort().join() !== "baseRevision,content,version" ||
    p.version !== 1 ||
    !/^[a-f0-9]{64}$/.test(p.baseRevision)
  )
    throw Error("Invalid CODMunity proposal");
  validateCodmunity(p.content, db, definitions);
  return { ...found, proposal: p };
}
export async function applyCodmunity(root = codRoot, { proposalHash } = {}) {
  return locked(root, async () => {
    const db = await codIntel(root),
      before = await readCodmunity(root, db),
      found = await readProposal(root, db);
    if (!found || found.hash !== proposalHash)
      throw Error("Reviewed CODMunity proposal changed");
    if (before.revision !== found.proposal.baseRevision)
      throw Error("CODMunity baseline changed; recheck and review");
    if (codFacts(before.value) === codFacts(found.proposal.content))
      return { unchanged: true };
    await atomic(root, ".local/codmunity-backup.json", before.bytes);
    if ((await readCodmunity(root, db)).revision !== before.revision)
      throw Error("CODMunity baseline changed during apply");
    await atomic(root, COD_PATH, codBytes(found.proposal.content));
    return { unchanged: false };
  });
}
export async function codmunityStatus(root = codRoot) {
  const db = await codIntel(root),
    current = await readCodmunity(root, db),
    p = await readProposal(root, db),
    rawMonitor = (await optionalJSON(root, MONITOR, 16384))?.value || null,
    monitor = rawMonitor ? validateMonitor(rawMonitor) : null;
  return {
    revision: current.revision,
    locked: !!(await assertSafePath(root, LOCK, { optional: true })),
    coverage: Object.fromEntries(
      ["mw4", "dmz"].map((m) => [m, codCoverage(current.value.modes[m], db)]),
    ),
    sources: current.value.modes,
    monitor,
    proposal: p
      ? {
          hash: p.hash,
          baseRevision: p.proposal.baseRevision,
          stale: p.proposal.baseRevision !== current.revision,
          unchanged: codFacts(current.value) === codFacts(p.proposal.content),
          diff: codDiff(current.value, p.proposal.content, db),
          content: p.proposal.content,
        }
      : null,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [action, rootArg, ...rest] = process.argv.slice(2),
    root = rootArg ? resolve(rootArg) : codRoot;
  try {
    const value =
      action === "check"
        ? await checkCodmunity(root)
        : action === "apply"
          ? await applyCodmunity(root, { proposalHash: rest[0] })
          : action === "monitor"
            ? await monitorCodmunity(root)
            : action === "status"
              ? await codmunityStatus(root)
              : (() => {
                  throw Error("Unknown CODMunity action");
                })();
    console.log(JSON.stringify(value));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
