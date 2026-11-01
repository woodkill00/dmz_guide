import { createHash } from "node:crypto";
import {
  COD_URLS,
  REGIONS,
  emptyCodmunity,
  validateCodmunity,
} from "../src/domain/codmunity.mjs";
// Restricted data grammar. Source JavaScript is never executed.
export function parseWeaponLiteral(source) {
  const marker = /\bweaponStats\s*:\s*/g,
    first = marker.exec(source);
  if (!first || marker.exec(source))
    throw Error("Missing or ambiguous weapon data");
  let p = first.index + first[0].length,
    nodes = 0;
  const refs = new Map();
  const fail = () => {
    throw Error("Unsupported or unsafe comparator data syntax");
  };
  const ws = () => {
    while (/\s/.test(source[p] || "x")) p++;
  };
  function value(depth = 0) {
    if (++nodes > 50000 || depth > 12) fail();
    ws();
    const c = source[p];
    if (source.startsWith("$R[", p)) {
      const m = /^\$R\[(\d{1,5})\]/.exec(source.slice(p, p + 15));
      if (!m) fail();
      p += m[0].length;
      ws();
      const key = m[1];
      if (source[p] === "=") {
        p++;
        if (refs.has(key) || refs.size >= 4096) fail();
        const result = value(depth + 1);
        refs.set(key, result);
        return result;
      }
      if (!refs.has(key)) fail();
      return refs.get(key);
    }
    if (c === '"') {
      const start = p++;
      let escaped = false;
      while (p < source.length) {
        const ch = source[p++];
        if (ch === '"' && !escaped) {
          const v = JSON.parse(source.slice(start, p));
          if (v.length > 512) fail();
          return v;
        }
        if (ch === "\\" && !escaped) escaped = true;
        else escaped = false;
        if (p - start > 4096) fail();
      }
      fail();
    }
    if (c === "[" || c === "{") {
      const array = c === "[",
        out = array ? [] : Object.create(null),
        end = array ? "]" : "}";
      p++;
      ws();
      if (source[p] === end) {
        p++;
        return out;
      }
      let count = 0;
      while (p < source.length) {
        if (++count > 4096) fail();
        if (array) out.push(value(depth + 1));
        else {
          ws();
          let key;
          if (source[p] === '"') key = value(depth + 1);
          else {
            const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(source.slice(p));
            if (!m) fail();
            key = m[0];
            p += key.length;
          }
          if (
            ["__proto__", "constructor", "prototype"].includes(key) ||
            Object.hasOwn(out, key)
          )
            fail();
          ws();
          if (source[p++] !== ":") fail();
          out[key] = value(depth + 1);
        }
        ws();
        if (source[p] === end) {
          p++;
          return out;
        }
        if (source[p++] !== ",") fail();
      }
      fail();
    }
    for (const [token, result] of [
      ["!0", true],
      ["!1", false],
      ["true", true],
      ["false", false],
      ["null", null],
    ])
      if (source.startsWith(token, p)) {
        p += token.length;
        return result;
      }
    const m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      source.slice(p, p + 40),
    );
    if (m) {
      p += m[0].length;
      const n = Number(m[0]);
      if (!Number.isFinite(n) || Math.abs(n) > 1e15) fail();
      return n;
    }
    fail();
  }
  const rows = value();
  ws();
  if (
    !Array.isArray(rows) ||
    rows.length === 0 ||
    rows.length > 256 ||
    !/[},]/.test(source[p] || "")
  )
    fail();
  return rows;
}
const compact = (v) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
export function parseComparator(
  html,
  mode,
  db,
  definitions,
  { now = new Date().toISOString() } = {},
) {
  if (Buffer.byteLength(html) > 2 * 1024 * 1024)
    throw Error("Comparator byte limit");
  const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i
    .exec(html)?.[1]
    .replace(/<[^>]+>/g, " ");
  if (
    !heading ||
    !(
      mode === "mw4"
        ? /Modern Warfare 4 Stats Comparator.*MW4 multiplayer/i
        : /DMZ Stats Comparator.*DMZ/i
    ).test(heading)
  )
    throw Error("Wrong comparator heading or mode");
  const visible = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(?:x([a-f0-9]+)|(\d+));/gi, (_, hex, decimal) => {
      const n = Number.parseInt(hex || decimal, hex ? 16 : 10);
      if (!Number.isFinite(n) || n < 0 || n > 0x10ffff)
        throw Error("Invalid source text entity");
      return String.fromCodePoint(n);
    })
    .replace(/&(?:nbsp|ensp|emsp|thinsp|ThinSpace|NewLine|Tab);/gi, " ");
  const date = /Updated\s*:\s*(\d{2})\/(\d{2})\/(\d{4})/i.exec(visible);
  const snapshot = {
    sourceURL: COD_URLS[mode],
    mode: mode === "mw4" ? "multiplayer" : "dmz",
    fetchedAt: now,
    sourceDate: date ? `${date[3]}-${date[2]}-${date[1]}` : null,
    sourceHash: createHash("sha256").update(html).digest("hex"),
    warning: (
      /\b(?:UNTESTED|NOT[\s\u200b\u2060\u00ad_-]*(?:YET[\s\u200b\u2060\u00ad_-]+)?TESTED)(?:\s+YET)?(?:\s+IN\s+(?:GAME|DMZ))?/i.exec(
        visible,
      )?.[0] || ""
    )
      .replace(/\s+/g, " ")
      .toUpperCase(),
    weapons: {},
    unknownCount: 0,
  };
  for (const row of parseWeaponLiteral(html)) {
    if (
      row.game !== mode ||
      row.sourceGame !== "mw4" ||
      typeof row.gun !== "string"
    )
      throw Error("Source weapon mode mismatch");
    const weapon = db.weapons.find((w) =>
      [w.id, w.name].some((v) => compact(v) === compact(row.gun)),
    );
    if (!weapon) {
      snapshot.unknownCount++;
      continue;
    }
    if (Object.hasOwn(snapshot.weapons, weapon.id))
      throw Error("Duplicate source weapon");
    if (!Array.isArray(row.simple_damage) || row.simple_damage.length > 16)
      throw Error("Missing or invalid damage profiles");
    const stats = {};
    for (const m of definitions)
      if (row[m.id] !== undefined && row[m.id] !== null) {
        if (
          m.id.startsWith("avgTtk") &&
          row[m.id] === 0 &&
          row.simple_damage.length === 0
        )
          continue;
        stats[m.id] = row[m.id];
      }
    const damage = row.simple_damage.map((b, i, bands) => ({
      from: b.dropoff,
      to: bands[i + 1]?.dropoff ?? null,
      unit: "source-unspecified",
      values: Object.fromEntries(REGIONS.map((r) => [r, b[r] ?? null])),
      providerTTK: b.ttk ?? null,
      shotsToKill: b.shots_to_kill ?? null,
    }));
    if (!Object.keys(stats).length && !damage.length)
      throw Error("Source weapon has no supported data");
    snapshot.weapons[weapon.id] = {
      name: row.gun,
      sourceUpdated:
        typeof row.updated === "number"
          ? new Date(row.updated).toISOString()
          : null,
      stats,
      damage,
    };
  }
  const value = emptyCodmunity();
  value.modes[mode] = snapshot;
  validateCodmunity(value, db, definitions);
  return snapshot;
}
