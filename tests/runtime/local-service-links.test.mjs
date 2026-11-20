import test from "node:test";
import assert from "node:assert/strict";
import { createServer, request } from "node:http";
import { once } from "node:events";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  servicePath,
  serviceOrigin,
} from "../../src/domain/local-services.mjs";
import { featureURL, features } from "../../src/ui/feature-registry.mjs";
import { createServiceLinkHandler } from "../../scripts/local-service-links.mjs";
test("095 dynamic links keep queries/hash, all map entries relative and companion routing centralized", () => {
  assert.equal(
    servicePath("author", "/?id=some%3Aitem#photos"),
    "/local-services/author/?destination=%2F%3Fid%3Dsome%253Aitem%23photos",
  );
  assert.equal(
    serviceOrigin("author", "http://localhost:49001"),
    "http://localhost:4174",
  );
  assert.equal(
    serviceOrigin("guide", "http://localhost:49001", { guide: 49002 }),
    "http://localhost:49002",
  );
  for (const value of [
    "https://evil.invalid/",
    "//evil.invalid/",
    "/\\evil",
    "/\ninvalid",
  ])
    assert.throws(() => servicePath("author", value));
  assert.throws(() => servicePath("unknown", "/"));
  for (const f of features) {
    const path = featureURL(f);
    assert.ok(path.startsWith("/"), f.id);
    assert.equal(new URL(path, "http://127.0.0.1:49001").port, "49001");
  }
  const map = features.find((f) => f.id === "hajin-map");
  assert.equal(featureURL(map, "studio"), servicePath("guide", "/map/"));
  assert.equal(
    featureURL(
      features.find((f) => f.id === "items"),
      "map",
      { mapBase: "/map/" },
    ),
    "/items/",
  );
});
test("095 service directory binds redirects to current host, fixed service config and strict read-only guards", async () => {
  const handler = createServiceLinkHandler({ ports: { author: 49002 } });
  const server = createServer((req, res) => {
    if (!handler(req, res)) {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const target = "/?id=some%3Aitem#photos";
    const r = await fetch(base + servicePath("author", target), {
      redirect: "manual",
    });
    assert.equal(r.status, 302);
    assert.equal(
      r.headers.get("location"),
      new URL(target, "http://127.0.0.1:49002").href,
    );
    const self = await fetch(
      base + servicePath("guide", "/map/x01/?floor=2#details"),
      { redirect: "manual" },
    );
    assert.equal(
      self.headers.get("location"),
      base + "/map/x01/?floor=2#details",
    );
    assert.equal(
      (
        await fetch(base + servicePath("author"), {
          method: "HEAD",
          redirect: "manual",
        })
      ).status,
      302,
    );
    for (const path of [
      "/local-services/missing/?destination=%2F",
      "/local-services/author/?destination=%2F&destination=%2F",
      "/local-services/author/?destination=%2F&extra=x",
      "/local-services/author/?destination=https%3A%2F%2Fevil.invalid",
      "/local-services/author/?destination=%2F%2Fevil.invalid",
    ])
      assert.ok(
        (await fetch(base + path, { redirect: "manual" })).status >= 400,
        path,
      );
    assert.equal(
      (
        await fetch(base + servicePath("author"), {
          method: "POST",
          redirect: "manual",
        })
      ).status,
      405,
    );
    assert.equal(
      (
        await fetch(base + servicePath("author"), {
          headers: { Origin: "https://evil.invalid" },
          redirect: "manual",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + servicePath("author"), {
          headers: { "Sec-Fetch-Site": "cross-site" },
          redirect: "manual",
        })
      ).status,
      403,
    );
    const code = await new Promise((resolve, reject) => {
      const req = request(
        base + servicePath("author"),
        { headers: ["Host", new URL(base).host, "Host", "evil.invalid"] },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on("error", reject);
      req.end();
    });
    assert.equal(code, 403);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
test("095 navigation source guard rejects embedded loopback addresses in all UI, clients and map modules", async () => {
  async function walk(root) {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(mjs|ts)$/.test(path))
        assert.doesNotMatch(
          await readFile(path, "utf8"),
          /https?:\/\/(?:127\.0\.0\.1|localhost)(?=[:\/"'])/,
          path,
        );
    }
  }
  await walk("src/ui");
  await walk("src/client");
  await walk("tools/hajin-map/src");
  for (const file of [
    "scripts/build.mjs",
    "scripts/page-editor-build.mjs",
    "scripts/page-editor-preview.mjs",
    "scripts/author-preview.mjs",
    "scripts/site-audit-report.mjs",
  ])
    assert.doesNotMatch(
      await readFile(file, "utf8"),
      /https?:\/\/(?:127\.0\.0\.1|localhost):\d+/,
      file,
    );
});
