import figures from "../src/ui/key-images.json" with { type: "json" };
import { readCatalogFile } from "./catalog.mjs";
import { imageInfo } from "../src/content/portable.mjs";
import { createHash } from "node:crypto";

const unavailable = new TextEncoder().encode(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#141a1d"/><path d="M850 320h220m-110-110v220" stroke="#84907e" stroke-width="3"/><text x="960" y="480" text-anchor="middle" fill="#ced4ca" font-family="sans-serif" font-size="38">Screenshot unavailable locally</text></svg>`,
);

export function createKeyImageReader({
  root,
  read = readCatalogFile,
  deadlineMs = 2000,
} = {}) {
  let active = 0;
  const queue = [];
  function drain() {
    while (active < 4 && queue.length) queue.shift()();
  }
  return async function keyImage(raw) {
    const match = /^\/local-key-images\/([a-z0-9]+(?:-[a-z0-9]+)*)\.webp$/.exec(
      raw,
    );
    if (!match || !Object.hasOwn(figures, match[1])) return { status: 404 };
    const id = match[1],
      entry = figures[id];
    const fallback = {
      status: 200,
      type: "image/svg+xml",
      bytes: unavailable,
      available: false,
    };
    if (!entry) return fallback;
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
              `.local/key-images/${id}.webp`,
              2 * 1024 * 1024,
            );
            const info = imageInfo(bytes);
            const valid =
              info.mime === "image/webp" &&
              info.width === entry.width &&
              info.height === entry.height &&
              createHash("sha256").update(bytes).digest("hex") === entry.sha256;
            if (!expired)
              resolve(
                valid
                  ? { status: 200, type: "image/webp", bytes, available: true }
                  : fallback,
              );
          } catch {
            if (!expired) resolve(fallback);
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
