import { join, extname } from "node:path";
import {
  safeFile,
  bundleRoot,
  validateBundle,
  sourceFingerprint,
  digest,
} from "./unified-map-bundle.mjs";
import { mapEntry } from "../src/domain/map-routes.mjs";
import { referencePlugin } from "../tools/hajin-map/server/reference-plugin.mjs";
import { sourceUpdatePlugin } from "../tools/hajin-map/server/source-update-plugin.mjs";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
export function createMapHandler({
  root,
  server,
  enabled = false,
  updates = false,
}) {
  const directory = bundleRoot(root),
    mounts = [];
  if (enabled) {
    const adapter = {
      httpServer: server,
      middlewares: {
        use(prefix, handler) {
          mounts.push([prefix, handler]);
        },
      },
    };
    referencePlugin().configureServer(adapter);
    sourceUpdatePlugin({
      root: join(root, "tools/hajin-map"),
      enabled: updates,
    }).configureServer(adapter);
  }
  async function status() {
    let reason = "missing",
      bundleId = null;
    if (enabled)
      try {
        const result = await validateBundle(directory, {
          fingerprint: await sourceFingerprint(root),
        });
        bundleId = result.bundleId;
        reason = result.fresh ? "ready" : "stale";
      } catch (error) {
        reason = error.code === "ENOENT" ? "missing" : "invalid";
      }
    return {
      kind: "dmz-unified-local-site",
      version: 1,
      guide: true,
      maps: enabled && reason === "ready",
      mapBase: "/map/",
      bundleId,
      reason,
    };
  }
  return async function handle(req, res) {
    const raw = (req.url || "/").split("?")[0];
    if (
      raw !== "/local-site/status.json" &&
      raw !== "/map" &&
      !raw.startsWith("/map/")
    )
      return false;
    const send = (code, bytes, type = "text/plain; charset=utf-8") => {
      res.writeHead(code, {
        "Content-Type": type,
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : bytes);
      return true;
    };
    if (raw === "/local-site/status.json") {
      if (!["GET", "HEAD"].includes(req.method))
        return send(405, "GET or HEAD only");
      return send(200, JSON.stringify(await status()), types[".json"]);
    }
    if (!enabled)
      return send(
        503,
        "<!doctype html><title>Local map setup</title><h1>Local maps need the source checkout</h1><p>Run npm run local in the repository, then open /map/. Your previous map data remains in its original browser at port 5175.</p>",
        types[".html"],
      );
    try {
      const path = decodeURIComponent(raw);
      if (
        path.includes("\\") ||
        path.includes("\0") ||
        path.split("/").some((s) => s === ".." || s.startsWith("."))
      )
        return send(400, "Invalid map path");
      for (const [prefix, handler] of mounts) {
        const full = "/map" + prefix;
        if (path === full || path.startsWith(full + "/")) {
          const original = req.url;
          req.url = req.url.slice(4 + prefix.length) || "/";
          let next = false;
          try {
            await handler(req, res, () => {
              next = true;
            });
          } finally {
            req.url = original;
          }
          if (!next) return true;
          return send(404, "Unknown map API");
        }
      }
      if (!["GET", "HEAD"].includes(req.method))
        return send(405, "GET or HEAD only");
      if (path === "/map") {
        res.writeHead(308, {
          Location:
            "/map/" +
            (req.url.includes("?")
              ? "?" + req.url.split("?").slice(1).join("?")
              : ""),
        });
        res.end();
        return true;
      }
      const relative = path.slice(5),
        entry = mapEntry(path);
      let bytes,
        name = entry || relative;
      if (
        /^maps\/(hajin|x01)\/.+\.(json|png|jpg|jpeg|webp|svg|avif)$/.test(
          relative,
        ) ||
        relative === "leaflet-LICENSE.txt"
      ) {
        const limit = relative.endsWith(".json")
          ? 2 * 1024 * 1024
          : relative.endsWith(".txt")
            ? 65536
            : 32 * 1024 * 1024;
        bytes = await safeFile(
          join(root, "tools/hajin-map/public"),
          relative,
          limit,
        );
      } else {
        const rawManifest = await safeFile(
            directory,
            "unified-map.json",
            1024 * 1024,
          ),
          m = JSON.parse(rawManifest);
        if (
          !entry &&
          !/^assets\/[^/]+\.(js|mjs|css|json|svg|png|webp|woff|woff2|txt)$/.test(
            relative,
          )
        )
          return send(404, "Unknown map resource");
        const info = m.files?.[name];
        if (
          !info ||
          !Number.isInteger(info.bytes) ||
          info.bytes > 32 * 1024 * 1024
        )
          return send(404, "Unknown map resource");
        bytes = await safeFile(directory, name, 32 * 1024 * 1024);
        if (bytes.length !== info.bytes || digest(bytes) !== info.sha256)
          throw Error("Changed map payload");
      }
      return send(
        200,
        bytes,
        types[extname(name)] || "application/octet-stream",
      );
    } catch (error) {
      return send(
        error instanceof URIError ? 400 : 404,
        "Map resource unavailable. Run npm run local to rebuild.",
      );
    }
  };
}
