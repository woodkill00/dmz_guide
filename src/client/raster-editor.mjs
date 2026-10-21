import { LIMITS, assert } from "../content/limits.mjs";
import { TRANSFER_LIMITS, hashBytes, imageInfo } from "../content/portable.mjs";
import { validatePNGPixelStream } from "../content/bundled-assets.mjs";

const check = (signal, deadline) => {
  assert(!signal?.aborted, "Import cancelled");
  assert(
    performance.now() < deadline,
    "Picture processing timed out; no changes saved",
  );
};
const boundedDeadline = (sharedDeadline) => {
  const limit = performance.now() + TRANSFER_LIMITS.decodeMs;
  const deadline = sharedDeadline ?? limit;
  assert(Number.isFinite(deadline), "Invalid picture processing deadline");
  return Math.min(deadline, limit);
};
async function pending(work, signal, deadline) {
  let timer, abort;
  // The operation may already be running when cancellation is observed.
  // Consume a later rejection even if check() rejects before the race starts.
  void Promise.resolve(work).catch(() => {});
  try {
    check(signal, deadline);
    const result = await Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error("Picture processing timed out; no changes saved")),
          Math.max(1, deadline - performance.now()),
        );
        abort = () => reject(new Error("Import cancelled"));
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted) abort();
      }),
    ]);
    check(signal, deadline);
    return result;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

// Callers own successful bitmaps and must close them. A cancelled or timed-out
// browser decode cannot be stopped, so its eventual bitmap is closed here.
export async function decodeBitmap(bytes, mime, signal, sharedDeadline) {
  const deadline = boundedDeadline(sharedDeadline);
  check(signal, deadline);
  imageInfo(bytes);
  const snapshot = new Uint8Array(bytes),
    info = imageInfo(snapshot);
  assert(info.mime === mime, "Raster MIME does not match its signature");
  assert(
    typeof globalThis.createImageBitmap === "function",
    "Browser raster decoder required",
  );
  if (mime === "image/png")
    await validatePNGPixelStream(snapshot, signal, deadline);
  check(signal, deadline);
  const work = createImageBitmap(new Blob([snapshot], { type: mime }));
  try {
    const bitmap = await pending(work, signal, deadline);
    assert(
      bitmap.width === info.width && bitmap.height === info.height,
      "Decoded picture dimensions mismatch",
    );
    return bitmap;
  } catch (error) {
    void work.then(
      (bitmap) => bitmap.close(),
      () => {},
    );
    throw error;
  }
}

export async function decodeRaster(bytes, mime, signal, deadline) {
  const bitmap = await decodeBitmap(bytes, mime, signal, deadline);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

function cropBounds(crop, info) {
  if (crop === undefined)
    return { x: 0, y: 0, width: info.width, height: info.height };
  assert(
    crop && typeof crop === "object" && !Array.isArray(crop),
    "Crop must contain integer x, y, width and height",
  );
  const { x, y, width, height } = crop;
  assert(
    [x, y, width, height].every(Number.isInteger) &&
      x >= 0 &&
      y >= 0 &&
      width > 0 &&
      height > 0 &&
      x + width <= info.width &&
      y + height <= info.height,
    "Crop must use positive integer dimensions within the original picture",
  );
  return { x, y, width, height };
}

function stripEncoderMetadata(bytes) {
  // The sRGB canvas has already rendered the source. Keep only the PNG image
  // chunks so encoder-specific metadata cannot enter a repository upload.
  const allowed = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]),
    view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    chunks = [bytes.subarray(0, 8)];
  let length = 8;
  for (let offset = 8; offset + 12 <= bytes.length; ) {
    const size = view.getUint32(offset) + 12,
      type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (allowed.has(type)) {
      chunks.push(bytes.subarray(offset, offset + size));
      length += size;
    }
    offset += size;
  }
  if (length === bytes.length) return bytes;
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// Pure draft preparation: this module does not initialize private storage or
// change caller state, even when encoding, decoding or validation fails.
export async function normalizeRaster(
  bytes,
  { signal, crop, maxDimension = 1024, keepOriginal = false } = {},
) {
  const deadline = boundedDeadline();
  check(signal, deadline);
  assert(
    Number.isInteger(maxDimension) &&
      maxDimension >= 1 &&
      maxDimension <= LIMITS.dimension,
    "Maximum dimension must be an integer from 1 to 2048",
  );
  assert(typeof keepOriginal === "boolean", "Invalid keep-original option");
  imageInfo(bytes);
  const snapshot = new Uint8Array(bytes),
    source = imageInfo(snapshot),
    bounds = cropBounds(crop, source),
    scale = keepOriginal
      ? 1
      : Math.min(1, maxDimension / Math.max(bounds.width, bounds.height)),
    width = Math.max(1, Math.round(bounds.width * scale)),
    height = Math.max(1, Math.round(bounds.height * scale));
  assert(
    width <= LIMITS.dimension &&
      height <= LIMITS.dimension &&
      width * height <= LIMITS.pixels,
    "Normalized picture dimensions/pixels exceed limits",
  );
  const bitmap = await decodeBitmap(snapshot, source.mime, signal, deadline);
  let canvas;
  try {
    check(signal, deadline);
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", {
      alpha: true,
      colorSpace: "srgb",
    });
    assert(context, "Picture canvas is unavailable; no changes saved");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      bitmap,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      width,
      height,
    );
    check(signal, deadline);
    const blob = await pending(
      new Promise((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(
                  new Error("Picture normalization failed; no changes saved"),
                ),
          "image/png",
        ),
      ),
      signal,
      deadline,
    );
    assert(blob.type === "image/png", "Picture encoder did not produce PNG");
    assert(
      blob.size > 0 && blob.size <= LIMITS.assetBytes,
      "Normalized picture exceeds 2 MiB; choose smaller dimensions or cancel",
    );
    const encoded = new Uint8Array(
        await pending(blob.arrayBuffer(), signal, deadline),
      ),
      info = imageInfo(encoded);
    assert(
      encoded.length === blob.size &&
        info.mime === "image/png" &&
        info.width === width &&
        info.height === height,
      "Normalized picture bytes or dimensions mismatch",
    );
    await validatePNGPixelStream(encoded, signal, deadline);
    const normalized = stripEncoderMetadata(encoded);
    await validatePNGPixelStream(normalized, signal, deadline);
    const sha256 = await pending(hashBytes(normalized), signal, deadline);
    check(signal, deadline);
    return {
      bytes: normalized,
      mime: info.mime,
      width,
      height,
      sha256,
      sourceWidth: source.width,
      sourceHeight: source.height,
      sourceBytes: snapshot.length,
    };
  } finally {
    bitmap.close();
    if (canvas) canvas.width = canvas.height = 0;
  }
}

export function normalizeThumbnail(bytes, options = {}) {
  return normalizeRaster(bytes, {
    ...options,
    maxDimension: 256,
    keepOriginal: false,
  });
}
