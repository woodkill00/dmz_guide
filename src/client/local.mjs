import { adviceMarkup } from "./upgrade-advice-view.mjs";
import { saveWatchPin } from "./watch-pin.mjs";
import { createReaderContext } from "../domain/reader-flow.mjs";
import {
  matchesTokens,
  readReaderContext,
  verifyReaderContext,
} from "../domain/reader-flow.mjs";
import { imageDescription } from "../content/image-description.mjs";
import { loadBundledPayloads } from "../content/bundled-assets.mjs";
import { init, state, $, esc, error } from "./common.mjs";
import { readRecord } from "../storage/store.mjs";
import {
  allRecords,
  renderDetail,
  recordUrl,
  recordSearchText,
  displayRecord,
  publicTitle,
} from "../ui/render.mjs";
import {
  bytesFromBase64,
  hashBytes,
  imageInfo,
  TRANSFER_LIMITS,
} from "../content/portable.mjs";
let navigationContext = null;
let imageURLs = [],
  generation = 0,
  pendingDecode = null;
let assetController = new AbortController();
function releaseImage() {
  assetController.abort();
  assetController = new AbortController();
  pendingDecode?.cancel();
  for (const url of imageURLs) URL.revokeObjectURL(url);
  imageURLs = [];
}
function decodeImage(image) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (reason) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (pendingDecode === job) pendingDecode = null;
      if (reason) {
        image.removeAttribute("src");
        reject(reason);
      } else resolve();
    };
    const job = { cancel: () => finish(new Error("Picture load cancelled")) };
    pendingDecode = job;
    const timer = setTimeout(
      () =>
        finish(new Error("Picture decode timed out; details remain readable.")),
      TRANSFER_LIMITS.decodeMs,
    );
    image.decode().then(
      () => finish(),
      (reason) => finish(reason),
    );
  });
}
async function render() {
  const token = ++generation;
  releaseImage();
  $("#local-records").replaceChildren();
  if (navigationContext)
    await verifyReaderContext(
      state.pack,
      navigationContext,
      Boolean(state.profile.spoilers),
    );
  if (token !== generation) return;
  const records = allRecords([state.pack]).map(displayRecord);
  const id =
    navigationContext?.targetId ||
    new URL(location.href).searchParams.get("id");
  const chosen = records.find((r) => r.id === id);
  const link = (r) =>
    `/local/?pack=${encodeURIComponent(state.pack.id)}&id=${encodeURIComponent(r.id)}`;
  let markup = `<p><a href="/editor/?pack=${encodeURIComponent(state.pack.id)}">Edit this private pack</a> · <a href="/local/?pack=${encodeURIComponent(state.pack.id)}">All local records</a></p>`;
  if (chosen) {
    markup +=
      `<p class="notice">PRIVATE PACK PREVIEW · ${esc(state.pack.contentVersion)}. This is not the published snapshot.</p><div id="private-picture"></div>` +
      renderDetail(chosen, [state.pack])
        .replaceAll("<h1>", "<h2>")
        .replaceAll("</h1>", "</h2>");
  } else
    markup += `<label>Search private visible records<input id="local-query" type="search"></label><div class="card-grid">${records.map((r) => `<article class="panel" data-local-search="${esc(recordSearchText(r))}"><p>${esc(r.recordType)} · ${esc(r.status)}</p><h2><a href="${link(r)}">${r.spoiler ? "Spoiler-protected record" : esc(r.name || r.title)}</a></h2><p>${r.spoiler ? "Reveal only after choosing this record." : esc(r.description || r.category || "")}</p></article>`).join("")}</div>`;
  if (
    chosen?.recordType === "item" &&
    (!chosen.spoiler || state.profile.spoilers)
  )
    markup += `<section id="item-upgrade-advice" class="panel"><h2>Your known unfinished upgrade uses</h2>${adviceMarkup(state.pack, state.profile, { itemId: chosen.id })}<button type="button" data-item-pin="${esc(chosen.id)}" aria-pressed="${(state.profile.watchPins || []).includes(chosen.id)}">${(state.profile.watchPins || []).includes(chosen.id) ? "Remove your watch pin" : "Add your watch pin"}</button></section>`;
  $("#local-records").innerHTML = markup;
  $("#item-upgrade-advice")?.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button || state.saving) return;
    try {
      const id = button.dataset.itemPin || button.dataset.watchPin;
      if (id) {
        if (
          await saveWatchPin(id, !(state.profile.watchPins || []).includes(id))
        )
          await render();
      } else if (button.dataset.adviceLocation) {
        location.assign(
          await createReaderContext(
            state.pack,
            button.dataset.adviceLocation,
            "maps",
            { needsOnly: false },
          ),
        );
      }
    } catch (reason) {
      error(reason);
    }
  });
  // Private relationships always stay in this exact selected pack, never a public fork.
  for (const a of $("#local-records").querySelectorAll("a[href]")) {
    const url = new URL(a.href, location.href);
    const target = records.find((r) => recordUrl(r) === url.pathname);
    if (target) a.href = link(target);
  }
  $("#local-query")?.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    for (const card of document.querySelectorAll("[data-local-search]"))
      card.hidden = !matchesTokens(card.dataset.localSearch, q);
  });
  const pictureIds = [
    ...new Set([chosen?.assetId, ...(chosen?.assetIds || [])].filter(Boolean)),
  ];
  if (pictureIds.length) {
    try {
      const saved = await readRecord("content", state.pack.id).catch(
        () => null,
      );
      if (token !== generation) return;
      for (const assetId of pictureIds) {
        const asset = state.pack.assets.find((a) => a.id === assetId);
        let payload = saved?.value?.payloads?.find(
          (p) => p.assetId === assetId,
        );
        if (!payload)
          payload = (
            await loadBundledPayloads(state.pack, {
              assetIds: [assetId],
              signal: assetController.signal,
            })
          )[0];
        if (token !== generation) return;
        if (!payload || !asset)
          throw new Error(
            "Picture bytes unavailable; record details remain readable.",
          );
        const bytes = bytesFromBase64(payload.base64),
          info = imageInfo(bytes);
        if (
          bytes.length !== asset.bytes ||
          info.mime !== asset.mime ||
          info.width !== asset.width ||
          info.height !== asset.height ||
          (await hashBytes(bytes)) !== asset.sha256
        )
          throw new Error("Picture metadata mismatch");
        if (token !== generation) return;
        const imageURL = URL.createObjectURL(
          new Blob([bytes], { type: asset.mime }),
        );
        imageURLs.push(imageURL);
        const image = document.createElement("img");
        image.src = imageURL;
        image.alt = imageDescription(chosen, assetId, publicTitle(chosen));
        image.width = asset.width;
        image.height = asset.height;
        image.className = "local-raster";
        await decodeImage(image);
        if (token !== generation) return;
        if (
          image.naturalWidth !== asset.width ||
          image.naturalHeight !== asset.height
        )
          throw new Error("Decoded picture dimensions mismatch");
        image.addEventListener("error", () => {
          if (token === generation) {
            releaseImage();
            $("#private-picture").textContent =
              "Picture unavailable; record details remain readable.";
          }
        });
        if (chosen.spoiler) {
          const details = document.createElement("details");
          const summary = document.createElement("summary");
          summary.textContent = "Reveal spoiler picture";
          details.append(summary, image);
          $("#private-picture").append(details);
        } else $("#private-picture").append(image);
      }
    } catch (reason) {
      if (token === generation) {
        releaseImage();
        $("#private-picture").textContent =
          "Picture unavailable: " + reason.message;
      }
    }
  }
}
document.addEventListener("pack-changing", () => {
  $("#local-records").replaceChildren();
  generation++;
  releaseImage();
});
window.addEventListener("pagehide", () => {
  generation++;
  releaseImage();
});
async function start() {
  const token = new URL(location.href).searchParams.get("context");
  if (token !== null) navigationContext = readReaderContext(token, "local");
  await init(render, {
    requestedPack: navigationContext?.packId,
    opaqueContext: token !== null,
  });
}
start().catch((reason) => {
  $("#local-records").innerHTML =
    '<p><a href="/planner/">Return to the planner</a> and open the item again.</p>';
  error(reason);
});
