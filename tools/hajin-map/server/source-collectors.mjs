import ts from "typescript";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  sites,
  canonicalDigest,
  digest,
  validateCapture,
} from "./source-contract.mjs";
import { sourceNetwork } from "./source-network.mjs";
import {
  mapgenieBindings,
  validateMapgenieMetadata,
  mapgenieRows,
  verifyMapgenieFrame,
  mapgenieSpriteURL,
  mapgenieSpriteIcons,
} from "./mapgenie.mjs";
const text = (b) => new TextDecoder("utf-8", { fatal: true }).decode(b);
const fallback = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="#e8eed5"/><circle cx="16" cy="16" r="4" fill="#26352b"/></svg>',
);
/** Decode only the selected TanStack data graph. Never evaluate downloaded JavaScript. */
export function hydrationPins(scripts) {
  const refs = new Map(),
    queries = [];
  const refId = (n) =>
    ts.isElementAccessExpression(n) &&
    ts.isIdentifier(n.expression) &&
    n.expression.text === "$R" &&
    n.argumentExpression &&
    ts.isNumericLiteral(n.argumentExpression)
      ? n.argumentExpression.text
      : null;
  let nodes = 0;
  for (const script of scripts) {
    const file = ts.createSourceFile(
      "inert.js",
      script,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    const visit = (n) => {
      if (++nodes > 500000) throw Error("Hydration AST limit exceeded.");
      if (
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        refId(n.left) !== null
      )
        refs.set(refId(n.left), n.right);
      if (
        ts.isObjectLiteralExpression(n) &&
        n.properties.some(
          (p) =>
            ts.isPropertyAssignment(p) &&
            p.name?.getText(file) === "queryHash" &&
            ts.isStringLiteral(p.initializer) &&
            p.initializer.text === '["dmz-map","en"]',
        )
      )
        queries.push(n);
      ts.forEachChild(n, visit);
    };
    visit(file);
  }
  let decoded = 0;
  const stack = new Set();
  const prop = (n, key) => {
    while (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken
    )
      n = n.right;
    if (refId(n) !== null) n = refs.get(refId(n));
    if (!n || !ts.isObjectLiteralExpression(n))
      throw Error("Changed hydration object.");
    const p = n.properties.find(
      (p) =>
        ts.isPropertyAssignment(p) &&
        (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
        p.name.text === key,
    );
    if (!p) throw Error("Missing hydration field.");
    return p.initializer;
  };
  const decode = (n, depth = 0) => {
    if (!n || depth > 16 || ++decoded > 150000)
      throw Error("Hydration value limit exceeded.");
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken
    )
      return decode(n.right, depth + 1);
    const id = refId(n);
    if (id !== null) {
      if (stack.has(id)) throw Error("Cyclic hydration.");
      stack.add(id);
      const v = decode(refs.get(id), depth + 1);
      stack.delete(id);
      return v;
    }
    if (ts.isStringLiteral(n) || ts.isNumericLiteral(n))
      return ts.isStringLiteral(n) ? n.text : Number(n.text);
    if (n.kind === ts.SyntaxKind.NullKeyword) return null;
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isPrefixUnaryExpression(n) && ts.isNumericLiteral(n.operand)) {
      if (n.operator === ts.SyntaxKind.MinusToken)
        return -Number(n.operand.text);
      if (n.operator === ts.SyntaxKind.ExclamationToken)
        return !Number(n.operand.text);
    }
    if (ts.isArrayLiteralExpression(n))
      return n.elements.map((v) => decode(v, depth + 1));
    if (ts.isObjectLiteralExpression(n)) {
      const result = Object.create(null);
      for (const p of n.properties) {
        if (
          !ts.isPropertyAssignment(p) ||
          !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
        )
          throw Error("Nonliteral hydration property.");
        const key = p.name.text;
        if (
          ["__proto__", "constructor", "prototype"].includes(key) ||
          Object.hasOwn(result, key)
        )
          throw Error("Unsafe hydration key.");
        result[key] = decode(p.initializer, depth + 1);
      }
      return result;
    }
    throw Error("Nonliteral hydration value refused.");
  };
  if (queries.length !== 1)
    throw Error("Expected one English map hydration query.");
  const pins = decode(prop(prop(prop(queries[0], "state"), "data"), "pins"));
  if (!Array.isArray(pins) || pins.length > 5000)
    throw Error("Invalid hydration pins.");
  return pins;
}
/** All remote markup lives only in detached DOMParser documents; requests are denied. */
export async function withInertParser(work, signal) {
  signal?.throwIfAborted();
  const browser = await chromium.launch({
    timeout: 10000,
    chromiumSandbox: true,
  });
  const abort = () => {
    void browser.close();
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    await context.route("**/*", (route) => route.abort());
    await context.routeWebSocket("**/*", (socket) => socket.close());
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    return await work(page);
  } finally {
    signal?.removeEventListener("abort", abort);
    await browser.close();
  }
}
export async function parsePage(page, id, html) {
  return await page.evaluate(
    ({ id, html }) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const clean = (svg) => {
        if (!svg) return null;
        let nodes = 0;
        const tags = new Set([
          "svg",
          "path",
          "circle",
          "rect",
          "line",
          "polyline",
          "polygon",
          "ellipse",
          "g",
        ]);
        const attrs = new Set([
          "viewBox",
          "d",
          "cx",
          "cy",
          "r",
          "rx",
          "ry",
          "x",
          "y",
          "x1",
          "y1",
          "x2",
          "y2",
          "width",
          "height",
          "points",
          "fill",
          "stroke",
          "stroke-width",
          "stroke-linecap",
          "stroke-linejoin",
          "fill-rule",
          "clip-rule",
          "transform",
        ]);
        const out = document.implementation.createDocument(
          "http://www.w3.org/2000/svg",
          "svg",
          null,
        );
        const copy = (n) => {
          if (++nodes > 256 || !tags.has(n.localName))
            throw Error("Unsupported icon.");
          const e = out.createElementNS(
            "http://www.w3.org/2000/svg",
            n.localName,
          );
          for (const a of n.attributes) {
            if (!attrs.has(a.name)) continue;
            if (
              a.value.length > 12000 ||
              /[<>]|url\s*\(|javascript|https?:|data:/i.test(a.value)
            )
              throw Error("Unsafe icon attribute.");
            e.setAttribute(
              a.name,
              a.value === "currentColor" ? "#e8eed5" : a.value,
            );
          }
          for (const c of n.children) e.append(copy(c));
          return e;
        };
        const root = copy(svg);
        root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        root.setAttribute("width", "32");
        root.setAttribute("height", "32");
        return new XMLSerializer().serializeToString(root);
      };
      const safeIcon = (n) => {
        try {
          return clean(n?.querySelector("svg"));
        } catch {
          return null;
        }
      };
      if (id === "icon")
        return clean(
          new DOMParser().parseFromString(html, "image/svg+xml")
            .documentElement,
        );
      if (id === "mapgenie")
        return { scripts: [...doc.scripts].map((n) => n.textContent) };
      if (id === "codcentral")
        return {
          image:
            doc.querySelector(".dmzm-img")?.getAttribute("data-hi") ??
            doc.querySelector(".dmzm-img")?.getAttribute("src"),
          rows: [...doc.querySelectorAll(".dmzm-pin")].map((n) => ({
            id: n.dataset.slug || "pin-" + n.dataset.i,
            title: n.dataset.name,
            category: n.dataset.layer,
            label: n.dataset.label,
            x: (parseFloat(n.style.left) / 100) * 2880,
            y: (parseFloat(n.style.top) / 100) * 2700,
            icon: safeIcon(n),
            notes: n.dataset.text,
          })),
        };
      if (id === "codmunity")
        return {
          image: doc
            .querySelector(
              'img[src*="hajin-map-"][width="1120"][height="1055"]',
            )
            ?.getAttribute("src"),
          scripts: [...doc.scripts].map((n) => n.textContent),
          icons: [...doc.querySelectorAll("button[aria-label]")]
            .slice(0, 10000)
            .map((n) => ({
              label: n.getAttribute("aria-label"),
              icon: safeIcon(n),
            })),
        };
      if (id === "wzstats")
        return {
          image: doc
            .querySelector("app-leaflet-image-map")
            ?.getAttribute("image"),
          state: doc.querySelector("#ng-state")?.textContent,
        };
      const map = doc.querySelector("#map[data-baselayer]");
      return {
        bundle: [...doc.scripts]
          .map((s) => s.getAttribute("src"))
          .find((s) => /maps\/map-page\/clientlibs\.[^/]+\.js$/.test(s ?? "")),
        frame: map
          ? {
              template: map.dataset.baselayer,
              width: map.dataset.width,
              height: map.dataset.height,
            }
          : null,
      };
    },
    { id, html },
  );
}
export async function normalizedCapture({
  id,
  rows,
  old,
  registration,
  iconDirectory,
  readIcon,
  declaredCategories = [],
  readCurrentIcon,
  capturedAt = new Date().toISOString(),
}) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 5000)
    throw Error("Empty or oversized source; previous capture retained.");
  const icons = Object.create(null),
    warnings = [],
    categories = [],
    seen = new Set();
  for (const category of [
    ...new Set([
      ...rows.map((r) => r.category),
      ...declaredCategories.map((c) => c.category),
      ...(old?.categories.map((c) => c.id) ?? []),
    ]),
  ].sort()) {
    if (
      typeof category !== "string" ||
      !category ||
      category.length > 80 ||
      !/^[\w.:-]+$/.test(category)
    )
      throw Error("Invalid category identifier.");
    const prior = old?.categories.find((c) => c.id === category),
      row =
        declaredCategories.find((c) => c.category === category) ??
        rows.find((r) => r.category === category && r.icon) ??
        rows.find((r) => r.category === category);
    let bytes,
      ext = "svg";
    const current = await readCurrentIcon?.(category);
    if (current) ({ bytes, ext } = current);
    else if (row?.icon) bytes = Buffer.from(row.icon);
    else if (prior) {
      ({ bytes, ext } = await readIcon(prior.icon));
      warnings.push(
        `${category}: reused local icon; source artwork was not refreshed.`,
      );
    } else {
      bytes = fallback;
      warnings.push(
        `${category}: generic fallback icon; source artwork unavailable.`,
      );
    }
    if (bytes.length > 512 * 1024) throw Error("Icon byte limit.");
    const name = digest(category).slice(0, 20) + "." + ext;
    icons[category] = { name, bytes, digest: digest(bytes) };
    categories.push({
      id: category,
      name: row?.label ?? prior?.name ?? category,
      group: row?.group ?? prior?.group ?? `${id} categories`,
      icon: iconDirectory + name,
    });
  }
  if (
    Object.values(icons).reduce((n, i) => n + i.bytes.length, 0) >
    4 * 1024 * 1024
  )
    throw Error("Icon total byte limit.");
  const signature = (r) =>
    JSON.stringify([
      r.category,
      r.name,
      Math.round(r.x * 4096 * 100) / 100,
      Math.round(r.y * 4096 * 100) / 100,
    ]);
  const oldSignatures = new Map();
  for (const r of old?.records ?? []) {
    const key = signature(r);
    oldSignatures.set(key, oldSignatures.has(key) ? null : r.id);
  }
  const upstreamIds = new Set(rows.map((r) => String(r.id))),
    oldIds = new Set(old?.records.map((r) => r.id) ?? []);
  const records = rows.map((row) => {
    if (
      typeof row.id !== "string" ||
      !row.id ||
      typeof row.title !== "string" ||
      (row.notes != null && typeof row.notes !== "string")
    )
      throw Error("Invalid source identity/title/notes.");
    const m = registration?.matrix ?? [
      [1, 0, 0],
      [0, 1, 0],
    ];
    if (
      ![row.x, row.y].every((v) => typeof v === "number" && Number.isFinite(v))
    )
      throw Error("Invalid source coordinates.");
    if (
      registration &&
      !(
        row.x >= 0 &&
        row.y >= 0 &&
        row.x <= registration.sourceSize[0] &&
        row.y <= registration.sourceSize[1]
      )
    )
      throw Error("Source coordinates outside reviewed frame.");
    const x = (m[0][0] * row.x + m[0][1] * row.y + m[0][2]) / 4096,
      y = (m[1][0] * row.x + m[1][1] * row.y + m[1][2]) / 4096;
    const r = {
      id: String(row.id),
      name: row.title,
      category: row.category,
      mapId: "hajin",
      coordinateSpaceVersion: "hajin-official-v1-4096",
      x,
      y,
    };
    if (row.notes != null && row.notes !== "")
      r.notes = String(row.notes).slice(0, 3500);
    if (row.floor != null) r.floor = row.floor;
    if (id === "codcentral" && !oldIds.has(r.id)) {
      const priorId = oldSignatures.get(signature(r));
      if (priorId && !upstreamIds.has(priorId)) r.id = priorId;
    }
    if (seen.has(r.id))
      throw Error("Conflicting source identity. Previous capture retained.");
    seen.add(r.id);
    return r;
  });
  const capture = validateCapture(
    {
      schemaVersion: 1,
      sourcePage: sites[id].page,
      capturedAt,
      categories,
      records,
    },
    id,
  );
  return { capture, icons, warnings };
}
export async function verifyFrame(
  id,
  parsed,
  authorization,
  registration,
  get,
) {
  if (id === "official") {
    if (
      !Array.isArray(authorization.tiles) ||
      authorization.tiles.length !== 256
    )
      throw Error("Official reviewed tile fingerprints required.");
    const template =
      "https://www.callofduty.com/cdn/blog/guides/maps/mw4/dmz/hajin/baselayer/v1/tiles/{z}/{x}/{y}.png";
    if (
      parsed.frame?.template !== template ||
      parsed.frame.width !== "4096" ||
      parsed.frame.height !== "4096"
    )
      throw Error("Official declared map frame changed; review required.");
    const expected = new Set();
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 16; y++)
        expected.add(
          template
            .replace("{z}", "4")
            .replace("{x}", String(x))
            .replace("{y}", String(y)),
        );
    for (const tile of authorization.tiles) {
      if (!expected.delete(tile.url) || !/^[a-f0-9]{64}$/.test(tile.sha256))
        throw Error(
          "Official tile fingerprint manifest is incomplete or repeated.",
        );
    }
    let cursor = 0;
    await Promise.all(
      Array.from({ length: 8 }, async () => {
        while (cursor < authorization.tiles.length) {
          const t = authorization.tiles[cursor++];
          if (digest(await get(t.url, 1024 * 1024)) !== t.sha256)
            throw Error("Official map imagery changed; frame review required.");
        }
      }),
    );
  } else {
    if (
      !parsed.image ||
      new URL(
        parsed.image,
        id === "wzstats" ? "https://wzstats.gg/" : sites[id].page,
      ).href !== sites[id].image
    )
      throw Error(
        "Source map image reference changed; alignment review required.",
      );
    const reviewed = authorization.sourceImages?.[id];
    if (
      !reviewed ||
      reviewed.url !== sites[id].image ||
      JSON.stringify(registration?.sourceSize) !==
        JSON.stringify(sites[id].size) ||
      registration.canonicalDigest !== canonicalDigest ||
      digest(await get(sites[id].image, 32 * 1024 * 1024)) !== reviewed.sha256
    )
      throw Error("Source image changed; alignment review required.");
  }
}
export async function collectSource(
  id,
  { root, old, registration, authorization, iconDirectory, signal },
) {
  const local = new AbortController();
  signal = signal ? AbortSignal.any([signal, local.signal]) : local.signal;
  const get = sourceNetwork(signal, id === "official" ? 270 : 128);
  try {
    if (
      digest(
        await readFile(path.join(root, "public/maps/hajin/v1/background.webp")),
      ) !== canonicalDigest
    )
      throw Error("Canonical background changed; alignment review required.");
    const html = text(await get(sites[id].page));
    return await withInertParser(async (page) => {
      const parsed = await parsePage(page, id, html);
      if (id === "mapgenie") {
        const meta = validateMapgenieMetadata(mapgenieBindings(parsed.scripts));
        await verifyMapgenieFrame(meta, authorization, registration, get);
        const data = JSON.parse(text(await get(sites.mapgenie.publicData))),
          { rows, warnings } = mapgenieRows(data, meta);
        const sprite = await get(
            mapgenieSpriteURL(meta.MARKER_IMAGES_URL),
            4 * 1024 * 1024,
          ),
          icons = await mapgenieSpriteIcons(page, sprite, meta);
        const result = await normalizedCapture({
          id,
          rows,
          old,
          registration,
          iconDirectory,
          declaredCategories: meta.categories,
          readCurrentIcon: async (category) => icons.get(category),
          readIcon: (icon) => readLocalIcon(root, page, icon),
        });
        result.warnings.push(...warnings);
        return result;
      }
      await verifyFrame(id, parsed, authorization, registration, get);
      let rows;
      if (id === "official") {
        if (!parsed.bundle) throw Error("Official category bundle changed.");
        const bundle = text(
          await get(
            new URL(parsed.bundle, sites[id].page).href,
            8 * 1024 * 1024,
          ),
        );
        const cats = new Map();
        const pattern =
          /^        (dmz_\w+|poiLabel(?:Secondary)?): \{([\s\S]*?)^        \},/gm;
        for (const match of bundle.matchAll(pattern)) {
          const name = match[2].match(/\bname:\s*"([^"]+)"/);
          if (name) cats.set(match[1], name[1]);
        }
        const api =
          "https://map-vnext-server.infra-ext.activision.com/mapdata/all?mapPath=%2Fcontent%2Fatvi%2Fcallofduty%2Fguides%2Fweb%2Fen%2Fmodernwarfare4%2Fdmz-maps%2Fhajin";
        const data = JSON.parse(text(await get(api)));
        if (!Array.isArray(data.features))
          throw Error("Official schema changed.");
        // The public API uses this ID while the guide bundle calls its icon/category HuntTower.
        if (cats.has("dmz_lieutenantHuntTower"))
          cats.set("dmz_lieutenantHunt", cats.get("dmz_lieutenantHuntTower"));
        rows = data.features.map((f) => {
          const p = f.properties;
          if (
            f.geometry?.type !== "Point" ||
            !cats.has(p?.category) ||
            !/^\d+$/.test(p?.mapId)
          )
            throw Error("Official point/category schema changed.");
          return {
            id: p.mapId,
            title: p.name,
            category: p.category,
            label: cats.get(p.category)?.trim(),
            x: f.geometry.coordinates[0],
            y: f.geometry.coordinates[1],
          };
        });
      } else {
        if (id === "codcentral") rows = parsed.rows;
        if (id === "codmunity")
          rows = hydrationPins(parsed.scripts).map((p) => {
            if (
              ![p.x, p.y].every(
                (v) => typeof v === "number" && Number.isFinite(v),
              )
            )
              throw Error("CODMunity coordinate schema changed.");
            const icon = parsed.icons.find((n) =>
              n.label?.endsWith(": " + p.title),
            );
            return {
              id: p.id,
              title: p.title,
              category: p.layer,
              label: icon?.label.split(": ")[0],
              x: (p.x / 10000) * 1120,
              y: (p.y / 10000) * 1055,
              icon: icon?.icon,
              notes: p.note,
              floor: p.floor,
            };
          });
        if (id === "wzstats") {
          const state = JSON.parse(parsed.state);
          const matches = Object.values(state).filter(
            (s) => s?.b?.map === "hajin" && Array.isArray(s.b.pins),
          );
          if (matches.length !== 1) throw Error("WZStats hydration changed.");
          rows = matches[0].b.pins.map((p) => {
            if (
              ![p.x, p.y].every(
                (v) => typeof v === "number" && Number.isFinite(v),
              )
            )
              throw Error("WZStats coordinate schema changed.");
            return {
              id: p.id,
              title: p.title,
              category: p.type,
              x: (p.x / 1000) * 1080,
              y: (p.y / 1000) * 1080,
              notes: p.note,
            };
          });
        }
      }
      return normalizedCapture({
        id,
        rows,
        old,
        registration,
        iconDirectory,
        readIcon: (icon) => readLocalIcon(root, page, icon),
      });
    }, signal);
  } finally {
    local.abort();
  }
}

