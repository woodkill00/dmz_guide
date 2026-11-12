import registry from "../content/item-icons.json" with { type: "json" };
import { loadBundledPayloads } from "../content/bundled-assets.mjs";
import {
  bytesFromBase64,
  hashBytes,
  imageInfo,
  TRANSFER_LIMITS,
} from "../content/portable.mjs";
import { readRecord } from "../storage/store.mjs";
let suspended = false;
let resumePack = null;
let activePack = null,
  generation = 0,
  controller = new AbortController();
const urls = new Map();
export function releaseInventoryIcons({ revoke = true } = {}) {
  generation++;
  controller.abort();
  controller = new AbortController();
  if (revoke)
    for (const url of urls.values())
      setTimeout(() => URL.revokeObjectURL(url), 5000);
  urls.clear();
  activePack = null;
}
export async function hydrateInventoryIcons(
  pack,
  { root = document, retain = false, visibleOnly = false } = {},
) {
  if (suspended) return;
  if (activePack !== pack) {
    if (!retain) releaseInventoryIcons();
    activePack = pack;
  }
  controller.abort();
  controller = new AbortController();
  const signal = controller.signal,
    token = ++generation;
  const cells = [...root.querySelectorAll("[data-inventory-icon]")].filter(
    (cell) =>
      (!cell.dataset.iconPack || cell.dataset.iconPack === pack.id) &&
      (!visibleOnly || !cell.closest("[hidden]")),
  );
  let localFiles = new Set();
  if (cells.length) {
    try {
      const response = await fetch("/local-item-icons-available.json", {
        signal,
      });
      if (response.ok) {
        const files = await response.json();
        if (Array.isArray(files)) localFiles = new Set(files);
      }
    } catch {
      // Private local icons are optional; the visible placeholder remains.
    }
  }
  if (token !== generation || signal.aborted) return;
  const pending = new Map();
  for (const cell of cells) {
    const item = pack.items.find((i) => i.id === cell.dataset.inventoryIcon),
      attached =
        item?.assetId && pack.assets?.find((a) => a.id === item.assetId),
      registeredId = registry.items[pack.id]?.[item?.id],
      local = registeredId && registry.assets[registeredId],
      asset =
        attached ||
        (local &&
          localFiles.has(local.file) && {
            ...local,
            id: registeredId,
            localURL: "/local-item-icons/" + local.file,
          });
    if (asset) {
      const key = pack.id + ":" + asset.id + ":" + asset.sha256;
      if (!pending.has(key)) pending.set(key, { asset, item, cells: [] });
      pending.get(key).cells.push(cell);
    }
  }
  if (!pending.size) return;
  let saved;
  try {
    saved = await readRecord("content", pack.id);
  } catch {
    saved = null;
  }
  if (token !== generation) return;
  const jobs = [...pending.entries()];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, jobs.length) }, async () => {
      while (cursor < jobs.length && !signal.aborted) {
        const [key, job] = jobs[cursor++];
        try {
          let url = urls.get(key);
          if (!url) {
            let bytes;
            if (job.asset.localURL) {
              const response = await fetch(job.asset.localURL, { signal });
              if (
                !response.ok ||
                response.headers.get("content-type") !== job.asset.mime
              )
                throw Error("Local icon unavailable");
              const chunks = [];
              let size = 0;
              const reader = response.body.getReader();
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  size += value.length;
                  if (size > job.asset.bytes || size > 1024 * 1024) {
                    await reader.cancel();
                    throw Error("Icon byte limit exceeded");
                  }
                  chunks.push(value);
                }
              } finally {
                reader.releaseLock();
              }
              bytes = new Uint8Array(size);
              let offset = 0;
              for (const chunk of chunks) {
                bytes.set(chunk, offset);
                offset += chunk.length;
              }
            } else {
              let payload = saved?.value?.payloads?.find(
                (p) => p.assetId === job.asset.id,
              );
              if (!payload)
                payload = (
                  await loadBundledPayloads(pack, {
                    assetIds: [job.asset.id],
                    signal,
                  })
                )[0];
              if (!payload) throw Error("Icon bytes missing");
              bytes = bytesFromBase64(payload.base64);
            }
            const info = imageInfo(bytes),
              asset = job.asset;
            if (
              bytes.length !== asset.bytes ||
              info.mime !== asset.mime ||
              info.width !== asset.width ||
              info.height !== asset.height ||
              (await hashBytes(bytes)) !== asset.sha256
            )
              throw Error("Icon metadata mismatch");
            if (token !== generation) return;
            url = URL.createObjectURL(new Blob([bytes], { type: asset.mime }));
            urls.set(key, url);
          }
          for (const cell of job.cells) {
            const img = document.createElement("img");
            img.src = url;
            img.alt = job.item.name + " icon";
            img.title = job.asset.attribution || "Item image";
            img.width = 48;
            img.height = 48;
            img.decoding = "async";
            let timeout;
            try {
              await Promise.race([
                img.decode(),
                new Promise((_, reject) => {
                  timeout = setTimeout(
                    () => reject(Error("Icon decode timeout")),
                    TRANSFER_LIMITS.decodeMs,
                  );
                }),
              ]);
            } finally {
              clearTimeout(timeout);
            }
            if (token !== generation || !cell.isConnected) return;
            if (
              img.naturalWidth !== job.asset.width ||
              img.naturalHeight !== job.asset.height
            )
              throw Error("Icon dimensions mismatch");
            if (job.asset.sourcePage) {
              const link = document.createElement("a");
              link.href = job.asset.sourcePage;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              link.setAttribute(
                "aria-label",
                job.item.name + " icon source: " + job.asset.provider,
              );
              link.append(img);
              cell.replaceChildren(link);
            } else cell.replaceChildren(img);
            cell.dataset.iconStatus = "available";
          }
        } catch {
          for (const cell of job.cells)
            if (cell.isConnected && token === generation) {
              cell.dataset.iconStatus = "missing";
              cell.title =
                "Icon unavailable - attach or repair this item’s primary image.";
            }
        }
      }
    }),
  );
}
if (typeof document !== "undefined")
  document.addEventListener("pack-changing", releaseInventoryIcons);
if (typeof window !== "undefined") {
  const suspend = () => {
    if (!suspended) resumePack = activePack;
    suspended = true;
    releaseInventoryIcons({ revoke: false });
  };
  window.addEventListener("beforeunload", suspend);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("pageshow", (event) => {
    suspended = false;
    if (event.persisted && resumePack) void hydrateInventoryIcons(resumePack);
  });
  // A dismissed unsaved-work prompt has no pageshow event. The next deliberate
  // interaction resumes image loading in the retained document.
  const resumeAfterCanceledDeparture = () => {
    if (!suspended || document.visibilityState !== "visible") return;
    suspended = false;
    if (resumePack) void hydrateInventoryIcons(resumePack);
  };
  window.addEventListener("pointerdown", resumeAfterCanceledDeparture, true);
  window.addEventListener("keydown", resumeAfterCanceledDeparture, true);
}
