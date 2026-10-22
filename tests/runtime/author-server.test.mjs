import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { request } from "node:http";
import { createServer as createTCPServer, createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createAuthorServer } from "../../scripts/author.mjs";
import { serializeCatalog } from "../../scripts/catalog.mjs";
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
function blankPack() {
  return {
    schemaVersion: 1,
    id: "test:catalog",
    contentVersion: "1",
    game: { id: "fictional-training", mode: "test", build: "test" },
    title: "Fictional server fixture",
    description: "Original software fixture",
    coverage: { expectedTotal: null, note: "Fictional" },
    sources: [],
    items: [],
    recipes: [],
    objectives: [],
    guides: [],
    maps: [],
    locations: [],
    claims: [],
    assets: [],
  };
}
async function fixture(t, options = {}) {
  const root = await mkdtemp(join(tmpdir(), "dmz-author-http-"));
  const files = serializeCatalog({
    entries: [{ key: "test", pack: blankPack(), assetSources: {} }],
    schema,
  });
  files.set("schemas/pack.schema.json", Buffer.from(JSON.stringify(schema)));
  for (const [path, bytes] of files) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  }
  const app = await createAuthorServer({ root, port: 0, ...options });
  t.after(async () => {
    await app.close();
    await rm(root, { recursive: true, force: true });
  });
  const session = await (await fetch(app.url + "/api/session")).json();
  return { root, app, session };
}
async function call(app, path, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(app.url + path, { method, headers, body });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers };
}
const auth = (app, session) => ({
  Origin: app.url,
  "X-Author-Token": session.token,
  "Content-Type": "application/json",
});
function raw(app, { path = "/api/session", method = "GET", headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = request(app.url, { path, method, headers }, (res) => {
      const chunks = [];
      res.on("data", (b) => chunks.push(b));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks).toString(),
        }),
      );
    });
    req.on("error", reject);
    req.end();
  });
}
test("FR-001/009: author serves only fixed local resources and metadata without pixels", async (t) => {
  const { app, session } = await fixture(t);
  assert.match(session.token, /^[a-f0-9]{64}$/);
  assert.match((await call(app, "/")).data, /Content Studio/);
  const catalog = await call(app, "/api/catalog");
  assert.equal(catalog.status, 200);
  assert.equal(catalog.data.entries[0].key, "test");
  assert(!JSON.stringify(catalog.data).includes("base64"));
  assert.equal(catalog.headers.get("access-control-allow-origin"), null);
  assert.equal(catalog.headers.get("cache-control"), "no-store");
  assert.equal(catalog.headers.get("x-content-type-options"), "nosniff");
  for (const route of [
    "/package.json",
    "/.git/config",
    "/assets/scripts/author-store.mjs",
    "/api/media?path=../.env",
  ])
    assert([400, 404].includes((await call(app, route)).status));
  assert.equal((await call(app, "/assets/src/ui/studio.css")).status, 200);
});
test("FR-009: Host, Origin, Fetch Metadata and session token fail closed", async (t) => {
  const { app, session } = await fixture(t);
  for (const host of [
    "localhost:" + app.port,
    "evil.example",
    "127.0.0.1:" + (app.port + 1),
    "127.0.0.1",
  ])
    assert.equal((await raw(app, { headers: { Host: host } })).status, 403);
  assert.equal(
    (
      await call(app, "/api/session", {
        headers: { Origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await raw(app, { headers: { "Sec-Fetch-Site": "cross-site" } })).status,
    403,
  );
  for (const headers of [
    {},
    { Origin: app.url },
    { ...auth(app, session), Origin: "null" },
    { ...auth(app, session), "X-Author-Token": "wrong" },
  ])
    assert.equal(
      (await call(app, "/api/save", { method: "POST", headers, body: "{}" }))
        .status,
      403,
    );
  assert.equal(
    (await call(app, "/api/save", { method: "OPTIONS" })).status,
    405,
  );
  assert.equal(
    (
      await call(app, "/api/save", {
        method: "PUT",
        headers: auth(app, session),
        body: "{}",
      })
    ).status,
    405,
  );
});
test("FR-009: duplicate Host and Origin headers are rejected", async (t) => {
  const { app, session } = await fixture(t);
  const response = await new Promise((resolve, reject) => {
    const socket = createConnection({ port: app.port, host: "127.0.0.1" });
    let result = "";
    socket.on("connect", () =>
      socket.write(
        `GET /api/session HTTP/1.1\r\nHost: 127.0.0.1:${app.port}\r\nHost: 127.0.0.1:${app.port}\r\nConnection: close\r\n\r\n`,
      ),
    );
    socket.on("data", (chunk) => (result += chunk));
    socket.on("end", () => resolve(result));
    socket.on("error", reject);
  });
  assert.match(response, /^HTTP\/1\.1 403/);
  assert.equal(
    (
      await raw(app, {
        method: "POST",
        path: "/api/save",
        headers: { ...auth(app, session), Origin: [app.url, app.url] },
      })
    ).status,
    403,
  );
});
test("FR-003/005: authenticated save survives restart; stale save preserves current bytes", async (t) => {
  const { root, app, session } = await fixture(t);
  const state = (await call(app, "/api/catalog")).data,
    pack = structuredClone(state.entries[0].pack);
  pack.title = "Saved through HTTP";
  pack.contentVersion = "2";
  const body = JSON.stringify({
    packKey: "test",
    expectedRevision: state.revision,
    pack,
    uploads: [],
  });
  const saved = await call(app, "/api/save", {
    method: "POST",
    headers: auth(app, session),
    body,
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.entry.pack.title, pack.title);
  const stale = await call(app, "/api/save", {
    method: "POST",
    headers: auth(app, session),
    body,
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.code, "STALE_REVISION");
  const second = await createAuthorServer({ root, port: 0 });
  t.after(() => second.close());
  assert.equal(
    (await call(second, "/api/catalog")).data.entries[0].pack.title,
    "Saved through HTTP",
  );
  assert.equal(
    (
      await call(second, "/api/save", {
        method: "POST",
        headers: { ...auth(second, session) },
        body,
      })
    ).status,
    403,
  );
});
test("FR-004: author preview serves only validated saved record selectors", async (t) => {
  const { app, session } = await fixture(t);
  const current = (await call(app, "/api/catalog")).data;
  const pack = structuredClone(current.entries[0].pack);
  pack.contentVersion = "2";
  pack.items.push({
    id: "test:preview",
    name: "Fictional saved preview",
    sourceIds: [],
    status: "fictional",
    kind: "item",
    category: "test",
    unit: "count",
    description: "Saved source",
    aliases: [],
    stats: [],
  });
  const save = await call(app, "/api/save", {
    method: "POST",
    headers: auth(app, session),
    body: JSON.stringify({
      packKey: "test",
      expectedRevision: current.revision,
      pack,
    }),
  });
  assert.equal(save.status, 200);
  const target =
    "/?packKey=test&packId=test%3Acatalog&id=test%3Apreview&intent=images";
  const beforeNavigation = (await call(app, "/api/catalog")).data.revision;
  const navigation = {
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Dest": "document",
  };
  assert.equal((await call(app, target)).status, 200);
  assert.equal(
    (await raw(app, { path: target, headers: navigation })).status,
    200,
  );
  for (const path of [
    "/api/session",
    "/api/catalog",
    "/api/media?packKey=test&assetId=test:preview",
    "/assets/src/client/studio.mjs",
    "/",
    "/preview?packKey=test&id=test:preview",
  ])
    assert.equal((await raw(app, { path, headers: navigation })).status, 403);
  for (const headers of [
    { ...navigation, "Sec-Fetch-Dest": "iframe" },
    { ...navigation, "Sec-Fetch-Mode": "cors" },
    { ...navigation, Origin: "https://untrusted.invalid" },
  ])
    assert.equal((await raw(app, { path: target, headers })).status, 403);
  assert.equal(
    (await raw(app, { path: target, method: "POST", headers: navigation }))
      .status,
    403,
  );
  for (const path of [
    target + "&id=test:other",
    target + "&return=https://untrusted.invalid",
    target.replace("test%3Acatalog", "test%3Awrong"),
    target.replace("test%3Apreview", "test%3Amissing"),
    "/?intent=images",
    "/?unknown=1",
    "/?",
    "/?#fragment",
  ])
    assert.equal((await raw(app, { path, headers: navigation })).status, 400);
  assert.equal(
    (await call(app, "/api/catalog")).data.revision,
    beforeNavigation,
  );
  const preview = await call(app, "/preview?packKey=test&id=test%3Apreview");
  assert.equal(preview.status, 200);
  assert.match(preview.data, /Fictional saved preview/);
  assert.match(preview.data, /Saved repository preview/);
  assert.equal(
    (await call(app, "/preview?packKey=test&id=test%3Amissing")).status,
    404,
  );
  for (const selector of [
    "packKey=test&id=test%3Apreview&path=README.md",
    "packKey=test&packKey=test&id=test%3Apreview",
    "packKey=test&id=test%3Apreview&id=test%3Apreview",
  ])
    assert.equal((await call(app, `/preview?${selector}`)).status, 400);
});
test("FR-008/009: request parser bounds declared sizes and rejects encodings/private envelopes", async (t) => {
  const { app, session } = await fixture(t);
  const tooLarge = await raw(app, {
    path: "/api/save",
    method: "POST",
    headers: {
      ...auth(app, session),
      "Content-Length": String(20 * 1024 * 1024 + 1),
    },
  });
  assert.equal(tooLarge.status, 413);
  for (const headers of [
    { ...auth(app, session), "Content-Type": "text/plain" },
    { ...auth(app, session), "Content-Encoding": "gzip" },
  ])
    assert.equal(
      (await call(app, "/api/save", { method: "POST", headers, body: "{}" }))
        .status,
      415,
    );
  assert.equal(
    (
      await call(app, "/api/save", {
        method: "POST",
        headers: auth(app, session),
        body: '{"packKey":"test","packKey":"again"}',
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await call(app, "/api/save", {
        method: "POST",
        headers: auth(app, session),
        body: JSON.stringify({ profile: { inventory: [] } }),
      })
    ).status,
    422,
  );
  const oversizedChunked = await new Promise((resolve, reject) => {
    const req = request(
      app.url + "/api/save",
      {
        method: "POST",
        headers: { ...auth(app, session), "Transfer-Encoding": "chunked" },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode));
      },
    );
    req.on("error", reject);
    for (let i = 0; i < 20; i++) req.write(Buffer.alloc(1024 * 1024, 32));
    req.write(" ");
    req.end();
  });
  assert.equal(oversizedChunked, 413);
});
test("FR-009: expired sessions cannot save", async (t) => {
  const { app, session } = await fixture(t, { sessionMs: -1 });
  const response = await call(app, "/api/save", {
    method: "POST",
    headers: auth(app, session),
    body: "{}",
  });
  assert.equal(response.status, 403);
  assert.equal(response.data.code, "SESSION_EXPIRED");
});
test("FR-001: ordinary website server rejects author writes", async (t) => {
  const readerRoot = await mkdtemp(join(tmpdir(), "dmz-reader-security-"));
  t.after(() => rm(readerRoot, { recursive: true, force: true }));
  await mkdir(join(readerRoot, "scripts"));
  await mkdir(join(readerRoot, "dist"));
  await writeFile(
    join(readerRoot, "dist/index.html"),
    "Synthetic reader fixture",
  );
  await writeFile(
    join(readerRoot, "scripts/serve.mjs"),
    await readFile(new URL("../../scripts/serve.mjs", import.meta.url)),
  );
  const probe = createTCPServer();
  await new Promise((r) => probe.listen(0, "127.0.0.1", r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  const child = spawn(
    process.execPath,
    [join(readerRoot, "scripts/serve.mjs"), "--port", String(port)],
    {
      env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(() => child.kill());
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Read-only server did not start")),
      5000,
    );
    child.stdout.once("data", () => {
      clearTimeout(timer);
      resolve();
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Read-only server exited before readiness: ${code}`));
    });
  });
  const response = await fetch(`http://127.0.0.1:${port}/api/save`, {
    method: "POST",
    body: "{}",
  });
  assert.equal(response.status, 405);
});
test("Studio image semantics module is available through real author HTTP allowlist", async (t) => {
  const { app } = await fixture(t);
  const response = await fetch(
    app.url + "/assets/src/content/image-description.mjs",
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /javascript/);
  assert.match(await response.text(), /export function imageDescription/);
});
