import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { allRecords, recordUrl } from "../../src/ui/render.mjs";

export async function runBundledAssetTests({
  browser,
  base,
  captureScreenshots = true,
}) {
  const manifest = await (
    await fetch(base + "/assets/content/bundled-assets.json")
  ).json();
  const index = await (
    await fetch(base + "/assets/content/manifest.json")
  ).json();
  const packs = await Promise.all(
    index.packs.map(async (path) => (await fetch(base + path)).json()),
  );
  const pack = packs.find((p) => p.id === "demo:bundled-pictures");
  assert(pack, "Bundled fictional picture fixture is published");
  const bundled = manifest.packs.find((p) => p.packId === pack.id);
  assert(bundled);
  assert.equal(pack.assets.length, 2);
  const records = allRecords([pack]),
    item = records.find((r) => r.recordType === "item" && r.assetId),
    map = records.find((r) => r.recordType === "map" && r.assetId);
  assert(item && map);
  const detailURL = recordUrl(item),
    mapDetailURL = recordUrl(map),
    query = encodeURIComponent(pack.id);
  const external = [];
  async function context(options = {}) {
    const ctx = await browser.newContext(options);
    await ctx.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (
        ["http:", "https:"].includes(url.protocol) &&
        url.origin !== new URL(base).origin
      ) {
        external.push(url.href);
        return route.abort();
      }
      return route.continue();
    });
    return ctx;
  }
  const noScript = await context({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const p = await noScript.newPage();
    for (const [record, path] of [
      [item, detailURL],
      [map, mapDetailURL],
    ]) {
      const asset = pack.assets.find((a) => a.id === record.assetId),
        entry = bundled.assets.find((a) => a.assetId === record.assetId);
      const response = await p.goto(base + path);
      assert.equal(response.status(), 200);
      const img = p.locator("img[data-public-image]");
      assert.equal(await img.count(), 1);
      assert.equal(await img.getAttribute("src"), entry.url);
      assert((await img.getAttribute("alt"))?.trim());
      if (record.spoiler) {
        assert.equal(await img.locator("xpath=ancestor::details").count(), 1);
        assert(!(await img.getAttribute("alt")).includes(record.name));
        await p.locator("details.spoiler-content summary").click();
      }
      await p.waitForFunction(() => {
        const image = document.querySelector("img[data-public-image]");
        return image?.complete && image.naturalWidth > 0;
      });
      assert.deepEqual(
        await img.evaluate((i) => [i.naturalWidth, i.naturalHeight]),
        [asset.width, asset.height],
      );
      const bytes = await p.request.get(base + entry.url);
      assert.equal(bytes.status(), 200);
      assert.equal(bytes.headers()["content-type"].split(";")[0], asset.mime);
      assert.equal((await bytes.body()).length, asset.bytes);
      assert.match(
        await p.locator("main").textContent(),
        /FICTIONAL|fictional/,
      );
    }
    if (captureScreenshots)
      await p.screenshot({
        path: "test-results/public-bundled-map-no-js-390.png",
        fullPage: true,
      });
  } finally {
    await noScript.close();
  }
  const denied = await context({ viewport: { width: 390, height: 844 } });
  try {
    await denied.addInitScript(() =>
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        get() {
          throw new Error("Storage disabled for public fixture verification");
        },
      }),
    );
    const p = await denied.newPage();
    await p.goto(base + detailURL);
    await p.waitForFunction(
      () =>
        document.querySelector("img[data-public-image]")?.naturalWidth === 8,
    );
    await p.goto(base + "/maps/?pack=" + query);
    await p.waitForSelector("#map-background image");
    assert.equal(await p.locator("#pack-select").inputValue(), pack.id);
    const dimensions = await p
      .locator("#map-background image")
      .evaluate(async (node) => {
        const image = new Image();
        image.src = node.getAttribute("href");
        await image.decode();
        return [image.naturalWidth, image.naturalHeight];
      });
    assert.deepEqual(dimensions, [8, 6]);
    assert(
      (await p.locator("#location-list button").count()) > 0,
      "Raster map retains useful list",
    );
    if (captureScreenshots)
      await p.screenshot({
        path: "test-results/public-bundled-map-no-idb-390.png",
        fullPage: true,
      });
    // A 200 response with corrupt image bytes tests readable fallback, without masking HTTP errors.
    const entry = bundled.assets.find((a) => a.assetId === map.assetId);
    await denied.route("**" + entry.url, (route) =>
      route.fulfill({
        status: 200,
        contentType: entry.mime,
        body: Buffer.alloc(entry.bytes),
      }),
    );
    await p.reload();
    await p.waitForFunction(() =>
      document
        .querySelector("#imagery-status")
        ?.textContent.includes("Image unavailable"),
    );
    assert.equal(await p.locator("#map-background image").count(), 0);
    assert((await p.locator("#location-list button").count()) > 0);
  } finally {
    await denied.close();
  }
  const editable = await context();
  let text;
  try {
    const p = await editable.newPage();
    await p.goto(base + "/editor/?pack=" + query);
    await p.waitForFunction(
      () => document.querySelectorAll("#picture-preview img").length === 2,
    );
    await p.waitForFunction(() =>
      [...document.querySelectorAll("#picture-preview img")].every(
        (i) => i.complete && i.naturalWidth === 8 && i.naturalHeight === 6,
      ),
    );
    await p.check("#export-rights");
    const download = p.waitForEvent("download");
    await p.click("#export-pictures");
    text = await readFile(await (await download).path(), "utf8");
    const envelope = JSON.parse(text);
    assert.equal(envelope.pack.id, pack.id);
    assert.equal(envelope.payloads.length, pack.assets.length);
    assert(!("profile" in envelope) && !("inventory" in envelope.pack));
    // First-edit history retains bundled pixels, not a reference-only rollback snapshot.
    await p.locator('[data-path="contentVersion"]').fill("bundled-private-2");
    await p.selectOption("#editor-section", "items");
    await p
      .locator('[data-path="items.0.name"]')
      .fill("Private original picture token");
    await p
      .getByRole("button", {
        name: "Validate and preview changes",
        exact: true,
      })
      .click();
    await p.waitForSelector("#content-stage:not([hidden])");
    await p.click("#apply-content");
    await p.waitForFunction(() =>
      document
        .querySelector("#save-status")
        ?.textContent.includes("Private content saved"),
    );
    const saved = await p.evaluate(async (id) => {
      const { readRecord } = await import("/assets/src/storage/store.mjs");
      return readRecord("content", id);
    }, pack.id);
    assert.deepEqual(saved.previous.payloads, envelope.payloads);
    await p.click("#rollback-content");
    await p.waitForSelector("#content-stage:not([hidden])");
    await p.click("#apply-content");
    await p.waitForFunction(() =>
      document
        .querySelector("#save-status")
        ?.textContent.includes("Private content saved"),
    );
    const restored = await p.evaluate(async (id) => {
      const { readRecord } = await import("/assets/src/storage/store.mjs");
      return (await readRecord("content", id)).value;
    }, pack.id);
    assert.deepEqual(restored.payloads, envelope.payloads);
    assert.equal(restored.pack.items[0].name, pack.items[0].name);
    // Even with self-consistent manifest metadata, invalid compressed pixels must fail real decode.
    const corrupt = await p.evaluate(
      async ({ pack, manifest }) => {
        const { loadBundledPayloads, bundledFileURL } = await import(
          "/assets/src/content/bundled-assets.mjs"
        );
        const { hashBytes, imageInfo } = await import(
          "/assets/src/content/portable.mjs"
        );
        const candidate = structuredClone(pack),
          a = candidate.assets.find((a) => a.mime === "image/png"),
          m = structuredClone(manifest),
          entry = m.packs
            .find((p) => p.packId === candidate.id)
            .assets.find((x) => x.assetId === a.id),
          bytes = new Uint8Array(await (await fetch(entry.url)).arrayBuffer());
        let offset = 8;
        const view = new DataView(bytes.buffer);
        while (offset + 12 <= bytes.length) {
          const n = view.getUint32(offset);
          if (
            String.fromCharCode(...bytes.slice(offset + 4, offset + 8)) ===
            "IDAT"
          ) {
            bytes.fill(0, offset + 8, offset + 8 + n);
            break;
          }
          offset += n + 12;
        }
        imageInfo(bytes);
        a.sha256 = await hashBytes(bytes);
        entry.sha256 = a.sha256;
        entry.url = bundledFileURL(candidate.id, a);
        try {
          await loadBundledPayloads(candidate, {
            manifest: m,
            assetIds: [a.id],
            fetchImpl: async () =>
              new Response(bytes, { headers: { "content-type": a.mime } }),
          });
          return false;
        } catch {
          return true;
        }
      },
      { pack, manifest },
    );
    assert(corrupt, "Malformed compressed raster cannot pass browser decode");
  } finally {
    await editable.close();
  }
  // Replacing pixels under an existing ID must not overwrite the first rollback snapshot.
  const replaced = await context();
  try {
    const p = await replaced.newPage(),
      original = JSON.parse(text);
    await p.goto(base + "/editor/?pack=" + query);
    await p.waitForFunction(
      () => document.querySelectorAll("#picture-preview img").length === 2,
    );
    const before = await p.evaluate(async (id) => {
      const { readRecord } = await import("/assets/src/storage/store.mjs");
      return readRecord("content", id);
    }, pack.id);
    assert.equal(
      before,
      null,
      "The replacement is genuinely the first private content save",
    );
    const replacement = await p.evaluate(
      async ({ original, assetId }) => {
        const { bytesFromBase64, hashBytes } = await import(
          "/assets/src/content/portable.mjs"
        );
        const candidate = structuredClone(original),
          canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 6;
        const drawing = canvas.getContext("2d");
        drawing.fillStyle = "#da7740";
        drawing.fillRect(0, 0, 8, 6);
        drawing.fillStyle = "#18344e";
        drawing.fillRect(0, 0, 4, 3);
        const base64 = canvas.toDataURL("image/png").split(",")[1],
          bytes = bytesFromBase64(base64);
        const asset = candidate.pack.assets.find((a) => a.id === assetId);
        Object.assign(asset, {
          path: "assets/replaced-token.png",
          mime: "image/png",
          bytes: bytes.length,
          sha256: await hashBytes(bytes),
          width: 8,
          height: 6,
        });
        candidate.payloads.find((p) => p.assetId === assetId).base64 = base64;
        candidate.pack.contentVersion = "bundled-replacement-2";
        return candidate;
      },
      { original, assetId: item.assetId },
    );
    const originalAsset = original.pack.assets.find(
        (a) => a.id === item.assetId,
      ),
      replacementAsset = replacement.pack.assets.find(
        (a) => a.id === item.assetId,
      );
    assert.equal(replacementAsset.id, originalAsset.id);
    assert.notEqual(
      replacementAsset.sha256,
      originalAsset.sha256,
      "The same asset ID carries genuinely different pixels",
    );
    await p.setInputFiles("#import-content", {
      name: "same-id-picture-replacement.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(replacement)),
    });
    await p.waitForSelector("#content-stage:not([hidden])");
    await p.click("#apply-content");
    await p.waitForFunction(() =>
      document
        .querySelector("#save-status")
        ?.textContent.includes("Private content saved"),
    );
    const first = await p.evaluate(async (id) => {
      const { readRecord } = await import("/assets/src/storage/store.mjs");
      return readRecord("content", id);
    }, pack.id);
    assert.equal(first.value.revision, 1);
    assert.deepEqual(first.value.payloads, replacement.payloads);
    assert.deepEqual(first.previous.pack, original.pack);
    assert.deepEqual(
      first.previous.payloads,
      original.payloads,
      "Immutable baseline pixels, not replacement draft pixels, belong in first history",
    );
    await p.click("#rollback-content");
    await p.waitForSelector("#content-stage:not([hidden])");
    await p.click("#apply-content");
    await p.waitForFunction(() =>
      document
        .querySelector("#save-status")
        ?.textContent.includes("Private content saved"),
    );
    const restored = await p.evaluate(async (id) => {
      const { readRecord } = await import("/assets/src/storage/store.mjs");
      return (await readRecord("content", id)).value;
    }, pack.id);
    assert.equal(restored.revision, 2);
    assert.deepEqual(restored.pack, original.pack);
    assert.deepEqual(restored.payloads, original.payloads);
    for (const asset of original.pack.assets) {
      const actual = restored.payloads.find((p) => p.assetId === asset.id),
        expected = original.payloads.find((p) => p.assetId === asset.id);
      assert.deepEqual(
        Buffer.from(actual.base64, "base64"),
        Buffer.from(expected.base64, "base64"),
      );
      assert.equal(
        createHash("sha256")
          .update(Buffer.from(actual.base64, "base64"))
          .digest("hex"),
        asset.sha256,
      );
    }
    await p.waitForFunction(
      () =>
        [...document.querySelectorAll("#picture-preview img")].length === 2 &&
        [...document.querySelectorAll("#picture-preview img")].every(
          (i) => i.complete && i.naturalWidth === 8 && i.naturalHeight === 6,
        ),
    );
  } finally {
    await replaced.close();
  }
  const imported = await context();
  try {
    const p = await imported.newPage();
    await p.goto(base + "/editor/");
    await p.waitForSelector('[data-path="contentVersion"]');
    await p.setInputFiles("#import-content", {
      name: "bundled-pictures.json",
      mimeType: "application/json",
      buffer: Buffer.from(text),
    });
    await p.waitForSelector("#content-stage:not([hidden])");
    await p.click("#apply-content");
    await p.waitForFunction(() =>
      document
        .querySelector("#save-status")
        ?.textContent.includes("Private content saved"),
    );
    await p.reload();
    await p.waitForFunction(
      () => document.querySelectorAll("#picture-preview img").length === 2,
    );
    const stored = await p.evaluate(async (id) => {
      const { readRecord } = await import("/assets/src/storage/store.mjs");
      return (await readRecord("content", id)).value;
    }, pack.id);
    assert.deepEqual(stored.payloads, JSON.parse(text).payloads);
    await p.goto(
      base + "/local/?pack=" + query + "&id=" + encodeURIComponent(item.id),
    );
    await p.waitForFunction(() =>
      [...document.querySelectorAll("main img")].some(
        (i) => i.complete && i.naturalWidth === 8 && i.naturalHeight === 6,
      ),
    );
    // A changed reference-only overlay must not borrow stale public pixels.
    await p.evaluate(async (id) => {
      const { readRecord, commitRecord } = await import(
        "/assets/src/storage/store.mjs"
      );
      const record = await readRecord("content", id);
      const value = structuredClone(record.value);
      value.pack.contentVersion = "private-reference-new-version";
      value.payloads = [];
      value.revision++;
      await commitRecord("content", id, value, record.value.revision);
    }, pack.id);
    await p.goto(base + "/maps/?pack=" + query);
    await p.waitForFunction(() =>
      document
        .querySelector("#imagery-status")
        ?.textContent.includes("Image unavailable"),
    );
    assert.equal(await p.locator("#map-background image").count(), 0);
    assert((await p.locator("#location-list button").count()) > 0);
  } finally {
    await imported.close();
  }
  assert.deepEqual(
    external,
    [],
    "Bundled picture journeys make no external request",
  );
}
