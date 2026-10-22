import { createGuidedEditor } from "./guided-editor.mjs";
import {
  loadBundledPayloads,
  validatePNGPixelStream,
} from "../content/bundled-assets.mjs";
import { $, state, init, error, status, download } from "./common.mjs";
import { readRecord, commitRecord } from "../storage/store.mjs";
import { LIMITS, assert, clone, parseBounded } from "../content/limits.mjs";
import { validatePack } from "../content/validate.mjs";
import {
  GROUPS,
  TRANSFER_LIMITS,
  parseTransfer,
  buildTransfer,
  exportContent,
  validatePayloads,
  diffPacks,
  profileImpact,
  imageInfo,
  hashBytes,
  base64FromBytes,
  bytesFromBase64,
} from "../content/portable.mjs";
let schema,
  draft,
  baseline,
  payloads = [],
  baselinePayloads = [],
  revision = 0,
  previous = null,
  stage = null,
  dirty = false,
  generation = 0,
  controller = new AbortController(),
  activeId = "",
  saving = false,
  portableBlocked = false,
  urls = [];
let guided;
const portableNotice =
  "This published catalog exceeds portable private-editor limits (32 pictures, 8 MiB image bytes or 16 million pixels). It is read-only here. Use the separately started repository Content Studio for this catalog, or import a smaller portable pack. No picture payloads were loaded and no private data was changed.";
function renderPortableNotice() {
  $("#editor-fields").replaceChildren(node("p", portableNotice));
  $("#picture-preview").replaceChildren();
  $("#editor-record").replaceChildren();
  $("#add-record").hidden = true;
  $("#remove-record").hidden = true;
  status(portableNotice);
}
const renderFields = () =>
  portableBlocked ? renderPortableNotice() : guided.renderFields();
const renderRecords = () =>
  portableBlocked ? renderPortableNotice() : guided.renderRecords();
const defaultValue = (s, key = "") => guided.defaultValue(s, key);
const label = (k) =>
  k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (s) => s.toUpperCase());
