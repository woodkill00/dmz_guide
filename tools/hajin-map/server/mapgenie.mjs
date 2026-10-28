import ts from "typescript";
import { canonicalDigest, digest, validAffine } from "./source-contract.mjs";
export const mapgenieFrame = Object.freeze({
  mapId: 1084,
  tileSetId: 1345,
  version: "v5",
  zoom: 10,
  min: 508,
  max: 511,
  size: 1024,
});
const names = new Set([
  "mapData",
  "MARKER_SPRITE_POSITIONS_V3",
  "MARKER_IMAGES_WIDTH",
  "MARKER_IMAGES_HEIGHT",
  "MARKER_IMAGES_URL",
]);
const safeText = (v, n) =>
  typeof v === "string" &&
  v.trim().length > 0 &&
  v.length <= n &&
  !/[\u0000-\u0008]/.test(v);
/** Selected literals only: no eval, Function, downloaded references or executable expressions. */
export function mapgenieBindings(scripts) {
  const result = Object.create(null);
  let visited = 0,
    decoded = 0;
  function literal(n, depth = 0) {
    if (!n || depth > 16 || ++decoded > 150000)
      throw Error("MapGenie literal limit.");
    if (ts.isStringLiteral(n)) return n.text;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (n.kind === ts.SyntaxKind.NullKeyword) return null;
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (
      ts.isPrefixUnaryExpression(n) &&
      n.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(n.operand)
    )
      return -Number(n.operand.text);
    if (ts.isArrayLiteralExpression(n))
      return n.elements.map((e) => literal(e, depth + 1));
    if (ts.isObjectLiteralExpression(n)) {
      const value = Object.create(null);
      for (const p of n.properties) {
        if (
          !ts.isPropertyAssignment(p) ||
          !(
            ts.isIdentifier(p.name) ||
            ts.isStringLiteral(p.name) ||
            ts.isNumericLiteral(p.name)
          )
        )
          throw Error("MapGenie nonliteral property.");
        const key = p.name.text;
        if (
          ["__proto__", "constructor", "prototype"].includes(key) ||
          Object.hasOwn(value, key)
        )
          throw Error("MapGenie unsafe/duplicate key.");
        value[key] = literal(p.initializer, depth + 1);
      }
      return value;
    }
    throw Error("MapGenie nonliteral expression refused.");
  }
  for (const script of scripts) {
    const file = ts.createSourceFile(
      "mapgenie-inert.js",
      script,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    const put = (name, node) => {
      if (!names.has(name)) return;
      if (Object.hasOwn(result, name))
        throw Error("MapGenie duplicate selected declaration.");
      result[name] = literal(node);
    };
    const visit = (n) => {
      if (++visited > 500000) throw Error("MapGenie AST limit.");
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name))
        put(n.name.text, n.initializer);
      if (
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(n.left) &&
        ts.isIdentifier(n.left.expression) &&
        n.left.expression.text === "window"
      )
        put(n.left.name.text, n.right);
      ts.forEachChild(n, visit);
    };
    visit(file);
  }
  if (!Object.hasOwn(result, "mapData"))
    throw Error("MapGenie map metadata changed.");
  return result;
}
export function mapgenieTileURLs() {
  const urls = [];
  for (let y = 508; y <= 511; y++)
    for (let x = 508; x <= 511; x++)
      urls.push(
        `https://tiles.mapgenie.io/games/call-of-duty-modern-warfare-4/hajin-dmz/v5/10/${y}/${x}.jpg`,
      );
  return urls;
}
export function validateMapgenieMetadata(bindings) {
  const data = bindings.mapData,
    tile = data?.mapConfig?.tile_sets?.[0];
  if (
    data?.map?.id !== 1084 ||
    data.map.slug !== "hajin-dmz" ||
    data.mapConfig.tile_sets.length !== 1 ||
    tile?.id !== 1345 ||
    tile.map_id !== 1084 ||
    tile.name !== "v5" ||
    tile.path !== "call-of-duty-modern-warfare-4/hajin-dmz/v5" ||
    tile.pattern !==
      "call-of-duty-modern-warfare-4/hajin-dmz/v5/{z}/{y}/{x}.jpg" ||
    tile.extension !== "jpg" ||
    tile.min_zoom !== 8 ||
    tile.max_zoom !== 14 ||
    tile.tiles_max_zoom !== 14 ||
    !tile.bounds ||
    Object.keys(tile.bounds).length !== 7
  )
    throw Error("MapGenie tile frame changed; alignment review required.");
  for (let z = 8; z <= 14; z++) {
    const min = 2 ** (z - 1) - 2 ** (z - 8),
      max = 2 ** (z - 1) - 1,
      b = tile.bounds[z];
    if (
      !b ||
      b.x?.min !== min ||
      b.x.max !== max ||
      b.y?.min !== min ||
      b.y.max !== max
    )
      throw Error("MapGenie declared tile bounds changed.");
  }
  if (
    !Array.isArray(data.groups) ||
    data.groups.length > 100 ||
    !data.categories ||
    typeof data.categories !== "object" ||
    Array.isArray(data.categories) ||
    Object.keys(data.categories).length < 1 ||
    Object.keys(data.categories).length > 100
  )
    throw Error("MapGenie category schema changed.");
  const groups = new Map();
  for (const g of data.groups) {
    if (
      !Number.isSafeInteger(g.id) ||
      g.id < 1 ||
      groups.has(g.id) ||
      !safeText(g.title, 80)
    )
      throw Error("Invalid MapGenie group.");
    groups.set(g.id, g.title.trim());
  }
  const categories = Object.entries(data.categories).map(([key, c]) => {
    if (
      !Number.isSafeInteger(c?.id) ||
      c.id < 1 ||
      String(c.id) !== key ||
      !groups.has(c.group_id) ||
      !safeText(c.title, 120) ||
      c.premium !== false
    )
      throw Error(
        "MapGenie category is malformed or requires unsupported restricted access.",
      );
    return {
      upstreamId: c.id,
      category: `mapgenie-${c.id}`,
      label: c.title.trim(),
      group: groups.get(c.group_id),
    };
  });
  return { ...bindings, categories };
}
export function projectMapgenie(latitude, longitude) {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 85.05112878 ||
    Math.abs(longitude) > 180
  )
    throw Error("Invalid MapGenie geographic coordinates.");
  const world = 256 * 2 ** 10,
    s = Math.sin((latitude * Math.PI) / 180),
    x = ((longitude + 180) / 360) * world - 508 * 256,
    y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world - 508 * 256;
  const clamp = (v) =>
    Math.abs(v) < 1e-8 ? 0 : Math.abs(v - 1024) < 1e-8 ? 1024 : v;
  if (x < -1e-8 || y < -1e-8 || x > 1024 + 1e-8 || y > 1024 + 1e-8)
    throw Error("MapGenie point is outside the reviewed tile frame.");
  return { x: clamp(x), y: clamp(y) };
}
export function mapgenieRows(data, meta) {
  if (
    !data ||
    !Array.isArray(data.locations) ||
    !data.locations.length ||
    data.locations.length > 5000
  )
    throw Error("MapGenie public location schema is empty/changed.");
  const categories = new Map(meta.categories.map((c) => [c.upstreamId, c])),
    ids = new Set();
  let truncated = 0;
  const rows = data.locations.map((p) => {
    if (
      !Number.isSafeInteger(p?.id) ||
      p.id < 1 ||
      ids.has(p.id) ||
      (p.map_id !== undefined && p.map_id !== 1084) ||
      !categories.has(p.category_id) ||
      !safeText(p.title, 200) ||
      (p.description != null && typeof p.description !== "string")
    )
      throw Error("Invalid/conflicting MapGenie location.");
    ids.add(p.id);
    if (p.description?.length > 3500) truncated++;
    const category = categories.get(p.category_id),
      point = projectMapgenie(p.latitude, p.longitude),
      row = {
        id: `mg-${p.id}`,
        title: p.title.trim(),
        category: category.category,
        label: category.label,
        group: category.group,
        ...point,
        notes: (p.description ?? "").slice(0, 3500),
      };
    if (p.floor != null) {
      if (
        !(
          (typeof p.floor === "number" && Number.isFinite(p.floor)) ||
          safeText(p.floor, 100)
        )
      )
        throw Error("Invalid MapGenie floor.");
      row.floor = p.floor;
    }
    return row;
  });
  return {
    rows,
    warnings: truncated
      ? [`${truncated} source descriptions truncated to3500characters.`]
      : [],
  };
}
export async function verifyMapgenieFrame(
  meta,
  authorization,
  registration,
  get,
) {
  const a = authorization?.mapgenie,
    urls = mapgenieTileURLs();
  if (
    !a ||
    a.frame?.mapId !== 1084 ||
    a.frame.tileSetId !== 1345 ||
    a.frame.version !== "v5" ||
    a.frame.zoom !== 10 ||
    a.frame.min !== 508 ||
    a.frame.max !== 511 ||
    a.frame.size !== 1024 ||
    !Array.isArray(a.tiles) ||
    a.tiles.length !== 16 ||
    registration?.canonicalDigest !== canonicalDigest ||
    !validAffine(registration.matrix) ||
    JSON.stringify(registration.sourceSize) !== "[1024,1024]"
  )
    throw Error(
      "MapGenie requires reviewed tile fingerprints and coordinate registration.",
    );
  validateMapgenieMetadata(meta);
  const expected = new Set(urls);
  for (const t of a.tiles)
    if (!expected.delete(t.url) || !/^[a-f0-9]{64}$/.test(t.sha256))
      throw Error("MapGenie tile fingerprint list is incomplete/repeated.");
  for (const t of a.tiles)
    if (digest(await get(t.url, 2 * 1024 * 1024)) !== t.sha256)
      throw Error("MapGenie imagery changed; alignment review required.");
}
export async function mapgenieSpriteIcons(
  page,
  bytes,
  meta,
  { decodeTimeoutMs = 10000 } = {},
) {
  if (
    bytes.length > 4 * 1024 * 1024 ||
    bytes.length < 24 ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw Error("Invalid MapGenie PNG sprite.");
  const width = bytes.readUInt32BE(16),
    height = bytes.readUInt32BE(20),
    positions = meta.MARKER_SPRITE_POSITIONS_V3;
  if (
    !width ||
    !height ||
    width > 2048 ||
    height > 2048 ||
    width * height > 4 * 1024 * 1024 ||
    width !== meta.MARKER_IMAGES_WIDTH ||
    height !== meta.MARKER_IMAGES_HEIGHT ||
    !positions ||
    typeof positions !== "object" ||
    Array.isArray(positions) ||
    Object.keys(positions).length > 1000
  )
    throw Error("MapGenie sprite dimensions/schema changed.");
  let offset = 8,
    header = false,
    pixels = false,
    end = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset),
      type = bytes.toString("ascii", offset + 4, offset + 8);
    if (length > bytes.length - offset - 12)
      throw Error("Truncated MapGenie sprite chunk.");
    if (!header) {
      if (type !== "IHDR" || length !== 13)
        throw Error("Invalid MapGenie sprite header.");
      header = true;
    } else if (type === "IHDR") throw Error("Repeated MapGenie sprite header.");
    if (["acTL", "fcTL", "fdAT", "iCCP", "zTXt", "iTXt"].includes(type))
      throw Error("Unsupported animated/compressed-metadata MapGenie sprite.");
    if (type === "IDAT") pixels = true;
    offset += length + 12;
    if (type === "IEND") {
      if (length || offset !== bytes.length)
        throw Error("Invalid MapGenie sprite ending.");
      end = true;
      break;
    }
  }
  if (!header || !pixels || !end) throw Error("Incomplete MapGenie sprite.");
  const crops = meta.categories.map((c) => {
    const r = positions[c.upstreamId];
    if (
      !r ||
      ![r.x, r.y, r.width, r.height].every(Number.isSafeInteger) ||
      r.x < 0 ||
      r.y < 0 ||
      r.width < 1 ||
      r.height < 1 ||
      r.width > 256 ||
      r.height > 256 ||
      r.x + r.width > width ||
      r.y + r.height > height ||
      !Number.isFinite(r.pixelRatio) ||
      r.pixelRatio < 1 ||
      r.pixelRatio > 4
    )
      throw Error("Invalid MapGenie sprite crop.");
    return { id: c.category, x: r.x, y: r.y, width: r.width, height: r.height };
  });
  // Node owns the deadline: page timers do not run with JavaScript disabled.
  const decoding = page.evaluate(
    async ({ raw, crops, width, height }) => {
      let image;
      try {
        image = await createImageBitmap(
          new Blob([Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))], {
            type: "image/png",
          }),
        );
        if (
          image.width !== width ||
          image.height !== height ||
          image.width * image.height > 4 * 1024 * 1024
        )
          throw Error("Decoded MapGenie sprite extent changed.");
        return crops.map((r) => {
          const canvas = document.createElement("canvas");
          canvas.width = r.width;
          canvas.height = r.height;
          canvas
            .getContext("2d")
            .drawImage(
              image,
              r.x,
              r.y,
              r.width,
              r.height,
              0,
              0,
              r.width,
              r.height,
            );
          return {
            id: r.id,
            base64: canvas.toDataURL("image/png").split(",")[1],
          };
        });
      } finally {
        image?.close();
      }
    },
    { raw: bytes.toString("base64"), crops, width, height },
  );
  let timer, encoded,expired=false;
  try {
    encoded = await new Promise((resolve, reject) => {
      timer = setTimeout(
        () => {
          expired=true;
          const fail=()=>reject(Error("Sprite decode timed out; decoder page disposed."));
          void page.close().then(fail,fail);
        },
        Math.min(10000, Math.max(1, decodeTimeoutMs)),
      );
      decoding.then(value=>{if(!expired)resolve(value);},error=>{if(!expired)reject(error);});
    });
  } finally {
    clearTimeout(timer);
  }
  const result = new Map();
  let total = 0;
  for (const item of encoded) {
    const bytes = Buffer.from(item.base64, "base64");
    if (bytes.length > 512 * 1024 || (total += bytes.length) > 4 * 1024 * 1024)
      throw Error("MapGenie crop byte limit.");
    result.set(item.id, { bytes, ext: "png" });
  }
  return result;
}
export function mapgenieSpriteURL(value) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "media.mapgenie.io" ||
    u.username ||
    u.password ||
    u.port ||
    u.search ||
    u.hash ||
    !/^\/v2\/assets\/prod\/games\/call-of-duty-modern-warfare-4\/markers\/v[1-9][0-9]{0,5}\/markers@2x\.png$/.test(
      u.pathname,
    )
  )
    throw Error("MapGenie sprite URL is outside the fixed game registry.");
  return u.href;
}
