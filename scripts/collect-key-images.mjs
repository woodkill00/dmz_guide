import { mkdir, writeFile, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { keyAssets as keyImages } from "../src/content/keys.mjs";
import { imageInfo } from "../src/content/portable.mjs";
import { assertSafePath } from "./catalog.mjs";
export async function fetchKeyImage(
  entry,
  { fetcher = fetch, maxBytes = 2 * 1024 * 1024 } = {},
) {
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 2 * 1024 * 1024)
    throw Error("Invalid screenshot byte budget");
  if (
    !Object.values(keyImages).some(
      (v) => v.url === entry.url && v.sha256 === entry.sha256,
    )
  )
    throw Error("Unregistered key image");
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetcher(entry.url, {
      redirect: "error",
      signal: controller.signal,
    });
    if (
      !response.ok ||
      response.headers.get("content-type")?.split(";")[0] !== "image/webp" ||
      !response.body
    )
      throw Error("Screenshot request failed or returned an unsupported type");
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > maxBytes)
        throw Error("Screenshot exceeds the remaining byte budget");
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks),
      info = imageInfo(bytes);
    if (
      info.mime !== entry.mime ||
      info.width !== entry.width ||
      info.height !== entry.height ||
      createHash("sha256").update(bytes).digest("hex") !== entry.sha256
    )
      throw Error(
        "Screenshot no longer matches the reviewed image; review the source before changing the register",
      );
    return bytes;
  } finally {
    controller.abort();
    clearTimeout(timer);
  }
}
export async function collectKeyImages(
  root,
  {
    fetcher = fetch,
    pause = () => new Promise((r) => setTimeout(r, 1000)),
  } = {},
) {
  await assertSafePath(root, ".local", { optional: true, directory: true });
  await mkdir(join(root, ".local"), { recursive: true });
  await assertSafePath(root, ".local/key-images", {
    optional: true,
    directory: true,
  });
  await mkdir(join(root, ".local/key-images"), { recursive: true });
  let total = 0,
    count = 0;
  for (const [id, entry] of Object.entries(keyImages)) {
    const remaining = 36 * 1024 * 1024 - total;
    if (remaining <= 0) throw Error("Screenshot run exceeds 36MiB");
    const bytes = await fetchKeyImage(entry, {
      fetcher,
      maxBytes: Math.min(2 * 1024 * 1024, remaining),
    });
    total += bytes.length;
    if (total > 36 * 1024 * 1024) throw Error("Screenshot run exceeds 36MiB");
    const relative = `.local/key-images/${id}.webp`,
      temp = `${relative}.${randomUUID()}.tmp`;
    const destination = await assertSafePath(root, relative, {
      optional: true,
    });
    await assertSafePath(root, temp, { optional: true });
    try {
      await writeFile(join(root, temp), bytes, { flag: "wx" });
      await assertSafePath(root, relative, { optional: true });
      await rename(join(root, temp), destination || join(root, relative));
    } finally {
      await unlink(join(root, temp)).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    count++;
    if (count < Object.keys(keyImages).length) await pause();
  }
  return { count, bytes: total };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(
      await collectKeyImages(
        resolve(fileURLToPath(new URL("..", import.meta.url))),
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
