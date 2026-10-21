import { createServer } from "node:http";
import { stat, readFile } from "node:fs/promises";
import { resolve, join, extname, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const args = process.argv.slice(2),
  portIndex = args.indexOf("--port");
const port = Number(
  process.env.PORT ||
    (portIndex >= 0
      ? args[portIndex + 1]
      : args.find((a) => /^\d+$/.test(a))) ||
    4173,
);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Port must be an integer from 1 to 65535.");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { Allow: "GET, HEAD" });
    return res.end("Method not allowed");
  }
  try {
    const raw = (req.url || "/").split("?")[0];
    const path = decodeURIComponent(raw);
    if (
      path.includes("\0") ||
      path.includes("\\") ||
      path.split("/").some((s) => s === "..")
    ) {
      res.writeHead(400);
      return res.end("Invalid path");
    }
    let file = resolve(root, "." + path);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    let info = await stat(file);
    if (info.isDirectory()) {
      file = join(file, "index.html");
      info = await stat(file);
    }
    if (!info.isFile()) throw new Error("Not a file");
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    return res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error instanceof URIError) {
      res.writeHead(400);
      return res.end("Invalid URL");
    }
    let body;
    try {
      body = await readFile(join(root, "404.html"));
    } catch {
      body = "Not found. Build the site first with npm run build.";
    }
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(req.method === "HEAD" ? undefined : body);
  }
});
server.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`DMZ Guide: http://${process.env.HOST || "127.0.0.1"}:${port}`),
);
