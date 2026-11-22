import metadata from "../ui/key-reference.json" with { type: "json" };
import roster from "../ui/key-map-roster.json" with { type: "json" };
import links from "../domain/key-item-links.json" with { type: "json" };
import { allKeys } from "./key-access.mjs";
const requireValue = (ok) => {
  if (!ok) throw Error("Invalid key map/reference identity");
};
const exact = (v, fields) =>
  requireValue(
    v &&
      !Array.isArray(v) &&
      typeof v === "object" &&
      Object.keys(v).sort().join() === fields.split(" ").sort().join(),
  );
const text = (v, max) =>
  typeof v === "string" &&
  v.length > 0 &&
  v.length <= max &&
  !/[<>\u0000-\u001f]/.test(v);
const keyId = (v) => text(v, 100) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
const allowed = {
  "hajin:codcentral": "https://codcentral.net/blog/mw4-dmz-map/",
  "x01:dmzhub": "https://dmzhub.gg/maps/x01-black-site",
};
export function validateKeyReferences(value, capture = roster, keys = allKeys) {
  exact(value, "version checkedAt records");
  exact(capture, "version sources");
  requireValue(
    value.version === 1 &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.checkedAt) &&
      new Date(value.checkedAt + "T00:00:00Z").toISOString().slice(0, 10) ===
        value.checkedAt &&
      Array.isArray(value.records) &&
      value.records.length === keys.length &&
      value.records.length <= 128 &&
      Buffer.byteLength(JSON.stringify(value)) <= 262144,
  );
  requireValue(
    capture.version === 1 &&
      Array.isArray(capture.sources) &&
      capture.sources.length <= 8 &&
      Buffer.byteLength(JSON.stringify(capture)) <= 262144,
  );
  const sources = new Set(),
    markers = new Map();
  for (const s of capture.sources) {
    exact(s, "mapId provider url capturedAt sha256 markers");
    const identity = s.mapId + ":" + s.provider;
    requireValue(
      Object.hasOwn(allowed, identity) &&
        allowed[identity] === s.url &&
        !sources.has(identity) &&
        typeof s.capturedAt === "string" &&
        new Date(s.capturedAt).toISOString() === s.capturedAt &&
        /^[a-f0-9]{64}$/.test(s.sha256) &&
        Array.isArray(s.markers) &&
        s.markers.length <= 1024,
    );
    sources.add(identity);
    for (const m of s.markers) {
      exact(m, "id name floor");
      const id = identity + ":" + m.id;
      requireValue(
        text(m.id, 120) &&
          text(m.name, 160) &&
          !markers.has(id) &&
          (s.mapId === "x01" ? [1, 2].includes(m.floor) : m.floor === null),
      );
      markers.set(id, m);
    }
  }
  const ids = new Set(),
    items = new Set(),
    owners = new Set();
  for (const r of value.records) {
    exact(r, "keyId itemId mapId markers notes");
    requireValue(
      keyId(r.keyId) &&
        keys.some((k) => k.id === r.keyId) &&
        !ids.has(r.keyId) &&
        typeof r.itemId === "string" &&
        r.itemId.length <= 100 &&
        /^[a-z][a-z0-9_-]*:[a-z0-9_-]{1,94}$/.test(r.itemId) &&
        !items.has(r.itemId) &&
        ["hajin", "x01"].includes(r.mapId) &&
        r.keyId.startsWith("x01-") === (r.mapId === "x01") &&
        Array.isArray(r.markers) &&
        r.markers.length <= 20 &&
        Array.isArray(r.notes) &&
        r.notes.length <= 8 &&
        r.notes.every((n) => text(n, 400)),
    );
    ids.add(r.keyId);
    items.add(r.itemId);
    const seen = new Set();
    for (const m of r.markers) {
      exact(m, "provider id floor");
      const id = r.mapId + ":" + m.provider + ":" + m.id,
        target = markers.get(id);
      requireValue(!!target && !seen.has(id) && target.floor === m.floor);
      seen.add(id);
      if (r.mapId === "x01") {
        requireValue(!owners.has(id));
        owners.add(id);
      }
    }
  }
  for (const id of markers.keys())
    if (id.startsWith("x01:")) requireValue(owners.has(id));
  return value;
}
export const keyReferences = validateKeyReferences(metadata);
const expected = Object.fromEntries(
  keyReferences.records.map((r) => [
    r.itemId,
    { keyId: r.keyId, mapId: r.mapId },
  ]),
);
requireValue(
  Object.keys(expected).length === Object.keys(links).length &&
    Object.entries(expected).every(
      ([id, r]) =>
        Object.hasOwn(links, id) &&
        Object.keys(links[id]).sort().join() === "keyId,mapId" &&
        links[id].keyId === r.keyId &&
        links[id].mapId === r.mapId,
    ),
);
export const keyReference = (id) =>
  keyReferences.records.find((r) => r.keyId === id);
export const keyRegion = (id) => keyReference(id)?.mapId || "hajin";
export const keyMapRoster = roster;
export function validateKeyInventory(pack) {
  const byId = new Map(pack.items.map((i) => [i.id, i]));
  for (const r of keyReferences.records) {
    const item = byId.get(r.itemId),
      key = allKeys.find((k) => k.id === r.keyId);
    requireValue(
      !!item &&
        pack.items.filter((i) => i.id === r.itemId).length === 1 &&
        [item.name, ...item.aliases].some((name) =>
          [key.name, ...key.aliases].includes(name),
        ),
    );
  }
  return true;
}
