import {
  LIMITS,
  PUBLISHED_LIMITS,
  assert,
  safeURL,
} from "../content/limits.mjs";
import {
  GROUPS,
  base64FromBytes,
  bytesFromBase64,
  imageInfo,
} from "../content/portable.mjs";
import { validateSchema } from "../content/validate.mjs";
import { normalizeRaster, normalizeThumbnail } from "./raster-editor.mjs";
const $ = (selector) => document.querySelector(selector);
const node = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
const referenceKeys = new Set([
  "mapId",
  "assetId",
  "assetIds",
  "itemId",
  "itemIds",
  "sourceId",
  "sourceIds",
  "entityId",
  "relatedIds",
  "prerequisites",
]);
export function recordUses(pack, id, assetSources = {}) {
  const result = [];
  for (const group of GROUPS)
    (pack[group] || []).forEach((record, index) => {
      function walk(value, path, ref = false) {
        if (value === id && ref)
          result.push({
            group,
            index,
            id: record.id,
            name: record.name || record.title || record.id,
            path: path.join("."),
          });
        else if (Array.isArray(value))
          value.forEach((v, i) => walk(v, [...path, i], ref));
        else if (value && typeof value === "object")
          for (const [key, child] of Object.entries(value))
            walk(child, [...path, key], referenceKeys.has(key));
      }
      walk(record, [group, index]);
    });
  (pack.assets || []).forEach((asset, index) => {
    if (assetSources[asset.id]?.parentAssetId === id)
      result.push({
        group: "assets",
        index,
        id: asset.id,
        name: asset.id,
        path: `assets.${index}.parentAssetId`,
      });
  });
  return result;
}
// Removing src schedules the browser's image-data cancellation. Wait for that
// decode lifecycle to settle before revoking; do not race it with a timer or
// force an unseen lazy preview to start loading its old resource.
export async function retirePreviewURL(url, images) {
  await Promise.all(
    images.map((image) => {
      if (image.getAttribute("src") === url) image.removeAttribute("src");
      return image.decode().catch(() => {});
    }),
  );
  URL.revokeObjectURL(url);
}
export function createStudioMedia({
  schema,
  getDraft,
  getKey,
  getUploads,
  getAssetSources,
  getSelection,
  getGeneration,
  isLocked,
  mutateDraft,
  uniqueId,
  onStatus,
  onError,
  onRender,
  onRemove,
  onSelect,
}) {
  let source = null,
    working = null,
    duplicate = null,
    page = 0,
    generation = 0,
    controller = new AbortController();
  const previews = new Map();
  function invoke(fn) {
    try {
      assert(!isLocked(), "Wait for the current operation to finish");
      const result = fn(),
        token = generation,
        workspace = getGeneration();
      Promise.resolve(result).catch((reason) => {
        if (token === generation && workspace === getGeneration())
          onError(reason);
      });
    } catch (reason) {
      onError(reason);
    }
  }
  const listen = (id, fn) => $(id).addEventListener("click", () => invoke(fn));
  function previewImage(owner, bytes, mime, element = null) {
    let entry = previews.get(owner);
    if (!entry) {
      entry = {
        url: URL.createObjectURL(
          new Blob(
            [typeof bytes === "string" ? bytesFromBase64(bytes) : bytes],
            { type: mime },
          ),
        ),
        image: element || node("img"),
      };
      if (!element) entry.image.loading = "lazy";
      previews.set(owner, entry);
    }
    if (entry.image.getAttribute("src") !== entry.url)
      entry.image.src = entry.url;
    return entry.image;
  }
  function retireUnusedPreviews() {
    // Retain upload URLs across paging/search/rerenders. The pending upload
    // batch is bounded to 32 images / 8 MiB; only these two workbench owners
    // are additional. Saved catalog previews use lazy HTTP URLs, not blobs.
    const retained = new Set([source, working, ...getUploads().values()]);
    for (const [owner, entry] of previews) {
      if (retained.has(owner)) continue;
      previews.delete(owner);
      void retirePreviewURL(entry.url, [entry.image]);
    }
  }
  function rightsReset() {
    generation++;
    $("#picture-rights").checked = false;
    $("#picture-private").checked = false;
    duplicate = null;
    $("#duplicate-stage").hidden = true;
  }
  function cancelPicture() {
    generation++;
    controller.abort();
    controller = new AbortController();
    source = working = duplicate = null;
    $("#picture-workbench").hidden = true;
    $("#picture-file").value = "";
    rightsReset();
    render();
  }
  function cropControls(info) {
    $("#crop-x").value = "0";
    $("#crop-y").value = "0";
    $("#crop-width").value = String(info.width);
    $("#crop-height").value = String(info.height);
    $("#picture-max").value = String(
      Math.min(1024, Math.max(info.width, info.height)),
    );
    $("#picture-original-size").checked = false;
  }
  function renderWorking() {
    if (!source || !working) {
      $("#picture-original").removeAttribute("src");
      $("#picture-working").removeAttribute("src");
      $("#picture-workbench").hidden = true;
      return;
    }
    previewImage(
      source,
      source.bytes,
      source.info.mime,
      $("#picture-original"),
    );
    previewImage(working, working.bytes, working.mime, $("#picture-working"));
    $("#picture-size").textContent =
      `Original ${source.info.width} × ${source.info.height}, ${source.bytes.length.toLocaleString()} bytes → draft ${working.width} × ${working.height}, ${working.bytes.length.toLocaleString()} bytes. PNG may be larger; choose smaller output dimensions if needed.`;
    $("#picture-workbench").hidden = false;
  }
  async function chooseFile(file) {
    assert(!isLocked(), "Wait for the current operation to finish");
    assert(getDraft(), "Choose or create a catalog first");
    assert(
      file && file.size > 0 && file.size <= LIMITS.assetBytes,
      "Choose one raster file up to 2 MiB",
    );
    const token = ++generation,
      workspace = getGeneration();
    controller.abort();
    controller = new AbortController();
    const bytes = new Uint8Array(await file.arrayBuffer()),
      info = imageInfo(bytes);
    const normalized = await normalizeRaster(bytes, {
      signal: controller.signal,
    });
    if (token !== generation || workspace !== getGeneration()) return;
    source = { bytes, info };
    working = normalized;
    cropControls(info);
    rightsReset();
    $("#picture-id").value = uniqueId(
      file.name.replace(/\.[^.]+$/, "") || "picture",
    );
    $("#picture-thumbnail").checked = false;
    render();
    onStatus(
      "Picture prepared locally. Review crop, attribution and permission before attaching to the draft.",
    );
  }
  async function applyCrop() {
    assert(source, "Choose a picture first");
    const token = ++generation,
      workspace = getGeneration();
    controller.abort();
    controller = new AbortController();
    const candidate = await normalizeRaster(source.bytes, {
      signal: controller.signal,
      crop: {
        x: Number($("#crop-x").value),
        y: Number($("#crop-y").value),
        width: Number($("#crop-width").value),
        height: Number($("#crop-height").value),
      },
      maxDimension: Number($("#picture-max").value),
      keepOriginal: $("#picture-original-size").checked,
    });
    if (token !== generation || workspace !== getGeneration()) return;
    working = candidate;
    rightsReset();
    render();
    onStatus(
      "Crop/resize applied to the picture preview only. Repository files are unchanged.",
    );
  }
  function canAttach() {
    const selected = getSelection();
    return selected &&
      [
        "items",
        "recipes",
        "objectives",
        "guides",
        "maps",
        "locations",
      ].includes(selected.group)
      ? selected
      : null;
  }
  function attachToRecord(draft, assetId, method) {
    if (method === "library") return;
    const selected = canAttach();
    assert(
      selected,
      "Select an item, recipe, objective, guide, map or location, or choose Library only",
    );
    const record = draft[selected.group][selected.index];
    if (method === "primary") record.assetId = assetId;
    else {
      const ids = record.assetIds || [];
      assert(
        ids.includes(assetId) || ids.length < 8,
        "At most eight additional pictures are allowed",
      );
      record.assetIds = [...new Set([...ids, assetId])];
    }
  }
  function category() {
    const selected = getSelection();
    if (
      !selected ||
      ![
        "items",
        "recipes",
        "objectives",
        "guides",
        "maps",
        "locations",
      ].includes(selected.group)
    )
      return "other";
    return selected.group === "items" && selected.record.kind === "weapon"
      ? "weapons"
      : selected.group;
  }
  function metadata(result, id) {
    const asset = {
      id,
      path: `assets/${id.replace(":", "-")}-${result.sha256}.png`,
      mime: result.mime,
      sha256: result.sha256,
      bytes: result.bytes.length,
      width: result.width,
      height: result.height,
      rightsHolder: $("#picture-holder").value.trim(),
      license: $("#picture-license").value.trim(),
      sourceUrl: $("#picture-source").value.trim(),
      attribution: $("#picture-attribution").value.trim(),
      redistributionAllowed: true,
    };
    validateSchema(asset, schema.$defs.asset, schema);
    assert(
      safeURL(asset.sourceUrl),
      "Use a valid http(s) source URL without credentials",
    );
    return asset;
  }
  function checkBatch(next) {
    assert(
      next.size <= LIMITS.assets,
      "A save can include at most 32 new pictures; save this batch before adding more",
    );
    let bytes = 0;
    for (const upload of next.values())
      bytes += bytesFromBase64(upload.base64).length;
    assert(
      bytes <= LIMITS.totalAssetBytes,
      "New picture batch exceeds 8 MiB; save or reduce the images first",
    );
  }
  async function attach() {
    assert(working, "Choose and prepare a picture first");
    assert(
      $("#picture-rights").checked && $("#picture-private").checked,
      "Confirm redistribution permission and absence of visible personal data first",
    );
    const pack = getDraft(),
      same = pack.assets.find((a) => a.sha256 === working.sha256);
    if (same) {
      duplicate = same.id;
      $("#duplicate-note").textContent =
        `Identical normalized pixels already exist as ${same.id}. Reuse that asset and its existing rights metadata rather than duplicating it.`;
      $("#duplicate-stage").hidden = false;
      $("#reuse-picture").focus();
      return;
    }
    const id = $("#picture-id").value.trim();
    assert(
      !GROUPS.some((group) => pack[group].some((r) => r.id === id)),
      "That ID already exists; choose a different picture ID",
    );
    const originalSelection = getSelection();
    const originalMethod = $("#picture-attachment").value;
    const original = metadata(working, id),
      additions = [
        {
          asset: original,
          upload: {
            assetId: id,
            base64: base64FromBytes(working.bytes),
            category: category(),
          },
        },
      ];
    const token = generation,
      workspace = getGeneration();
    if ($("#picture-thumbnail").checked) {
      const thumbnail = await normalizeThumbnail(working.bytes, {
        signal: controller.signal,
      });
      if (token !== generation || workspace !== getGeneration()) return;
      const thumbId = uniqueId(
        id.split(":").at(-1) + "-thumbnail",
        new Set([id]),
      );
      const thumbnailAsset = metadata(thumbnail, thumbId);
      additions.push({
        asset: thumbnailAsset,
        upload: {
          assetId: thumbId,
          base64: base64FromBytes(thumbnail.bytes),
          category: category(),
          parentAssetId: id,
          variant: "thumbnail",
        },
      });
    }
    assert(
      pack.assets.length + additions.length <= PUBLISHED_LIMITS.assets,
      "Repository catalog picture limit reached",
    );
    const next = new Map(getUploads());
    for (const entry of additions) next.set(entry.asset.id, entry.upload);
    checkBatch(next);
    // Test attachment constraints before mutating the live draft.
    const selection = canAttach(),
      method = $("#picture-attachment").value;
    assert(
      method === originalMethod &&
        getSelection()?.record === originalSelection?.record,
      "Selected picture target changed during preparation. Attach again after reviewing the target",
    );
    assert(
      $("#picture-rights").checked && $("#picture-private").checked,
      "Picture permissions changed during preparation. Review and confirm them again",
    );
    if (method !== "library") {
      assert(
        selection,
        "Select a picture-capable record or choose Library only",
      );
      if (method === "additional")
        assert(
          (selection.record.assetIds || []).length < 8,
          "At most eight additional pictures are allowed",
        );
    }
    mutateDraft((draft) => {
      for (const entry of additions) draft.assets.push(entry.asset);
      attachToRecord(draft, id, method);
      for (const [key, upload] of next) getUploads().set(key, upload);
    });
    cancelPicture();
    onRender();
    onStatus(
      `Picture ${id} attached to the unsaved draft${additions.length > 1 ? " with a separate thumbnail" : ""}. Validate and save when ready.`,
    );
  }
  function useExisting(id, method) {
    assert(
      getDraft().assets.some((a) => a.id === id),
      "Picture no longer exists",
    );
    // Validate max before invoking the mutation callback.
    const selected = canAttach();
    assert(selected, "Select a picture-capable record first");
    if (method === "additional")
      assert(
        (selected.record.assetIds || []).includes(id) ||
          (selected.record.assetIds || []).length < 8,
        "At most eight additional pictures are allowed",
      );
    mutateDraft((draft) => attachToRecord(draft, id, method));
    onRender();
  }
  function render() {
    const pack = getDraft(),
      root = $("#media-library");
    root.replaceChildren();
    renderWorking();
    retireUnusedPreviews();
    if (!pack) return;
    const selected = canAttach();
    $("#picture-target").textContent = selected
      ? `Selected record: ${selected.record.name || selected.record.title || selected.record.id}. Primary: ${selected.record.assetId || "none"}. Additional: ${(selected.record.assetIds || []).join(", ") || "none"}.`
      : "Select an item, weapon, recipe, objective, guide, map or location to attach pictures. Other records can add images to the library only.";
    const query = $("#media-search").value.trim().toLowerCase();
    const matches = pack.assets.filter((a) =>
      `${a.id} ${a.attribution} ${a.rightsHolder}`
        .toLowerCase()
        .includes(query),
    );
    page = Math.min(page, Math.max(0, Math.ceil(matches.length / 24) - 1));
    $("#media-count").textContent =
      `${matches.length} pictures · showing ${matches.length ? page * 24 + 1 : 0}–${Math.min((page + 1) * 24, matches.length)}. Only this page's previews are requested.`;
    $("#media-prev").disabled = page === 0 || isLocked();
    $("#media-next").disabled = (page + 1) * 24 >= matches.length || isLocked();
    for (const asset of matches.slice(page * 24, (page + 1) * 24)) {
      const card = node("article");
      card.className = "media-card";
      card.dataset.assetId = asset.id;
      card.append(node("h3", asset.id));
      const upload = getUploads().get(asset.id),
        existing = getAssetSources()[asset.id];
      if (upload || existing) {
        const img = upload
          ? previewImage(upload, upload.base64, asset.mime)
          : node("img");
        img.loading = "lazy";
        img.alt = `Picture ${asset.id}`;
        if (!upload)
          img.src = `/api/media?packKey=${encodeURIComponent(getKey())}&assetId=${encodeURIComponent(asset.id)}`;
        card.append(img);
      } else
        card.append(
          node(
            "p",
            "Picture bytes missing. Import a complete bundle or attach a local image before saving.",
          ),
        );
      card.append(
        node(
          "p",
          `${asset.width} × ${asset.height} · ${asset.bytes.toLocaleString()} bytes`,
        ),
        node(
          "p",
          `${asset.rightsHolder} · ${asset.license} · ${asset.attribution}`,
        ),
      );
      const source = upload || existing;
      if (source?.variant)
        card.append(node("p", `${source.variant} of ${source.parentAssetId}`));
      const uses = recordUses(pack, asset.id, {
          ...getAssetSources(),
          ...Object.fromEntries(getUploads()),
        }),
        details = node("details"),
        summary = node(
          "summary",
          `Where used: ${uses.length} reference${uses.length === 1 ? "" : "s"}`,
        );
      details.dataset.mediaAction = "where-used";
      details.append(summary);
      for (const use of uses) {
        const button = node(
          "button",
          `${use.name} · ${use.path.endsWith(".parentAssetId") ? "thumbnail parent relationship · " : ""}${use.path}`,
        );
        button.type = "button";
        button.onclick = () => onSelect(use.group, use.index);
        details.append(button);
      }
      if (!uses.length)
        details.append(node("p", "No content record uses this picture."));
      card.append(details);
      for (const [action, title] of [
        ["primary", "Use as primary"],
        ["additional", "Add additional picture"],
        ["detach", "Remove from selected record"],
        ["remove", "Preview picture removal"],
      ]) {
        const button = node("button", title);
        button.type = "button";
        button.dataset.mediaAction = action;
        button.disabled = isLocked() || (action !== "remove" && !selected);
        button.onclick = () => {
          try {
            assert(!isLocked(), "Wait for the current operation to finish");
            if (action === "remove")
              onRemove("assets", pack.assets.indexOf(asset));
            else if (action === "detach") {
              mutateDraft(() => {
                if (selected.record.assetId === asset.id)
                  delete selected.record.assetId;
                if (selected.record.assetIds)
                  selected.record.assetIds = selected.record.assetIds.filter(
                    (id) => id !== asset.id,
                  );
              });
              onRender();
            } else useExisting(asset.id, action);
          } catch (reason) {
            onError(reason);
          }
        };
        card.append(button);
      }
      root.append(card);
    }
  }
  $("#picture-file").addEventListener("change", () => {
    const file = $("#picture-file").files[0];
    if (file) invoke(() => chooseFile(file));
  });
  const drop = $("#picture-drop");
  drop.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop.classList.add("dragover");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    drop.classList.remove("dragover");
    const files = event.dataTransfer?.files;
    if (!files || files.length !== 1)
      return onError(
        new Error("Drop exactly one local raster file, not a URL or folder"),
      );
    invoke(() => chooseFile(files[0]));
  });
  drop.addEventListener("keydown", (event) => {
    if (event.target === drop && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      $("#picture-file").click();
    }
  });
  for (const id of [
    "picture-id",
    "picture-holder",
    "picture-license",
    "picture-source",
    "picture-attribution",
  ])
    $("#" + id).addEventListener("input", rightsReset);
  $("#media-search").addEventListener("input", () => {
    page = 0;
    render();
  });
  listen("#media-prev", () => {
    page--;
    render();
  });
  listen("#media-next", () => {
    page++;
    render();
  });
  listen("#reset-crop", () => {
    assert(source, "Choose a picture first");
    cropControls(source.info);
  });
  listen("#apply-crop", applyCrop);
  listen("#cancel-picture", cancelPicture);
  listen("#attach-picture", attach);
  listen("#reuse-picture", () => {
    assert(duplicate, "No duplicate is selected");
    const method = $("#picture-attachment").value;
    if (method !== "library") useExisting(duplicate, method);
    cancelPicture();
    onStatus("Existing picture reused; no duplicate image bytes added.");
  });
  return {
    render,
    reset() {
      page = 0;
      cancelPicture();
    },
    cancelPicture,
    hasPending: () => !!source || !!working,
  };
}
