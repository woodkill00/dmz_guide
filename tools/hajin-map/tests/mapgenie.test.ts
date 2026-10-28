// Synthetic fixtures only; no MapGenie POIs/artwork or remote requests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  mapgenieBindings,
  validateMapgenieMetadata,
  mapgenieFrame,
  mapgenieTileURLs,
  projectMapgenie,
  mapgenieRows,
  verifyMapgenieFrame,
  mapgenieSpriteIcons,
  mapgenieSpriteURL,
} from "../server/mapgenie.mjs";
import {
  canonicalDigest,
  sites,
  digest,
  semantic,
} from "../server/source-contract.mjs";
import {
  withInertParser,
  parsePage,
  normalizedCapture,
} from "../server/source-collectors.mjs";
import { SourceUpdates } from "../server/source-update-service.mjs";
import { allowedURL } from "../server/source-network.mjs";
import { displayDuplicates } from "../src/map/display-duplicates.ts";
import { localProviderSources } from "../src/map/local-providers.ts";
import { sourceAdmission } from "../src/map/source-admission.ts";
function metadata() {
  return {
    mapData: {
      map: { id: 1084, slug: "hajin-dmz" },
      mapConfig: {
        tile_sets: [
          {
            id: 1345,
            map_id: 1084,
            name: "v5",
            path: "call-of-duty-modern-warfare-4/hajin-dmz/v5",
            pattern:
              "call-of-duty-modern-warfare-4/hajin-dmz/v5/{z}/{y}/{x}.jpg",
            extension: "jpg",
            min_zoom: 8,
            max_zoom: 14,
            tiles_max_zoom: 14,
            bounds: {
              8: { x: { min: 127, max: 127 }, y: { min: 127, max: 127 } },
              9: { x: { min: 254, max: 255 }, y: { min: 254, max: 255 } },
              10: { x: { min: 508, max: 511 }, y: { min: 508, max: 511 } },
              11: { x: { min: 1016, max: 1023 }, y: { min: 1016, max: 1023 } },
              12: { x: { min: 2032, max: 2047 }, y: { min: 2032, max: 2047 } },
              13: { x: { min: 4064, max: 4095 }, y: { min: 4064, max: 4095 } },
              14: { x: { min: 8128, max: 8191 }, y: { min: 8128, max: 8191 } },
            },
          },
        ],
      },
      groups: [{ id: 1, title: "SYNTHETIC facilities" }],
      categories: {
        28410: {
          id: 28410,
          group_id: 1,
          title: "SYNTHETIC UAV Tower",
          premium: false,
        },
        28420: {
          id: 28420,
          group_id: 1,
          title: "SYNTHETIC empty exfil",
          premium: false,
        },
      },
    },
    MARKER_SPRITE_POSITIONS_V3: {
      28410: { x: 0, y: 0, width: 16, height: 16, pixelRatio: 2 },
      28420: { x: 16, y: 0, width: 16, height: 16, pixelRatio: 2 },
    },
    MARKER_IMAGES_WIDTH: 32,
    MARKER_IMAGES_HEIGHT: 16,
    MARKER_IMAGES_URL:
      "https://media.mapgenie.io/v2/assets/prod/games/call-of-duty-modern-warfare-4/markers/v34/markers@2x.png",
  };
}
function geographic(x, y) {
  const world = 262144,
    origin = 130048;
  return {
    longitude: ((origin + x) / world) * 360 - 180,
    latitude:
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * (origin + y)) / world))) * 180) /
      Math.PI,
  };
}
const location = (id = 1) => ({
  id,
  map_id: 1084,
  category_id: 28410,
  title: "SYNTHETIC tower",
  description: "<script>inert note</script>",
  ...geographic(300, 600),
});
const spriteBytes = Buffer.from("SYNTHETIC tile bytes");
const authorization = () => ({
  version: 1,
  canonicalDigest,
  authorizedSources: ["mapgenie"],
  mapgenie: {
    frame: { ...mapgenieFrame },
    tiles: mapgenieTileURLs().map((url) => ({
      url,
      sha256: digest(spriteBytes),
    })),
  },
});
const registration = () => ({
  sourceSize: [1024, 1024],
  canonicalDigest,
  matrix: [
    [2, 0, 100],
    [0, 2, 200],
  ],
  rms: 0,
  maxError: 0,
  heldOut: 2,
});
test("024 MapGenie literal extraction is inert and validates exact declared map/category metadata", () => {
  const m = metadata(),
    scripts = Object.entries(m).map(
      ([k, v]) =>
        `${k === "mapData" ? "window." : "const "}${k}=${JSON.stringify(v)};`,
    ),
    parsed = validateMapgenieMetadata(mapgenieBindings(scripts));
  assert.equal(parsed.categories.length, 2);
  assert.equal(parsed.categories[0].group, "SYNTHETIC facilities");
  assert.throws(
    () =>
      mapgenieBindings([
        'window.mapData=(()=>{throw Error("must not execute")})()',
      ]),
    /nonliteral/,
  );
  assert.throws(
    () => mapgenieBindings(["window.mapData={__proto__:null}"]),
    /unsafe/,
  );
  assert.throws(
    () => mapgenieBindings(["window.mapData={a:1,a:2}"]),
    /duplicate/,
  );
  assert.throws(
    () => mapgenieBindings(["window.mapData={};window.mapData={}"]),
    /duplicate/,
  );
  const changed = metadata();
  changed.mapData.mapConfig.tile_sets[0].name = "v6";
  assert.throws(() => validateMapgenieMetadata(changed), /frame changed/);
  const premium = metadata();
  premium.mapData.categories[28410].premium = true;
  assert.throws(() => validateMapgenieMetadata(premium), /restricted/);
});
test("024 WebMercator maps all reviewed corners and interior points without axis/scale guesses", () => {
  for (const [x, y] of [
    [0, 0],
    [1024, 0],
    [0, 1024],
    [1024, 1024],
    [300, 600],
    [512, 512],
  ]) {
    const p = geographic(x, y),
      q = projectMapgenie(p.latitude, p.longitude);
    assert.ok(Math.abs(q.x - x) < 1e-8 && Math.abs(q.y - y) < 1e-8);
  }
  for (const [lat, lon] of [
    [NaN, 0],
    [Infinity, 0],
    [90, 0],
    [0, 181],
    [1, -20],
    [0.5, "-1"],
  ])
    assert.throws(() => projectMapgenie(lat, lon));
});
test("024 five5000-record captures admit20k deterministically and can prioritize selected sources without losing data", () => {
  const ids = ["official", "codmunity", "wzstats", "codcentral", "mapgenie"],
    loaded = new Map(ids.map((id) => [id, 5000]));
  const p = sourceAdmission(new Map(), loaded, {});
  assert.equal(p.used, 20000);
  assert.deepEqual([...p.excluded], ["mapgenie"]);
  assert.equal(
    sourceAdmission(new Map(), new Map([...loaded].reverse()), {}).used,
    20000,
  );
  const preferred = sourceAdmission(new Map(), loaded, {
    official: false,
    codmunity: false,
    codcentral: false,
    wzstats: false,
    mapgenie: true,
  });
  assert.equal(preferred.used, 20000);
  assert.equal(preferred.excluded.has("mapgenie"), false);
  assert.equal(loaded.size, 5);
  const authoritative = sourceAdmission(
    new Map([
      ["mapgenie", 5000],
      ["official", 5000],
    ]),
    loaded,
    {},
  );
  assert.equal(authoritative.used, 20000);
  assert.equal(authoritative.excluded.has("mapgenie"), false);
  assert.throws(() => sourceAdmission(new Map([["bad", 20001]]), loaded, {}));
  const entry = {
    authorization: "SYNTHETIC local permission",
    canonicalDigest,
    rms: 1,
    maxError: 2,
    heldOut: 2,
    snapshotDigest: "a".repeat(64),
    registrationDigest: "b".repeat(64),
  };
  assert.equal(
    localProviderSources({
      version: 1,
      sources: ids.slice(1).map((id) => ({ ...entry, id })),
    }).length,
    4,
  );
});
test("024 public location parser retains stable IDs/notes/floors and refuses malformed/conflicting records", () => {
  const meta = validateMapgenieMetadata(metadata()),
    r = mapgenieRows({ locations: [{ ...location(), floor: "upper" }] }, meta)
      .rows[0];
  assert.equal(r.id, "mg-1");
  assert.equal(r.category, "mapgenie-28410");
  assert.equal(r.floor, "upper");
  assert.match(r.notes, /<script>/);
  assert.ok(Math.abs(r.x - 300) < 1e-8 && Math.abs(r.y - 600) < 1e-8);
  assert.equal(
    mapgenieRows({ locations: [location()] }, meta).rows[0].floor,
    undefined,
  );
  for (const locations of [
    [],
    [location(), location()],
    [{ ...location(), category_id: 999 }],
    [{ ...location(), map_id: 99 }],
    [{ ...location(), title: "" }],
    [{ ...location(), latitude: "1invalid" }],
  ])
    assert.throws(() => mapgenieRows({ locations }, meta));
});
test("024 exact16tile hashes and reviewed source frame gate every MapGenie update", async () => {
  const meta = validateMapgenieMetadata(metadata());
  let requests = 0;
  await verifyMapgenieFrame(meta, authorization(), registration(), async () => {
    requests++;
    return spriteBytes;
  });
  assert.equal(requests, 16);
  const bad = authorization();
  bad.mapgenie.tiles[15] = bad.mapgenie.tiles[0];
  await assert.rejects(
    verifyMapgenieFrame(meta, bad, registration(), async () => spriteBytes),
    /repeated/,
  );
  await assert.rejects(
    verifyMapgenieFrame(meta, authorization(), registration(), async () =>
      Buffer.from("changed"),
    ),
    /imagery changed/,
  );
  await assert.rejects(
    verifyMapgenieFrame(
      meta,
      authorization(),
      { ...registration(), sourceSize: [1000, 1000] },
      async () => spriteBytes,
    ),
    /reviewed/,
  );
  for (const u of [
    sites.mapgenie.page,
    sites.mapgenie.publicData,
    ...mapgenieTileURLs(),
    metadata().MARKER_IMAGES_URL,
  ])
    assert.ok(allowedURL(u));
  for (const u of [
    "https://mapgenie.io/api/v1/user/map-data/1084",
    "https://mapgenie.io/api/v1/maps/99/data",
    "https://tiles.mapgenie.io/games/call-of-duty-modern-warfare-4/hajin-dmz/v6/10/508/508.jpg",
    "https://media.mapgenie.io/other.png",
  ])
    assert.throws(() => allowedURL(u));
  assert.throws(() => mapgenieSpriteURL("https://evil.invalid/markers.png"));
});
test("024 sandboxed sprite cropping re-encodes actual bounded PNGs and preserves empty category metadata", async () => {
  await withInertParser(async (page) => {
    const png = Buffer.from(
        await page.evaluate(() => {
          const c = document.createElement("canvas");
          c.width = 32;
          c.height = 16;
          c.getContext("2d").fillRect(0, 0, 32, 16);
          return c.toDataURL("image/png").split(",")[1];
        }),
        "base64",
      ),
      meta = validateMapgenieMetadata(metadata()),
      icons = await mapgenieSpriteIcons(page, png, meta);
    assert.equal(icons.size, 2);
    assert.equal(icons.get("mapgenie-28410").bytes.readUInt32BE(16), 16);
    const { rows } = mapgenieRows({ locations: [location()] }, meta),
      result = await normalizedCapture({
        id: "mapgenie",
        rows,
        registration: registration(),
        iconDirectory: "/maps/hajin/providers/mapgenie/icons/",
        declaredCategories: meta.categories,
        readCurrentIcon: async (c) => icons.get(c),
      });
    assert.equal(result.capture.categories.length, 2);
    assert.equal(result.capture.records.length, 1);
    assert.equal(result.capture.categories[0].group, "SYNTHETIC facilities");
    assert.ok(Math.abs(result.capture.records[0].x - 700 / 4096) < 1e-8);
    const bad = metadata();
    const injected = metadata();
    injected.MARKER_SPRITE_POSITIONS_V3[28410].id = "mapgenie-28420";
    const bound = await mapgenieSpriteIcons(
      page,
      png,
      validateMapgenieMetadata(injected),
    );
    assert.equal(bound.size, 2);
    assert.ok(bound.has("mapgenie-28410"));
    bad.MARKER_SPRITE_POSITIONS_V3[28410].x = 30;
    await assert.rejects(
      mapgenieSpriteIcons(page, png, validateMapgenieMetadata(bad)),
      /crop/,
    );
    await assert.rejects(
      mapgenieSpriteIcons(page, Buffer.from("<svg/>"), meta),
      /PNG/,
    );
    const markup = await parsePage(
      page,
      "mapgenie",
      '<script>window.mapData={"map":{"id":1084}}</script><img src="https://evil.invalid/no">',
    );
    assert.equal(mapgenieBindings(markup.scripts).mapData.map.id, 1084);
  });
});
test("024 MapGenie known facility aliases retain exact name+location, floor and per-source protections", () => {
  const a = {
      key: "a",
      sourceId: "official",
      category: "dmz_uavTower",
      title: "SYNTHETIC tower",
      x: 2000,
      y: 2000,
      floor: null,
      build: null,
      visible: true,
    },
    b = { ...a, key: "b", sourceId: "mapgenie", category: "mapgenie-28410" };
  assert.ok(displayDuplicates([a, b]).suppressed.has("b"));
  assert.equal(
    displayDuplicates([a, { ...b, title: "Other" }]).suppressed.size,
    0,
  );
  assert.equal(displayDuplicates([a, { ...b, x: 2050 }]).suppressed.size, 0);
  assert.equal(
    displayDuplicates([
      { ...a, floor: "lower" },
      { ...b, floor: "upper" },
    ]).suppressed.size,
    0,
  );
  assert.equal(
    displayDuplicates([a, { ...b, category: "mapgenie-28432" }]).suppressed
      .size,
    0,
  );
  assert.equal(
    displayDuplicates([a, b, { ...b, key: "c" }]).suppressed.size,
    1,
  );
});
async function temporary(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "dmz-mapgenie-"));
  t.after(async () => {
    assert.ok(
      path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep),
    );
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(path.join(root, "public/maps/hajin"), { recursive: true });
  return root;
}
test("024 old four-source authorization stays valid and unauthorized MapGenie triggers no acquisition", async (t) => {
  const root = await temporary(t),
    ids = Object.keys(sites).filter((id) => id !== "mapgenie"),
    auth = { version: 1, canonicalDigest, authorizedSources: ids };
  await writeFile(
    path.join(root, "public/maps/hajin/update-authorization.local.json"),
    JSON.stringify(auth),
  );
  const called = [];
  const s = new SourceUpdates(root, {
    enabled: true,
    collect: async (id) => {
      called.push(id);
      throw Error("SYNTHETIC source outcome");
    },
  });
  s.registration = async () => null;
  s.baseline = async () => ({ capture: {} });
  assert.equal((await s.capabilities()).enabled, true);
  const job = await s.prepare();
  await s.jobs.get(job.id).work;
  const result = await s.get(job.id);
  assert.deepEqual(called, ids);
  assert.match(
    result.outcomes.find((o) => o.id === "mapgenie").message,
    /not authorized/,
  );
  assert.equal(result.outcomes.length, 5);
});
test("024 authorized reviewed MapGenie bootstraps without disturbing old baseline and repeats as a no-op", async (t) => {
  const root = await temporary(t),
    a = authorization(),
    file = path.join(
      root,
      "public/maps/hajin/providers/mapgenie/registration.local.json",
    );
  await mkdir(path.dirname(file), { recursive: true });
  const evidence = Buffer.from(
    JSON.stringify({
      registrationVersion: "reviewed-affine-v1",
      registration: registration(),
    }),
  );
  await writeFile(file, evidence);
  a.mapgenie.registrationDigest = digest(evidence);
  await writeFile(
    path.join(root, "public/maps/hajin/update-authorization.local.json"),
    JSON.stringify(a),
  );
  const s = new SourceUpdates(root, {
    enabled: true,
    collect: async (id, args) =>
      normalizedCapture({
        id,
        rows: [
          {
            id: "mg-1",
            title: "SYNTHETIC tower",
            category: "mapgenie-28410",
            label: "SYNTHETIC type",
            x: 300,
            y: 600,
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="4"/></svg>',
          },
        ],
        registration: args.registration,
        old: args.old,
        iconDirectory: args.iconDirectory,
      }),
  });
  const first = await s.prepare();
  await s.jobs.get(first.id).work;
  const p = await s.get(first.id);
  assert.equal(p.outcomes.find((o) => o.id === "mapgenie").diff.added, 1);
  await s.reserve(p.id);
  await s.activate(p.id);
  assert.equal((await s.current()).value.sources.length, 1);
  const second = await s.prepare();
  await s.jobs.get(second.id).work;
  const q = await s.get(second.id);
  assert.equal(q.outcomes.find((o) => o.id === "mapgenie").status, "unchanged");
  assert.equal((await s.current()).value.sources.length, 1);
  a.mapgenie.registrationDigest = "a".repeat(64);
  await assert.rejects(s.registration("mapgenie", a), /evidence changed/);
  for (const matrix of [
    [
      [0, 0, 2000],
      [0, 0, 2000],
    ],
    [
      [1, 1, 2000],
      [1, 1 + 1e-12, 2000],
    ],
  ]) {
    const bytes = Buffer.from(
      JSON.stringify({
        registrationVersion: "reviewed-affine-v1",
        registration: { ...registration(), matrix },
      }),
    );
    await writeFile(file, bytes);
    a.mapgenie.registrationDigest = digest(bytes);
    await assert.rejects(s.registration("mapgenie", a), /singular|degenerate/);
  }
});
test("024 sprite decode extent/deadline and unsupported PNG chunks fail and dispose the decoder page", async () => {
  await withInertParser(async (page) => {
    const png = Buffer.from(
        await page.evaluate(() => {
          const c = document.createElement("canvas");
          c.width = 32;
          c.height = 16;
          return c.toDataURL("image/png").split(",")[1];
        }),
        "base64",
      ),
      meta = validateMapgenieMetadata(metadata());
    await page.evaluate(() => {
      window.originalBitmap = createImageBitmap;
      window.bitmapClosed = false;
      window.createImageBitmap = async () => ({
        width: 33,
        height: 16,
        close() {
          window.bitmapClosed = true;
        },
      });
    });
    await assert.rejects(
      mapgenieSpriteIcons(page, png, meta),
      /extent changed/,
    );
    assert.equal(await page.evaluate(() => window.bitmapClosed), true);
    await page.evaluate(() => {
      window.createImageBitmap = window.originalBitmap;
    });
    const chunk = Buffer.alloc(12);
    chunk.write("acTL", 4, "ascii");
    const animated = Buffer.concat([
      png.subarray(0, 33),
      chunk,
      png.subarray(33),
    ]);
    await assert.rejects(mapgenieSpriteIcons(page, animated, meta), /animated/);
    await assert.rejects(
      mapgenieSpriteIcons(page, png.subarray(0, png.length - 1), meta),
      /Truncated|Incomplete/,
    );
    await page.evaluate(() => {
      window.createImageBitmap = () => new Promise(() => {});
    });
    await assert.rejects(
      mapgenieSpriteIcons(page, png, meta, { decodeTimeoutMs: 20 }),
      /timed out/,
    );
    assert.equal(page.isClosed(), true);
  });
});

