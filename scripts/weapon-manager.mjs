import { resolvePresentation } from "../src/ui/presentation-config.mjs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, mkdir, open, rename, unlink } from "node:fs/promises";
import { dirname, resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertSafePath, readCatalogFile } from "./catalog.mjs";
import { parseBounded } from "../src/content/limits.mjs";
import { renderWeaponManager } from "../src/ui/weapon-manager-page.mjs";
import { codmunityStatus, monitorCodmunity } from "./codmunity.mjs";
import codmunityMetrics from "../src/domain/codmunity-metrics.json" with { type: "json" };
const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const statusPath = ".local/weapon-updates/manager-status.json";
const assets = new Set([
  "src/ui/workspace-shell.css",
  "src/ui/directory-view.css",
  "src/ui/directory-view.mjs",
  "src/ui/workspace-shell.mjs",
  "src/client/workspace-shell.mjs",
  "src/styles.css",
  "src/ui/layout-tokens.css",
  "src/ui/compact-navigation.css",
  "src/client/theme.mjs",
  "src/client/navigation-menu.mjs",
  "src/client/navigation-menu-entry.mjs",
  "src/client/weapon-manager.mjs",
  "src/client/codmunity-review.mjs",
  "src/favicon.svg",
]);
async function receipt(root) {
  const path = await assertSafePath(root, statusPath, { optional: true });
  if (!path) return { lastCheck: null, lastOperation: null };
  const v = parseBounded(
    new TextDecoder("utf-8", { fatal: true }).decode(
      await readCatalogFile(root, statusPath, 32768),
    ),
    32768,
    { depth: 4, nodes: 50, string: 1000 },
  );
  if (!v || Object.keys(v).sort().join() !== "lastCheck,lastOperation")
    throw new Error("Invalid manager status receipt");
  return v;
}
async function writeReceipt(root, value) {
  for (const path of [".local", ".local/weapon-updates"]) {
    if (
      !(await assertSafePath(root, path, { optional: true, directory: true }))
    )
      await mkdir(join(root, path));
    await assertSafePath(root, path, { directory: true });
  }
  await assertSafePath(root, statusPath, { optional: true });
  const temp = join(
    root,
    ".local/weapon-updates/manager-status-" +
      randomBytes(8).toString("hex") +
      ".tmp",
  );
  let handle;
  try {
    handle = await open(temp, "wx", 0o600);
    await handle.writeFile(JSON.stringify(value));
    await handle.sync();
    await handle.close();
    handle = null;
    await assertSafePath(root, statusPath, { optional: true });
    await rename(temp, join(root, statusPath));
  } finally {
    await handle?.close();
    await unlink(temp).catch(() => {});
  }
}
export function runWeaponJob(root, action, fields = {}) {
  const python = process.platform === "win32" ? "py" : "python3";
  const loader =
    "import sys;from pathlib import Path;sys.path.insert(0,sys.argv[1]);import weapon_database as w;root=Path(sys.argv[2]);sys.argv=[str(Path(sys.argv[1])/'weapon_database.py'),*sys.argv[3:]];sys.exit(w.main(root))";
  let command, args, timeout;
  if (action.startsWith("codmunity-")) {
    if (
      !["codmunity-check", "codmunity-apply", "codmunity-monitor"].includes(
        action,
      )
    )
      throw Error("Unknown CODMunity action");
    command = process.execPath;
    args = [join(sourceRoot, "scripts/codmunity.mjs"), action.slice(10), root];
    if (action === "codmunity-apply") args.push(fields.proposalHash);
    timeout = 50000;
  } else if (action === "build") {
    command = process.execPath;
    args = ["scripts/build.mjs"];
    timeout = 120000;
  } else {
    if (!["check", "status", "apply", "rollback"].includes(action))
      throw new Error("Unknown local action");
    command = python;
    args = [
      ...(process.platform === "win32" ? ["-3"] : []),
      "-c",
      loader,
      join(sourceRoot, "scripts"),
      root,
      action,
    ];
    if (action === "apply") args.push("--proposal-hash", fields.proposalHash);
    if (action === "rollback")
      args.push("--expected-revision", fields.expectedRevision);
    timeout = action === "check" ? 130000 : 30000;
  }
  return new Promise((resolveJob, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let chunks = [],
      errors = [],
      size = 0,
      pendingFailure = null,
      settled = false;
    const timer = setTimeout(() => {
      pendingFailure = new Error(
        "Local operation timed out; inspect current revision, receipt and writer lock before retrying.",
      );
      child.kill();
    }, timeout);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolveJob(value);
    }
    const collect = (target, data) => {
      size += data.length;
      if (size > 4 * 1024 * 1024) {
        pendingFailure = new Error(
          "Local operation output limit exceeded; inspect state before retrying.",
        );
        child.kill();
      } else target.push(data);
    };
    child.stdout.on("data", (d) => collect(chunks, d));
    child.stderr.on("data", (d) => collect(errors, d));
    child.on("error", (e) => finish(e));
    child.on("close", (code) => {
      if (pendingFailure) return finish(pendingFailure);
      if (code !== 0)
        return finish(
          new Error(
            "Local operation failed; inspect the proposal/current revision and local process output before retrying.",
          ),
        );
      const out = Buffer.concat(chunks).toString("utf8");
      try {
        finish(
          null,
          action === "build"
            ? { built: true }
            : JSON.parse(
                out.split("\n").find((line) => line.startsWith("{")) || "{}",
              ),
        );
      } catch {
        finish(
          new Error(
            "Invalid local worker result; inspect current state before retrying.",
          ),
        );
      }
    });
  });
}
export async function createWeaponManager({
  root = sourceRoot,
  port = 4176,
  sessionMs = 12 * 60 * 60 * 1000,
  runner = runWeaponJob,
  monitor = false,
  probe = monitorCodmunity,
  monitorMs = 6 * 60 * 60 * 1000,
} = {}) {
  resolvePresentation("manager");
  if (
    monitor &&
    (!Number.isFinite(monitorMs) || monitorMs < 10 || monitorMs > 86400000)
  )
    throw Error("Invalid monitor interval");
  root = resolve(root);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("Invalid manager port");
  await assertSafePath(root, "content/weapon-intel.json");
  const priorReceipt = await receipt(root);
  if (priorReceipt.lastOperation?.result === "running")
    await writeReceipt(root, {
      ...priorReceipt,
      lastOperation: {
        ...priorReceipt.lastOperation,
        result: "interrupted; inspect current state before retrying",
      },
    });
  const token = randomBytes(32).toString("hex"),
    expiresAt = Date.now() + sessionMs;
  let origin,
    busy = false,
    stateWork = null;
  let closing = false,
    probeWork = null,
    probeController = null,
    probeTimer = null,
    startProbeTimer = null;
  const current = async () => {
    if (stateWork) return stateWork;
    const work = (async () => ({
      ...(await runner(root, "status")),
      codmunity: await codmunityStatus(root),
      codmunityMetrics,
      monitorPolicy: { enabled: monitor, intervalHours: monitorMs / 3600000 },
      receipt: await receipt(root),
    }))();
    stateWork = work;
    try {
      return await work;
    } finally {
      if (stateWork === work) stateWork = null;
    }
  };
  const server = createServer(
    { maxHeaderSize: 8192, headersTimeout: 10000, requestTimeout: 15000 },
    async (req, res) => {
      const send = (code, value, type = "application/json; charset=utf-8") => {
        res.writeHead(code, { "Content-Type": type });
        res.end(typeof value === "string" ? value : JSON.stringify(value));
      };
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("Cache-Control", "no-store");
      const reject = (message, code = 400) => {
        const error = new Error(message);
        error.status = code;
        throw error;
      };
      try {
        const topNavigation =
          req.method === "GET" &&
          req.url === "/" &&
          req.headers["sec-fetch-mode"] === "navigate" &&
          req.headers["sec-fetch-dest"] === "document";
        if (
          req.headers.host !== origin.slice(7) ||
          req.rawHeaders.filter(
            (v, i) => !(i % 2) && v.toLowerCase() === "host",
          ).length !== 1 ||
          !["127.0.0.1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress)
        )
          reject("Local manager address required", 403);
        if (
          (req.headers.origin && req.headers.origin !== origin) ||
          (req.headers["sec-fetch-site"] &&
            !["same-origin", "none"].includes(req.headers["sec-fetch-site"]) &&
            !topNavigation)
        )
          reject("Cross-origin manager access refused", 403);
        if (
          !req.url?.startsWith("/") ||
          req.url.startsWith("//") ||
          /[\\?%\x00]/.test(req.url) ||
          req.url.split("/").includes("..") ||
          req.url.length > 500
        )
          reject("Invalid local path");
        if (req.method === "GET") {
          if (req.url === "/")
            return send(200, renderWeaponManager(), "text/html; charset=utf-8");
          if (req.url.startsWith("/assets/")) {
            const path = req.url.slice(8);
            if (!assets.has(path)) reject("Not found", 404);
            return send(
              200,
              await readFile(join(sourceRoot, path), "utf8"),
              extname(path) === ".css"
                ? "text/css; charset=utf-8"
                : extname(path) === ".svg"
                  ? "image/svg+xml"
                  : "text/javascript; charset=utf-8",
            );
          }
          if (req.url === "/api/session")
            return send(200, { token, expiresAt });
          if (req.url === "/api/state")
            return send(200, { ...(await current()), busy });
          reject("Not found", 404);
        }
        if (req.method !== "POST" || req.url !== "/api/action")
          reject("Explicit manager action required", 405);
        const supplied = req.headers["x-weapon-token"];
        if (
          req.headers.origin !== origin ||
          typeof supplied !== "string" ||
          Buffer.byteLength(supplied) !== Buffer.byteLength(token) ||
          !timingSafeEqual(Buffer.from(supplied), Buffer.from(token)) ||
          req.rawHeaders.filter(
            (v, i) => !(i % 2) && v.toLowerCase() === "x-weapon-token",
          ).length !== 1
        )
          reject("Current local session required", 403);
        if (Date.now() >= expiresAt)
          reject(
            "Manager session expired; restart the local service and reload",
            403,
          );
        if (
          !/^application\/json(?:;\s*charset=utf-8)?$/i.test(
            req.headers["content-type"] || "",
          ) ||
          req.headers["content-encoding"]
        )
          reject("Uncompressed JSON required", 415);
        if (Number(req.headers["content-length"] || 0) > 4096)
          reject("Action exceeds4096bytes", 413);
        let raw = "",
          size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4096) reject("Action exceeds4096bytes", 413);
          raw += chunk.toString("utf8");
        }
        const body = parseBounded(raw, 4096, {
          depth: 4,
          nodes: 20,
          string: 100,
        });
        const keys = {
          check: ["action"],
          build: ["action"],
          apply: ["action", "proposalHash"],
          rollback: ["action", "expectedRevision"],
          "codmunity-check": ["action"],
          "codmunity-monitor": ["action"],
          "codmunity-apply": ["action", "proposalHash"],
        }[body.action];
        if (!keys || Object.keys(body).sort().join() !== keys.sort().join())
          reject("Unsupported action fields", 422);
        for (const key of keys.filter((k) => k !== "action"))
          if (
            typeof body[key] !== "string" ||
            !/^[a-f0-9]{64}$/.test(body[key])
          )
            reject("Invalid reviewed revision/hash", 422);
        if (busy) reject("Another local operation is running", 409);
        busy = true;
        try {
          const before = await current();
          if (body.action.startsWith("codmunity-") && before.codmunity.locked)
            reject("CODMunity writer lock requires inspection", 409);
          if (
            body.action === "codmunity-apply" &&
            (before.codmunity.proposal?.hash !== body.proposalHash ||
              before.codmunity.proposal?.stale)
          )
            reject("CODMunity proposal changed; check and review again", 409);
          if (before.locked) reject("Writer lock requires inspection", 409);
          if (before.pendingRollback && body.action !== "rollback")
            reject("Resume interrupted rollback first", 409);
          if (
            body.action === "apply" &&
            before.proposal?.hash !== body.proposalHash
          )
            reject("Proposal changed since review", 409);
          if (
            body.action === "rollback" &&
            before.revision !== body.expectedRevision
          )
            reject("Database changed since rollback review", 409);
          const old = await receipt(root),
            started = {
              action: body.action,
              time: new Date().toISOString(),
              result: "running",
            };
          await writeReceipt(root, { ...old, lastOperation: started });
          try {
            await runner(root, body.action, body);
            const done = {
              ...started,
              time: new Date().toISOString(),
              result: "success",
            };
            await writeReceipt(root, {
              ...old,
              lastOperation: done,
              lastCheck: body.action === "check" ? done : old.lastCheck,
            });
            return send(200, {
              message:
                body.action === "build"
                  ? "Reader rebuilt. Reload its pages."
                  : `${body.action} finished; inspect the refreshed state.`,
            });
          } catch (error) {
            const done = {
              ...started,
              time: new Date().toISOString(),
              result: "failed; inspect current state before retrying",
            };
            await writeReceipt(root, {
              ...old,
              lastOperation: done,
              lastCheck: body.action === "check" ? done : old.lastCheck,
            });
            throw error;
          }
        } finally {
          busy = false;
          stateWork = null;
        }
      } catch (error) {
        if (error.status === 413) res.setHeader("Connection", "close");
        if (!res.destroyed && !res.headersSent)
          send(error.status || 422, {
            message:
              error.message || "Local operation failed; inspect current state",
          });
      }
    },
  );
  await new Promise((ok, no) => {
    server.once("error", no);
    server.listen(port, "127.0.0.1", ok);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  async function tick() {
    if (closing || busy) return;
    busy = true;
    probeController = new AbortController();
    probeWork = (async () => {
      try {
        const status = await codmunityStatus(root);
        if (
          !status.locked &&
          !(await assertSafePath(root, ".local/weapon-updates/writer.lock", {
            optional: true,
          }))
        )
          await probe(root, { signal: probeController.signal });
      } catch {
      } finally {
        busy = false;
        stateWork = null;
        probeController = null;
      }
    })();
    await probeWork;
  }
  if (monitor) {
    if (!Number.isFinite(monitorMs) || monitorMs < 10 || monitorMs > 86400000)
      throw Error("Invalid monitor interval");
    startProbeTimer = setTimeout(() => void tick(), 0);
    probeTimer = setInterval(() => void tick(), monitorMs);
    probeTimer.unref();
  }
  return {
    url: origin,
    close: async () => {
      closing = true;
      clearTimeout(startProbeTimer);
      clearInterval(probeTimer);
      probeController?.abort();
      await probeWork;
      await new Promise((resolveClose) => server.close(resolveClose));
    },
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  let port = 4176;
  const args = process.argv.slice(2);
  if (args.length) {
    if (
      args.length !== 2 ||
      args[0] !== "--port" ||
      !/^\d+$/.test(args[1]) ||
      Number(args[1]) < 1 ||
      Number(args[1]) > 65535
    )
      throw new Error("Usage: npm run weapons:manage -- [--port4176]");
    port = Number(args[1]);
  }
  createWeaponManager({ port, monitor: true })
    .then((app) => {
      console.log(
        `Local weapon update dashboard: ${app.url}. DMZ readiness probe on startup and every six hours; no automatic apply.`,
      );
      for (const signal of ["SIGINT", "SIGTERM"])
        process.once(signal, async () => {
          await app.close();
          process.exit(0);
        });
    })
    .catch((error) => {
      console.error(
        error.code === "EADDRINUSE"
          ? "Manager port is in use; no fallback port was chosen."
          : error.message,
      );
      process.exitCode = 1;
    });
}
