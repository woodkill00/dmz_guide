import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { assertSafePath, readCatalogFile } from "../../scripts/catalog.mjs";
import { parseBounded } from "./limits.mjs";
import { validateWeaponIntel } from "./weapon-intel.mjs";
import { emptyCodmunity, parseCodmunityJSON } from "../domain/codmunity.mjs";
import definitions from "../domain/codmunity-metrics.json" with { type: "json" };
export const COD_PATH = "content/codmunity-stats.json";
export const codRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const codBytes = (value) =>
  Buffer.from(JSON.stringify(value, null, 2) + "\n");
export const codHash = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
const decode = (bytes) =>
  new TextDecoder("utf-8", { fatal: true }).decode(bytes);
export async function codIntel(root = codRoot) {
  return validateWeaponIntel(
    parseBounded(
      decode(
        await readCatalogFile(
          root,
          "content/weapon-intel.json",
          8 * 1024 * 1024,
        ),
      ),
      8 * 1024 * 1024,
      { depth: 20, string: 500 },
    ),
  );
}
export async function readCodmunity(root = codRoot, db) {
  db ||= await codIntel(root);
  const exists = await assertSafePath(root, COD_PATH, { optional: true });
  const bytes = exists
    ? Buffer.from(await readCatalogFile(root, COD_PATH, 2 * 1024 * 1024))
    : codBytes(emptyCodmunity());
  return {
    value: parseCodmunityJSON(decode(bytes), db, definitions),
    bytes,
    revision: codHash(bytes),
    exists: !!exists,
  };
}
