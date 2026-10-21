import assert from "node:assert/strict";

// Synthetic canvas fixtures contain no game artwork or private user pictures.
// The Studio browser runner can reuse this helper for each supported engine.
export async function runRasterEditorTests({
  browser,
  base,
  modulePath = "/assets/src/client/raster-editor.mjs",
}) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base);
    const results = await page.evaluate(async (path) => {
      const {
        decodeBitmap,
        decodeRaster,
        normalizeRaster,
        normalizeThumbnail,
      } = await import(path);
      const check = (value, message) => {
        if (!value) throw new Error(message);
      };
      let assertions = 0;
      const rejects = async (operation, pattern, message) => {
        let error;
        try {
          await operation();
        } catch (caught) {
          error = caught;
        }
        check(error && pattern.test(error.message), message);
        assertions++;
      };
      const fixture = async (width, height, mime = "image/png") => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const paint = canvas.getContext("2d");
        paint.fillStyle = "red";
        paint.fillRect(0, 0, width / 2, height);
        paint.fillStyle = "rgba(0, 0, 255, 0.5)";
        paint.fillRect(width / 2, 0, width / 2, height);
        paint.clearRect((width * 3) / 4, 0, width / 4, height / 2);
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, mime),
        );
        canvas.width = canvas.height = 0;
        return {
          bytes: new Uint8Array(await blob.arrayBuffer()),
          mime: blob.type,
        };
      };
      const pixels = async (bytes) => {
        const bitmap = await decodeBitmap(bytes, "image/png");
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        try {
          const context = canvas.getContext("2d");
          context.drawImage(bitmap, 0, 0);
          return context.getImageData(0, 0, canvas.width, canvas.height).data;
        } finally {
          bitmap.close();
          canvas.width = canvas.height = 0;
        }
      };
      const small = await fixture(8, 4),
        large = await fixture(1200, 600),
        timingInput = await fixture(8, 4, "image/jpeg"),
        baseline = [...small.bytes];
      const defaultSize = await normalizeRaster(large.bytes);
      check(
        defaultSize.width === 1024 && defaultSize.height === 512,
        "Default normalization fits the longest side to 1024",
      );
      check(
        defaultSize.sourceWidth === 1200 &&
          defaultSize.sourceHeight === 600 &&
          defaultSize.sourceBytes === large.bytes.length,
        "Before/after metadata retains the original size",
      );
      const original = await normalizeRaster(large.bytes, {
        keepOriginal: true,
      });
      check(
        original.width === 1200 && original.height === 600,
        "Explicit keep-original preserves dimensions",
      );
      const unchanged = await normalizeRaster(small.bytes);
      check(
        unchanged.width === 8 && unchanged.height === 4,
        "Small images are never upscaled",
      );
      const cropped = await normalizeRaster(small.bytes, {
        crop: { x: 4, y: 0, width: 4, height: 4 },
        maxDimension: 4,
      });
      const pixelData = await pixels(cropped.bytes);
      check(
        cropped.width === 4 &&
          cropped.height === 4 &&
          pixelData[3 * 4 + 3] === 0 &&
          pixelData[3 * 4 * 4 + 2] === 255 &&
          pixelData[3 * 4 * 4 + 3] === 128,
        "Crop samples the requested source pixels and preserves alpha",
      );
      const thumbnail = await normalizeThumbnail(large.bytes, {
        keepOriginal: true,
        maxDimension: 2048,
      });
      check(
        thumbnail.width === 256 && thumbnail.height === 128,
        "Thumbnail always uses the bounded 256-pixel normalization",
      );
      const checksum = [
        ...new Uint8Array(await crypto.subtle.digest("SHA-256", cropped.bytes)),
      ]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      check(cropped.sha256 === checksum, "Hash covers the returned PNG bytes");
      check(
        cropped.mime === "image/png" && cropped.bytes.length <= 2097152,
        "Normalized bytes have the advertised bounded PNG format",
      );
      const dimensions = await decodeRaster(cropped.bytes, cropped.mime);
      check(
        dimensions.width === 4 && dimensions.height === 4,
        "Shared decoder returns actual dimensions",
      );
      for (const mime of ["image/jpeg", "image/webp"]) {
        const input = await fixture(8, 4, mime);
        // Some engines cannot encode WebP fixtures, but can still decode WebP.
        if (input.mime !== mime) continue;
        const result = await normalizeRaster(input.bytes);
        check(
          result.mime === "image/png" &&
            result.width === 8 &&
            result.height === 4,
          `${mime} is decoded and normalized to PNG`,
        );
      }
      for (const maxDimension of [0, -1, 2049, 1.5, NaN, Infinity, "256", null])
        await rejects(
          () => normalizeRaster(small.bytes, { maxDimension }),
          /integer from 1 to 2048/,
          "Invalid maximum dimension is rejected",
        );
      await rejects(
        () => normalizeRaster(small.bytes, { keepOriginal: "true" }),
        /keep-original/,
        "Keep-original must be explicitly boolean",
      );
      for (const crop of [
        null,
        [],
        {},
        { x: -1, y: 0, width: 2, height: 2 },
        { x: 0, y: 0, width: 0, height: 2 },
        { x: 0, y: 0, width: 9, height: 2 },
        { x: 0, y: 3, width: 2, height: 2 },
        { x: 0.5, y: 0, width: 2, height: 2 },
        { x: "0", y: 0, width: 2, height: 2 },
      ])
        await rejects(
          () => normalizeRaster(small.bytes, { crop }),
          /Crop must/,
          "Invalid crop is rejected before decoding",
        );
      await rejects(
        () => normalizeRaster(new Uint8Array(2097153)),
        /byte limit/,
        "Oversized source bytes are rejected",
      );
      await rejects(
        () => normalizeRaster(new TextEncoder().encode("<svg></svg>")),
        /raster|Raster|Unsupported/,
        "Executable/non-raster content is rejected",
      );
      await rejects(
        () => decodeBitmap(small.bytes, "image/jpeg"),
        /signature/,
        "MIME mismatch is rejected",
      );
      const corrupt = small.bytes.slice();
      corrupt[29] ^= 1;
      await rejects(
        () => normalizeRaster(corrupt),
        /CRC/,
        "PNG corruption cannot be hidden by a recovering browser codec",
      );
      const cancelled = new AbortController();
      cancelled.abort();
      await rejects(
        () => normalizeRaster(small.bytes, { signal: cancelled.signal }),
        /cancelled/,
        "Pre-cancelled work does not normalize",
      );
      const nativeDecode = globalThis.createImageBitmap;
      const toBlob = HTMLCanvasElement.prototype.toBlob;
      let lateClosed = 0;
      try {
        globalThis.createImageBitmap = () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ width: 8, height: 4, close: () => lateClosed++ }),
              80,
            ),
          );
        await rejects(
          () =>
            decodeBitmap(
              timingInput.bytes,
              timingInput.mime,
              undefined,
              performance.now() + 35,
            ),
          /timed out/,
          "Decode respects the shared deadline",
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        check(lateClosed === 1, "Late timed-out bitmap is closed exactly once");
        const controller = new AbortController();
        const pendingDecode = decodeBitmap(
          timingInput.bytes,
          timingInput.mime,
          controller.signal,
        );
        setTimeout(() => controller.abort(), 20);
        await rejects(
          () => pendingDecode,
          /cancelled/,
          "Active decode is abortable",
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        check(lateClosed === 2, "Late aborted bitmap is closed exactly once");
        globalThis.createImageBitmap = async () => ({
          width: 7,
          height: 4,
          close: () => lateClosed++,
        });
        await rejects(
          () => decodeBitmap(small.bytes, "image/png"),
          /dimensions mismatch/,
          "A decoder cannot silently change declared dimensions",
        );
        check(lateClosed === 3, "Dimension-mismatched bitmap is closed");
        globalThis.createImageBitmap = nativeDecode;
        HTMLCanvasElement.prototype.toBlob = (callback) => callback(null);
        await rejects(
          () => normalizeRaster(small.bytes),
          /normalization failed/,
          "Encoder failure leaves the source available",
        );
        HTMLCanvasElement.prototype.toBlob = (callback) =>
          callback(new Blob([new Uint8Array(2097153)], { type: "image/png" }));
        await rejects(
          () => normalizeRaster(small.bytes),
          /exceeds 2 MiB/,
          "Oversized normalized PNG is rejected",
        );
        const text = new TextEncoder().encode("fixture\0not-for-publication"),
          ancillary = new Uint8Array(text.length + 12),
          view = new DataView(ancillary.buffer);
        view.setUint32(0, text.length);
        ancillary.set(new TextEncoder().encode("tEXt"), 4);
        ancillary.set(text, 8);
        let crc = 0xffffffff;
        for (const byte of ancillary.subarray(4, -4)) {
          crc ^= byte;
          for (let bit = 0; bit < 8; bit++)
            crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
        view.setUint32(ancillary.length - 4, (crc ^ 0xffffffff) >>> 0);
        HTMLCanvasElement.prototype.toBlob = (callback) =>
          callback(
            new Blob(
              [
                small.bytes.subarray(0, -12),
                ancillary,
                small.bytes.subarray(-12),
              ],
              { type: "image/png" },
            ),
          );
        const sanitized = await normalizeRaster(small.bytes),
          png = new DataView(sanitized.bytes.buffer),
          allowed = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
        for (let offset = 8; offset < sanitized.bytes.length; ) {
          const type = String.fromCharCode(
            ...sanitized.bytes.subarray(offset + 4, offset + 8),
          );
          check(allowed.has(type), "Ancillary encoder metadata is removed");
          offset += png.getUint32(offset) + 12;
        }
      } finally {
        globalThis.createImageBitmap = nativeDecode;
        HTMLCanvasElement.prototype.toBlob = toBlob;
      }
      check(
        baseline.every((byte, index) => small.bytes[index] === byte),
        "Success, cancellation and failure never mutate caller bytes",
      );
      return { assertions, cropped: [cropped.width, cropped.height] };
    }, modulePath);
    assert(
      results.assertions >= 28,
      "All negative raster cases were exercised",
    );
    assert.deepEqual(results.cropped, [4, 4]);
    return results;
  } finally {
    await context.close();
  }
}
