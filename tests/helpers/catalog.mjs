import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readCatalog, bundledSources } from "../../scripts/catalog.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const schema = JSON.parse(
  await readFile(new URL("../../schemas/pack.schema.json", import.meta.url)),
);
export const fixtureCatalog = await readCatalog({ root, schema });
export const fixtureAssetSources = bundledSources(fixtureCatalog.entries);
export function loadFixturePack(key) {
  const entry = fixtureCatalog.entries.find((entry) => entry.key === key);
  if (!entry) throw new Error(`Unknown canonical fixture ${key}`);
  return structuredClone(entry.pack);
}
