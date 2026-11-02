import data from "../ui/key-room-details.json" with { type: "json" };
import { allKeys, KEY_ACCESS_SOURCES } from "./key-access.mjs";
const assert = (v) => {
  if (!v) throw Error("Invalid key room/source details");
};
const exact = (v, f) =>
  assert(
    v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      Object.keys(v).sort().join() === f.split(" ").sort().join(),
  );
const text = (v, max = 400) =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const date = (v) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v + "T00:00:00Z")) &&
  new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
function sources(rows) {
  assert(Array.isArray(rows) && rows.length > 0 && rows.length <= 4);
  const seen = new Set();
  for (const s of rows) {
    exact(s, "url label date");
    assert(
      KEY_ACCESS_SOURCES.includes(s.url) &&
        !seen.has(s.url) &&
        text(s.label, 160) &&
        date(s.date),
    );
    seen.add(s.url);
  }
}
export function validateKeyRoomDetails(v, keys = allKeys) {
  exact(v, "version checkedAt records comparisons");
  assert(
    v.version === 1 &&
      date(v.checkedAt) &&
      Buffer.byteLength(JSON.stringify(v)) <= 262144 &&
      v.records &&
      typeof v.records === "object" &&
      !Array.isArray(v.records),
  );
  const ids = new Set(keys.map((k) => k.id));
  assert(Object.keys(v.records).length === ids.size && ids.size <= 128);
  for (const [id, r] of Object.entries(v.records)) {
    assert(ids.has(id));
    exact(r, "entrance floor loot notes sources accessRequirements lockState");
    assert(["unknown", "unlocked-reported"].includes(r.lockState));
    assert(
      Array.isArray(r.accessRequirements) &&
        r.accessRequirements.length <= 8 &&
        r.accessRequirements.every((s) => text(s)),
    );
    assert(
      (r.entrance === null || text(r.entrance)) &&
        (r.floor === null || text(r.floor)),
    );
    for (const field of ["loot", "notes"])
      assert(
        Array.isArray(r[field]) &&
          r[field].length <= 12 &&
          r[field].every((s) => text(s)),
      );
    sources(r.sources);
  }
  assert(Array.isArray(v.comparisons) && v.comparisons.length <= 256);
  const seen = new Set();
  for (const c of v.comparisons) {
    exact(
      c,
      "sourceName sourceURL sourceDate keyName keyId grid place status note",
    );
    assert(
      text(c.sourceName, 120) &&
        KEY_ACCESS_SOURCES.includes(c.sourceURL) &&
        date(c.sourceDate) &&
        text(c.keyName, 120) &&
        text(c.grid, 80) &&
        text(c.place) &&
        text(c.note) &&
        [
          "name-match",
          "grid-conflict",
          "new-record",
          "unresolved-identity",
        ].includes(c.status),
    );
    assert(
      c.status === "unresolved-identity" ? c.keyId === null : ids.has(c.keyId),
    );
    const id = c.sourceURL + "|" + c.keyName.toLowerCase();
    assert(!seen.has(id));
    seen.add(id);
  }
  return v;
}
export const keyRoomDetails = validateKeyRoomDetails(data);
