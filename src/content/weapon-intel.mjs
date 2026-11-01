import { readFile, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { assert, boundedWalk, parseBounded } from "./limits.mjs";

const exact = (v, keys) =>
  assert(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).sort().join() === keys.split(" ").sort().join(),
    "Unexpected intelligence fields",
  );
const text = (v) =>
  assert(
    typeof v === "string" && v.length <= 500 && !v.includes("\0"),
    "Invalid intelligence text",
  );
const slug = (v) =>
  assert(
    typeof v === "string" &&
      v.length <= 100 &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v),
    "Invalid intelligence identity",
  );
const number = (v) =>
  assert(
    typeof v === "number" && Number.isFinite(v) && v >= 0,
    "Invalid intelligence number",
  );
const date = (v) =>
  assert(
    typeof v === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid intelligence date",
  );
const list = (v, max) =>
  assert(Array.isArray(v) && v.length <= max, "Intelligence collection limit");
export const isPatchURL = (v) =>
  typeof v === "string" &&
  /^https:\/\/www\.callofduty\.com\/patchnotes\/20\d{2}\/(?:0[1-9]|1[0-2])\/call-of-duty-modern-warfare-4-[a-z0-9-]+$/.test(
    v,
  ) &&
  v.length <= 500;
export function patchWeapon(subject, db) {
  if (typeof subject !== "string") return null;
  const compact = (v) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const [base, ...parts] = subject.toLowerCase().trim().split(" - ");
  const weapon = db.weapons.find((w) => compact(w.id) === compact(base));
  if (!weapon) return null;
  if (!parts.length) return weapon.id;
  const suffix = parts
    .join(" - ")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
  if (suffix.endsWith(" apex attachment")) {
    const variant = compact(suffix.slice(0, -" apex attachment".length)),
      apex = compact(weapon.apex),
      prefix = compact(weapon.id);
    const aliases = [
      apex,
      apex.startsWith(prefix) ? apex.slice(prefix.length) : null,
      {
        "hyeon-burst": "hyperburst",
        oden: "sentinel",
        "type-73": "assault",
        "x-58-nyx": "void",
      }[weapon.id],
    ];
    return variant && aliases.includes(variant) ? weapon.id : null;
  }
  if (
    db.attachments.some(
      (a) => a.name.toLowerCase() === suffix && a.weapons.includes(weapon.id),
    ) ||
    (weapon.id === "warlord" && suffix === "12g slug rounds")
  )
    return weapon.id;
  return null;
}
export function validateWeaponIntel(db) {
  boundedWalk(db, { depth: 20, nodes: 150000, string: 500 });
  exact(
    db,
    "version importedAt sources metrics weapons attachments communityStats patches patchHistory",
  );
  assert(db.version === 1, "Unsupported intelligence version");
  date(db.importedAt);
  assert(
    Buffer.byteLength(JSON.stringify(db)) <= 8 * 1024 * 1024,
    "Intelligence byte limit",
  );
  assert(
    db.sources &&
      typeof db.sources === "object" &&
      !Array.isArray(db.sources) &&
      Object.keys(db.sources).length <= 256,
    "Invalid sources",
  );
  for (const [id, s] of Object.entries(db.sources)) {
    slug(id);
    exact(s, "url date mode status upstream");
    date(s.date);
    text(s.mode);
    text(s.status);
    list(s.upstream, 256);
    for (const url of [s.url, ...s.upstream]) {
      text(url);
      const u = new URL(url);
      assert(
        u.protocol === "https:" && !u.username && !u.password,
        "Unsafe intelligence source",
      );
    }
  }
  list(db.metrics, 64);
  const metrics = new Set();
  for (const m of db.metrics) {
    exact(m, "id name group unit better");
    Object.values(m).forEach(text);
    assert(
      !metrics.has(m.id) && ["higher", "lower"].includes(m.better),
      "Invalid metric",
    );
    metrics.add(m.id);
  }
  list(db.weapons, 256);
  assert(db.weapons.length, "Empty weapons");
  const weapons = new Set();
  for (const w of db.weapons) {
    exact(w, "id name category official slots apex blockedSlots unlockReports");
    slug(w.id);
    text(w.name);
    text(w.category);
    text(w.apex);
    assert(!weapons.has(w.id), "Duplicate weapon");
    weapons.add(w.id);
    for (const values of [w.slots, w.blockedSlots, w.unlockReports]) {
      list(values, 64);
      values.forEach(text);
    }
    exact(w.official, "rpm magazine reserve levels");
    for (const v of Object.values(w.official)) {
      exact(v, "value unit applicability");
      text(v.unit);
      assert(
        ["reported", "unknown", "not-applicable"].includes(v.applicability),
        "Invalid applicability",
      );
      if (v.applicability === "reported") number(v.value);
      else assert(v.value === null, "Unreported numeric value");
    }
  }
  const metricValues = (values) => {
    assert(
      values && typeof values === "object" && !Array.isArray(values),
      "Invalid stat map",
    );
    for (const [key, value] of Object.entries(values)) {
      assert(metrics.has(key), "Unknown metric");
      number(value);
    }
  };
  assert(
    db.communityStats &&
      typeof db.communityStats === "object" &&
      !Array.isArray(db.communityStats),
    "Invalid community stats",
  );
  for (const [weapon, values] of Object.entries(db.communityStats)) {
    assert(weapons.has(weapon), "Unknown stat weapon");
    metricValues(values);
  }
  list(db.attachments, 2000);
  const attachments = new Set();
  for (const a of db.attachments) {
    exact(
      a,
      "id name slot kind weapons effects operation sources unlock about",
    );
    slug(a.id);
    [a.name, a.slot, a.unlock, a.about].forEach(text);
    assert(
      !attachments.has(a.id) && ["standard", "apex"].includes(a.kind),
      "Duplicate/invalid attachment",
    );
    attachments.add(a.id);
    list(a.weapons, 256);
    assert(
      new Set(a.weapons).size === a.weapons.length &&
        a.weapons.every((w) => weapons.has(w)),
      "Invalid compatibility",
    );
    list(a.sources, 256);
    assert(
      a.sources.length && a.sources.every((s) => Object.hasOwn(db.sources, s)),
      "Unknown attachment source",
    );
    assert(
      a.operation === "multiply" &&
        a.effects &&
        typeof a.effects === "object" &&
        !Array.isArray(a.effects),
      "Invalid effect operation",
    );
    for (const [weapon, values] of Object.entries(a.effects)) {
      assert(a.weapons.includes(weapon), "Incompatible effect");
      metricValues(values);
    }
  }
  const event = (r) => {
    exact(
      r,
      "id sourceURL date mode weapon variant metric before after unit status",
    );
    date(r.date);
    assert(
      isPatchURL(r.sourceURL) &&
        weapons.has(r.weapon) &&
        ["multiplayer", "dmz", "global", "unknown"].includes(r.mode),
      "Invalid patch scope",
    );
    [r.variant, r.metric, r.before, r.after, r.unit].forEach(text);
    assert(
      patchWeapon(r.variant, db) === r.weapon,
      "Unknown patch weapon/variant",
    );
    const id = createHash("sha256")
      .update(
        JSON.stringify([
          r.sourceURL,
          r.date,
          r.mode,
          r.weapon,
          r.variant,
          r.metric,
        ]),
      )
      .digest("hex");
    assert(
      r.id === id && r.metric && r.after && r.status === "official-reported",
      "Invalid patch identity",
    );
  };
  list(db.patches, 10000);
  list(db.patchHistory, 1000);
  const ids = new Set();
  for (const p of db.patches) {
    event(p);
    assert(!ids.has(p.id), "Duplicate patch");
    ids.add(p.id);
  }
  for (const h of db.patchHistory) {
    exact(h, "previousHash report");
    event(h.report);
    assert(/^[a-f0-9]{64}$/.test(h.previousHash), "Invalid history hash");
    const canonical =
      JSON.stringify(
        Object.fromEntries(
          Object.keys(h.report)
            .sort()
            .map((key) => [key, h.report[key]]),
        ),
        null,
        2,
      ) + "\n";
    assert(
      createHash("sha256").update(canonical).digest("hex") === h.previousHash,
      "History content hash mismatch",
    );
  }
  return db;
}
export async function readWeaponIntel() {
  const path = new URL("../../content/weapon-intel.json", import.meta.url);
  const info = await lstat(path);
  assert(
    info.isFile() && !info.isSymbolicLink() && info.size <= 8 * 1024 * 1024,
    "Unsafe intelligence file",
  );
  return validateWeaponIntel(
    parseBounded(await readFile(path, "utf8"), 8 * 1024 * 1024, {
      depth: 20,
      string: 500,
    }),
  );
}