// Reference cards are captured identities, never fabricated world positions.
test("024 decimal API coordinates and off-terrain reference entries survive repeat capture without pins",async()=>{
 const m=metadata();m.mapData.categories[28403]={id:28403,group_id:1,title:'SYNTHETIC mission',premium:false};m.MARKER_SPRITE_POSITIONS_V3[28403]={x:0,y:0,width:16,height:16,pixelRatio:2};
 const meta=validateMapgenieMetadata(m),p=geographic(900,900);
 const {rows}=mapgenieRows({locations:[{...location(),category_id:28403,latitude:String(p.latitude),longitude:String(p.longitude)}]},meta);
 const options={id:'mapgenie',rows,registration:{...registration(),matrix:[[6,0,-1000],[0,6,-1400]]},iconDirectory:'/maps/hajin/providers/mapgenie/icons/',declaredCategories:meta.categories,readCurrentIcon:async()=>({name:'a'.repeat(20)+'.png',bytes:Buffer.from('SYNTHETIC'),digest:digest(Buffer.from('SYNTHETIC'))})};
 const first=await normalizedCapture(options),second=await normalizedCapture(options);
 assert.equal(first.capture.records.length,1);assert.equal(first.capture.records[0].placement,'reference');assert.equal(first.capture.records[0].x,null);assert.equal(semantic(first.capture,{}),semantic(second.capture,{}));
 const {adaptOfficial}=await import('../src/workspace/import.ts');const converted=adaptOfficial(first.capture,'mapgenie');assert.deepEqual(converted.records[0].rawGeometry,{kind:'unplaced'});
 const {emptyWorkspace}=await import('../src/workspace/model.ts');const {explorerRecords,coverage}=await import('../src/workspace/explorer-index.ts');const w=emptyWorkspace();
 const found=explorerRecords(w,[{id:'mapgenie',getSnapshot:()=>first.capture,getSnapshotDigest:()=>digest(Buffer.from('SYNTHETIC'))}]);assert.equal(found.length,1);assert.equal(found[0].x,null);assert.equal(found[0].visible,false);assert.match(found[0].status,/Reference/);const official={...found[0],key:'official',sourceId:'official',placement:undefined,x:100,y:100};const check=coverage([official,...found],[]);assert.equal(check.available,true);assert.equal(check.rows.length,0);const {asDisplay}=await import('../src/workspace/explorer-index.ts');assert.equal(asDisplay(found[0]),null);
 const {validateCapture}=await import('../server/source-contract.mjs');for(const sourceX of [undefined,Infinity])assert.throws(()=>validateCapture({...first.capture,records:[{...first.capture.records[0],sourceX}]},'mapgenie'));assert.throws(()=>adaptOfficial({...first.capture,sourcePage:sites.codcentral.page},'codcentral'));
 const facility=mapgenieRows({locations:[{...location(),...p}]},meta).rows;await assert.rejects(normalizedCapture({...options,rows:facility}));
});
