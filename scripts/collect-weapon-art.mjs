// Explicit local collection only. No provider request runs during build or startup.
import figures from "../src/ui/weapon-figures.json" with { type: "json" };
import { mkdir, open, rename, unlink } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";
import { assertSafePath } from "./catalog.mjs";
import { imageInfo } from "../src/content/portable.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const path of [".local", ".local/weapon-art"]) {
  if (!(await assertSafePath(root, path, { optional: true, directory: true })))
    await mkdir(join(root, path));
  await assertSafePath(root, path, { directory: true });
}
let total = 0;
const queue = Object.entries(figures).filter(([, figure]) => figure);
const receipts = [];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const [id, figure] = queue.shift();
      if (
        !/^https:\/\/imgs\.callofduty\.com\/content\/dam\/atvi\/callofduty\/cod-touchui\/blog\/body\/mw4\/rfl-ops-and-weapons\/MW4-RFL-OPS-WEAPONS-\d{3}\.webp$/.test(
          figure.sourceURL,
        )
      )
        throw new Error("Unapproved source");
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 20000);
      let temp;
      try {
        const response = await fetch(figure.sourceURL, {
          redirect: "error",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Official artwork request failed");
        const chunks = [];
        let length = 0;
        for await (const chunk of response.body) {
          length += chunk.length;
          total += chunk.length;
          if (length > 2 * 1024 * 1024 || total > 64 * 1024 * 1024) {
            controller.abort();
            throw new Error("Artwork collection limit exceeded");
          }
          chunks.push(chunk);
        }
        const bytes = Buffer.concat(chunks),
          info = imageInfo(new Uint8Array(bytes));
        if (
          info.mime !== "image/webp" ||
          info.width !== figure.width ||
          info.height !== figure.height ||
          createHash("sha256").update(bytes).digest("hex") !== figure.sha256
        )
          throw new Error(
            "Official figure changed; review registry before replacing it",
          );
        const path = `.local/weapon-art/${id}.webp`;
        await assertSafePath(root, path, { optional: true });
        temp = join(
          root,
          `.local/weapon-art/temp-${randomBytes(8).toString("hex")}`,
        );
        const handle = await open(temp, "wx", 0o600);
        try {
          await handle.writeFile(bytes);
          await handle.sync();
        } finally {
          await handle.close();
        }
        await assertSafePath(root, path, { optional: true });
        await rename(temp, join(root, path));
        temp = null;
        receipts.push({
          id,
          sourceURL: figure.sourceURL,
          sha256: figure.sha256,
          bytes: length,
        });
      } finally {
        clearTimeout(timer);
        if (temp) await unlink(temp).catch(() => {});
      }
    }
  }),
);
// The tracked register is provenance; this stdout receipt may be saved locally.
console.log(
  JSON.stringify(
    {
      localOnly: true,
      date: new Date().toISOString(),
      figures: receipts.length,
      bytes: total,
      assets: receipts,
    },
    null,
    2,
  ),
);
