import test from "node:test";
import assert from "node:assert/strict";
import {
  readFile,
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  symlink,
  readdir,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { readWeaponCamos } from "../../src/content/weapon-camos.mjs";
import { readWeaponAcquisition } from "../../src/content/weapon-acquisition.mjs";
import {
  validateCamoCatalog,
  parseCamoCatalog,
} from "../../src/domain/weapon-camos.mjs";
import {
  renderWeaponCamos,
  progressionGuide,
  featurePages,
} from "../../src/ui/weapon-camos-page.mjs";
import {
  createCamoImageReader,
  validCamoImage,
} from "../../scripts/camo-images.mjs";
import { collectCamoImages } from "../../scripts/collect-camo-images.mjs";
import { captureCamoRows } from "../../scripts/capture-camo-catalog.mjs";
const catalog = await readWeaponCamos(),
  roster = (await readWeaponAcquisition()).weapons;
const clone = (v) => structuredClone(v);
// Synthetic header-valid raster only: never presented as real game art.
const bytes = Buffer.alloc(30);
bytes.write("RIFF");
bytes.writeUInt32LE(22, 4);
bytes.write("WEBPVP8 ", 8);
bytes.writeUInt32LE(10, 16);
bytes[23] = 157;
bytes[24] = 1;
bytes[25] = 42;
bytes.writeUInt16LE(128, 26);
bytes.writeUInt16LE(128, 28);
const fake = () => {
  const c = clone(catalog);
  c.weapons = [c.weapons[0]];
  c.weapons[0].rows = [c.weapons[0].rows[0]];
  c.weapons[0].rows[0].image.sha256 = createHash("sha256")
    .update(bytes)
    .digest("hex");
  return c;
};
const rawPath = "/local-camo-images/han-86/military-camo-1.webp";
test("089 all released weapons have 25 ordered core camo rows and fixed media associations", () => {
  assert.equal(catalog.weapons.length, 35);
  assert.equal(catalog.weapons.flatMap((w) => w.rows).length, 875);
  assert.deepEqual(
    new Set(catalog.weapons.map((w) => w.id)),
    new Set(roster.map((w) => w.id)),
  );
  const han = catalog.weapons.find((w) => w.id === "han-86");
  assert.equal(han.rows[0].requirement, "Reach Weapon Level 10");
  assert.equal(
    han.rows.find((r) => r.id === "gold").requirement,
    "Complete the 3 Weapon Specific Camo Challenges, then get 100 Enemy Kills in a single match in DMZ",
  );
  assert.match(
    catalog.weapons
      .find((w) => w.id === "cronen-osprey")
      .rows.find((r) => r.id === "chained").requirement,
    /100 times/,
  );
  assert.equal(validateCamoCatalog(catalog, roster), catalog);
});
test("089 rejects unsupported fields, unsafe URLs, malformed images, roster/order/coverage drift", () => {
  for (const mutate of [
    (c) => c.weapons.pop(),
    (c) => c.weapons[0].rows.pop(),
    (c) => (c.weapons[0].rows[0].id = "constructor"),
    (c) => (c.weapons[0].rows[1].id = c.weapons[0].rows[0].id),
    (c) => (c.weapons[0].rows[0].sourceURL = "javascript:alert(1)"),
    (c) =>
      (c.weapons[0].rows[0].image.sourceURL =
        "https://codcentral.net.evil.test/a.webp"),
    (c) => (c.weapons[0].rows[0].image.width = 9999),
    (c) => (c.weapons[0].rows[0].image.sha256 = "invalid"),
    (c) => (c.weapons[0].rows[0].order = 2),
    (c) => (c.weapons[0].rows[0].group = "fake"),
    (c) => (c.version = 2),
    (c) => (c.checkedAt = "2026-02-30"),
    (c) => (c.provider.extra = true),
    (c) => (c.coverage = "x".repeat(1001)),
    (c) => (c.weapons[0].rows[0].requirement = "\u0000"),
    (c) => (c.weapons[0].name = "Wrong weapon"),
  ]) {
    const c = clone(catalog);
    mutate(c);
    assert.throws(() => validateCamoCatalog(c, roster));
  }
  assert.throws(() => parseCamoCatalog('{"__proto__":{}}', roster));
  assert.throws(
    () => parseCamoCatalog(" ".repeat(2 * 1024 * 1024 + 1), roster),
    /byte/,
  );
});
test("089 published guidance retains correct non-linear gates and reported labels", () => {
  const html = renderWeaponCamos(
    catalog,
    catalog.weapons[0],
    new Set(["han-86"]),
  );
  assert.equal((html.match(/data-camo-row=/g) || []).length, 25);
  assert.match(
    progressionGuide(),
    /each of the three challenges opens at its own weapon level/,
  );
  assert.match(progressionGuide(), /33 Platinum/);
  assert.match(progressionGuide(), /33 Harmonic Break/);
  assert.match(progressionGuide(), /automatic Prestige Master transition/);
  assert.match(html, /Prestige Master Level 73/);
  assert.match(html, /Multiplayer · shared/);
  assert.match(html, /DMZ · shared/);
  assert.match(html, /Warzone/);
  assert.match(html, /Spinal Verge/);
  assert(!html.includes("<script"));
});
test("089 every route and native gun/acquisition linkage is present without combat inventions", async () => {
  const pages = await featurePages();
  assert.equal(pages.length, 36);
  for (const w of catalog.weapons)
    assert(pages.some((p) => p.path === `/armory/camos/${w.id}/`));
  assert(
    !pages
      .find((p) => p.path === "/armory/camos/cronen-osprey/")
      .body.includes('href="/armory/cronen-osprey/"'),
  );
  for (const p of ["armory-page.mjs", "weapon-acquisition-page.mjs"])
    assert.match(
      await readFile(new URL("../../src/ui/" + p, import.meta.url), "utf8"),
      /\/armory\/camos\//,
    );
});
test("089 local image reader rejects unregistered/encoded/query paths before file access", async () => {
  let reads = 0;
  const reader = await createCamoImageReader({
    catalog: fake(),
    root: tmpdir(),
    read: async () => {
      reads++;
      return bytes;
    },
  });
  for (const path of [
    rawPath + "?x=1",
    rawPath.replace("han-86", "%68an-86"),
    rawPath.replace("han-86", ".."),
    rawPath.replace("han-86", "absent"),
    rawPath.replace(".webp", ".svg"),
  ])
    assert.equal((await reader(path)).status, 404);
  assert.equal(reads, 0);
  assert.equal((await reader(rawPath)).status, 200);
  assert.equal(reads, 1);
  assert(!validCamoImage(new Uint8Array([0]), fake().weapons[0].rows[0].image));
});
test("089 missing/corrupt/symlink cache files never expose private bytes", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dmz089-reader-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, ".local/camo-images"), { recursive: true });
  const reader = await createCamoImageReader({ root, catalog: fake() }),
    target = join(root, ".local/camo-images/han-86--military-camo-1.webp");
  assert.equal((await reader(rawPath)).status, 404);
  await writeFile(target, "private synthetic bytes");
  assert.equal((await reader(rawPath)).status, 404);
  await rm(target);
  await writeFile(join(root, "private.txt"), "private fixture");
  await symlink(join(root, "private.txt"), target);
  assert.equal((await reader(rawPath)).status, 404);
});
test("089 reader queue/concurrency/deadline stays bounded", async () => {
  let active = 0,
    peak = 0;
  const release = [];
  const reader = await createCamoImageReader({
    root: tmpdir(),
    catalog: fake(),
    deadlineMs: 50,
    read: () =>
      new Promise((resolve) => {
        active++;
        peak = Math.max(peak, active);
        release.push(() => {
          active--;
          resolve(bytes);
        });
      }),
  });
  const pending = Array.from({ length: 70 }, () => reader(rawPath));
  assert.equal(peak, 4);
  const results = await Promise.all(pending);
  assert(results.every((r) => r.status === 503));
  assert.equal(release.length, 4);
  release.forEach((f) => f());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal((await reader(rawPath)).status, 503);
  assert.equal(
    release.length,
    5,
    "Expired queued reads must not start after active work drains",
  );
  release[4]();
});
test("089 collector reuses verified files, rejects changed remote data and leaves no temp files", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dmz089-collect-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const c = fake();
  let requests = 0;
  const fetcher = async (url, options) => {
    requests++;
    assert.equal(options.redirect, "error");
    assert.match(url, /^https:\/\/codcentral.net\/assets\/library\//);
    return new Response(bytes, { headers: { "content-type": "image/webp" } });
  };
  const result = await collectCamoImages({ root, catalog: c, fetcher });
  assert.equal(result.downloaded, 1);
  assert.equal(
    (await collectCamoImages({ root, catalog: c, fetcher })).reused,
    1,
  );
  assert.equal(requests, 1);
  const changed = clone(c);
  changed.weapons[0].rows[0].image.sha256 = "0".repeat(64);
  await assert.rejects(
    collectCamoImages({ root, catalog: changed, fetcher }),
    /changed/,
  );
  assert.deepEqual(
    await readFile(
      join(root, ".local/camo-images/han-86--military-camo-1.webp"),
    ),
    bytes,
  );
  assert(
    !(await readdir(join(root, ".local/camo-images"))).some((p) =>
      p.startsWith("temp-"),
    ),
  );
  for (const response of [
    () => new Response(bytes, { headers: { "content-type": "text/html" } }),
    () =>
      new Response(new Uint8Array(512 * 1024 + 1), {
        headers: { "content-type": "image/webp" },
      }),
  ]) {
    const missing = clone(c);
    missing.weapons[0].rows[0].id = "missing";
    missing.weapons[0].rows[0].image.sourceURL =
      "https://codcentral.net/assets/library/mw4/dmz/camos/han-86/swatch-missing.webp";
    await assert.rejects(
      collectCamoImages({
        root,
        catalog: missing,
        fetcher: async () => response(),
      }),
    );
  }
});
test("089 inert capture stages rows without executing source scripts and rejects coverage drift", () => {
  let html = '<script>throw new Error("untrusted synthetic fixture")</script>';
  for (const w of catalog.weapons) {
    html += `<section class="dcm-weapon" data-weapon="${w.id}">`;
    for (const r of w.rows)
      html += `<li class="dcl-row" data-group="${r.group}"><a href="${r.sourceURL}"><img src="${r.image.sourceURL}"><span class="dcl-name">${r.name}</span><span class="dcl-line">${r.requirement}</span></a></li>`;
    html += "</section>";
  }
  assert.deepEqual(captureCamoRows(html, roster, catalog), catalog.weapons);
  assert.throws(
    () => captureCamoRows("<script></script>", roster, catalog),
    /roster/,
  );
  assert.throws(
    () =>
      captureCamoRows(
        html.replace(
          catalog.weapons[0].rows[0].image.sourceURL,
          "https://evil.test/art.webp",
        ),
        roster,
        catalog,
      ),
    /source/,
  );
});

