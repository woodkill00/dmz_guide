import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const file = new URL(
  "../specs/071-ui-ux-implementation/extensions/quick-entry/item-experience/preview.html",
  import.meta.url,
);
const port = Number(process.argv[2] || 4180);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw Error("Choose a local preview port from 1024 to 65535");
const server = createServer(async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  if (!["/", "/index.html"].includes(req.url)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  try {
    const html = await readFile(file);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    res.writeHead(500);
    res.end("Design concept unavailable");
  }
});
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Item design concept: http://127.0.0.1:${port}/`),
);
