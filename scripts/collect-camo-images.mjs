// Explicit authorized local collection; never invoked by build/start/test.
import { mkdir, open, rename, unlink } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { assertSafePath, readCatalogFile } from "./catalog.mjs";
import { readWeaponCamos } from "../src/content/weapon-camos.mjs";
import { CAMO_IMAGE_BYTES, validCamoImage } from "./camo-images.mjs";
export async function collectCamoImages({
  root,
  catalog,
  fetcher = fetch,
} = {}) {
  for (const path of [".local", ".local/camo-images"]) {
    if (
      !(await assertSafePath(root, path, { optional: true, directory: true }))
    )
      await mkdir(join(root, path));
    await assertSafePath(root, path, { directory: true });
  }
  const queue = catalog.weapons.flatMap((w) =>
    w.rows.map((r) => ({ weapon: w.id, row: r })),
  );
  let total = 0,
    reused = 0,
    downloaded = 0;
  if (queue.length > 1200) throw Error("Camo image count limit");
  let failure;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length && !failure) {
        const { weapon, row } = queue.shift(),
          entry = row.image,
          path = `.local/camo-images/${weapon}--${row.id}.webp`;
        let temp;
        const controller = new AbortController(),
          timer = setTimeout(() => controller.abort(), 20000);
        try {
          if (
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(weapon) ||
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id) ||
            entry.sourceURL !==
              `https://codcentral.net/assets/library/mw4/dmz/camos/${weapon}/swatch-${row.id}.webp`
          )
            throw Error("Unapproved camo source");
          let existing;
          try {
            existing = await readCatalogFile(root, path, CAMO_IMAGE_BYTES);
          } catch {}
          if (existing && validCamoImage(existing, entry)) {
            reused++;
            continue;
          }
          await assertSafePath(root, path, { optional: true });
          const response = await fetcher(entry.sourceURL, {
            redirect: "error",
            signal: controller.signal,
          });
          if (
            !response.ok ||
            response.redirected ||
            response.headers.get("content-type")?.split(";")[0].trim() !==
              "image/webp"
          )
            throw Error("Camo image response rejected");
          const chunks = [];
          let length = 0;
          for await (const chunk of response.body) {
            length += chunk.length;
            total += chunk.length;
            if (length > CAMO_IMAGE_BYTES || total > 128 * 1024 * 1024) {
              controller.abort();
              throw Error("Camo artwork byte limit");
            }
            chunks.push(chunk);
          }
          const bytes = Buffer.concat(chunks);
          if (!validCamoImage(bytes, entry))
            throw Error(
              "Camo artwork changed; review source registry before replacing",
            );
          temp = `.local/camo-images/temp-${randomBytes(12).toString("hex")}`;
          await assertSafePath(root, temp, { optional: true });
          const target = join(root, temp),
            handle = await open(target, "wx", 0o600);
          try {
            await handle.writeFile(bytes);
            await handle.sync();
          } finally {
            await handle.close();
          }
          await assertSafePath(root, path, { optional: true });
          await rename(target, join(root, path));
          temp = null;
          downloaded++;
        } catch (error) {
          failure ||= error;
        } finally {
          clearTimeout(timer);
          if (temp) await unlink(join(root, temp)).catch(() => {});
        }
      }
    }),
  );
  if (failure) throw failure;
  return {
    localOnly: true,
    assets: reused + downloaded,
    reused,
    downloaded,
    downloadedBytes: total,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  console.log(
    JSON.stringify(
      await collectCamoImages({ root, catalog: await readWeaponCamos() }),
    ),
  );
}
