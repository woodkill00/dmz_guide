// Explicit collection of reviewed icon URLs only; never runs during build/startup.
import registry from "../src/content/item-icons.json" with { type: "json" };
import { mkdir, writeFile, rename, unlink } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { assertSafePath } from "./catalog.mjs";
import { validateItemIconBytes } from "./item-icons.mjs";
export async function fetchItemIcon(entry, { fetcher = fetch } = {}) {
  if (
    !Object.values(registry.assets).some(
      (e) => JSON.stringify(e) === JSON.stringify(entry),
    )
  )
    throw Error("Unregistered item icon");
  const url = new URL(entry.sourceURL);
  if (
    url.protocol !== "https:" ||
    ![
      "codcentral.net",
      "www.dmztracker.gg",
      "tools.tcno.co",
      "dmzcodex.com",
      "img.wzstats.gg",
    ].includes(url.hostname)
  )
    throw Error("Unapproved icon host");
  const response = await fetcher(entry.sourceURL, {
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (
    !response.ok ||
    !response.body ||
    response.headers.get("content-type")?.split(";")[0] !== entry.mime
  )
    throw Error("Item icon request failed or unsupported image type");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 1024 * 1024 || size > entry.bytes)
      throw Error("Item icon byte limit exceeded");
    chunks.push(chunk);
  }
  return validateItemIconBytes(entry, Buffer.concat(chunks));
}
export async function collectItemIcons(root, { fetcher = fetch } = {}) {
  for (const path of [".local", ".local/item-icons"]) {
    await assertSafePath(root, path, { optional: true, directory: true });
    await mkdir(join(root, path), { recursive: true });
  }
  let total = 0,
    count = 0;
  const queue = Object.values(registry.assets);
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const entry = queue.shift(),
          bytes = await fetchItemIcon(entry, { fetcher });
        total += bytes.length;
        if (total > 40 * 1024 * 1024)
          throw Error("Icon run exceeds byte budget");
        const path = ".local/item-icons/" + entry.file,
          temp = path + "." + randomUUID() + ".tmp";
        await assertSafePath(root, path, { optional: true });
        await assertSafePath(root, temp, { optional: true });
        try {
          await writeFile(join(root, temp), bytes, { flag: "wx" });
          await assertSafePath(root, path, { optional: true });
          await rename(join(root, temp), join(root, path));
        } finally {
          await unlink(join(root, temp)).catch((e) => {
            if (e.code !== "ENOENT") throw e;
          });
        }
        count++;
        await new Promise((r) => setTimeout(r, 250));
      }
    }),
  );
  return { count, bytes: total };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    await collectItemIcons(
      resolve(dirname(fileURLToPath(import.meta.url)), ".."),
    ),
  );
