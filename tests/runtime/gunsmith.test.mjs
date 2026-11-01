import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readWeaponIntel } from "../../src/content/weapon-intel.mjs";
import { renderArmory } from "../../src/ui/armory-page.mjs";
import { createWeaponArtReader } from "../../scripts/weapon-art.mjs";
import figures from "../../src/ui/weapon-figures.json" with { type: "json" };
const db = await readWeaponIntel();
test("050 all current weapons retain identities, native links and scoped unknowns", () => {
  const html = renderArmory(db);
  assert.deepEqual(
    [...html.matchAll(/data-preview-weapon="([a-z0-9-]+)"/g)]
      .slice(0, 5)
      .map((m) => m[1]),
    ["han-86", "m4", "hyeon-burst", "kastov-762", "patriot-xmr"],
  );
  assert.equal((html.match(/data-weapon-row /g) || []).length, 33);
  for (const w of db.weapons) {
    assert(html.includes(`href="/armory/${w.id}/"`));
    const detail = renderArmory(db, w.id);
    assert(detail.includes("Unknown bars are not performance scores"));
    assert(detail.includes("Official patch history"));
    assert(detail.includes(`?weapon=${w.id}#builder`));
  }
  const knife = renderArmory(db, "fss-carbon-edge-1095");
  assert(!knife.includes('data-focus-slot="optic"'));
  assert(!knife.includes('data-focus-slot="apex"'));
  for (const [id, slot] of [
    ["cronen-squall", "stock"],
    ["ppsh-41", "fire-mods"],
    ["x-58-nyx", "muzzle"],
    ["warlord", "magazine"],
  ]) {
    const html = renderArmory(db, id);
    assert(html.includes(`data-focus-slot="${slot}"`));
    assert(html.includes(`<option>${slot}</option>`));
  }
});
test("050 untrusted labels remain inert and roster payload round-trips", () => {
  const copy = structuredClone(db);
  copy.weapons[0].name = "</script><img src=x onerror=alert(1)>";
  const html = renderArmory(copy);
  assert(!html.includes("<img src=x"));
  const payload = html.match(
    /id="gunsmith-roster-data">([\s\S]*?)<\/script>/,
  )[1];
  assert.equal(JSON.parse(payload).db.weapons[0].name, copy.weapons[0].name);
});
test("050 artwork registry has exact known ownership, bounded crops and fixed sources", () => {
  assert.deepEqual(
    Object.keys(figures).sort(),
    db.weapons.map((w) => w.id).sort(),
  );
  assert.equal(Object.values(figures).filter(Boolean).length, 33);
  for (const figure of Object.values(figures).filter(Boolean)) {
    assert.match(
      figure.sourceURL,
      /^https:\/\/imgs\.callofduty\.com\/content\/dam\/atvi\/callofduty\/cod-touchui\/blog\/body\/mw4\/rfl-ops-and-weapons\/MW4-RFL-OPS-WEAPONS-\d{3}\.webp$/,
    );
    assert.match(figure.sha256, /^[a-f0-9]{64}$/);
    const [x, y, w, h] = figure.crop;
    assert(
      x >= 0 &&
        y >= 0 &&
        w > 0 &&
        h > 0 &&
        x + w <= figure.width &&
        y + h <= figure.height,
    );
  }
});
test("050 artwork reader rejects arbitrary paths and returns inert unavailable art", async () => {
  const calls = [];
  const reader = createWeaponArtReader({
    root: tmpdir(),
    read: async (...args) => {
      calls.push(args);
      return new Uint8Array([60, 115, 118, 103, 62]);
    },
  });
  for (const path of [
    "/local-weapon-art/not-real.webp",
    "/local-weapon-art/../secret.webp",
    "/local-weapon-art/%68an-86.webp",
    "/local-weapon-art/han-86.webp?secret=1",
  ])
    assert.equal((await reader(path)).status, 404);
  assert.equal(calls.length, 0);
  const result = await reader("/local-weapon-art/han-86.webp");
  assert.equal(result.type, "image/svg+xml");
  assert.equal(result.available, false);
  assert.equal(calls[0][1], ".local/weapon-art/han-86.webp");
  assert.equal(calls[0][2], 2097152);
});
test("050 missing and symlinked local art never exposes target bytes", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dmz050-art-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, ".local/weapon-art"), { recursive: true });
  const reader = createWeaponArtReader({ root });
  assert.equal((await reader("/local-weapon-art/m4.webp")).available, false);
  await writeFile(join(root, "private.txt"), "private fixture");
  await symlink(
    join(root, "private.txt"),
    join(root, ".local/weapon-art/han-86.webp"),
  );
  const result = await reader("/local-weapon-art/han-86.webp");
  assert.equal(result.available, false);
  assert(!new TextDecoder().decode(result.bytes).includes("private fixture"));
});
test("050 bounded queue limits active reads and drains normal thumbnail bursts", async () => {
  let active = 0,
    peak = 0;
  const release = [];
  const reader = createWeaponArtReader({
    root: tmpdir(),
    read: () =>
      new Promise((resolve) => {
        active++;
        peak = Math.max(peak, active);
        release.push(() => {
          active--;
          resolve(new Uint8Array([0]));
        });
      }),
  });
  const work = Array.from({ length: 12 }, () =>
    reader("/local-weapon-art/han-86.webp"),
  );
  assert.equal(peak, 4);
  for (let n = 0; n < 3; n++) {
    release.splice(0).forEach((f) => f());
    await new Promise((r) => setImmediate(r));
  }
  assert((await Promise.all(work)).every((r) => r.status === 200));
  assert.equal(peak, 4);
});
test("050 timed-out reads retain slots and waiting requests remain bounded", async () => {
  const release = [];
  let reads = 0;
  const reader = createWeaponArtReader({
    root: tmpdir(),
    deadlineMs: 10,
    read: () => {
      reads++;
      return new Promise((resolve) =>
        release.push(() => resolve(new Uint8Array([0]))),
      );
    },
  });
  const work = Array.from({ length: 69 }, () =>
    reader("/local-weapon-art/han-86.webp"),
  );
  assert.equal((await work[68]).status, 503);
  assert((await Promise.all(work)).every((r) => r.status === 503));
  assert.equal(reads, 4);
  release.forEach((f) => f());
  await new Promise((r) => setImmediate(r));
});
