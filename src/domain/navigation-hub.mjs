import { features, featureURL } from "../ui/feature-registry.mjs";
const ids = new Set(features.map((f) => f.id));
export function navigationPreferences(raw) {
  if (typeof raw !== "string" || raw.length > 16384)
    return { pins: [], recent: [] };
  try {
    const v = JSON.parse(raw);
    if (
      !v ||
      v.version !== 1 ||
      !Array.isArray(v.pins) ||
      !Array.isArray(v.recent)
    )
      throw Error();
    const list = (a) =>
      [...new Set(a.filter((x) => typeof x === "string" && ids.has(x)))].slice(
        0,
        8,
      );
    return { pins: list(v.pins), recent: list(v.recent) };
  } catch {
    return { pins: [], recent: [] };
  }
}
export function searchEntries(index, query, type = "", offset = 0) {
  validateSearchIndex(index);
  const tokens = String(query)
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .slice(0, 200)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12);
  const matching = index.entries.filter(
    (r) =>
      (!type || r.type === type) &&
      tokens.every((t) =>
        (r.title + " " + r.summary).toLowerCase().normalize("NFKC").includes(t),
      ),
  );
  return {
    total: matching.length,
    rows: matching.slice(Math.max(0, offset), Math.max(0, offset) + 100),
  };
}
export const safeDestination = (v) =>
  typeof v === "string" &&
  v.length <= 600 &&
  !/[\u0000-\u0020\\]/.test(v) &&
  (features.some((f) => featureURL(f) === v) ||
    /^\/(?!\/)[a-zA-Z0-9%_/?=&.:#-]*$/.test(v) ||
    /^http:\/\/127\.0\.0\.1:5175\/\?key-grid=[A-J][1-9](?:&key-name=[a-zA-Z0-9%_.~-]*)?$/.test(
      v,
    ));
export function validateSearchIndex(v) {
  if (
    !v ||
    v.version !== 1 ||
    !Array.isArray(v.entries) ||
    v.entries.length > 10000 ||
    !Number.isSafeInteger(v.eligibleCount) ||
    v.eligibleCount < v.entries.length ||
    v.indexedCount !== v.entries.length ||
    v.limited !== v.eligibleCount > v.entries.length
  )
    throw Error("Invalid search coverage");
  const ids = new Set();
  for (const r of v.entries) {
    if (
      !r ||
      Object.keys(r).sort().join() !==
        "id,mapUrl,packId,planUrl,recordId,summary,title,type,url" ||
      ![
        "feature",
        "key",
        "weapon",
        "attachment",
        "item",
        "recipe",
        "upgrade",
        "mission",
        "progression",
        "guide",
        "location",
        "map",
      ].includes(r.type) ||
      !["id", "title", "summary", "packId", "recordId"].every(
        (k) => typeof r[k] === "string" && r[k].length <= 600,
      ) ||
      !r.id ||
      !r.title ||
      ids.has(r.id) ||
      !safeDestination(r.url) ||
      ![r.mapUrl, r.planUrl].every((x) => x === null || safeDestination(x))
    )
      throw Error("Invalid public search entry");
    ids.add(r.id);
  }
  return v;
}
export function boundSearchEntries(
  essential,
  other,
  { maxEntries = 10000, maxBytes = 2097152 } = {},
) {
  const entries = [],
    eligibleCount = essential.length + other.length;
  let bytes =
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        eligibleCount,
        indexedCount: maxEntries,
        limited: false,
        entries: [],
      }),
    ).length + 128;
  for (const [i, row] of [...essential, ...other].entries()) {
    const size = new TextEncoder().encode(JSON.stringify(row)).length + 1;
    if (entries.length >= maxEntries || bytes + size > maxBytes) {
      if (i < essential.length)
        throw Error("Essential search tools exceed index limit");
      continue;
    }
    entries.push(row);
    bytes += size;
  }
  return validateSearchIndex({
    version: 1,
    eligibleCount,
    indexedCount: entries.length,
    limited: entries.length < eligibleCount,
    entries,
  });
}
