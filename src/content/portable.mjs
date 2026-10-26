import { LIMITS, assert, parseBounded, boundedWalk } from "./limits.mjs";
import { validatePack } from "./validate.mjs";
export const TRANSFER_LIMITS = Object.freeze({
  envelopeBytes: 20 * 1024 * 1024,
  totalPixels: 16 * 1024 * 1024,
  decodeMs: 5000,
});
export const GROUPS = [
  "sources",
  "items",
  "recipes",
  "objectives",
  "guides",
  "maps",
  "locations",
  "claims",
  "assets",
];
const encodedLength = (n) => Math.ceil(n / 3) * 4;
const size = (v) =>
  new TextEncoder().encode(typeof v === "string" ? v : JSON.stringify(v))
    .length;
const exact = (value, keys, label) =>
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === keys.length &&
      keys.every((k) => Object.hasOwn(value, k)),
    `Invalid ${label} fields or unsupported capabilities`,
  );
export function base64FromBytes(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 16384)
    s += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return btoa(s);
}
export function bytesFromBase64(text) {
  assert(
    typeof text === "string" && text.length <= encodedLength(LIMITS.assetBytes),
    "Asset base64 byte limit exceeded",
  );
  assert(
    text.length > 0 &&
      text.length % 4 === 0 &&
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        text,
      ),
    "Invalid canonical base64",
  );
  const s = atob(text),
    bytes = Uint8Array.from(s, (c) => c.charCodeAt(0));
  assert(base64FromBytes(bytes) === text, "Noncanonical base64");
  return bytes;
}
export async function hashBytes(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function imageInfo(bytes) {
  assert(
    bytes instanceof Uint8Array &&
      bytes.length > 0 &&
      bytes.length <= LIMITS.assetBytes,
    "Raster byte limit exceeded",
  );
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    ascii = (i, n) => String.fromCharCode(...bytes.subarray(i, i + n));
  let width, height, mime;
  const dimensions = (w, h) =>
    assert(
      Number.isInteger(w) &&
        Number.isInteger(h) &&
        w > 0 &&
        h > 0 &&
        w <= LIMITS.dimension &&
        h <= LIMITS.dimension &&
        w * h <= LIMITS.pixels,
      "Raster dimensions/pixels exceed limits",
    );
  if (
    bytes.length >= 33 &&
    ascii(1, 3) === "PNG" &&
    bytes[0] === 137 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  ) {
    mime = "image/png";
    assert(
      v.getUint32(8) === 13 && ascii(12, 4) === "IHDR",
      "Invalid PNG header",
    );
    width = v.getUint32(16);
    height = v.getUint32(20);
    dimensions(width, height);
    let pos = 8,
      end = false,
      data = false,
      palette = false,
      dataEnded = false;
    const color = bytes[25];
    assert(
      [0, 2, 3, 4, 6].includes(color) &&
        bytes[26] === 0 &&
        bytes[27] === 0 &&
        bytes[28] <= 1,
      "Unsupported PNG header",
    );
    assert(
      {
        0: [1, 2, 4, 8, 16],
        2: [8, 16],
        3: [1, 2, 4, 8],
        4: [8, 16],
        6: [8, 16],
      }[color].includes(bytes[24]),
      "Invalid PNG bit depth",
    );
    while (pos + 12 <= bytes.length) {
      const n = v.getUint32(pos),
        type = ascii(pos + 4, 4);
      assert(n <= bytes.length - pos - 12, "Truncated PNG chunk");
      assert(type !== "IHDR" || pos === 8, "Duplicate PNG frame header");
      assert(
        type !== "acTL" && type !== "fcTL" && type !== "fdAT",
        "Raster animation is unsupported",
      );
      assert(/^[A-Za-z]{4}$/.test(type), "Invalid PNG chunk type");
      assert(
        type[0] === type[0].toLowerCase() ||
          ["IHDR", "PLTE", "IDAT", "IEND"].includes(type),
        "Unsupported PNG critical chunk",
      );
      if (type === "PLTE") {
        assert(
          !data && !palette && n > 0 && n <= 768 && n % 3 === 0,
          "Invalid PNG palette ordering",
        );
        palette = true;
      }
      if (type === "IDAT") {
        assert(!dataEnded, "Noncontiguous PNG image data");
        assert(color !== 3 || palette, "PNG palette missing before image");
        data = true;
      } else if (data) dataEnded = true;
      pos += n + 12;
      if (type === "IEND") {
        assert(n === 0 && pos === bytes.length, "Invalid PNG ending");
        end = true;
        break;
      }
    }
    assert(end && data, "Incomplete PNG");
  } else if (
    bytes.length >= 12 &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 4) === "WEBP"
  ) {
    mime = "image/webp";
    assert(v.getUint32(4, true) + 8 === bytes.length, "Invalid WebP size");
    let pos = 12,
      found = false,
      extended = false;
    while (pos + 8 <= bytes.length) {
      const type = ascii(pos, 4),
        n = v.getUint32(pos + 4, true),
        start = pos + 8;
      assert(n <= bytes.length - start, "Truncated WebP chunk");
      assert(
        type !== "ANIM" && type !== "ANMF",
        "Raster animation is unsupported",
      );
      if (type === "VP8X") {
        assert(
          !extended && !found,
          "Duplicate or misplaced WebP canvas header",
        );
        extended = true;
        assert(n === 10, "Invalid WebP extended header");
        assert(!(bytes[start] & 2), "Raster animation is unsupported");
        width =
          1 +
          bytes[start + 4] +
          (bytes[start + 5] << 8) +
          (bytes[start + 6] << 16);
        height =
          1 +
          bytes[start + 7] +
          (bytes[start + 8] << 8) +
          (bytes[start + 9] << 16);
        dimensions(width, height);
      }
      if (type === "VP8 ") {
        assert(
          n >= 10 &&
            bytes[start + 3] === 157 &&
            bytes[start + 4] === 1 &&
            bytes[start + 5] === 42,
          "Invalid WebP frame",
        );
        const w = v.getUint16(start + 6, true) & 16383,
          h = v.getUint16(start + 8, true) & 16383;
        dimensions(w, h);
        assert(!found, "Multiple WebP frames unsupported");
        assert(
          width === undefined || (width === w && height === h),
          "WebP frame/canvas dimensions mismatch",
        );
        width = w;
        height = h;
        found = true;
      }
      if (type === "VP8L") {
        assert(n >= 5 && bytes[start] === 47, "Invalid WebP lossless frame");
        const bits = v.getUint32(start + 1, true);
        const w = (bits & 16383) + 1,
          h = ((bits >>> 14) & 16383) + 1;
        dimensions(w, h);
        assert(!found, "Multiple WebP frames unsupported");
        assert(
          width === undefined || (width === w && height === h),
          "WebP frame/canvas dimensions mismatch",
        );
        width = w;
        height = h;
        found = true;
      }
      pos = start + n + (n % 2);
    }
    assert(found && pos === bytes.length, "Incomplete WebP");
  } else if (
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes.at(-2) === 255 &&
    bytes.at(-1) === 217
  ) {
    mime = "image/jpeg";
    let pos = 2,
      ended = false;
    while (pos < bytes.length) {
      assert(bytes[pos++] === 255, "Invalid JPEG marker");
      while (bytes[pos] === 255) pos++;
      const marker = bytes[pos++];
      if (marker === 217) {
        assert(pos === bytes.length, "JPEG trailing bytes");
        ended = true;
        break;
      }
      assert(marker !== 216 && marker !== 0, "Invalid nested JPEG marker");
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      assert(pos + 2 <= bytes.length, "Truncated JPEG");
      const n = v.getUint16(pos);
      assert(n >= 2 && pos + n <= bytes.length, "Truncated JPEG segment");
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      ) {
        assert([192, 193, 194].includes(marker), "Unsupported JPEG frame type");
        assert(n >= 8, "Invalid JPEG frame");
        assert(width === undefined, "Multiple JPEG frame headers unsupported");
        height = v.getUint16(pos + 3);
        width = v.getUint16(pos + 5);
        dimensions(width, height);
      }
      pos += n;
      if (marker === 218) {
        assert(width !== undefined, "JPEG scan before frame");
        while (pos < bytes.length) {
          if (bytes[pos] !== 255) {
            pos++;
            continue;
          }
          let next = pos + 1;
          while (bytes[next] === 255) next++;
          if (bytes[next] === 0 || (bytes[next] >= 208 && bytes[next] <= 215)) {
            pos = next + 1;
            continue;
          }
          break;
        }
      }
    }
    assert(ended, "Incomplete JPEG");
  } else
    throw new Error(
      "Unsupported raster signature; use PNG, JPEG or WebP (not SVG or archives)",
    );
  assert(
    Number.isInteger(width) &&
      Number.isInteger(height) &&
      width > 0 &&
      height > 0 &&
      width <= LIMITS.dimension &&
      height <= LIMITS.dimension &&
      width * height <= LIMITS.pixels,
    "Raster dimensions/pixels exceed limits",
  );
  return { mime, width, height };
}
function checkedPack(pack, schema) {
  boundedWalk(pack);
  assert(
    [1, 2].includes(pack.schemaVersion),
    "Unsupported content version. Keep the original file and use a compatible reader; no automatic migration is available.",
  );
  assert(size(pack) <= LIMITS.packBytes, "Pack exceeds byte limit");
  validatePack(pack, schema);
  const paths = new Set();
  for (const a of pack.assets) {
    const key = a.path.toLowerCase();
    assert(!paths.has(key), "Duplicate or case-colliding asset path");
    paths.add(key);
  }
  return pack;
}
export async function validatePayloads(
  pack,
  payloads,
  { decodeRaster, complete = true, signal } = {},
) {
  assert(
    Array.isArray(payloads) && payloads.length <= LIMITS.assets,
    "Too many asset payloads",
  );
  let total = 0,
    pixels = 0;
  const seen = new Set();
  for (const payload of payloads) {
    assert(!signal?.aborted, "Import cancelled");
    exact(payload, ["assetId", "base64"], "payload");
    assert(!seen.has(payload.assetId), "Duplicate payload ID");
    seen.add(payload.assetId);
    const a = pack.assets.find((x) => x.id === payload.assetId);
    assert(a, "Unexpected asset payload");
    const bytes = bytesFromBase64(payload.base64);
    total += bytes.length;
    assert(total <= LIMITS.totalAssetBytes, "Total asset byte limit exceeded");
    assert(bytes.length === a.bytes, "Asset byte count mismatch");
    const info = imageInfo(bytes);
    assert(
      info.mime === a.mime &&
        info.width === a.width &&
        info.height === a.height,
      "Asset signature/dimensions mismatch",
    );
    pixels += info.width * info.height;
    assert(
      pixels <= TRANSFER_LIMITS.totalPixels,
      "Total decoded pixel limit exceeded",
    );
    assert((await hashBytes(bytes)) === a.sha256, "Asset hash mismatch");
    assert(
      typeof decodeRaster === "function",
      "Raster decoder required before accepting actual pictures",
    );
    const decoded = await decodeRaster(bytes, a.mime, signal);
    assert(!signal?.aborted, "Import cancelled");
    assert(
      decoded?.width === a.width && decoded?.height === a.height,
      "Asset decoded dimensions mismatch",
    );
  }
  if (complete)
    assert(
      pack.assets.every((a) => seen.has(a.id)),
      "Missing actual picture bytes: use a picture bundle, not a reference-only export",
    );
  return payloads;
}
export async function parseTransfer(text, schema, options = {}) {
  assert(
    typeof text === "string" && !/^PK/.test(text),
    "ZIP/archive import unsupported. Use JSON content or a self-contained picture JSON bundle.",
  );
  const input = parseBounded(text, TRANSFER_LIMITS.envelopeBytes, {
    depth: LIMITS.depth + 2,
    nodes: LIMITS.nodes + 100,
    string: encodedLength(LIMITS.assetBytes),
  });
  if (input?.format !== undefined) {
    exact(input, ["format", "version", "pack", "payloads"], "envelope");
    assert(
      input.format === "dmz-picture-pack" && input.version === 1,
      "Unsupported picture bundle version. Preserve original and use a compatible reader.",
    );
    checkedPack(input.pack, schema);
    await validatePayloads(input.pack, input.payloads, options);
    return { pack: input.pack, payloads: input.payloads, selfContained: true };
  }
  checkedPack(input, schema);
  return { pack: input, payloads: [], selfContained: false };
}
export async function buildTransfer(pack, payloads, schema, options = {}) {
  checkedPack(pack, schema);
  pack = JSON.parse(JSON.stringify(pack));
  payloads = JSON.parse(JSON.stringify(payloads));
  await validatePayloads(pack, payloads, options);
  const text = JSON.stringify({
    format: "dmz-picture-pack",
    version: 1,
    pack,
    payloads,
  });
  assert(
    size(text) <= TRANSFER_LIMITS.envelopeBytes,
    "Picture envelope exceeds 20 MiB limit",
  );
  return text;
}
export function exportContent(pack, schema) {
  checkedPack(pack, schema);
  return JSON.stringify(pack, null, 2);
}
export function diffPacks(before, after) {
  const result = { added: [], removed: [], changed: [], manifest: [] };
  for (const group of GROUPS) {
    const old = new Map((before?.[group] || []).map((r) => [r.id, r])),
      next = new Map(after[group].map((r) => [r.id, r]));
    for (const [id, value] of next) {
      if (!old.has(id)) result.added.push({ group, id, after: value });
      else if (JSON.stringify(old.get(id)) !== JSON.stringify(value))
        result.changed.push({ group, id, before: old.get(id), after: value });
    }
    for (const [id, value] of old)
      if (!next.has(id)) result.removed.push({ group, id, before: value });
  }
  for (const key of Object.keys(after).filter((k) => !GROUPS.includes(k)))
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after[key]))
      result.manifest.push({
        field: key,
        before: before?.[key] ?? null,
        after: after[key],
      });
  return result;
}
export function profileImpact(profile, before, after) {
  if (!profile)
    return { rebindRequired: false, unresolved: [], affectedGoals: [] };
  const known = new Set(GROUPS.flatMap((k) => after[k].map((r) => r.id)));
  const refs = new Set([
    ...Object.keys(profile.inventory || {}),
    ...Object.keys(profile.reserves || {}),
    ...Object.keys(profile.completion || {}),
    ...Object.keys(profile.upgradeProgress || {}),
    ...(profile.watchPins || []),
    ...Object.keys(profile.routes || {}),
    ...Object.values(profile.routes || {}),
    ...(profile.goals || []).map((g) => g.id),
  ]);
  const diff = diffPacks(before, after),
    changed = new Set([...diff.changed, ...diff.removed].map((x) => x.id));
  return {
    rebindRequired:
      profile.packId !== after.id ||
      profile.contentVersion !== after.contentVersion ||
      JSON.stringify(before?.game) !== JSON.stringify(after.game),
    unresolved: [...refs].filter((id) => !known.has(id)),
    affectedGoals: (profile.goals || [])
      .filter(
        (g) =>
          changed.has(g.id) ||
          [...diff.changed, ...diff.removed, ...diff.added].some((c) =>
            ["items", "recipes", "objectives"].includes(c.group),
          ),
      )
      .map((g) => g.id),
  };
}

// Defaults are draft placeholders, not invented facts; final schema/semantic validation remains mandatory.
export function defaultFieldValue(
  root,
  field,
  { fictional = false } = {},
  key = "",
) {
  let s = field;
  while (s.$ref)
    s = s.$ref
      .slice(2)
      .split("/")
      .reduce((value, part) => value[part], root);
  const next = (child, name = "") =>
    defaultFieldValue(root, child, { fictional }, name);
  if ("const" in s) return s.const;
  if (s.anyOf) return next(s.anyOf[0], key);
  if (s.enum) {
    if (key === "status") return fictional ? "fictional" : "unknown";
    return s.enum.includes("unknown") ? "unknown" : s.enum[0];
  }
  if (Array.isArray(s.type)) {
    if (s.type.includes("null")) return null;
    return next({ ...s, type: s.type[0] }, key);
  }
  if (s.type === "null") return null;
  if (s.type === "object")
    return Object.fromEntries(
      (s.required || []).map((name) => [name, next(s.properties[name], name)]),
    );
  if (s.type === "array")
    return Array.from({ length: s.minItems || 0 }, () => next(s.items));
  if (s.type === "boolean") return false;
  if (["number", "integer"].includes(s.type)) return s.minimum ?? 0;
  return "";
}
