import { keyGuide, KEY_TYPES } from "./keys.mjs";
import supplement from "../ui/key-supplemental.json" with { type: "json" };
import access from "../ui/key-access.json" with { type: "json" };
export const KEY_ACCESS_SOURCES = [
  keyGuide.sourceURL,
  "https://www.modern-warfare4.wiki/guide/mw4-dmz-irradiated-container",
  "https://codcentral.net/blog/mw4-dmz-keys/",
];
const requireValue = (v) => {
  if (!v) throw Error("Invalid key access data");
};
const exact = (v, fields) =>
  requireValue(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).sort().join() === fields.split(" ").sort().join(),
  );
const text = (v, max = 400) =>
  typeof v === "string" && v.length > 0 && v.length <= max && v.trim() === v;
const date = (v) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v + "T00:00:00Z")) &&
  new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
export const keyUseId = (key, location) =>
  key.id +
  "--" +
  location.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") +
  "-" +
  location.grid
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
function sources(rows, required = false) {
  requireValue(
    Array.isArray(rows) && rows.length <= 4 && (!required || rows.length > 0),
  );
  const urls = new Set();
  for (const s of rows) {
    exact(s, "url label date");
    requireValue(
      KEY_ACCESS_SOURCES.includes(s.url) &&
        !urls.has(s.url) &&
        text(s.label, 160) &&
        date(s.date),
    );
    urls.add(s.url);
  }
}
export function validateSupplemental(value, base = keyGuide.keys) {
  exact(value, "version checkedAt keys");
  requireValue(
    value.version === 1 &&
      date(value.checkedAt) &&
      Array.isArray(value.keys) &&
      value.keys.length <= 16 &&
      base.length + value.keys.length <= 128 &&
      Buffer.byteLength(JSON.stringify(value)) <= 65536,
  );
  const ids = new Set(base.map((k) => k.id)),
    names = new Set(base.map((k) => k.name.toLowerCase()));
  for (const k of value.keys) {
    exact(
      k,
      "id name aliases category acquisition locations steps requirements sources status",
    );
    requireValue(
      text(k.id, 100) &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(k.id) &&
        !ids.has(k.id) &&
        text(k.name, 120) &&
        !names.has(k.name.toLowerCase()) &&
        Object.hasOwn(KEY_TYPES, k.category) &&
        text(k.acquisition) &&
        k.status === "source-reported-unverified",
    );
    ids.add(k.id);
    names.add(k.name.toLowerCase());
    for (const [field, max, min, len] of [
      ["aliases", 4, 0, 120],
      ["steps", 12, 1, 400],
      ["requirements", 8, 0, 400],
    ])
      requireValue(
        Array.isArray(k[field]) &&
          k[field].length >= min &&
          k[field].length <= max &&
          k[field].every((v) => text(v, len)),
      );
    requireValue(
      Array.isArray(k.locations) &&
        k.locations.length > 0 &&
        k.locations.length <= 8,
    );
    for (const l of k.locations) {
      exact(l, "name grid");
      requireValue(text(l.name, 160) && text(l.grid, 16));
    }
    sources(k.sources, true);
  }
  return value;
}
export function validateKeyAccess(value, keys) {
  exact(value, "version groups uses");
  requireValue(
    value.version === 1 &&
      Array.isArray(value.groups) &&
      value.groups.length > 0 &&
      value.groups.length <= 64 &&
      Array.isArray(value.uses) &&
      value.uses.length <= 1024 &&
      Buffer.byteLength(JSON.stringify(value)) <= 1024 * 1024,
  );
  const groups = new Set(),
    names = new Set();
  for (const g of value.groups) {
    exact(g, "id name");
    requireValue(
      text(g.id, 100) &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(g.id) &&
        !groups.has(g.id) &&
        text(g.name, 120) &&
        !names.has(g.name.toLowerCase()),
    );
    groups.add(g.id);
    names.add(g.name.toLowerCase());
  }
  const expected = new Map();
  for (const k of keys)
    for (const l of k.locations) {
      const id = keyUseId(k, l);
      requireValue(!expected.has(id));
      expected.set(id, { keyId: k.id, locationName: l.name, grid: l.grid });
    }
  const byId = new Map();
  for (const u of value.uses) {
    exact(
      u,
      "id keyId locationName grid groupId requiredUses possibleUses status sources note" +
        (Object.hasOwn(u, "ownerReport") ? " ownerReport" : ""),
    );
    const e = expected.get(u.id);
    requireValue(
      text(u.id, 384) &&
        !byId.has(u.id) &&
        !!e &&
        u.keyId === e.keyId &&
        u.locationName === e.locationName &&
        u.grid === e.grid &&
        groups.has(u.groupId) &&
        text(u.note),
    );
    for (const field of ["requiredUses", "possibleUses"])
      requireValue(
        Array.isArray(u[field]) &&
          u[field].length <= 8 &&
          u[field].every((id) => typeof id === "string") &&
          new Set(u[field]).size === u[field].length,
      );
    requireValue(!u.requiredUses.some((id) => u.possibleUses.includes(id)));
    if (u.status === "unknown")
      requireValue(
        !u.requiredUses.length && !u.possibleUses.length && !u.sources.length,
      );
    else if (u.status === "community-reported")
      requireValue(u.requiredUses.length > 0 && !u.possibleUses.length);
    else if (u.status === "unconfirmed-identity")
      requireValue(!u.requiredUses.length && u.possibleUses.length > 0);
    else if (u.status === "player-reported") {
      requireValue(
        u.requiredUses.length > 0 &&
          !u.possibleUses.length &&
          Object.hasOwn(u, "ownerReport"),
      );
      exact(u.ownerReport, "date statement");
      requireValue(date(u.ownerReport.date) && text(u.ownerReport.statement));
    } else requireValue(false);
    if (u.status !== "player-reported")
      requireValue(!Object.hasOwn(u, "ownerReport"));
    sources(
      u.sources,
      u.status !== "unknown" && u.status !== "player-reported",
    );
    byId.set(u.id, u);
  }
  requireValue(byId.size === expected.size);
  for (const group of groups)
    requireValue(value.uses.some((u) => u.groupId === group));
  const done = new Set(),
    active = new Set();
  function visit(id) {
    requireValue(!active.has(id));
    if (done.has(id)) return;
    const u = byId.get(id);
    requireValue(!!u);
    active.add(id);
    for (const next of [...u.requiredUses, ...u.possibleUses]) {
      requireValue(byId.has(next) && byId.get(next).keyId !== u.keyId);
      visit(next);
    }
    active.delete(id);
    done.add(id);
  }
  for (const id of byId.keys()) visit(id);
  return value;
}
export function requiredKeyChain(use, uses) {
  const byId = new Map(uses.map((u) => [u.id, u])),
    result = [],
    seen = new Set();
  function visit(id) {
    if (seen.has(id)) return;
    seen.add(id);
    const u = byId.get(id);
    if (!u) throw Error("Missing key use");
    u.requiredUses.forEach(visit);
    result.push(u);
  }
  visit(use.id);
  return result;
}
export function requiredBy(useId, uses) {
  return uses.filter((u) => u.requiredUses.includes(useId));
}
export const supplementalKeys = validateSupplemental(supplement).keys;
export const allKeys = [...keyGuide.keys, ...supplementalKeys];
export const keyAccess = validateKeyAccess(access, allKeys);