export async function readLocalIcon(root, page, icon) {
  if (
    !/^\/maps\/hajin\/(?:official|providers\/(?:codmunity|wzstats|codcentral|mapgenie)|captures\/[a-f0-9-]{36}\/(?:official|codmunity|wzstats|codcentral|mapgenie))\/icons\/[a-zA-Z0-9_-]+\.(svg|png)$/.test(
      icon,
    )
  )
    throw Error("Unsafe local icon path.");
  const bytes = await readFile(path.join(root, "public", icon));
  if (bytes.length > 512 * 1024) throw Error("Icon limit.");
  if (icon.endsWith(".svg"))
    return {
      bytes: Buffer.from(await parsePage(page, "icon", text(bytes))),
      ext: "svg",
    };
  if (
    !bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    bytes.length < 24 ||
    bytes.readUInt32BE(16) > 256 ||
    bytes.readUInt32BE(20) > 256
  )
    throw Error("Invalid or oversized existing PNG icon.");
  const encoded = await page.evaluate(async (raw) => {
    const image = await createImageBitmap(
      new Blob([Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))], {
        type: "image/png",
      }),
    );
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d").drawImage(image, 0, 0);
    image.close();
    return canvas.toDataURL("image/png").split(",")[1];
  }, bytes.toString("base64"));
  return { bytes: Buffer.from(encoded, "base64"), ext: "png" };
}
