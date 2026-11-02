import { allKeys } from "../../src/content/key-access.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  keyGuide,
  keyImages,
  keyIcons,
  keyAssets,
  validateKeyGuide,
  keyMatches,
} from "../../src/content/keys.mjs";
import { featurePages } from "../../src/ui/keys-page.mjs";
import { createKeyImageReader } from "../../scripts/key-images.mjs";
import {
  fetchKeyImage,
  collectKeyImages,
} from "../../scripts/collect-key-images.mjs";
test("053 source snapshot contains eighteen unique keys, real heading anchors and paired screenshots", () => {
  assert.equal(keyGuide.keys.length, 18);
  assert.equal(Object.keys(keyImages).length, 18);
  assert.equal(keyGuide.keys[0].sourceAnchor, "hm_2");
  assert.equal(keyGuide.keys.at(-1).sourceAnchor, "hm_19");
  assert.equal(
    keyGuide.keys.find((k) => k.id === "police-station-armory").locations
      .length,
    4,
  );
  assert(
    keyMatches(
      keyGuide.keys.find((k) => k.id === "shopping-drc-locker"),
      "12 battery",
      "loot",
    ),
  );
  const pages = featurePages();
  assert.equal(pages.length, allKeys.length + 1);
  assert.equal(new Set(pages.map((p) => p.path)).size, allKeys.length + 1);
  for (const k of keyGuide.keys) {
    const html = pages.find((p) => p.path === `/keys/${k.id}/`).body;
    assert(html.includes(`#${k.sourceAnchor}`));
    assert(html.includes(`/local-key-images/${k.id}.webp`));
    assert(html.includes("not a verified complete"));
    assert(!html.includes('<img src="https:'));
  }
});
test("053 schema rejects duplicate/missing source identities and unsafe image registers", () => {
  for (const alter of [
    (v) => v.keys.push(v.keys[0]),
    (v) => (v.keys[1].sourceAnchor = v.keys[0].sourceAnchor),
    (v) => (v.keys[0].locations = []),
    (v) => (v.keys[0].category = "unsupported"),
    (v) => (v.sourceURL = "https://example.invalid"),
    (v) => (v.keys[0].steps = ["x".repeat(401)]),
  ]) {
    const v = structuredClone(keyGuide);
    alter(v);
    assert.throws(() => validateKeyGuide(v, keyImages));
  }
  for (const alter of [
    (v) => delete v[Object.keys(v)[0]],
    (v) => (v[Object.keys(v)[0]].url = "https://evil.invalid/image"),
    (v) => (v[Object.keys(v)[0]].width = 99999),
    (v) => (v[Object.keys(v)[0]].sha256 = "bad"),
  ]) {
    const v = structuredClone(keyImages);
    alter(v);
    assert.throws(() => validateKeyGuide(keyGuide, v));
  }
});
test("053 search combines location, grid, acquisition, aliases and prerequisites without changing records", () => {
  assert.equal(keyGuide.keys.filter((k) => keyMatches(k, "B-C3")).length, 1);
  assert.equal(
    keyGuide.keys.filter((k) => keyMatches(k, "casino F4")).length,
    2,
  );
  assert.equal(
    keyGuide.keys.filter((k) => keyMatches(k, "", "story")).length,
    4,
  );
  assert.equal(
    keyGuide.keys.filter((k) => keyMatches(k, "Recon 46", "level")).length,
    1,
  );
  assert.equal(
    keyGuide.keys.filter((k) => keyMatches(k, "nonsense")).length,
    0,
  );
  assert.equal(
    keyGuide.keys.filter((k) => keyMatches(k, "  COIN mining key ")).length,
    1,
  );
});
test("053 image requests refuse unregistered/encoded/query paths and never return imported active content", async () => {
  let calls = 0;
  const reader = createKeyImageReader({
    root: tmpdir(),
    read: async () => {
      calls++;
      return Buffer.from("<script>bad</script>");
    },
  });
  for (const p of [
    "/local-key-images/no.webp",
    "/local-key-images/../secret.webp",
    "/local-key-images/%6dirae-electrical-room.webp",
    "/local-key-images/mirae-electrical-room.webp?x=1",
  ])
    assert.equal((await reader(p)).status, 404);
  assert.equal(calls, 0);
  // Synthetic WebP container has the registered dimensions but different bytes.
  const fake = Buffer.alloc(30);
  fake.write("RIFF");
  fake.writeUInt32LE(22, 4);
  fake.write("WEBP", 8);
  fake.write("VP8 ", 12);
  fake.writeUInt32LE(10, 16);
  fake[23] = 157;
  fake[24] = 1;
  fake[25] = 42;
  fake.writeUInt16LE(800, 26);
  fake.writeUInt16LE(418, 28);
  const mismatch = createKeyImageReader({
    root: tmpdir(),
    read: async () => fake,
  });
  assert.equal(
    (await mismatch("/local-key-images/mirae-electrical-room.webp")).available,
    false,
  );
  await assert.rejects(
    fetchKeyImage(keyImages["mirae-electrical-room"], {
      fetcher: async () =>
        new Response(fake, { headers: { "content-type": "image/webp" } }),
    }),
    /no longer matches/,
  );

  const r = await reader("/local-key-images/mirae-electrical-room.webp");
  assert.equal(r.type, "image/svg+xml");
  assert.equal(r.available, false);
  assert(!new TextDecoder().decode(r.bytes).includes("<script>"));
});
test("053 missing/corrupt/symlinked images preserve safe placeholders", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dmz053-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, ".local/key-images"), { recursive: true });
  const reader = createKeyImageReader({ root });
  assert.equal(
    (await reader("/local-key-images/mirae-electrical-room.webp")).available,
    false,
  );
  await writeFile(join(root, "private.txt"), "private fixture");
  await symlink(
    join(root, "private.txt"),
    join(root, ".local/key-images/mirae-electrical-room.webp"),
  );
  const r = await reader("/local-key-images/mirae-electrical-room.webp");
  assert.equal(r.available, false);
  assert(!new TextDecoder().decode(r.bytes).includes("private fixture"));
});
test("053 image reader bounds active ownership, backlog and deadlines", async () => {
  const release = [];
  let reads = 0;
  const reader = createKeyImageReader({
    root: tmpdir(),
    deadlineMs: 10,
    read: () => {
      reads++;
      return new Promise((r) => release.push(() => r(Buffer.from([0]))));
    },
  });
  const work = Array.from({ length: 69 }, () =>
    reader("/local-key-images/mirae-electrical-room.webp"),
  );
  assert.equal((await work[68]).status, 503);
  assert((await Promise.all(work)).every((r) => r.status === 503));
  assert.equal(reads, 4);
  release.forEach((f) => f());
  await new Promise((r) => setImmediate(r));
});
test("053 explicit collector rejects unknown URLs, HTTP/MIME/oversize/digest changes and retains prior files", async (t) => {
  const entry = Object.values(keyImages)[0];
  await assert.rejects(
    fetchKeyImage({ ...entry, url: "https://example.invalid/" }),
    /Unregistered/,
  );
  for (const response of [
    () => new Response("blocked", { status: 403 }),
    () => new Response("active", { headers: { "content-type": "text/html" } }),
    () =>
      new Response(new Uint8Array(2097153), {
        headers: { "content-type": "image/webp" },
      }),
    () => new Response("bad", { headers: { "content-type": "image/webp" } }),
  ])
    await assert.rejects(
      fetchKeyImage(entry, {
        fetcher: async (url, options) => {
          assert.equal(url, entry.url);
          assert.equal(options.redirect, "error");
          return response();
        },
      }),
    );
  const root = await mkdtemp(join(tmpdir(), "dmz053-collect-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, ".local/key-images"), { recursive: true });
  const path = join(root, ".local/key-images/mirae-electrical-room.webp");
  await writeFile(path, "previous fixture");
  await assert.rejects(
    collectKeyImages(root, {
      fetcher: async () => {
        throw Error("offline");
      },
    }),
    /offline/,
  );
  assert.equal(await readFile(path, "utf8"), "previous fixture");
});

test("054 directory link icons cover all keys while retaining screenshot identities", () => {
  assert.equal(Object.keys(keyIcons).length, 18);
  assert.equal(Object.keys(keyAssets).length, 36);
  assert.equal(new Set(Object.values(keyIcons).map((v) => v.url)).size, 5);
  const directory = featurePages()[0].body;
  for (const key of keyGuide.keys) {
    assert.equal(keyIcons[key.id].width, 72);
    assert.equal(keyIcons[key.id].height, 72);
    assert.deepEqual(keyAssets[key.id], keyImages[key.id]);
    assert.deepEqual(keyAssets["icon-" + key.id], keyIcons[key.id]);
    assert(
      directory.includes(
        `href="/keys/${key.id}/"><img src="/local-key-images/icon-${key.id}.webp" alt=""`,
      ),
    );
  }
});
test("054 missing or changed registered icons use a safe square generic key fallback", async () => {
  const reader = createKeyImageReader({
    root: tmpdir(),
    read: async () => Buffer.from("changed image"),
  });
  const result = await reader(
    "/local-key-images/icon-mirae-electrical-room.webp",
  );
  assert.equal(result.status, 200);
  assert.equal(result.type, "image/svg+xml");
  assert.equal(result.available, false);
  const svg = new TextDecoder().decode(result.bytes);
  assert(svg.includes('width="72"'));
  assert(!svg.includes("changed image"));
  assert.equal(
    (await reader("/local-key-images/icon-mirae-electrical-room.webp?x=1"))
      .status,
    404,
  );
});
