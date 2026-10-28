// Entirely synthetic. No source requests, private captures or game assets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { createServer } from "node:http";
import {
  canonicalDigest,
  sites,
  digest,
  semantic,
  validateCapture,
  diffCaptures,
} from "../server/source-contract.mjs";
import {
  allowedURL,
  publicAddress,
  sourceNetwork,
} from "../server/source-network.mjs";
import {
  hydrationPins,
  normalizedCapture,
  withInertParser,
  parsePage,
  verifyFrame,
} from "../server/source-collectors.mjs";
import { SourceUpdates } from "../server/source-update-service.mjs";
import {
  localRequest,
  sourceUpdatePlugin,
} from "../server/source-update-plugin.mjs";
import {
  applyPrepared,
  reusePrepared,
} from "../src/workspace/source-updates.ts";
import { emptyWorkspace } from "../src/workspace/model.ts";
import { adaptOfficial, sha256 } from "../src/workspace/import.ts";
import { captureSource } from "../src/map/current-captures.ts";
const svg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="8"/></svg>',
);
const capture = (id = "official") => ({
  schemaVersion: 1,
  sourcePage: sites[id].page,
  capturedAt: "2026-10-28T00:00:00Z",
  categories: [
    {
      id: "synthetic",
      name: "Synthetic",
      group: "Synthetic categories",
      icon: `/maps/hajin/${id === "official" ? "official" : `providers/${id}`}/icons/test.svg`,
    },
  ],
  records: [
    {
      id: "one",
      name: "Synthetic location",
      category: "synthetic",
      mapId: "hajin",
      coordinateSpaceVersion: "hajin-official-v1-4096",
      x: 0.5,
      y: 0.5,
    },
  ],
});
test("022 registry denies arbitrary hosts/paths/redirect targets and private addresses", () => {
  for (const s of Object.values(sites)) {
    assert.ok(allowedURL(s.page));
    if (s.image) assert.ok(allowedURL(s.image));
  }
  for (const u of [
    "http://codmunity.gg/dmz/map",
    "https://codmunity.gg/api/private",
    "https://localhost/",
    "https://www.callofduty.com@127.0.0.1/",
    "https://codmunity.gg/dmz/map?redirect=x",
    "https://codmunity.gg:444/dmz/map",
    "https://www.callofduty.com/apps/atvi/callofduty/strategy-guide/components/maps/map-page/clientlibs.x.js?x=1",
  ])
    assert.throws(() => allowedURL(u));
  for (const ip of [
    "127.0.0.1",
    "10.1.1.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
  ])
    assert.equal(publicAddress(ip), false);
  assert.equal(publicAddress("8.8.8.8"), true);
});
test("022 literal hydration decoder finds selected map graph and rejects calls/cycles/prototype", () => {
  const code = (pins) =>
    `$R[4]={state:$R[9]={data:$R[10]={pins:${pins}}},queryHash:'["dmz-map","en"]'};`;
  assert.equal(
    hydrationPins([
      code('$R[11]=[{id:"x",x:0,y:4,note:null,floor:-1,visible:!0}]'),
    ])[0].floor,
    -1,
  );
  globalThis.__executed = false;
  assert.throws(
    () =>
      hydrationPins([code("(()=>{globalThis.__executed=true;return []})()")]),
    /Nonliteral/,
  );
  assert.equal(globalThis.__executed, false);
  assert.throws(() => hydrationPins([code("$R[11]=[$R[11]]")]), /Cyclic/);
  assert.throws(() => hydrationPins([code("[{__proto__:null}]")]), /Unsafe/);
  assert.throws(() => hydrationPins(["$R[0]={pins:[]}"]), /Expected/);
});
test("022 network bounds DNS, streamed bytes, redirects/error bodies and request deadlines", async () => {
  const resolveHost = async () => [{ address: "8.8.8.8", family: 4 }];
  let requested = 0,
    lastResponse;
  const transport =
    (status, chunks = [], headers = {}) =>
    (_url, _options, callback) => {
      requested++;
      const request = new EventEmitter();
      request.destroy = (e) => {
        if (e) request.emit("error", e);
        request.emit("close");
      };
      queueMicrotask(() => {
        const response = new PassThrough();
        lastResponse = response;
        response.statusCode = status;
        response.headers = headers;
        callback(response);
        if (!response.destroyed) {
          for (const c of chunks) response.write(c);
          response.end();
        }
      });
      return request;
    };
  const url = sites.codmunity.page;
  await assert.rejects(
    sourceNetwork(undefined, 128, {
      resolveHost: () => new Promise(() => {}),
      requestHTTPS: transport(200),
      deadlineMs: 20,
    })(url),
    /DNS lookup timed out/,
  );
  assert.equal(requested, 0);
  const abort = new AbortController(),
    waiting = sourceNetwork(abort.signal, 128, {
      resolveHost: () => new Promise(() => {}),
      deadlineMs: 1000,
    })(url);
  abort.abort();
  await assert.rejects(waiting, /cancelled/);
  await assert.rejects(
    sourceNetwork(undefined, 128, {
      resolveHost: async () => [{ address: "127.0.0.1", family: 4 }],
      requestHTTPS: transport(200),
    })(url),
    /public addresses/,
  );
  assert.equal(requested, 0);
  await assert.rejects(
    sourceNetwork(undefined, 128, {
      resolveHost,
      requestHTTPS: transport(200, [Buffer.alloc(9)]),
    })(url, 8),
    /byte budget/,
  );
  await assert.rejects(
    sourceNetwork(undefined, 128, {
      resolveHost,
      requestHTTPS: transport(200, [], { "content-length": "10" }),
    })(url, 8),
    /byte limit/,
  );
  await assert.rejects(
    sourceNetwork(undefined, 128, {
      resolveHost,
      requestHTTPS: transport(403, [Buffer.alloc(100000)]),
    })(url, 8),
    /HTTP403/,
  );
  assert.ok(lastResponse.destroyed);
  await assert.rejects(
    sourceNetwork(undefined, 128, {
      resolveHost,
      requestHTTPS: transport(302, [Buffer.alloc(100000)], {
        location: "https://127.0.0.1/",
      }),
    })(url, 8),
    /registry/,
  );
  assert.ok(lastResponse.destroyed);
  await assert.rejects(
    sourceNetwork(undefined, 128, {
      resolveHost,
      requestHTTPS: transport(302, [], { location: url }),
    })(url),
    /redirect limit/,
  );
  const noResponse = () => {
    const req = new EventEmitter();
    req.destroy = (e) => {
      req.emit("error", e);
      req.emit("close");
    };
    return req;
  };
  await assert.rejects(
    sourceNetwork(undefined, 128, {
      resolveHost,
      requestHTTPS: noResponse,
      deadlineMs: 20,
    })(url),
    /request timed out/,
  );
});
test("022 semantic hash ignores capture time/order/path but catches notes/floors/icons and diff IDs", () => {
  const a = capture(),
    b = structuredClone(a);
  b.capturedAt = "2026-10-29T00:00:00Z";
  b.categories[0].icon = "/different/path.svg";
  assert.equal(
    semantic(a, { synthetic: "a" }),
    semantic(b, { synthetic: "a" }),
  );
  b.records[0].notes = "Changed";
  assert.notEqual(
    semantic(a, { synthetic: "a" }),
    semantic(b, { synthetic: "a" }),
  );
  assert.equal(diffCaptures(a, b).changed, 1);
  assert.notEqual(
    semantic(a, { synthetic: "a" }),
    semantic(a, { synthetic: "b" }),
  );
  const c = structuredClone(a);
  c.records.push({ ...c.records[0], id: "two" });
  assert.equal(
    semantic(c),
    semantic({ ...c, records: [...c.records].reverse() }),
  );
  assert.throws(
    () =>
      validateCapture(
        { ...a, records: [a.records[0], a.records[0]] },
        "official",
      ),
    /conflicting/,
  );
  assert.throws(() => validateCapture({ ...a, records: [] }, "official"));
  assert.throws(() =>
    validateCapture(
      { ...a, records: [{ ...a.records[0], x: NaN }] },
      "official",
    ),
  );
});
test("022 normalized affine captures preserve distinct upstream IDs, zero coords, floors and fallback warning", async () => {
  const rows = [
    { id: "a", title: "Synthetic A", category: "test", x: 0, y: 0, floor: 0 },
    { id: "b", title: "Synthetic A", category: "test", x: 0, y: 0 },
  ];
  const result = await normalizedCapture({
    id: "codmunity",
    rows,
    registration: {
      matrix: [
        [1, 0, 100],
        [0, 1, 200],
      ],
      sourceSize: [1120, 1055],
    },
    iconDirectory: "/maps/hajin/providers/codmunity/icons/",
    readIcon: () => {
      throw Error("Not needed");
    },
  });
  assert.equal(result.capture.records.length, 2);
  assert.equal(result.capture.records[0].x, 100 / 4096);
  assert.equal(result.capture.records[0].floor, 0);
  assert.match(result.warnings[0], /generic fallback/);
  await assert.rejects(
    normalizedCapture({
      id: "codmunity",
      rows: [{ ...rows[0], x: 2000 }],
      registration: {
        matrix: [
          [1, 0, 0],
          [0, 1, 0],
        ],
        sourceSize: [1120, 1055],
      },
      iconDirectory: "/icons/",
    }),
    /outside/,
  );
});
test("022 exact provider/official imagery and declared frames gate calibration reuse", async () => {
  const bytes = Buffer.from("SYNTHETIC reviewed image");
  const authorization = {
    sourceImages: Object.fromEntries(
      ["codmunity", "wzstats", "codcentral"].map((id) => [
        id,
        { url: sites[id].image, sha256: digest(bytes) },
      ]),
    ),
  };
  for (const id of ["codmunity", "wzstats", "codcentral"]) {
    const registration = { sourceSize: sites[id].size, canonicalDigest };
    const parsed = { image: sites[id].image };
    await verifyFrame(
      id,
      parsed,
      authorization,
      registration,
      async () => bytes,
    );
    await assert.rejects(
      verifyFrame(id, parsed, authorization, registration, async () =>
        Buffer.from("changed"),
      ),
      /image changed/,
    );
    await assert.rejects(
      verifyFrame(
        id,
        { image: "/new-map.webp" },
        authorization,
        registration,
        async () => bytes,
      ),
      /reference changed/,
    );
    await assert.rejects(
      verifyFrame(
        id,
        parsed,
        authorization,
        { ...registration, sourceSize: [1, 2] },
        async () => bytes,
      ),
      /image changed/,
    );
  }
  const template =
    "https://www.callofduty.com/cdn/blog/guides/maps/mw4/dmz/hajin/baselayer/v1/tiles/{z}/{x}/{y}.png";
  const tiles = [];
  for (let x = 0; x < 16; x++)
    for (let y = 0; y < 16; y++)
      tiles.push({
        url: template
          .replace("{z}", "4")
          .replace("{x}", String(x))
          .replace("{y}", String(y)),
        sha256: digest(bytes),
      });
  const parsed = { frame: { template, width: "4096", height: "4096" } };
  let count = 0;
  await verifyFrame("official", parsed, { tiles }, null, async () => {
    count++;
    return bytes;
  });
  assert.equal(count, 256);
  await assert.rejects(
    verifyFrame(
      "official",
      parsed,
      { tiles: [...tiles.slice(0, -1), tiles[0]] },
      null,
      async () => bytes,
    ),
    /repeated/,
  );
  await assert.rejects(
    verifyFrame(
      "official",
      { frame: { ...parsed.frame, width: "2048" } },
      { tiles },
      null,
      async () => bytes,
    ),
    /declared map frame/,
  );
  await assert.rejects(
    verifyFrame("official", parsed, { tiles }, null, async () =>
      Buffer.from("changed"),
    ),
    /imagery changed/,
  );
});
test("022 detached parser extracts CC/CM/WZ/official contracts without execution or egress", async () => {
  await withInertParser(async (page) => {
    let requests = 0;
    page.on("request", () => requests++);
    const evil =
      '<script>window.executed=true;fetch("http://127.0.0.1:1/")</script><img src="https://example.invalid/pixel"><iframe src="file:///etc/passwd"></iframe><style>@import "https://example.invalid/css";</style>';
    const cc = await parsePage(
      page,
      "codcentral",
      evil +
        '<img class="dmzm-img" data-hi="/assets/map.webp"><button class="dmzm-pin" data-slug="a" data-name="Synthetic A" data-layer="uav" data-label="Synthetic UAV" style="left:0%;top:50%"><svg viewBox="0 0 32 32"><path d="M0 0L10 10" onclick="alert(1)"/></svg></button>',
    );
    assert.equal(cc.rows[0].x, 0);
    assert.equal(cc.rows[0].y, 1350);
    assert.ok(!cc.rows[0].icon.includes("onclick"));
    const cm = await parsePage(
      page,
      "codmunity",
      '<img src="/dmz/hajin-map-cod2-surround.webp"><img width="1120" height="1055" src="/dmz/hajin-map-cod2-1120.webp"><script>$R[0]={state:{data:{pins:[{id:"s"}]}},queryHash:\'["dmz-map","en"]\'}</script>',
    );
    assert.equal(hydrationPins(cm.scripts)[0].id, "s");
    assert.equal(cm.image, "/dmz/hajin-map-cod2-1120.webp");
    const wz = await parsePage(
      page,
      "wzstats",
      '<app-leaflet-image-map image="assets/img/dmz/hajin-map.webp"></app-leaflet-image-map><script id="ng-state" type="application/json">{"s":{"b":{"map":"hajin","pins":[]}}}</script>',
    );
    assert.equal(JSON.parse(wz.state).s.b.map, "hajin");
    const official = await parsePage(
      page,
      "official",
      '<script src="/apps/atvi/callofduty/strategy-guide/components/maps/map-page/clientlibs.abc.js"></script>',
    );
    assert.match(official.bundle, /clientlibs/);
    await assert.rejects(
      parsePage(
        page,
        "icon",
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/a"/></svg>',
      ),
      /Unsupported/,
    );
    await assert.rejects(
      parsePage(
        page,
        "icon",
        '<svg xmlns="http://www.w3.org/2000/svg"><path fill="url(https://example.invalid/a)"/></svg>',
      ),
      /Unsafe/,
    );
    assert.equal(await page.evaluate(() => window.executed), undefined);
    assert.equal(requests, 0);
  });
});
async function fixture(t, opts = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "dmz-update-"));
  t.after(async () => {
    const resolved = path.resolve(root);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
    await rm(resolved, { recursive: true, force: true });
  });
  await mkdir(path.join(root, "public/maps/hajin"), { recursive: true });
  await writeFile(
    path.join(root, "public/maps/hajin/update-authorization.local.json"),
    JSON.stringify({
      version: 1,
      canonicalDigest,
      authorizedSources: Object.keys(sites),
    }),
  );
  const collect = async (id, { old, iconDirectory }) => {
    if (opts.fail === id) throw Error("Synthetic blocked source");
    if (opts.wait) await new Promise((r) => setTimeout(r, 30));
    const next = structuredClone(old);
    if (!opts.unchanged)
      next.records.push({
        ...next.records[0],
        id: "two",
        name: "Synthetic new point",
      });
    next.categories[0].icon = iconDirectory + "a".repeat(20) + ".svg";
    return {
      capture: next,
      icons: {
        synthetic: {
          name: "a".repeat(20) + ".svg",
          bytes: svg,
          digest: digest(svg),
        },
      },
      warnings: [],
    };
  };
  const service = new SourceUpdates(root, {
    enabled: true,
    collect,
    replace: opts.replace,
  });
  service.registration = async () => null;
  for (const id of Object.keys(sites)) {
    const c = capture(id),
      dir = path.join(root, "public", c.categories[0].icon, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(root, "public", c.categories[0].icon), svg);
    await writeFile(path.join(dir, "../markers.json"), JSON.stringify(c));
  }
  return { service, root };
}
async function ready(s) {
  const p = await s.prepare();
  await s.jobs.get(p.id).work;
  return s.get(p.id);
}
test("022 staged partial update preserves failures, atomically activates and survives restart", async (t) => {
  const { service: s, root } = await fixture(t, { fail: "wzstats" });
  const before = await s.current();
  const p = await ready(s);
  assert.equal(p.state, "ready");
  assert.equal(p.outcomes.find((o) => o.id === "wzstats").status, "error");
  assert.equal((await s.current()).hash, before.hash);
  await s.reserve(p.id);
  const restart = new SourceUpdates(root, { enabled: true });
  await restart.activate(p.id);
  assert.equal((await restart.current()).value.sources.length, 3);
  await restart.activate(p.id);
  assert.equal((await restart.get(p.id)).state, "activated");
});
test("022 repeated checks reuse semantic captures; same-ID edits are changed records", async (t) => {
  const { service: s } = await fixture(t, { unchanged: true });
  const p = await ready(s);
  assert.ok(p.outcomes.every((o) => o.status === "unchanged"));
  await s.reserve(p.id);
  await s.activate(p.id);
  const q = await ready(s);
  assert.ok(q.outcomes.every((o) => o.status === "unchanged"));
  assert.equal((await s.current()).value.sources.length, 0);
});
test("022 cancellation, competing pointer CAS, lock and rename failure keep current pointer valid", async (t) => {
  const { service: s, root } = await fixture(t, { wait: true });
  const running = await s.prepare();
  await assert.rejects(s.prepare(), /already running/);
  await s.cancel(running.id);
  assert.equal((await s.current()).value.sources.length, 0);
  const p = await ready(s),
    q = await ready(s);
  await assert.rejects(s.prepare(), /Two previews/);
  await s.reserve(p.id);
  await s.reserve(q.id);
  await s.activate(p.id);
  const baseline = await s.current();
  await assert.rejects(s.activate(q.id), /changed in another/);
  assert.equal((await s.current()).hash, baseline.hash);
  await writeFile(
    path.join(root, ".local/source-updates/update.lock"),
    JSON.stringify({ pid: process.pid }),
  );
  await assert.rejects(s.activate(q.id), /locked/);
  await rm(path.join(root, ".local/source-updates/update.lock"));
  await s.cancel(q.id);
  const { service: f } = await fixture(t);
  const r = await ready(f);
  await f.reserve(r.id);
  const real = f.replace;
  f.replace = async (from, to) => {
    if (to === f.pointer) throw Error("Synthetic rename failure");
    return real(from, to);
  };
  await assert.rejects(f.activate(r.id), /rename failure/);
  assert.equal((await f.current()).value.sources.length, 0);
  f.replace = real;
  await f.activate(r.id);
});
test("022 simultaneous prepares acquire mutex before asynchronous preflight and release on failure", async (t) => {
  const { service: s } = await fixture(t, { wait: true });
  const results = await Promise.allSettled([
    s.prepare(),
    s.prepare(),
    s.prepare(),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 2);
  const p = results.find((r) => r.status === "fulfilled").value;
  await s.cancel(p.id);
  const original = s.authorization;
  s.authorization = async () => {
    throw Error("Synthetic bad config");
  };
  await assert.rejects(s.prepare(), /bad config/);
  assert.equal(s.busy, false);
  s.authorization = original;
});
test("022 category rename and distinct CODCentral identities survive unambiguous normalization", async () => {
  const old = capture("codcentral");
  old.records.push({ ...old.records[0], id: "two" });
  const rows = old.records.map((r) => ({
    id: r.id,
    title: r.name,
    category: r.category,
    x: r.x * 4096,
    y: r.y * 4096,
    label: "Synthetic renamed type",
    icon: svg.toString(),
  }));
  const next = await normalizedCapture({
    id: "codcentral",
    rows,
    old,
    iconDirectory: "/maps/hajin/providers/codcentral/icons/",
  });
  assert.deepEqual(
    next.capture.records.map((r) => r.id),
    ["one", "two"],
  );
  assert.equal(next.capture.categories[0].name, "Synthetic renamed type");
  assert.equal(diffCaptures(old, next.capture).categoriesChanged, true);
  const floor = structuredClone(capture());
  floor.records[0].floor = "upper";
  assert.equal(adaptOfficial(floor).records[0].applicability.floor, "upper");
});
test("022 HTTP actions reject missing tokens, cross origin, oversized bodies and arbitrary action input", async (t) => {
  let middleware,
    calls = 0;
  const service = {
    capabilities: async () => ({ enabled: true }),
    prepare: async () => {
      calls++;
      return { id: "synthetic" };
    },
    dispose() {},
  };
  const server = createServer((req, res) => {
    req.url = req.url.replace("/__map-updates", "");
    middleware(req, res, () => {
      res.statusCode = 404;
      res.end();
    });
  });
  sourceUpdatePlugin({ service }).configureServer({
    httpServer: server,
    middlewares: {
      use(_prefix, handler) {
        middleware = handler;
      },
    },
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const origin = `http://127.0.0.1:${server.address().port}`,
    url = origin + "/__map-updates";
  const c = await (await fetch(url + "/capabilities")).json();
  const headers = {
    "content-type": "application/json",
    origin,
    "x-map-update-token": c.token,
  };
  assert.equal(
    (
      await fetch(url + "/prepare", {
        method: "POST",
        headers: { ...headers, "x-map-update-token": "" },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(url + "/prepare", {
        method: "POST",
        headers: { ...headers, origin: "https://evil.invalid" },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(url + "/prepare", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: "https://evil.invalid" }),
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await fetch(url + "/prepare", {
        method: "POST",
        headers,
        body: JSON.stringify({ padding: "a".repeat(5000) }),
      })
    ).status,
    413,
  );
  assert.equal(calls, 0);
  assert.equal(
    (await fetch(url + "/prepare", { method: "POST", headers, body: "{}" }))
      .status,
    200,
  );
  assert.equal(calls, 1);
});
test("022 route guards require loopback exact host/origin and fixed descriptors", () => {
  const req = {
    headers: {
      host: "127.0.0.1:5175",
      origin: "http://127.0.0.1:5175",
      "sec-fetch-site": "same-origin",
    },
    socket: { remoteAddress: "127.0.0.1" },
  };
  assert.equal(localRequest(req), true);
  for (const headers of [
    { host: "evil.invalid:5175" },
    { origin: "https://evil.invalid" },
    { "sec-fetch-site": "cross-site" },
  ])
    assert.equal(
      localRequest({ ...req, headers: { ...req.headers, ...headers } }),
      false,
    );
  assert.equal(
    localRequest({ ...req, socket: { remoteAddress: "10.0.0.1" } }),
    false,
  );
  assert.throws(() =>
    captureSource({
      id: "official",
      snapshot: "https://evil.invalid",
      iconDirectory: "/icons/",
      snapshotDigest: "a".repeat(64),
    }),
  );
});
test("022 workspace applies immutable captures once and retains private metadata/history", async () => {
  const state = emptyWorkspace();
  state.usability = {
    version: 1,
    presets: [],
    separate: [],
    flags: [],
    edits: 7,
  };
  const marker = structuredClone(state.usability);
  const snapshot = structuredClone(adaptOfficial(capture()));
  snapshot.snapshotId = "synthetic-update";
  const p = {
    snapshot,
    digest: await sha256(new TextEncoder().encode(JSON.stringify(snapshot))),
    descriptor: {},
  };
  applyPrepared(state, [p]);
  applyPrepared(state, [p]);
  assert.equal(state.snapshots.length, 1);
  assert.deepEqual(state.usability, marker);
  const next = structuredClone(p);
  next.snapshot.snapshotId = "synthetic-next";
  next.snapshot.records[0].title = "Changed";
  next.digest = await sha256(
    new TextEncoder().encode(JSON.stringify(next.snapshot)),
  );
  applyPrepared(state, [next]);
  assert.equal(state.snapshots.length, 2);
  assert.equal(
    state.snapshots[0].snapshot.records[0].title,
    "Synthetic location",
  );
  await assert.rejects(
    async () => applyPrepared(state, [{ ...p, digest: "a".repeat(64) }]),
    /different content/,
  );
});
test("022 activation and cancellation serialize across service instances and survive restart", async (t) => {
  const { service: s, root } = await fixture(t);
  const j = await ready(s);
  await s.reserve(j.id);
  let release, seen;
  const gate = new Promise((r) => (release = r)),
    entered = new Promise((r) => (seen = r)),
    replace = s.replace;
  s.replace = async (from, to) => {
    if (to === s.pointer) {
      seen();
      await gate;
    }
    return replace(from, to);
  };
  const activation = s.activate(j.id);
  await entered;
  const other = new SourceUpdates(root, { enabled: true });
  await assert.rejects(other.cancel(j.id), /locked/);
  await assert.rejects(other.reserve(j.id), /locked/);
  release();
  await activation;
  const restart = new SourceUpdates(root, { enabled: true });
  assert.equal((await restart.get(j.id)).state, "activated");
  await assert.rejects(restart.cancel(j.id), /cancellation is unavailable/);
  assert.equal((await restart.current()).value.sources.length, 4);
});
test("022 semantic restaging reuses workspace capture and can reselect an older immutable head", async () => {
  const state = emptyWorkspace();
  const snapshot = structuredClone(adaptOfficial(capture()));
  snapshot.sourceRevision = "a".repeat(64);
  snapshot.snapshotId = "synthetic-a";
  const a = { snapshot, digest: "a".repeat(64), descriptor: {} };
  applyPrepared(state, [a]);
  const restaged = structuredClone(a);
  restaged.snapshot.snapshotId = "synthetic-a-restaged";
  restaged.snapshot.capturedAt = "2026-10-29T01:00:00Z";
  restaged.digest = "b".repeat(64);
  assert.equal(
    reusePrepared(state, restaged).snapshot.snapshotId,
    "synthetic-a",
  );
  applyPrepared(state, [restaged]);
  assert.equal(state.snapshots.length, 1);
  const b = structuredClone(a);
  b.snapshot.snapshotId = "synthetic-b";
  b.snapshot.sourceRevision = "c".repeat(64);
  b.snapshot.records[0].title = "Changed";
  b.digest = "c".repeat(64);
  applyPrepared(state, [b]);
  state.entities.push({
    id: "synthetic-reviewed",
    refs: [JSON.stringify(["official", "synthetic-b", "one"])],
    freshness: "current",
  });
  applyPrepared(state, [restaged]);
  assert.equal(state.snapshots.length, 2);
  assert.equal(state.snapshots.at(-1).snapshot.snapshotId, "synthetic-a");
  assert.equal(state.entities[0].freshness, "stale");
});
test("022 ready job bookkeeping refreshes across instances and superseded activations cannot claim current", async (t) => {
  const { service: s, root } = await fixture(t);
  const a = await ready(s),
    b = await ready(s);
  const other = new SourceUpdates(root, { enabled: true });
  await other.cancel(b.id);
  await other.reserve(a.id);
  await other.activate(a.id);
  assert.deepEqual((await s.list()).jobs, []);
  assert.equal((await s.get(a.id)).state, "activated");
  const original = s.collect;
  s.collect = async (id, args) => {
    const r = await original(id, args);
    r.capture.records = args.old.records.map((r, i) =>
      i ? { ...r } : { ...r, name: "Synthetic newer claim" },
    );
    return r;
  };
  const c = await ready(s);
  await s.reserve(c.id);
  await s.activate(c.id);
  assert.equal((await s.current()).value.sources[0].generation, c.id);
  await assert.rejects(other.activate(a.id), /superseded/);
  assert.equal((await s.current()).value.sources[0].generation, c.id);
});
