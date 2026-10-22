import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { allRecords, recordUrl } from "../../src/ui/render.mjs";
import { expectConsoleErrors } from "./health.mjs";

export async function runBundledAssetTests({
  browser,
  base,
  captureScreenshots = true,
}) {
  const engine = browser.browserType().name();
  console.log(
    "Bundled raster environment:",
    JSON.stringify({
      engine,
      version: browser.version(),
      platform: process.platform,
      job: process.env.GITHUB_JOB || "local",
      run: process.env.GITHUB_RUN_ID || "unscheduled",
    }),
  );
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
  } finally {
    await editable.close();
  }
  // Isolate intentional codec failures: no other context may consume their diagnostics.
  const invalidRaster = await context();
  let codecDiagnostics;
  try {
    const p = await invalidRaster.newPage();
    await p.goto(base + "/");
    codecDiagnostics = expectConsoleErrors(invalidRaster, {
      label: "Intentional malformed PNG/JPEG full-pixel decode rejection",
      patterns: [/^Image corrupt or truncated\.$/],
      maxCount: 2,
    });
    const results = await p.evaluate(
      async ({ pack, manifest, payloads }) => {
        const { loadBundledPayloads, bundledFileURL, decodeBundledRaster } =
          await import("/assets/src/content/bundled-assets.mjs");
        const { hashBytes, imageInfo, bytesFromBase64 } = await import(
          "/assets/src/content/portable.mjs"
        );
        const crc32 = (bytes) => {
          let crc = 0xffffffff;
          for (const byte of bytes) {
            crc ^= byte;
            for (let bit = 0; bit < 8; bit++)
              crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
          }
          return (crc ^ 0xffffffff) >>> 0;
        };
        const candidatePNG = () =>
          bytesFromBase64(
            payloads.find(
              (p) =>
                p.assetId ===
                pack.assets.find((a) => a.mime === "image/png").id,
            ).base64,
          );
        const results = [],
          nativeBitmap = globalThis.createImageBitmap;
        let bitmapCalls = 0;
        globalThis.createImageBitmap = (...args) => {
          bitmapCalls++;
          return nativeBitmap.apply(globalThis, args);
        };
        try {
          const valid = candidatePNG();
          const dimensions = await decodeBundledRaster(valid, "image/png");
          results.push({
            layer: "valid-png-full-bitmap",
            dimensions,
            bitmapCalls,
          });
          for (const mime of ["image/png", "image/jpeg"]) {
            bitmapCalls = 0;
            const candidate = structuredClone(pack),
              a = candidate.assets.find((a) => a.mime === mime),
              m = structuredClone(manifest);
            const entry = m.packs
              .find((p) => p.packId === candidate.id)
              .assets.find((x) => x.assetId === a.id);
            let bytes,
              changedChunks = 0;
            if (mime === "image/png") {
              bytes = bytesFromBase64(
                payloads.find((p) => p.assetId === a.id).base64,
              );
              const view = new DataView(bytes.buffer);
              let offset = 8;
              while (offset + 12 <= bytes.length) {
                const n = view.getUint32(offset);
                if (
                  String.fromCharCode(
                    ...bytes.slice(offset + 4, offset + 8),
                  ) === "IDAT"
                ) {
                  // Invalid zlib stream with a correct PNG chunk checksum isolates the codec layer.
                  bytes.fill(0, offset + 8, offset + 8 + n);
                  view.setUint32(
                    offset + 8 + n,
                    crc32(bytes.subarray(offset + 4, offset + 8 + n)),
                  );
                  changedChunks++;
                }
                offset += n + 12;
              }
            } else {
              // Independent absent-pixel-stream case: valid SOF dimensions but no SOS/scan at all.
              bytes = Uint8Array.from([
                0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 6, 0, 8, 1, 1, 0x11, 0,
                0xff, 0xd9,
              ]);
            }
            const header = imageInfo(bytes);
            a.bytes = bytes.length;
            a.sha256 = await hashBytes(bytes);
            entry.bytes = a.bytes;
            entry.sha256 = a.sha256;
            entry.url = bundledFileURL(candidate.id, a);
            let decodeCalls = 0,
              fetchCalls = 0;
            try {
              await loadBundledPayloads(candidate, {
                manifest: m,
                assetIds: [a.id],
                fetchImpl: async () => {
                  fetchCalls++;
                  return new Response(bytes, {
                    headers: { "content-type": a.mime },
                  });
                },
                decodeRaster: async (actualBytes, type, signal, deadline) => {
                  decodeCalls++;
                  return decodeBundledRaster(
                    actualBytes,
                    type,
                    signal,
                    deadline,
                  );
                },
              });
              results.push({
                rejected: false,
                decodeCalls,
                fetchCalls,
                header,
                changedChunks,
                bitmapCalls,
                layer:
                  mime === "image/png"
                    ? "strict-png-preflight"
                    : "jpeg-full-bitmap",
              });
            } catch (error) {
              results.push({
                rejected: true,
                decodeCalls,
                fetchCalls,
                header,
                changedChunks,
                bitmapCalls,
                layer:
                  mime === "image/png"
                    ? "strict-png-preflight"
                    : "jpeg-full-bitmap",
                error: error.message,
              });
            }
          }
          return results;
        } finally {
          globalThis.createImageBitmap = nativeBitmap;
        }
      },
      { pack, manifest, payloads: JSON.parse(text).payloads },
    );
    console.log(
      "Bundled raster layer results:",
      JSON.stringify({ engine, results }),
    );
    assert.equal(results.length, 3);
    assert.deepEqual(results[0], {
      layer: "valid-png-full-bitmap",
      dimensions: { width: 8, height: 6 },
      bitmapCalls: 1,
    });
    assert(
      results[1].changedChunks > 0,
      "PNG zlib data and its checksum were both changed",
    );
    for (const result of results.slice(1)) {
      assert.deepEqual(result.header, {
        mime: result.header.mime,
        width: 8,
        height: 6,
      });
      assert.equal(result.fetchCalls, 1);
      if (result.header.mime === "image/png") {
        assert.equal(
          result.decodeCalls,
          0,
          "Known-invalid PNG must be rejected by the shared strict preflight before a supplied decoder",
        );
        assert.equal(
          result.bitmapCalls,
          0,
          "Known-invalid PNG must not reach a permissive browser bitmap codec",
        );
        assert.match(result.error, /PNG zlib/);
      } else {
        assert.equal(
          result.decodeCalls,
          1,
          "JPEG fixture must reach the real decoder wrapper",
        );
        assert.equal(
          result.bitmapCalls,
          1,
          "JPEG fixture must invoke the real full-pixel codec",
        );
      }
      assert(
        result.rejected,
        `${engine}/${result.layer}: malformed pixels cannot pass layered raster validation`,
      );
      assert.doesNotMatch(
        result.error,
        /timed out|cancelled/i,
        "Malformed pixels must be rejected rather than merely expire",
      );
    }
  } finally {
    await invalidRaster.close();
    if (codecDiagnostics)
      console.log(
        "Expected isolated codec diagnostics:",
        JSON.stringify({ engine, ...codecDiagnostics() }),
      );
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
    const describedTransfer = JSON.parse(text);
    // Description changes are content edits, so preserve the existing version guard.
    describedTransfer.pack.contentVersion = "bundled-described-private-1";
    const describedItem = describedTransfer.pack.items.find(
      (record) => record.id === item.id,
    );
    describedItem.imageDescriptions = [
      {
        assetId: item.assetId,
        text: "Synthetic grid used in this private item.",
        decorative: false,
      },
    ];
    const decorativeMap = describedTransfer.pack.maps.find(
      (record) => record.id === map.id,
    );
    decorativeMap.imageDescriptions = [
      { assetId: map.assetId, text: "", decorative: true },
    ];
    await p.setInputFiles("#import-content", {
      name: "bundled-pictures.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(describedTransfer)),
    });
    try {
      await p.waitForSelector("#content-stage:not([hidden])");
    } catch (cause) {
      const feedback = await p.evaluate(() =>
        ["#error", "#save-status"].map((selector) => ({
          selector,
          text: (document.querySelector(selector)?.textContent || "").slice(
            0,
            1000,
          ),
        })),
      );
      throw new Error(
        `Described picture import did not stage: ${JSON.stringify(feedback)}`,
        { cause },
      );
    }
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
    assert.equal(
      stored.pack.contentVersion,
      describedTransfer.pack.contentVersion,
    );
    assert.deepEqual(
      stored.pack.maps.find((record) => record.id === map.id).imageDescriptions,
      decorativeMap.imageDescriptions,
    );
    await p.goto(
      base + "/local/?pack=" + query + "&id=" + encodeURIComponent(item.id),
    );
    await p.waitForFunction(() =>
      [...document.querySelectorAll("main img")].some(
        (i) => i.complete && i.naturalWidth === 8 && i.naturalHeight === 6,
      ),
    );
    assert.equal(
      await p.locator("#private-picture img").first().getAttribute("alt"),
      "Synthetic grid used in this private item.",
    );
    assert.deepEqual(
      stored.pack.items.find((record) => record.id === item.id)
        .imageDescriptions,
      describedItem.imageDescriptions,
    );
    await p.goto(
      base + "/local/?pack=" + query + "&id=" + encodeURIComponent(map.id),
    );
    await p.waitForSelector("#private-picture img", { state: "attached" });
    assert.equal(
      await p.locator("#private-picture img").first().getAttribute("alt"),
      "",
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
