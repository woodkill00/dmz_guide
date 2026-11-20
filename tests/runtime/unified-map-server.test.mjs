import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { once } from "node:events";
import { MAP_ENTRIES } from "../../src/domain/map-routes.mjs";
import {
  createManifest,
  safeFile,
  sourceFingerprint,
  validateBundle,
} from "../../scripts/unified-map-bundle.mjs";
import { createMapHandler } from "../../scripts/unified-map-server.mjs";
test("095 finite map routes, alias, HEAD/MIME, tamper, methods and plugin origins", async () => {
  const root = await mkdtemp(join(tmpdir(), "dmz-unified-")),
    dist = join(root, ".local/unified-map/dist");
  await mkdir(dist, { recursive: true });
  for (const entry of MAP_ENTRIES)
    await writeFile(join(dist, entry), "<h1>" + entry + "</h1>");
  await createManifest(dist, "0".repeat(64));
  let handler;
  const server = createServer(async (req, res) => {
    if (!(await handler(req, res))) {
      res.writeHead(404);
      res.end();
    }
  });
  handler = createMapHandler({ root, server, enabled: true });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    for (const path of [
      "/map/",
      "/map/x01/",
      "/map/safes/",
      "/map/loot/",
      "/map/migrate/",
      "/map/x01.html",
    ]) {
      const r = await fetch(base + path);
      assert.equal(r.status, 200, path);
      assert.match(r.headers.get("content-type"), /text\/html/);
    }
    const h = await fetch(base + "/map/", { method: "HEAD" });
    assert.equal(h.status, 200);
    assert.equal(await h.text(), "");
    for (const path of [
      "/map/nope.html",
      "/map/.env",
      "/map/maps/hajin/update-authorization.local.json",
      "/map/assets/source.js.map",
    ])
      assert.ok((await fetch(base + path)).status >= 400, path);
    assert.equal((await fetch(base + "/map/", { method: "POST" })).status, 405);
    assert.equal(
      (
        await fetch(base + "/map/__map-updates/capabilities", {
          headers: { Origin: "https://invalid.example" },
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(base + "/map/__map-updates/prepare", { method: "POST" }))
        .status,
      403,
    );
    await writeFile(join(dist, "index.html"), "tampered");
    assert.equal((await fetch(base + "/map/")).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await rm(root, { recursive: true, force: true });
  }
});
test("095 linked ancestor rejected; fingerprint covers shared runtime dependencies", async () => {
  const root = await mkdtemp(join(tmpdir(), "dmz-unified-path-"));
  try {
    const real = join(root, "real");
    await mkdir(join(real, "nested"), { recursive: true });
    await writeFile(join(real, "nested", "file.json"), "{}");
    await symlink(real, join(root, "linked"), "junction");
    await assert.rejects(
      () => safeFile(join(root, "linked", "nested"), "file.json", 100),
      /Linked/,
    );
    for (const path of [
      "tools/hajin-map/src",
      "tools/hajin-map/server",
      "src/client",
      "src/content",
    ])
      await mkdir(join(root, path), { recursive: true });
    for (const file of [
      "vite.config.mjs",
      "package.json",
      "package-lock.json",
      ...MAP_ENTRIES,
    ])
      await writeFile(join(root, "tools/hajin-map", file), "synthetic");
    const shared = join(root, "src/content/portable.mjs");
    await writeFile(shared, "first synthetic");
    const a = await sourceFingerprint(root);
    await writeFile(shared, "changed synthetic");
    assert.notEqual(await sourceFingerprint(root), a);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
