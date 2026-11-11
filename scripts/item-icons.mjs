import registry from "../src/content/item-icons.json" with { type: "json" };
import { readCatalogFile } from "./catalog.mjs";
import { createHash } from "node:crypto";
import { imageInfo } from "../src/content/portable.mjs";
export function validateItemIconBytes(entry, bytes) {
  const info = imageInfo(new Uint8Array(bytes));
  if (
    bytes.length !== entry.bytes ||
    info.mime !== entry.mime ||
    info.width !== entry.width ||
    info.height !== entry.height ||
    createHash("sha256").update(bytes).digest("hex") !== entry.sha256
  )
    throw Error("Item icon no longer matches reviewed register");
  return bytes;
}
export function createItemIconReader({ root, read = readCatalogFile } = {}) {
  let active = 0;
  return async (raw) => {
    const match =
      /^\/local-item-icons\/([a-z0-9]+(?:-[a-z0-9]+)*)\.(png|webp|jpg)$/.exec(
        raw,
      );
    const entry = match && registry.assets[match[1]];
    if (!entry || entry.file !== match[1] + "." + match[2])
      return { status: 404 };
    if (active >= 8) return { status: 503 };
    active++;
    try {
      const bytes = validateItemIconBytes(
        entry,
        await read(root, ".local/item-icons/" + entry.file, 1024 * 1024),
      );
      return { status: 200, type: entry.mime, bytes, available: true };
    } catch {
      return { status: 404, available: false };
    } finally {
      active--;
    }
  };
}
