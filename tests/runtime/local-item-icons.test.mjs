import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import registry from "../../src/content/item-icons.json" with { type: "json" };
import {
  createItemIconReader,
  validateItemIconBytes,
} from "../../scripts/item-icons.mjs";
import { fetchItemIcon } from "../../scripts/collect-item-icons.mjs";
import { imageInfo } from "../../src/content/portable.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
test("local icon register matches catalog identities without duplicates or currency guesses", () => {
  assert.equal(Object.keys(registry.assets).length, 168);
  for (const [key, count] of [
    ["official-starter", 166],
    ["upgrade-observations", 118],
  ]) {
    const pack = loadFixturePack(key),
      map = registry.items[pack.id];
    assert.equal(Object.keys(map).length, count);
    for (const [id, icon] of Object.entries(map)) {
      const item = pack.items.find((i) => i.id === id);
      assert(item);
      assert(registry.assets[icon]);
      assert.equal(
        item.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
        registry.assets[icon].name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      );
      assert.notEqual(item.kind, "currency");
    }
  }
  for (const entry of Object.values(registry.assets)) {
    assert.match(entry.file, /^[a-z0-9-]+\.(png|jpg|webp)$/);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert(entry.bytes > 0 && entry.bytes <= 1024 * 1024);
    assert(entry.width <= 2048 && entry.height <= 2048);
    assert(!/local-illustration|placeholder|generic/.test(entry.sourceURL));
    assert(entry.attribution.includes("Local use"));
  }
});
test("local icon bytes require exact hash, dimensions and byte count", async () => {
  const bytes = await readFile(
      "media/bundled-pictures/items/demo_bundled-token/original.jpg",
    ),
    entry = {
      ...imageInfo(new Uint8Array(bytes)),
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  assert.equal(validateItemIconBytes(entry, bytes), bytes);
  for (const field of ["width", "height", "bytes"])
    assert.throws(() =>
      validateItemIconBytes({ ...entry, [field]: entry[field] + 1 }, bytes),
    );
  assert.throws(() =>
    validateItemIconBytes({ ...entry, sha256: "0".repeat(64) }, bytes),
  );
});
test("local reader rejects unsafe paths and handles missing/tampered files without serving them", async () => {
  let reads = 0;
  const reader = createItemIconReader({
    root: ".",
    read: async () => {
      reads++;
      throw Error("missing");
    },
  });
  for (const path of [
    "/local-item-icons/../secret.png",
    "/local-item-icons/%2e%2e.png",
    "/local-item-icons/nope.png",
    "/local-item-icons/chemicals.webp?x=1",
  ])
    assert.equal((await reader(path)).status, 404);
  assert.equal(reads, 0);
  assert.equal(
    (await reader("/local-item-icons/" + registry.assets.chemicals.file))
      .status,
    404,
  );
  assert.equal(reads, 1);
});
test("collector rejects unknown URL, incorrect MIME and over-budget responses", async () => {
  await assert.rejects(
    fetchItemIcon({
      ...registry.assets.chemicals,
      sourceURL: "https://example.org/no.png",
    }),
    /Unregistered/,
  );
  await assert.rejects(
    fetchItemIcon(registry.assets.chemicals, {
      fetcher: async () =>
        new Response("bad", { headers: { "content-type": "text/html" } }),
    }),
    /unsupported/,
  );
  await assert.rejects(
    fetchItemIcon(registry.assets.chemicals, {
      fetcher: async () =>
        new Response(new Uint8Array(registry.assets.chemicals.bytes + 1), {
          headers: { "content-type": registry.assets.chemicals.mime },
        }),
    }),
    /byte limit/,
  );
});