const node = (tag, text) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  return element;
};
function cancelWork() {
  assert(
    !saving,
    "A local atomic save is in progress; wait for its result before changing workspace",
  );
  generation++;
  controller.abort();
  controller = new AbortController();
  stage = null;
  $("#content-stage").hidden = true;
  $("#apply-content").disabled = false;
}
function markDirty() {
  assert(!portableBlocked, portableNotice);
  cancelWork();
  $("#export-rights").checked = false;
  dirty = true;
  status("Unsaved private draft · validate and preview before applying");
}
function renderPictures() {
  for (const u of urls) URL.revokeObjectURL(u);
  urls = [];
  const root = $("#picture-preview");
  root.replaceChildren();
  for (const a of draft?.assets || []) {
    const p = payloads.find((x) => x.assetId === a.id);
    const row = node("div");
    row.append(
      node(
        "p",
        `${a.id} · ${a.width} × ${a.height} · ${a.bytes} bytes · Rights: ${a.rightsHolder} · ${a.license} · ${a.attribution} · SHA-256 ${a.sha256}`,
      ),
    );
    if (p) {
      try {
        const raw = bytesFromBase64(p.base64),
          info = imageInfo(raw);
        assert(info.mime === a.mime, "Invalid picture MIME");
        const u = URL.createObjectURL(new Blob([raw], { type: info.mime }));
        urls.push(u);
        const img = node("img");
        img.src = u;
        img.alt = `Private picture ${a.id}`;
        img.width = Math.min(a.width, 240);
        row.append(img);
      } catch {
        row.append(
          node("p", "Picture bytes unavailable; validation required."),
        );
      }
    } else row.append(node("p", "Reference only: no picture bytes stored."));
    root.append(row);
  }
}
async function decodeBitmap(bytes, mime, signal, sharedDeadline) {
  const deadline =
    sharedDeadline ?? performance.now() + TRANSFER_LIMITS.decodeMs;
  assert(!signal?.aborted, "Import cancelled");
  if (mime === "image/png")
    await validatePNGPixelStream(bytes, signal, deadline);
  assert(!signal?.aborted, "Import cancelled");
  assert(
    performance.now() < deadline,
    "Picture decode timed out; no changes saved",
  );
  let timer, abort;
  const work = createImageBitmap(new Blob([bytes], { type: mime }));
  let expired = false;
  const result = await Promise.race([
    work,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => {
          expired = true;
          reject(new Error("Picture decode timed out; no changes saved"));
        },
        Math.max(1, deadline - performance.now()),
      );
      abort = () => {
        expired = true;
        reject(new Error("Import cancelled"));
      };
      signal?.addEventListener("abort", abort, { once: true });
    }),
  ]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    work.then(
      (bitmap) => {
        if (expired) bitmap.close();
      },
      () => {},
    );
  });
  return result;
}
async function decodeRaster(bytes, mime, signal, deadline) {
  const result = await decodeBitmap(bytes, mime, signal, deadline);
  try {
    return { width: result.width, height: result.height };
  } finally {
    result.close();
  }
}
const options = () => ({ decodeRaster, signal: controller.signal });
async function loadWorkspace() {
  const token = generation,
    id = state.pack.id;
  activeId = id;
  guided.resetPagination();
  $("#export-rights").checked = false;
  baseline = clone(state.pack);
  draft = clone(state.pack);
  revision = 0;
  previous = null;
  payloads = [];
  baselinePayloads = [];
  dirty = false;
  portableBlocked = false;
  try {
    const record = await readRecord("content", id);
    if (token !== generation || state.pack.id !== id) return;
    if (record?.value) {
      baseline = clone(record.value.pack);
      draft = clone(baseline);
      revision = record.value.revision;
      payloads = clone(record.value.payloads || []);
      previous = record.previous;
    }
    status(
      `Private content loaded · revision ${revision}. Public pages unchanged.`,
    );
  } catch (e) {
    status("Storage unavailable · draft stays exportable on this page");
    error(e);
  }
  if (token !== generation) return;
  portableBlocked =
    baseline.assets.length > LIMITS.assets ||
    baseline.assets.reduce((sum, asset) => sum + asset.bytes, 0) >
      LIMITS.totalAssetBytes ||
    baseline.assets.reduce(
      (sum, asset) => sum + asset.width * asset.height,
      0,
    ) > TRANSFER_LIMITS.totalPixels;
  if (portableBlocked) {
    payloads = [];
    baselinePayloads = [];
    renderPortableNotice();
    return;
  }
  const missing = baseline.assets
    .filter((a) => !payloads.some((p) => p.assetId === a.id))
    .map((a) => a.id);
  if (missing.length) {
    try {
      const bundled = await loadBundledPayloads(baseline, {
        assetIds: missing,
        ...options(),
      });
      if (token !== generation) return;
      payloads.push(...bundled);
    } catch (reason) {
      if (token !== generation) return;
      status(
        "Some picture bytes unavailable; content remains editable and exportable.",
      );
      error(reason);
    }
  }
  if (token !== generation) return;
  baselinePayloads = clone(payloads);
  $("#private-reader").href = `/local/?pack=${encodeURIComponent(id)}`;
  renderRecords();
}
function showDiff(diff) {
  const root = $("#stage-diff");
  root.replaceChildren();
  for (const kind of ["manifest", "added", "changed", "removed"]) {
    const entries = diff[kind],
      details = node("details"),
      content = node("div");
    details.open = entries.length > 0;
    details.append(
      node("summary", `${label(kind)}: ${entries.length}`),
      content,
    );
    let start = 0;
    function render() {
      content.replaceChildren();
      content.append(
        node(
          "p",
          `${entries.length} changes · showing ${entries.length ? start + 1 : 0}–${Math.min(start + 20, entries.length)}`,
        ),
      );
      if (start > 0) {
        const previous = node("button", `Previous ${kind} changes`);
        previous.type = "button";
        previous.onclick = () => {
          start -= 20;
          render();
        };
        content.append(previous);
      }
      if (start + 20 < entries.length) {
        const next = node("button", `Next ${kind} changes`);
        next.type = "button";
        next.onclick = () => {
          start += 20;
          render();
        };
        content.append(next);
      }
      for (const entry of entries.slice(start, start + 20)) {
        const title = node("h3", entry.id || entry.field),
          before = node("pre", JSON.stringify(entry.before ?? null, null, 2)),
          after = node("pre", JSON.stringify(entry.after ?? null, null, 2));
        content.append(
          title,
          node("p", "Before"),
          before,
          node("p", "After"),
          after,
        );
      }
    }
    render();
    root.append(details);
  }
}
async function stageCandidate(
  candidate,
  candidatePayloads,
  {
    targetBaseline = baseline,
    expectedRevision = revision,
    rollback = false,
  } = {},
) {
  const token = generation;
  assert(!portableBlocked, portableNotice);
  exportContent(candidate, schema);
  candidate = clone(candidate);
  candidatePayloads = clone(candidatePayloads);
  validatePack(candidate, schema);
  await validatePayloads(candidate, candidatePayloads, {
    ...options(),
    complete: false,
  });
  if (token !== generation) return;
  assert(
    candidate.id === targetBaseline?.id || !targetBaseline,
    "Pack identity cannot change in an existing draft",
  );
  const diff = diffPacks(targetBaseline, candidate);
  if (
    targetBaseline &&
    !rollback &&
    JSON.stringify(candidate) !== JSON.stringify(targetBaseline)
  )
    assert(
      candidate.contentVersion !== targetBaseline.contentVersion,
      "Change Content version in Pack metadata before saving changed facts.",
    );
  let profile,
    profileUnavailable = false;
  try {
    profile = (await readRecord("profiles", candidate.id))?.value;
  } catch {
    profile = null;
    profileUnavailable = true;
  }
  if (token !== generation) return;
  const impact = profileImpact(profile, targetBaseline, candidate);
  let originalPayloads = [];
  if (targetBaseline?.assets.length) {
    const sameActive =
      targetBaseline.id === baseline?.id &&
      targetBaseline.contentVersion === baseline?.contentVersion;
    originalPayloads = sameActive
      ? baselinePayloads.filter((p) =>
          targetBaseline.assets.some((a) => a.id === p.assetId),
        )
      : [];
    const missing = targetBaseline.assets
      .filter((a) => !originalPayloads.some((p) => p.assetId === a.id))
      .map((a) => a.id);
    if (missing.length) {
      try {
        originalPayloads.push(
          ...(await loadBundledPayloads(targetBaseline, {
            assetIds: missing,
            ...options(),
          })),
        );
      } catch {
        /* Reference-only original remains explicitly incomplete. */
      }
    }
    if (token !== generation) return;
  }
  stage = {
    pack: clone(candidate),
    payloads: clone(candidatePayloads),
    targetId: candidate.id,
    expectedRevision,
    generation: token,
    rollback,
    initialPrevious: targetBaseline
      ? {
          pack: clone(targetBaseline),
          payloads: clone(originalPayloads),
          revision: 0,
        }
      : null,
  };
  $("#stage-target").textContent =
    `${targetBaseline ? "Replace" : "Create"} private pack ${candidate.id} at expected revision ${expectedRevision}. Published pages and all profiles remain unchanged.`;
  const warnings = [];
  if (profileUnavailable)
    warnings.push(
      "Profile storage could not be inspected. Binding/reference impact is unknown; export a profile backup before proceeding.",
    );
  if (impact.rebindRequired)
    warnings.push(
      "Profile rebind required. Export your profile and use Settings to explicitly reconcile the new content version.",
    );
  if (impact.unresolved.length)
    warnings.push(
      `Historical references retained, not deleted: ${impact.unresolved.join(", ")}`,
    );
  if (impact.affectedGoals.length)
    warnings.push(`Affected saved goals: ${impact.affectedGoals.join(", ")}`);
  if (candidate.assets.length !== candidatePayloads.length)
    warnings.push(
      "Reference-only pictures: some actual bytes are missing. A self-contained picture export is blocked until supplied.",
    );
  if (rollback)
    warnings.push(
      "Rollback restores the previous content snapshot as a new revision. Profile content binding may need explicit rebind.",
    );
  $("#stage-warnings").textContent =
    warnings.join("\n") ||
    "No known profile binding conflict. Verify all changes and evidence before applying.";
  showDiff(diff);
  $("#content-stage").hidden = false;
  $("#stage-title").focus();
}
function action(selector, fn) {
  $(selector).addEventListener("click", () =>
    Promise.resolve()
      .then(() => {
        assert(
          !portableBlocked ||
            [
              "#export-draft",
              "#discard-draft",
              "#cancel-import",
              "#cancel-content",
            ].includes(selector),
          portableNotice,
        );
        return fn();
      })
      .catch((e) => {
        status(
          "No replacement saved. Your draft remains available for recovery export.",
        );
        error(e);
      }),
  );
}
async function attachPicture() {
  cancelWork();
  const token = generation,
    signal = controller.signal;
  assert(
    $("#picture-rights").checked && $("#picture-private").checked,
    "Confirm redistribution rights and absence of personal picture data first",
  );
  const file = $("#picture-file").files[0];
  assert(
    file && file.size <= LIMITS.assetBytes,
    "Choose a raster file up to 2 MiB",
  );
  assert(draft.assets.length < LIMITS.assets, "32-picture limit reached");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (token !== generation) return;
  const info = imageInfo(bytes);
  const bitmap = await decodeBitmap(bytes, info.mime, signal);
  let blob;
  try {
    assert(
      bitmap.width === info.width && bitmap.height === info.height,
      "Decoded picture dimensions mismatch",
    );
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Picture normalization failed")),
        "image/png",
      ),
    );
    canvas.width = canvas.height = 0;
  } finally {
    bitmap.close();
  }
  if (token !== generation) return;
  assert(
    blob.size <= LIMITS.assetBytes,
    "Normalized picture exceeds 2 MiB; resize it before attaching",
  );
  const normalized = new Uint8Array(await blob.arrayBuffer()),
    id = $("#picture-id").value.trim(),
    sum = await hashBytes(normalized);
  if (token !== generation) return;
  const asset = {
    id,
    path: `assets/${sum}.png`,
    mime: "image/png",
    sha256: sum,
    bytes: normalized.length,
    width: info.width,
    height: info.height,
    rightsHolder: $("#picture-holder").value.trim(),
    license: $("#picture-license").value.trim(),
    sourceUrl: $("#picture-source").value.trim(),
    attribution: $("#picture-attribution").value.trim(),
    redistributionAllowed: true,
  };
  assert(
    !draft.assets.some((a) => a.id === id),
    "Picture ID already exists; remove its metadata and references deliberately before replacement",
  );
  const next = clone(draft);
  next.assets.push(asset);
  validatePack(next, schema);
  const nextPayloads = [
    ...payloads,
    { assetId: id, base64: base64FromBytes(normalized) },
  ];
  await validatePayloads(next, nextPayloads, {
    decodeRaster,
    signal,
    complete: false,
  });
  if (token !== generation) return;
  draft = next;
  payloads = nextPayloads;
  markDirty();
  renderRecords();
  status(
    `Picture ${id} attached to unsaved draft. Set an Asset ID on a record and change content version before applying.`,
  );
}
async function importFile() {
  const file = $("#import-content").files[0];
  if (!file) return;
  assert(!saving, "Wait for the atomic save to finish");
  if (
    dirty &&
    !confirm(
      "Discard the current unsaved draft and load this import? Export your draft first if needed.",
    )
  ) {
    $("#import-content").value = "";
    return;
  }
  cancelWork();
  const token = generation;
  assert(
    file.size <= TRANSFER_LIMITS.envelopeBytes,
    "Import exceeds 20 MiB envelope limit",
  );
  status("Validating private import. Cancel remains available.");
  const validationOptions = options(),
    text = await file.text();
  if (token !== generation) return;
  const parsed = await parseTransfer(text, schema, validationOptions);
  if (token !== generation) return;
  const record = await readRecord("content", parsed.pack.id);
  if (token !== generation) return;
  const existing =
    record?.value?.pack ||
    state.packs.find((p) => p.id === parsed.pack.id) ||
    null;
  const targetPayloads = parsed.selfContained
    ? parsed.payloads
    : (record?.value?.payloads || []).filter((p) =>
        parsed.pack.assets.some(
          (a) =>
            a.id === p.assetId &&
            existing?.assets.some(
              (old) => old.id === a.id && old.sha256 === a.sha256,
            ),
        ),
      );
  $("#export-rights").checked = false;
  baselinePayloads = record?.value
    ? clone(record.value.payloads || [])
    : existing?.id === baseline?.id &&
        existing?.contentVersion === baseline?.contentVersion
      ? clone(baselinePayloads)
      : [];
  baseline = existing ? clone(existing) : null;
  revision = record?.value?.revision || 0;
  previous = record?.previous || null;
  draft = clone(parsed.pack);
  portableBlocked = false;
  payloads = clone(targetPayloads);
  dirty = true;
  renderRecords();
  await stageCandidate(draft, payloads, {
    targetBaseline: existing,
    expectedRevision: record?.value?.revision || 0,
  });
}
async function start() {
  const response = await fetch("/assets/schemas/pack.schema.json");
  assert(
    response.ok,
    "Content schema unavailable. Retry when the local site is available.",
  );
  schema = await response.json();
  guided = createGuidedEditor({
    onError: error,
    schema,
    getDraft: () => draft,
    mutateDraft: (mutator) => {
      assert(!saving, "Wait for the atomic save to finish");
      assert(!portableBlocked, portableNotice);
      mutator(draft);
      markDirty();
    },
    onRender: renderPictures,
  });
  $("#pack-select").addEventListener(
    "change",
    (event) => {
      if (saving) {
        event.stopImmediatePropagation();
        $("#pack-select").value = activeId;
        return;
      }
      if (
        dirty &&
        !confirm(
          "Discard the unsaved private draft and switch packs? Export it first if needed.",
        )
      ) {
        event.stopImmediatePropagation();
        $("#pack-select").value = activeId;
        return;
      }
      cancelWork();
    },
    true,
  );
  document.addEventListener("pack-changing", () => cancelWork());
  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  $("#editor-section").addEventListener("change", renderRecords);
  $("#editor-record").addEventListener("change", renderFields);
  action("#add-record", () => {
    assert(!saving, "Wait for the atomic save to finish");
    const group = $("#editor-section").value;
    if (!GROUPS.includes(group)) return;
    assert(draft[group].length < LIMITS.records, "Record limit reached");
    draft[group].push(defaultValue(schema.properties[group].items));
    markDirty();
    renderRecords();
    $("#editor-record").value = String(draft[group].length - 1);
    renderFields();
  });
  action("#remove-record", () => {
    assert(!saving, "Wait for the atomic save to finish");
    const group = $("#editor-section").value;
    if (!GROUPS.includes(group)) return;
    const i = Number($("#editor-record").value);
    assert(draft[group][i], "Select a record");
    const id = draft[group][i].id;
    draft[group].splice(i, 1);
    if (group === "assets") payloads = payloads.filter((p) => p.assetId !== id);
    markDirty();
    renderRecords();
  });
  $("#guided-form").addEventListener("submit", (event) => {
    event.preventDefault();
    cancelWork();
    stageCandidate(draft, payloads).catch(error);
  });
  action("#discard-draft", async () => {
    if (dirty && !confirm("Discard all unsaved draft changes?")) return;
    cancelWork();
    await loadWorkspace();
  });
  for (const id of [
    "picture-file",
    "picture-id",
    "picture-holder",
    "picture-license",
    "picture-source",
    "picture-attribution",
  ])
    $("#" + id).addEventListener("input", () => {
      $("#picture-rights").checked = false;
      $("#picture-private").checked = false;
    });
  action("#attach-picture", attachPicture);
  action("#export-content", () =>
    download("dmz-content-reference-only.json", exportContent(draft, schema)),
  );
  action("#export-draft", () => {
    assert(draft, "No draft loaded");
    download("dmz-UNSAVED-recovery.json", {
      format: "dmz-unsaved-recovery",
      version: 1,
      warning:
        "Unvalidated recovery draft, not an importable content pack. Use the advanced panel to recover pack fields and reattach pictures after validation.",
      pack: draft,
      payloads,
    });
  });
  action("#export-pictures", async () => {
    assert(
      $("#export-rights").checked,
      "Confirm rights and privacy for every exported picture first",
    );
    download(
      "dmz-picture-pack.json",
      await buildTransfer(draft, payloads, schema, options()),
    );
  });
  $("#import-content").addEventListener("change", () =>
    importFile().catch((e) => {
      status(
        "Import rejected; no replacement saved. Draft remains exportable.",
      );
      error(e);
    }),
  );
  action("#cancel-import", () => {
    cancelWork();
    status("Pending import cancelled. Stored content and profiles unchanged.");
  });
  action("#cancel-content", () => {
    cancelWork();
    status(
      "Replacement cancelled. Stored content unchanged; unsaved draft remains available.",
    );
  });
  action("#rollback-content", async () => {
    cancelWork();
    assert(previous?.pack, "No previous private snapshot exists yet");
    await stageCandidate(previous.pack, previous.payloads || [], {
      rollback: true,
    });
  });
  action("#apply-content", async () => {
    const candidate = stage;
    assert(
      candidate && candidate.generation === generation,
      "Preview expired. Validate again.",
    );
    $("#apply-content").disabled = true;
    saving = true;
    const controls = [
      ...document.querySelectorAll(
        "#guided-form input,#guided-form select,#guided-form textarea,#guided-form button,#add-record,#remove-record,#attach-picture,#import-content,#load-json",
      ),
    ].map((n) => [n, n.disabled]);
    for (const [n] of controls) n.disabled = true;
    status("Applying private replacement atomically…");
    try {
      const saved = await commitRecord(
        "content",
        candidate.targetId,
        {
          pack: candidate.pack,
          payloads: candidate.payloads,
          revision: candidate.expectedRevision,
        },
        candidate.expectedRevision,
        { initialPrevious: candidate.initialPrevious },
      );
      if (candidate.generation !== generation) return;
      dirty = false;
      stage = null;
      $("#export-rights").checked = false;
      $("#content-stage").hidden = true;
      revision = saved.revision;
      draft = clone(saved.pack);
      payloads = clone(saved.payloads);
      baseline = clone(saved.pack);
      baselinePayloads = clone(saved.payloads);
      activeId = saved.pack.id;
      state.pack = clone(saved.pack);
      const record = await readRecord("content", saved.pack.id);
      previous = record?.previous;
      const known = state.packs.findIndex((p) => p.id === saved.pack.id);
      if (known >= 0) state.packs[known] = clone(saved.pack);
      else {
        state.packs.push(clone(saved.pack));
        const opt = node("option", saved.pack.title);
        opt.value = saved.pack.id;
        $("#pack-select").append(opt);
      }
      $("#pack-select").value = saved.pack.id;
      const url = new URL(location.href);
      url.searchParams.set("pack", saved.pack.id);
      history.replaceState(null, "", url);
      $("#private-reader").href =
        `/local/?pack=${encodeURIComponent(saved.pack.id)}`;
      for (const a of document.querySelectorAll("a[href]")) {
        const target = new URL(a.href, location.href);
        if (
          target.origin === location.origin &&
          [
            "/local/",
            "/planner/",
            "/inventory/",
            "/settings/",
            "/editor/",
            "/maps/",
            "/progression/",
          ].includes(target.pathname)
        ) {
          target.searchParams.set("pack", saved.pack.id);
          a.href = target.href;
        }
      }
      $("#pack-note").textContent =
        `PRIVATE: ${saved.pack.title} · ${saved.pack.contentVersion}`;
      status(
        `Private content saved · revision ${saved.revision}. Published pages and profiles unchanged.`,
      );
      $("#error").hidden = true;
      renderRecords();
    } finally {
      saving = false;
      for (const [n, disabled] of controls) n.disabled = disabled;
      $("#apply-content").disabled = false;
    }
  });
  action("#refresh-json", () => {
    $("#advanced-json").value = JSON.stringify(draft, null, 2);
  });
  action("#load-json", () => {
    assert(!saving, "Wait for the atomic save to finish");
    const next = parseBounded($("#advanced-json").value);
    assert(
      next.id === draft.id && next.schemaVersion === 1,
      "Existing pack identity/schemaVersion cannot change in the advanced draft",
    );
    validatePack(next, schema);
    draft = next;
    markDirty();
    renderRecords();
  });
  await init(() => loadWorkspace().catch(error));
}
start().catch(error);
