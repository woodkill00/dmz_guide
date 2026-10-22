// Transient navigation establishes consistency, never authenticity.
const CONTEXT_KEY = "dmz-reader-context-v1";
const SEARCH_KEY = "dmz-reader-search-v1";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const unavailable = () =>
  new Error(
    "This private navigation context is unavailable or has changed. Return to the planner and open the item again; no published record was substituted.",
  );
export const matchesTokens = (text, query) =>
  String(query)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => String(text).toLowerCase().includes(token));
export async function packDigest(pack) {
  const bytes = new TextEncoder().encode(JSON.stringify(pack));
  return [
    ...new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
const id = (value) =>
  typeof value === "string" && value.length > 0 && value.length <= 256;
function validContext(entry, now) {
  return (
    entry &&
    typeof entry === "object" &&
    Object.keys(entry).sort().join() ===
      "contentVersion,destination,digest,expiresAt,needsOnly,packId,targetId" &&
    id(entry.packId) &&
    id(entry.contentVersion) &&
    id(entry.targetId) &&
    /^[a-f0-9]{64}$/.test(entry.digest) &&
    ["local", "maps"].includes(entry.destination) &&
    typeof entry.needsOnly === "boolean" &&
    Number.isFinite(entry.expiresAt) &&
    entry.expiresAt > now &&
    entry.expiresAt <= now + 30 * 60_000
  );
}
function readContexts(storage, now) {
  const raw = storage.getItem(CONTEXT_KEY);
  if (!raw) return {};
  if (raw.length > 32768) throw unavailable();
  const value = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length > 20
  )
    throw unavailable();
  const entries = {};
  for (const [token, entry] of Object.entries(value)) {
    if (!UUID.test(token)) throw unavailable();
    if (entry?.expiresAt <= now) continue;
    if (!validContext(entry, now)) throw unavailable();
    entries[token] = entry;
  }
  return entries;
}
export async function createReaderContext(
  pack,
  targetId,
  destination,
  { storage, now = Date.now(), needsOnly = true } = {},
) {
  try {
    storage ||= sessionStorage;
    const entry = {
      packId: pack.id,
      contentVersion: pack.contentVersion,
      digest: await packDigest(pack),
      targetId,
      destination,
      needsOnly,
      expiresAt: now + 30 * 60_000,
    };
    if (!validContext(entry, now)) throw unavailable();
    const entries = readContexts(storage, now);
    const ordered = Object.keys(entries).sort(
      (a, b) => entries[a].expiresAt - entries[b].expiresAt,
    );
    while (ordered.length >= 20) delete entries[ordered.shift()];
    const token = globalThis.crypto.randomUUID();
    entries[token] = entry;
    const raw = JSON.stringify(entries);
    if (raw.length > 32768) throw unavailable();
    storage.setItem(CONTEXT_KEY, raw);
    return `/${destination}/?context=${token}`;
  } catch {
    throw unavailable();
  }
}
export function readReaderContext(
  token,
  destination,
  { storage, now = Date.now() } = {},
) {
  try {
    storage ||= sessionStorage;
    if (!UUID.test(token)) throw unavailable();
    const entry = readContexts(storage, now)[token];
    if (!entry || entry.destination !== destination) throw unavailable();
    return entry;
  } catch {
    throw unavailable();
  }
}
export async function verifyReaderContext(
  pack,
  context,
  spoilers = false,
  { now = Date.now() } = {},
) {
  if (!validContext(context, now)) throw unavailable();
  const item = pack.items.find((record) => record.id === context.targetId);
  if (
    pack.id !== context.packId ||
    pack.contentVersion !== context.contentVersion ||
    (await packDigest(pack)) !== context.digest ||
    !item ||
    (item.spoiler && !spoilers)
  )
    throw unavailable();
  return item;
}
export function writeHomeSearch(
  query,
  { storage = sessionStorage, now = Date.now() } = {},
) {
  if (typeof query !== "string" || query.length > 200)
    throw new Error("Enter up to 200 characters in the catalog search.");
  const token = globalThis.crypto.randomUUID();
  storage.setItem(
    SEARCH_KEY,
    JSON.stringify({
      token,
      query,
      expiresAt: now + 120_000,
      destination: "catalog",
    }),
  );
  return `/catalog/?search=${token}`;
}
export function readHomeSearch(
  token,
  { storage = sessionStorage, now = Date.now() } = {},
) {
  const raw = storage.getItem(SEARCH_KEY);
  if (!UUID.test(token) || !raw || raw.length > 2048)
    throw new Error("Search transfer unavailable. Enter your search here.");
  const entry = JSON.parse(raw);
  if (
    Object.keys(entry).sort().join() !== "destination,expiresAt,query,token" ||
    entry.token !== token ||
    entry.destination !== "catalog" ||
    typeof entry.query !== "string" ||
    entry.query.length > 200 ||
    !Number.isFinite(entry.expiresAt) ||
    entry.expiresAt <= now ||
    entry.expiresAt > now + 120_000
  )
    throw new Error("Search transfer unavailable. Enter your search here.");
  storage.removeItem(SEARCH_KEY);
  return entry.query;
}
