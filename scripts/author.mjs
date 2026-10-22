import {
  parseAuthorTarget,
  resolveAuthorTarget,
} from "../src/content/author-target.mjs";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  AUTHOR_LIMITS,
  AuthorError,
  createAuthorStore,
  inspectRecovery,
  recoverRepository,
} from "./author-store.mjs";
import { parseBounded } from "../src/content/limits.mjs";
import { renderStudioPage } from "../src/ui/studio-page.mjs";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const staticFiles = new Set([
  "src/client/studio.mjs",
  "src/client/studio-media.mjs",
  "src/client/guided-editor.mjs",
  "src/client/raster-editor.mjs",
  "src/client/theme.mjs",
  "src/content/limits.mjs",
  "src/content/image-description.mjs",
  "src/content/author-target.mjs",
  "src/content/studio-recovery.mjs",
  "src/content/json.mjs",
  "src/content/validate.mjs",
  "src/content/portable.mjs",
  "src/content/bundled-assets.mjs",
  "src/ui/studio.css",
  "src/styles.css",
  "src/favicon.svg",
  "schemas/pack.schema.json",
]);
const types = {
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
const tokenMatches = (a, b) =>
  typeof a === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const headerCount = (request, name) =>
  request.rawHeaders.filter(
    (_, i) => !(i % 2) && request.rawHeaders[i].toLowerCase() === name,
  ).length;
function respond(
  res,
  status,
  data,
  mime = "application/json; charset=utf-8",
  head = false,
) {
  const body =
    typeof data === "object" &&
    !Buffer.isBuffer(data) &&
    !(data instanceof Uint8Array)
      ? JSON.stringify(data)
      : data;
  res.writeHead(status, { "Content-Type": mime });
  res.end(head ? undefined : body);
}
async function readJSON(request) {
  if (
    !/^application\/json(?:;\s*charset=utf-8)?$/i.test(
      request.headers["content-type"] || "",
    ) ||
    request.headers["content-encoding"]
  )
    throw new AuthorError(
      "INVALID_REQUEST",
      "Use uncompressed application/json",
      415,
    );
  const declared = request.headers["content-length"];
  if (
    declared &&
    (!/^\d+$/.test(declared) || Number(declared) > AUTHOR_LIMITS.requestBytes)
  )
    throw new AuthorError("LIMIT_EXCEEDED", "Request exceeds 20 MiB", 413);
  const chunks = [];
  let length = 0;
  await new Promise((resolveBody, reject) => {
    const cleanup = () => {
      request.removeListener("data", data);
      request.removeListener("end", ended);
      request.removeListener("error", failed);
      request.removeListener("aborted", aborted);
    };
    const failed = (error) => {
      cleanup();
      reject(error);
    };
    const aborted = () =>
      failed(
        new AuthorError("INVALID_REQUEST", "Request was interrupted", 400),
      );
    const ended = () => {
      cleanup();
      resolveBody();
    };
    const data = (chunk) => {
      length += chunk.length;
      if (length > AUTHOR_LIMITS.requestBytes) {
        request.pause();
        failed(
          new AuthorError("LIMIT_EXCEEDED", "Request exceeds 20 MiB", 413),
        );
      } else chunks.push(chunk);
    };
    request.on("data", data);
    request.once("end", ended);
    request.once("error", failed);
    request.once("aborted", aborted);
  });
  return parseBounded(
    Buffer.concat(chunks).toString("utf8"),
    AUTHOR_LIMITS.requestBytes,
    { depth: 20, nodes: 160000, string: Math.ceil((2 * 1024 * 1024) / 3) * 4 },
  );
}
export async function createAuthorServer({
  root = sourceRoot,
  port = 4174,
  sessionMs = 12 * 60 * 60 * 1000,
} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("Port must be an integer from 0 to 65535");
  root = resolve(root);
  const store = await createAuthorStore({ root });
  const token = randomBytes(32).toString("hex"),
    expiresAt = Date.now() + sessionMs;
  let origin,
    activeWrites = 0;
  const server = createServer(
    {
      maxHeaderSize: 8192,
      headersTimeout: 10000,
      requestTimeout: 30000,
      keepAliveTimeout: 5000,
    },
    async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      );
      try {
        if (req.rawHeaders.length > 64)
          throw new AuthorError(
            "LIMIT_EXCEEDED",
            "Too many request headers",
            431,
          );
        if (
          headerCount(req, "host") !== 1 ||
          req.headers.host !== origin.slice(7) ||
          headerCount(req, "origin") > 1
        )
          throw new AuthorError(
            "FORBIDDEN",
            "Only the local Studio address is accepted",
            403,
          );
        // Only an explicit top-level document navigation may enter a targeted
        // editor from the static guide. APIs, subresources, frames and writes
        // retain the same-origin boundary, even with a copied target query.
        const editorNavigation =
          req.method === "GET" &&
          req.url?.startsWith("/?") &&
          req.headers["sec-fetch-mode"] === "navigate" &&
          req.headers["sec-fetch-dest"] === "document";
        if (
          (req.headers.origin && req.headers.origin !== origin) ||
          (req.headers["sec-fetch-site"] &&
            !["same-origin", "none"].includes(req.headers["sec-fetch-site"]) &&
            !editorNavigation)
        )
          throw new AuthorError(
            "FORBIDDEN",
            "Cross-origin requests are not allowed",
            403,
          );
        if (
          !req.url?.startsWith("/") ||
          req.url.startsWith("//") ||
          req.url.includes("\\") ||
          req.url.split("?")[0].split("/").includes("..") ||
          /%(?:2f|5c|00|2e)/i.test(req.url.split("?")[0]) ||
          req.url.length > 2048
        )
          throw new AuthorError("INVALID_REQUEST", "Invalid request URL", 400);
        const url = new URL(req.url, origin);
        if (
          /%(?:2f|5c|00|2e)/i.test(url.pathname) ||
          url.pathname.split("/").includes("..")
        )
          throw new AuthorError("INVALID_REQUEST", "Invalid request path", 400);
        const head = req.method === "HEAD";
        if (["GET", "HEAD"].includes(req.method)) {
          if (url.pathname === "/") {
            if (editorNavigation && (!url.search || url.hash))
              throw new AuthorError(
                "INVALID_TARGET",
                "Use the complete editor link from the record page.",
                400,
              );
            if (url.search) {
              try {
                const target = parseAuthorTarget(url.searchParams);
                if (!target) throw new Error("Editor target is missing");
                resolveAuthorTarget((await store.read()).entries, target);
              } catch (error) {
                throw new AuthorError("INVALID_TARGET", error.message, 400);
              }
            }
            return respond(
              res,
              200,
              renderStudioPage(),
              "text/html; charset=utf-8",
              head,
            );
          }
          if (url.pathname === "/docs/content-studio.md" && !url.search)
            return respond(
              res,
              200,
              await readFile(join(sourceRoot, "docs/content-studio.md")),
              "text/plain; charset=utf-8",
              head,
            );
          if (url.pathname === "/preview") {
            if ([...url.searchParams.keys()].sort().join(",") !== "id,packKey")
              throw new AuthorError(
                "INVALID_REQUEST",
                "Preview requires catalog and record ID",
                400,
              );
            const { renderSavedPreview } = await import("./author-preview.mjs");
            const page = renderSavedPreview(
              await store.read(),
              url.searchParams.get("packKey"),
              url.searchParams.get("id"),
            );
            if (!page)
              throw new AuthorError("NOT_FOUND", "Saved record not found", 404);
            return respond(res, 200, page, "text/html; charset=utf-8", head);
          }
          if (url.pathname.startsWith("/assets/") && !url.search) {
            const file = url.pathname.slice(8);
            if (!staticFiles.has(file))
              throw new AuthorError("NOT_FOUND", "Not found", 404);
            if (file === "schemas/pack.schema.json")
              return respond(res, 200, store.schema, types[".json"], head);
            return respond(
              res,
              200,
              await readFile(join(sourceRoot, file)),
              types[extname(file)],
              head,
            );
          }
          if (head)
            throw new AuthorError(
              "METHOD_NOT_ALLOWED",
              "API requests require GET",
              405,
            );
          if (url.pathname === "/api/session" && !url.search)
            return respond(res, 200, {
              token,
              expiresAt,
              limits: AUTHOR_LIMITS,
            });
          if (url.pathname === "/api/catalog" && !url.search)
            return respond(res, 200, await store.read());
          if (url.pathname === "/api/changes" && !url.search)
            return respond(res, 200, await store.changes());
          if (url.pathname === "/api/recovery" && !url.search)
            return respond(res, 200, await inspectRecovery({ root }));
          if (url.pathname === "/api/media") {
            if (
              [...url.searchParams.keys()].sort().join(",") !==
              "assetId,packKey"
            )
              throw new AuthorError(
                "INVALID_REQUEST",
                "Picture lookup requires catalog and asset ID",
                400,
              );
            const media = await store.media(
              url.searchParams.get("packKey"),
              url.searchParams.get("assetId"),
            );
            return respond(res, 200, media.bytes, media.mime);
          }
          throw new AuthorError("NOT_FOUND", "Not found", 404);
        }
        if (req.method !== "POST" || url.pathname !== "/api/save" || url.search)
          throw new AuthorError(
            "METHOD_NOT_ALLOWED",
            "Only explicit repository saves are supported",
            405,
          );
        if (
          req.headers.origin !== origin ||
          headerCount(req, "x-author-token") !== 1 ||
          !tokenMatches(req.headers["x-author-token"], token)
        )
          throw new AuthorError(
            "FORBIDDEN",
            "Repository saves require the current local Studio session",
            403,
          );
        if (Date.now() >= expiresAt)
          throw new AuthorError(
            "SESSION_EXPIRED",
            "Session expired. Export your draft before restarting Studio.",
            403,
          );
        if (activeWrites >= 4)
          throw new AuthorError(
            "REPOSITORY_BUSY",
            "Too many pending saves; wait before trying again",
            429,
          );
        activeWrites++;
        try {
          return respond(res, 200, await store.save(await readJSON(req)));
        } finally {
          activeWrites--;
        }
      } catch (error) {
        if (res.destroyed || res.headersSent) return;
        if (error.status === 413) res.setHeader("Connection", "close");
        if (error instanceof AuthorError)
          return respond(res, error.status, {
            code: error.code,
            message: error.message,
          });
        if (["ENOSPC", "EIO", "EACCES", "EPERM", "EROFS"].includes(error.code))
          return respond(res, 500, {
            code: "DISK_ERROR",
            message:
              "Repository disk access failed. Keep your draft and inspect recovery before saving again.",
          });
        if (error.code)
          return respond(res, 500, {
            code: "REPOSITORY_ERROR",
            message:
              "Repository operation could not complete. Preserve your draft and inspect recovery.",
          });
        const message = error.message || "Invalid repository content";
        // Validation errors contain public record IDs/field names, not system paths or bytes.
        return respond(res, 422, {
          code: "INVALID_CONTENT",
          message: /(?:ENOENT|\/workspace\/|[A-Za-z]:\\)/.test(message)
            ? "A required repository file is unavailable"
            : message.slice(0, 500),
        });
      }
    },
  );
  server.maxHeadersCount = 32;
  server.maxRequestsPerSocket = 100;
  server.on("upgrade", (_req, socket) => socket.destroy());
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolveListen);
  });
  const actualPort = server.address().port;
  origin = `http://127.0.0.1:${actualPort}`;
  return {
    server,
    url: origin,
    port: actualPort,
    close: async () => {
      server.closeIdleConnections();
      const stopped = new Promise((resolveClose, reject) =>
        server.close((e) => (e ? reject(e) : resolveClose())),
      );
      server.closeAllConnections();
      await stopped;
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--recover")) {
    if (args.some((a) => !["--recover", "--apply"].includes(a)))
      throw new Error("Recovery accepts only --recover and optional --apply");
    const preview = await recoverRepository({ root: sourceRoot });
    console.log(JSON.stringify(preview, null, 2));
    if (args.includes("--apply"))
      console.log(
        JSON.stringify(
          await recoverRepository({
            root: sourceRoot,
            apply: true,
            expectedRecoveryRevision: preview.revision,
          }),
          null,
          2,
        ),
      );
    else
      console.log(
        "Preview only. To apply verified recovery: npm run author:recover -- --apply",
      );
    return;
  }
  let port = 4174;
  if (args.length) {
    if (args.length !== 2 || args[0] !== "--port" || !/^\d+$/.test(args[1]))
      throw new Error("Usage: npm run author -- [--port 4174]");
    port = Number(args[1]);
    if (port < 1 || port > 65535) throw new Error("Port must be 1 to 65535");
  }
  const recovery = await inspectRecovery({ root: sourceRoot });
  if (recovery.pending || recovery.lock)
    throw new Error(
      "Repository recovery or lock inspection is required. Run npm run author:recover first.",
    );
  const app = await createAuthorServer({ root: sourceRoot, port });
  console.log(
    `DMZ Content Studio: ${app.url}. Public repository editing is enabled only here. No automatic Git publication.`,
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, async () => {
      await app.close();
      process.exit(0);
    });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? "Content Studio port is already in use. Stop the other server or explicitly choose --port. No port was changed; browser storage belongs to its original address and port."
        : error.message,
    );
    process.exitCode = 1;
  });
