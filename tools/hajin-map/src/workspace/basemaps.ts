import { requireCapability } from "./policy.ts";
import { sha256 } from "./import.ts";
import type { BasemapAsset } from "./model.ts";
const fail = (message: string): never => {
  throw new Error(message);
};
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let j = 0; j < 8; j++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc(bytes: Uint8Array, start: number, end: number) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++)
    c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
export function rasterHeader(bytes: Uint8Array): {
  mime: string;
  width: number;
  height: number;
} {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.length < 12 ||
    bytes.length > 32 * 1024 * 1024
  )
    fail("Background byte limit or signature invalid.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    ascii = (i: number, n: number) =>
      String.fromCharCode(...bytes.subarray(i, i + n));
  let width = 0,
    height = 0,
    mime = "";
  if (ascii(0, 8) === "\x89PNG\r\n\x1a\n") {
    mime = "image/png";
    if (
      bytes.length < 33 ||
      view.getUint32(8) !== 13 ||
      ascii(12, 4) !== "IHDR"
    )
      fail("Invalid PNG header.");
    width = view.getUint32(16);
    height = view.getUint32(20);
    let offset = 8,
      ended = false,
      data = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset),
        kind = ascii(offset + 4, 4);
      if (
        length > bytes.length - offset - 12 ||
        !/^[A-Za-z]{4}$/.test(kind) ||
        ["acTL", "fcTL", "fdAT"].includes(kind)
      )
        fail("Truncated or animated PNG.");
      if (
        crc(bytes, offset + 4, offset + 8 + length) !==
        view.getUint32(offset + 8 + length)
      )
        fail("PNG checksum mismatch.");
      if (kind === "IHDR" && offset !== 8) fail("Duplicate PNG frame.");
      if (
        kind[0] === kind[0].toUpperCase() &&
        !["IHDR", "PLTE", "IDAT", "IEND"].includes(kind)
      )
        fail("Unsupported critical PNG chunk.");
      if (kind === "IDAT") data = true;
      if (kind === "IEND") {
        if (length !== 0 || offset + 12 !== bytes.length)
          fail("Invalid PNG termination.");
        ended = true;
        break;
      }
      offset += length + 12;
    }
    if (!ended || !data) fail("PNG image data missing.");
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    mime = "image/jpeg";
    let p = 2,
      frames = 0;
    while (p + 3 < bytes.length) {
      if (bytes[p++] !== 255) fail("Invalid JPEG marker.");
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const length = view.getUint16(p);
      if (length < 2 || p + length > bytes.length)
        fail("Truncated JPEG segment.");
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (++frames !== 1) fail("Multiple JPEG frames unsupported.");
        if (length < 8) fail("Invalid JPEG dimensions.");
        height = view.getUint16(p + 3);
        width = view.getUint16(p + 5);
      }
      if (ascii(p + 2, 4) === "MPF\0") fail("Multi-picture JPEG unsupported.");
      p += length;
    }
  } else if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    mime = "image/webp";
    let canvasWidth = 0,
      canvasHeight = 0,
      frames = 0;
    if (view.getUint32(4, true) + 8 !== bytes.length) fail("Truncated WebP.");
    for (let p = 12; p + 8 <= bytes.length; ) {
      const kind = ascii(p, 4),
        size = view.getUint32(p + 4, true),
        s = p + 8;
      if (size > bytes.length - s) fail("Truncated WebP chunk.");
      if (["ANIM", "ANMF"].includes(kind)) fail("Animated WebP unsupported.");
      if (kind === "VP8X") {
        if (p !== 12 || canvasWidth || size < 10 || bytes[s] & 2)
          fail("Animated or invalid WebP.");
        width = 1 + bytes[s + 4] + (bytes[s + 5] << 8) + (bytes[s + 6] << 16);
        height = 1 + bytes[s + 7] + (bytes[s + 8] << 8) + (bytes[s + 9] << 16);
        canvasWidth = width;
        canvasHeight = height;
      } else if (kind === "VP8 ") {
        if (++frames !== 1) fail("Multiple WebP frames unsupported.");
        if (size < 10 || ascii(s + 3, 3) !== "\x9d\x01\x2a")
          fail("Invalid WebP frame.");
        width = view.getUint16(s + 6, true) & 0x3fff;
        height = view.getUint16(s + 8, true) & 0x3fff;
      } else if (kind === "VP8L") {
        if (++frames !== 1) fail("Multiple WebP frames unsupported.");
        if (size < 5 || bytes[s] !== 0x2f) fail("Invalid lossless WebP.");
        const bits = view.getUint32(s + 1, true);
        width = (bits & 0x3fff) + 1;
        height = ((bits >>> 14) & 0x3fff) + 1;
      }
      if (
        canvasWidth &&
        frames &&
        (width !== canvasWidth || height !== canvasHeight)
      )
        fail("WebP canvas/frame dimension mismatch.");
      p = s + size + (size % 2);
    }
    if (frames !== 1) fail("Missing WebP image frame.");
  } else
    fail(
      "Choose PNG, JPEG or WebP; SVG and executable formats are unsupported.",
    );
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 8192 ||
    height > 8192 ||
    width * height > 33554432
  )
    fail("Background dimension/pixel limit exceeded.");
  return { mime, width, height };
}
function stripPNG(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    chunks = [bytes.subarray(0, 8)];
  for (let p = 8; p + 12 <= bytes.length; ) {
    const size = v.getUint32(p) + 12,
      kind = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
    if (["IHDR", "PLTE", "tRNS", "IDAT", "IEND"].includes(kind))
      chunks.push(bytes.subarray(p, p + size));
    p += size;
  }
  const output = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let p = 0;
  for (const c of chunks) {
    output.set(c, p);
    p += c.length;
  }
  return output;
}
async function validatePNGInflation(
  bytes: Uint8Array,
  pending: <T>(work: Promise<T>) => Promise<T>,
  check: () => void,
) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    width = view.getUint32(16),
    height = view.getUint32(20),
    depth = bytes[24],
    color = bytes[25],
    channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[
      color
    ];
  const allowed = (
    {
      0: [1, 2, 4, 8, 16],
      2: [8, 16],
      3: [1, 2, 4, 8],
      4: [8, 16],
      6: [8, 16],
    } as Record<number, number[]>
  )[color];
  if (
    !channels ||
    !allowed.includes(depth) ||
    bytes[26] !== 0 ||
    bytes[27] !== 0 ||
    bytes[28] > 1
  )
    fail("Unsupported PNG pixel format.");
  const rows: number[] = [],
    passes = bytes[28]
      ? [
          [0, 0, 8, 8],
          [4, 0, 8, 8],
          [0, 4, 4, 8],
          [2, 0, 4, 4],
          [0, 2, 2, 4],
          [1, 0, 2, 2],
          [0, 1, 1, 2],
        ]
      : [[0, 0, 1, 1]];
  for (const [x, y, dx, dy] of passes) {
    const w = Math.max(0, Math.ceil((width - x) / dx)),
      h = Math.max(0, Math.ceil((height - y) / dy));
    if (w && h)
      for (let i = 0; i < h; i++)
        rows.push(1 + Math.ceil((w * channels * depth) / 8));
  }
  const expected = rows.reduce((a, b) => a + b, 0),
    chunks: BlobPart[] = [];
  for (let p = 8; p + 12 <= bytes.length; ) {
    const n = view.getUint32(p),
      kind = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
    if (kind === "IDAT")
      chunks.push(bytes.slice(p + 8, p + 8 + n) as Uint8Array<ArrayBuffer>);
    p += n + 12;
  }
  const reader = new Blob(chunks)
    .stream()
    .pipeThrough(new DecompressionStream("deflate"))
    .getReader();
  let total = 0,
    row = 0,
    start = 0;
  try {
    for (;;) {
      check();
      const result = await pending(reader.read());
      if (result.done) break;
      const chunk = result.value;
      if (total + chunk.length > expected)
        fail("PNG inflates beyond its declared pixel extent.");
      while (row < rows.length && start < total + chunk.length) {
        if (start >= total && chunk[start - total] > 4)
          fail("Invalid PNG scanline filter.");
        start += rows[row++];
      }
      total += chunk.length;
    }
    if (total !== expected || row !== rows.length)
      fail("Truncated PNG pixel stream.");
  } finally {
    void reader.cancel().catch(() => {});
  }
}
export async function stageBasemap(
  file: File,
  sourceId: string,
  description: string,
  signal?: AbortSignal,
): Promise<{ asset: BasemapAsset; blob: Blob }> {
  requireCapability(sourceId, "basemap");
  if (
    !description.trim() ||
    description.length > 200 ||
    file.size <= 0 ||
    file.size > 32 * 1024 * 1024
  )
    fail("Provide a background description and a file no larger than32MiB.");
  const deadline = performance.now() + 15000;
  let timer: ReturnType<typeof setTimeout> | undefined,
    abort: (() => void) | undefined;
  const check = () => {
    if (signal?.aborted) fail("Import cancelled.");
    if (performance.now() > deadline) fail("Background processing timed out.");
  };
  const pending = async <T>(work: Promise<T>): Promise<T> => {
    void work.catch(() => {});
    check();
    try {
      return await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Background processing timed out.")),
            Math.max(1, deadline - performance.now()),
          );
          abort = () => reject(new Error("Import cancelled."));
          signal?.addEventListener("abort", abort, { once: true });
          if (signal?.aborted) abort();
        }),
      ]);
    } finally {
      clearTimeout(timer);
      if (abort) signal?.removeEventListener("abort", abort);
    }
  };
  const bytes = new Uint8Array(await pending(file.arrayBuffer())),
    info = rasterHeader(bytes);
  check();
  if (info.mime === "image/png")
    await validatePNGInflation(bytes, pending, check);
  const decodeBytes = info.mime === "image/png" ? stripPNG(bytes) : bytes;
  const decoding = createImageBitmap(
    new Blob([decodeBytes as Uint8Array<ArrayBuffer>], { type: info.mime }),
  );
  let bitmap: ImageBitmap;
  try {
    bitmap = await pending(decoding);
  } catch (error) {
    void decoding.then(
      (b) => b.close(),
      () => {},
    );
    throw error;
  }
  const canvas = document.createElement("canvas");
  try {
    if (bitmap.width !== info.width || bitmap.height !== info.height)
      fail("Background decoded extent differs from header.");
    canvas.width = info.width;
    canvas.height = info.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Background canvas unavailable.");
    context.drawImage(bitmap, 0, 0);
    check();
    const blob = await pending(
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("Background encoding failed.")),
          "image/png",
        ),
      ),
    );
    if (blob.size > 32 * 1024 * 1024)
      fail("Sanitized background exceeds32MiB.");
    const clean = stripPNG(new Uint8Array(await pending(blob.arrayBuffer())));
    rasterHeader(clean);
    const id = await pending(sha256(clean));
    check();
    return {
      asset: {
        id,
        sourceId,
        description,
        rightsDeclaration:
          "User expressly confirmed ownership or authorization for this local background.",
        capturedAt: new Date().toISOString(),
        registrationId: null,
        frame: {
          id: `background-${id.slice(0, 16)}`,
          mapId: "hajin",
          coordinateVersion: `background-${id.slice(0, 16)}`,
          width: info.width,
          height: info.height,
          units: "pixels",
          origin: "top-left",
          xAxis: "right",
          yAxis: "down",
          crop: null,
          imageDigest: id,
        },
      },
      blob: new Blob([clean as Uint8Array<ArrayBuffer>], { type: "image/png" }),
    };
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 0;
  }
}
