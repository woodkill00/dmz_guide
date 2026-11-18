import { createHash } from "node:crypto";
import { readCatalogFile } from "./catalog.mjs";
import { imageInfo } from "../src/content/portable.mjs";
import { readWeaponCamos } from "../src/content/weapon-camos.mjs";
export const CAMO_IMAGE_BYTES = 512 * 1024;
export function validCamoImage(bytes, entry) {
  try {
    const info = imageInfo(bytes);
    return (
      bytes.length <= CAMO_IMAGE_BYTES &&
      info.mime === entry.mime &&
      info.width === entry.width &&
      info.height === entry.height &&
      createHash("sha256").update(bytes).digest("hex") === entry.sha256
    );
  } catch {
    return false;
  }
}
export async function createCamoImageReader({
  root,
  read = readCatalogFile,
  deadlineMs = 2000,
  catalog,
} = {}) {
  catalog ||= await readWeaponCamos();
  const registry = new Map(
    catalog.weapons.flatMap((w) =>
      w.rows.map((r) => [`${w.id}/${r.id}`, r.image]),
    ),
  );
  let active = 0;
  const queue = [];
  function drain() {
    while (active < 4 && queue.length) queue.shift()();
  }
  return async function image(raw) {
    const match =
      /^\/local-camo-images\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.webp$/.exec(
        raw,
      );
    const entry = match && registry.get(match[1] + "/" + match[2]);
    if (!entry) return { status: 404 };
    if (queue.length >= 64) return { status: 503 };
    return new Promise((resolve) => {
      let expired = false;
      const timer = setTimeout(() => {
        expired = true;
        resolve({ status: 503 });
      }, deadlineMs);
      queue.push(() => {
        if (expired) return;
        active++;
        void (async () => {
          try {
            const bytes = await read(
              root,
              `.local/camo-images/${match[1]}--${match[2]}.webp`,
              CAMO_IMAGE_BYTES,
            );
            if (!expired)
              resolve(
                validCamoImage(bytes, entry)
                  ? { status: 200, type: "image/webp", bytes }
                  : { status: 404 },
              );
          } catch {
            if (!expired) resolve({ status: 404 });
          } finally {
            clearTimeout(timer);
            active--;
            drain();
          }
        })();
      });
      drain();
    });
  };
}