test("089 collector aborts a stalled stream at its20second deadline", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dmz089-timeout-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const pending = collectCamoImages({
    root,
    catalog: fake(),
    fetcher: async (url, { signal }) => {
      return new Response(
        new ReadableStream({
          start(controller) {
            signal.addEventListener("abort", () =>
              controller.error(new Error("Synthetic stream aborted")),
            );
            started();
          },
        }),
        { headers: { "content-type": "image/webp" } },
      );
    },
  });
  const rejected = assert.rejects(pending, /aborted/);
  await ready;
  t.mock.timers.tick(20000);
  await rejected;
  assert.deepEqual(await readdir(join(root, ".local/camo-images")), []);
});

test("089 collector stops aggregate downloads above128MiB with valid preceding cache retained", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dmz089-budget-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const padded = Buffer.alloc(256 * 1024);
  bytes.copy(padded);
  padded.writeUInt32LE(padded.length - 8, 4);
  padded.write("JUNK", 30);
  padded.writeUInt32LE(padded.length - 38, 34);
  const c = fake(),
    template = c.weapons[0].rows[0],
    hash = createHash("sha256").update(padded).digest("hex");
  assert(validCamoImage(padded, { ...template.image, sha256: hash }));
  c.weapons[0].rows = Array.from({ length: 520 }, (_, i) => ({
    ...template,
    id: `synthetic-${i}`,
    image: {
      ...template.image,
      sourceURL: `https://codcentral.net/assets/library/mw4/dmz/camos/han-86/swatch-synthetic-${i}.webp`,
      sha256: hash,
    },
  }));
  let requested = 0;
  await assert.rejects(
    collectCamoImages({
      root,
      catalog: c,
      fetcher: async () => {
        requested++;
        return new Response(padded, {
          headers: { "content-type": "image/webp" },
        });
      },
    }),
    /byte limit/,
  );
  assert(
    requested >= 513 && requested <= 516,
    "Four workers stop when first aggregate cap failure is recorded",
  );
  const files = await readdir(join(root, ".local/camo-images"));
  assert(files.length > 0);
  assert(!files.some((p) => p.startsWith("temp-")));
});
