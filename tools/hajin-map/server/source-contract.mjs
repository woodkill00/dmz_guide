import { createHash } from "node:crypto";
export const canonicalDigest =
  "377393bf8bb36140ee97702e2ce3950acc7f62841f9bf66f9a9adc8a9f740acb";
export const sites = Object.freeze({
  official: {
    page: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
  },
  codmunity: {
    page: "https://codmunity.gg/dmz/map",
    image: "https://codmunity.gg/dmz/hajin-map-cod2-1120.webp",
    size: [1120, 1055],
  },
  wzstats: {
    page: "https://wzstats.gg/mw4/dmz/map",
    image: "https://wzstats.gg/assets/img/dmz/hajin-map.webp",
    size: [1080, 1080],
  },
  codcentral: {
    page: "https://codcentral.net/blog/mw4-dmz-map/",
    image:
      "https://codcentral.net/assets/library/mw4/dmz/map/hajin-map-2880.webp",
    size: [2880, 2700],
  },
  mapgenie: {
    page: "https://mapgenie.io/call-of-duty-modern-warfare-4/maps/hajin-dmz",
    publicData: "https://mapgenie.io/api/v1/maps/1084/data",
    size: [1024, 1024],
  },
});
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export function validAffine(matrix) {
  if (
    !Array.isArray(matrix) ||
    matrix.length !== 2 ||
    matrix.some(
      (row) =>
        !Array.isArray(row) || row.length !== 3 || !row.every(Number.isFinite),
    )
  )
    return false;
  const [[a, b], [c, d]] = matrix,
    det = a * d - b * c,
    norm = a * a + b * b + c * c + d * d;
  return Number.isFinite(det) && Math.abs(det) > 1e-8 * Math.max(1, norm);
}
const stable = (value) =>
  Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, stable(value[k])]),
        )
      : value;
const recordValue = (r) => ({
  ...r,
  notes: r.notes ?? "",
  floor: r.floor ?? null,
  x: Math.round(r.x * 1e9) / 1e9,
  y: Math.round(r.y * 1e9) / 1e9,
});
export const semantic = (capture, icons = {}) =>
  digest(
    JSON.stringify(
      stable({
        mapId: "hajin",
        coordinateVersion: "hajin-official-v1-4096",
        imageDigest: canonicalDigest,
        categories: capture.categories
          .map((c) => ({ ...c, icon: icons[c.id] ?? c.icon.split("/").at(-1) }))
          .sort((a, b) => a.id.localeCompare(b.id)),
        records: capture.records
          .map(recordValue)
          .sort((a, b) => a.id.localeCompare(b.id)),
      }),
    ),
  );
export function diffCaptures(old, next) {
  const before = new Map((old?.records ?? []).map((r) => [r.id, r])),
    after = new Map(next.records.map((r) => [r.id, r]));
  return {
    added: next.records.filter((r) => !before.has(r.id)).length,
    changed: next.records.filter(
      (r) =>
        before.has(r.id) &&
        JSON.stringify(stable(recordValue(before.get(r.id)))) !==
          JSON.stringify(stable(recordValue(r))),
    ).length,
    missing: [...before.keys()].filter((id) => !after.has(id)).length,
    categoriesChanged:
      JSON.stringify(
        old?.categories
          .map(({ icon, ...c }) => c)
          .sort((a, b) => a.id.localeCompare(b.id)),
      ) !==
      JSON.stringify(
        next.categories
          .map(({ icon, ...c }) => c)
          .sort((a, b) => a.id.localeCompare(b.id)),
      ),
  };
}
export function validateCapture(value, id) {
  if (
    !sites[id] ||
    value?.schemaVersion !== 1 ||
    value.sourcePage !== sites[id].page ||
    !Number.isFinite(Date.parse(value.capturedAt)) ||
    !Array.isArray(value.categories) ||
    value.categories.length < 1 ||
    value.categories.length > 100 ||
    !Array.isArray(value.records) ||
    value.records.length < 1 ||
    value.records.length > 5000
  )
    throw Error(
      "Source schema or record limits changed. Previous data retained.",
    );
  const cats = new Set(),
    ids = new Set();
  const text = (v, n) =>
    typeof v === "string" &&
    v.length > 0 &&
    v.length <= n &&
    !/[\u0000-\u0008]/.test(v);
  for (const c of value.categories) {
    if (
      !text(c.id, 80) ||
      !/^[\w.:-]+$/.test(c.id) ||
      cats.has(c.id) ||
      !text(c.name, 120) ||
      !text(c.group, 80) ||
      !text(c.icon, 260)
    )
      throw Error("Invalid source category.");
    cats.add(c.id);
  }
  for (const r of value.records) {
    if (
      !text(r.id, 100) ||
      !/^[\w.:-]+$/.test(r.id) ||
      ids.has(r.id) ||
      !text(r.name, 200) ||
      !cats.has(r.category) ||
      r.mapId !== "hajin" ||
      r.coordinateSpaceVersion !== "hajin-official-v1-4096" ||
      ![r.x, r.y].every(
        (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1,
      ) ||
      (r.notes !== undefined &&
        (typeof r.notes !== "string" || r.notes.length > 3500)) ||
      (r.floor != null &&
        !(
          (typeof r.floor === "number" && Number.isFinite(r.floor)) ||
          (typeof r.floor === "string" &&
            r.floor.length > 0 &&
            r.floor.length <= 100)
        ))
    )
      throw Error("Invalid or conflicting source record.");
    ids.add(r.id);
  }
  if (Buffer.byteLength(JSON.stringify(value)) > 2 * 1024 * 1024)
    throw Error("Normalized capture exceeds2MiB.");
  return value;
}
