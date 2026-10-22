import { ID, assert, parseBounded } from "./limits.mjs";
import { validatePack } from "./validate.mjs";

const publishedPath = /^\/assets\/content\/packs\/[a-z0-9-]+\.json$/;
/** Metadata is deliberately distinct from full validated catalog payloads. */
export function parseCatalogManifest(text) {
  const manifest = parseBounded(text, 65536);
  assert(
    Array.isArray(manifest?.packs) && Array.isArray(manifest?.catalogs),
    "Catalog index unavailable. Rebuild this local guide and retry.",
  );
  const { packs, catalogs } = manifest;
  assert(
    packs.length > 0 && packs.length <= 32 && catalogs.length === packs.length,
    "Invalid catalog index size",
  );
  const ids = new Set(),
    paths = new Set();
  for (const entry of catalogs) {
    assert(
      entry && typeof entry === "object" && !Array.isArray(entry),
      "Invalid catalog descriptor",
    );
    assert(
      typeof entry.id === "string" &&
        entry.id.length <= 200 &&
        ID.test(entry.id) &&
        !ids.has(entry.id),
      "Invalid or duplicate catalog identity",
    );
    assert(
      typeof entry.title === "string" &&
        entry.title.trim().length > 0 &&
        entry.title.length <= 200,
      "Invalid catalog title",
    );
    assert(
      typeof entry.path === "string" &&
        entry.path.length <= 256 &&
        publishedPath.test(entry.path) &&
        !paths.has(entry.path),
      "Invalid or duplicate catalog path",
    );
    ids.add(entry.id);
    paths.add(entry.path);
  }
  assert(
    new Set(packs).size === packs.length &&
      packs.every((path) => paths.has(path)),
    "Catalog index and payload inventory differ",
  );
  return {
    ...manifest,
    catalogs: catalogs.map((entry) =>
      Object.freeze({ id: entry.id, title: entry.title, path: entry.path }),
    ),
  };
}

export function createCatalogLoader({ manifest, schema, fetcher = fetch }) {
  // Validate even callers supplying an already-parsed object.
  const { catalogs } = parseCatalogManifest(JSON.stringify(manifest));
  const descriptors = new Map(catalogs.map((entry) => [entry.id, entry]));
  const cache = new Map();
  return {
    catalogs,
    has: (id) => descriptors.has(id),
    async getPublished(id) {
      const descriptor = descriptors.get(id);
      assert(
        descriptor,
        "Selected catalog unavailable. Choose a known catalog; no different catalog was substituted.",
      );
      if (cache.has(id)) return cache.get(id);
      const response = await fetcher(descriptor.path);
      assert(
        response.ok,
        "Selected catalog unavailable. Start the local server and retry; no different catalog was substituted.",
      );
      const pack = parseBounded(await response.text());
      validatePack(pack, schema, { profile: "published" });
      assert(
        pack.id === descriptor.id,
        "Selected catalog identity mismatch; no different catalog was substituted.",
      );
      cache.set(id, pack);
      return pack;
    },
  };
}
