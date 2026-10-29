import { parseRecoveryDraft } from "../content/studio-recovery.mjs";
import {
  parseAuthorTarget,
  resolveAuthorTarget,
  previewPath,
} from "../content/author-target.mjs";
import { createGuidedEditor } from "./guided-editor.mjs";
import { createStudioMedia, recordUses } from "./studio-media.mjs";
import { decodeRaster, normalizeRaster } from "./raster-editor.mjs";
import {
  LIMITS,
  ID,
  assert,
  boundedWalk,
  clone,
  parseBounded,
} from "../content/limits.mjs";
import { validatePack, schemaForVersion } from "../content/validate.mjs";
import {
  GROUPS,
  TRANSFER_LIMITS,
  defaultFieldValue,
  diffPacks,
  parseTransfer,
  base64FromBytes,
  bytesFromBase64,
} from "../content/portable.mjs";
const $ = (selector) => document.querySelector(selector);
const node = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
let initialTarget = null,
  initialTargetApplied = false;
let schema,
  entries = [],
  repositoryRevision = "",
  expectedRevision = "",
  token = "",
  key = "",
  draft = null,
  baseline = null,
  assetSources = {},
  uploads = new Map(),
  guided,
  media;
let dirty = false,
  busy = false,
  blocked = false,
  generation = 0,
  stage = null,
  imported = null,
  removal = null,
  operation = new AbortController();
let savedHere = false;
function workflowSummary() {
  $("#workflow-summary").textContent =
    `Draft: ${dirty ? "unsaved changes" : "unchanged"} · Review: ${stage?.generation === generation ? "ready" : "required before save"} · Repository: ${savedHere ? "saved this session" : "no save confirmed this session"} · Rebuild/publication: manual, not published by Studio.`;
}
const status = (text) => {
  $("#save-status").textContent = text;
  workflowSummary();
};
function fail(reason) {
  const message = reason.message || String(reason),
    code = reason.code ? `${reason.code}: ` : "";
  $("#error").textContent = code + message;
  $("#error").hidden = false;
  $("#error").focus();
  if (/RECOVER|JOURNAL|LOCK/i.test(reason.code || "")) {
    blocked = true;
    $("#recovery-help").hidden = false;
    $("#save-repository").disabled = true;
  }
  status(
    "No new repository save confirmed. Your draft remains available; use Download draft before reloading.",
  );
}
function clearError() {
  $("#error").hidden = true;
}
async function api(path, body) {
  const response = await fetch(path, {
    cache: "no-store",
    headers: body
      ? { "Content-Type": "application/json", "X-Author-Token": token }
      : {},
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const reason = new Error(data.message || "Local authoring request failed");
    reason.code = data.code || `HTTP_${response.status}`;
    throw reason;
  }
  return data;
}
function invalidate() {
  generation++;
  operation.abort();
  operation = new AbortController();
  stage = imported = removal = null;
  $("#content-stage").hidden = true;
  $("#import-stage").hidden = true;
  $("#remove-stage").hidden = true;
}
function mutateDraft(mutator) {
  assert(!busy, "Wait for the current operation to finish");
  assert(draft, "Choose or create a catalog first");
  mutator(draft);
  invalidate();
  renderSavedPreview();
  dirty = true;
  clearError();
  status("Unsaved repository draft · validate and preview before saving");
}
function selected() {
  const group = $("#editor-section").value,
    index = Number($("#editor-record").value);
  return GROUPS.includes(group) && draft?.[group]?.[index]
    ? { group, index, record: draft[group][index] }
    : null;
}
const slug = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "") || "record";
function uniqueId(name, extra = new Set()) {
  const namespace = draft?.id?.split(":")[0] || "community",
    used = new Set([
      ...GROUPS.flatMap((group) => draft?.[group]?.map((r) => r.id) || []),
      ...extra,
    ]);
  const base = `${namespace}:${slug(name)}`;
  let id = base,
    n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  return id;
}
function uniqueKey(name) {
  const base = `catalog-${slug(name)}`,
    used = new Set(entries.map((e) => e.key));
  let value = base,
    n = 2;
  while (used.has(value)) value = `${base}-${n++}`;
  return value;
}
function renderSavedPreview() {
  const selection = selected(),
    link = $("#saved-preview");
  const saved =
    selection &&
    baseline?.[selection.group]?.some(
      (record) => record.id === selection.record.id,
    );
  link.hidden = !saved;
  if (saved) {
    link.href = `/preview?packKey=${encodeURIComponent(key)}&id=${encodeURIComponent(selection.record.id)}`;
    link.textContent = `View saved preview: ${selection.record.name || selection.record.title || selection.record.id}`;
    $("#saved-preview-note").textContent =
      `Shows latest saved repository content, not unsaved draft edits. Loaded revision ${expectedRevision.slice(0, 12)}.`;
  } else {
    link.removeAttribute("href");
    $("#saved-preview-note").textContent =
      "Select an already saved record to preview it. New or removed records have no saved-preview link until saving.";
  }
}
function render() {
  if (!draft) {
    $("#editor-fields").replaceChildren(
      node("p", "No catalog yet. Create a new catalog or import one to begin."),
    );
    media?.render();
    renderSavedPreview();
    return;
  }
  guided.renderRecords();
  $("#review-version").value = draft.contentVersion;
  $("#pack-note").textContent =
    `${draft.title} · ${draft.id} · ${draft.contentVersion} · ${baseline ? "Existing repository catalog" : "New unsaved catalog"}`;
  $("#new-record-controls").hidden = $("#editor-section").value === "metadata";
}
function selectRecord(group, index) {
  $("#editor-section").value = group;
  guided.renderRecords();
  $("#editor-record").value = String(index);
  guided.renderFields();
  $("#editor-fields").scrollIntoView({ block: "start" });
  $("#editor-record").focus();
}
function renderChoices() {
  const select = $("#pack-select");
  select.replaceChildren();
  for (const entry of entries) {
    const option = node("option", entry.pack.title);
    option.value = entry.key;
    select.append(option);
  }
  if (draft && !entries.some((entry) => entry.key === key)) {
    const option = node("option", `${draft.title} (unsaved)`);
    option.value = key;
    select.append(option);
  }
  if (!select.options.length) {
    const option = node("option", "No repository catalogs yet");
    option.value = "";
    select.append(option);
  }
  select.value = key;
}
function loadEntry(entry) {
  invalidate();
  key = entry?.key || "";
  draft = entry ? clone(entry.pack) : null;
  baseline = entry ? clone(entry.pack) : null;
  assetSources = entry ? clone(entry.assetSources || {}) : {};
  uploads = new Map();
  dirty = false;
  expectedRevision = repositoryRevision;
  guided.resetPagination();
  media?.reset();
  renderChoices();
  render();
  clearError();
  status(
    draft
      ? "Repository catalog loaded. No private player data was read."
      : "Repository ready. Create a new catalog or import a portable pack.",
  );
}
async function withBusy(fn) {
  assert(!busy, "Wait for the current operation to finish");
  busy = true;
  const controls = [
    ...document.querySelectorAll(
      "main button, main input, main select, main textarea",
    ),
  ].map((n) => [n, n.disabled]);
  for (const [n] of controls) n.disabled = true;
  $("#workspace").setAttribute("aria-busy", "true");
  try {
    return await fn();
  } finally {
    busy = false;
    for (const [n, disabled] of controls)
      if (n.isConnected) n.disabled = disabled;
    $("#workspace").removeAttribute("aria-busy");
    if (blocked) $("#save-repository").disabled = true;
    media?.render();
  }
}
function validate(candidate) {
  boundedWalk(candidate);
  assert(
    new TextEncoder().encode(JSON.stringify(candidate)).length <=
      LIMITS.packBytes,
    "Catalog metadata exceeds 8 MiB",
  );
  validatePack(candidate, schema, { profile: "published" });
  assert(
    !draft || candidate.id === draft.id,
    "Existing catalog identity cannot change",
  );
}
function showDiff(root, before, after) {
  root.replaceChildren();
  const diff = diffPacks(before, after);
  for (const kind of ["manifest", "added", "changed", "removed"]) {
    const entries = diff[kind],
      details = node("details");
    details.open = entries.length > 0;
    details.append(
      node(
        "summary",
        `${kind[0].toUpperCase() + kind.slice(1)}: ${entries.length}`,
      ),
    );
    for (const entry of entries.slice(0, 50)) {
      const item = node("details");
      item.append(
        node(
          "summary",
          `${entry.group ? entry.group + " · " : ""}${entry.id || entry.field}`,
        ),
      );
      const beforeText = JSON.stringify(entry.before ?? null, null, 2),
        afterText = JSON.stringify(entry.after ?? null, null, 2);
      item.append(
        node("p", "Before"),
        node("pre", beforeText.slice(0, 12000)),
        node("p", "After"),
        node("pre", afterText.slice(0, 12000)),
      );
      if (beforeText.length > 12000 || afterText.length > 12000)
        item.append(
          node(
            "p",
            "Long detail truncated here; use the advanced JSON or draft download for the complete record.",
          ),
        );
      details.append(item);
    }
    if (entries.length > 50)
      details.append(
        node(
          "p",
          `Showing 50 of ${entries.length} changes. Download the draft for the complete candidate.`,
        ),
      );
    root.append(details);
  }
}
function preview() {
  assert(
    !media?.hasPending(),
    "Attach or cancel the prepared picture before previewing a repository save.",
  );
  assert(draft, "Choose or create a catalog first");
  assert(!busy, "Wait for the current operation to finish");
  validate(draft);
  if (baseline && JSON.stringify(draft) !== JSON.stringify(baseline))
    assert(
      draft.contentVersion !== baseline.contentVersion,
      "Change Content version in catalog metadata before saving changed facts",
    );
  for (const asset of draft.assets)
    assert(
      uploads.has(asset.id) || assetSources[asset.id],
      `Missing actual picture bytes for ${asset.id}; attach a local image or import its bundle`,
    );
  const nextUploads = [...uploads.values()].filter((u) =>
    draft.assets.some((a) => a.id === u.assetId),
  );
  assert(
    nextUploads.length <= LIMITS.assets,
    "A save can contain at most 32 new images",
  );
  assert(
    nextUploads.reduce((n, u) => n + bytesFromBase64(u.base64).length, 0) <=
      LIMITS.totalAssetBytes,
    "New image batch exceeds 8 MiB",
  );
  stage = {
    packKey: key,
    expectedRevision,
    pack: clone(draft),
    uploads: clone(nextUploads),
    generation,
  };
  showDiff($("#stage-diff"), baseline, draft);
  $("#stage-target").textContent =
    `${baseline ? "Update" : "Create"} repository catalog ${draft.id}. ${nextUploads.length} new picture payloads. Review the facts, sources and rights. This does not commit, push or alter private profiles.`;
  $("#content-stage").hidden = false;
  $("#save-repository").disabled = blocked;
  $("#stage-title").focus();
  clearError();
  status("Validated save preview ready. Nothing has been written yet.");
}
async function save() {
  assert(
    !media?.hasPending(),
    "Attach or cancel the prepared picture before saving other changes.",
  );
  assert(
    !blocked,
    "Resolve repository recovery before saving; download the draft first",
  );
  const candidate = stage;
  assert(
    candidate && candidate.generation === generation,
    "Save preview expired. Validate and preview again",
  );
  await withBusy(async () => {
    status("Saving validated repository files…");
    const { generation: ignored, ...body } = candidate;
    const result = await api("/api/save", body);
    assert(
      result.ok === true &&
        result.entry?.pack &&
        typeof result.revision === "string",
      "Save response was incomplete. Reload only after downloading your draft and checking the repository",
    );
    savedHere = true;
    repositoryRevision = result.revision;
    const i = entries.findIndex((entry) => entry.key === result.entry.key);
    if (i < 0) entries.push(result.entry);
    else entries[i] = result.entry;
    loadEntry(result.entry);
    $("#saved-paths").replaceChildren();
    for (const path of (result.paths || []).slice(0, 100))
      $("#saved-paths").append(node("li", path));
    if ((result.paths || []).length > 100)
      $("#saved-paths").append(
        node("li", `${result.paths.length - 100} more paths; review with Git`),
      );
    status(
      `Saved to repository · ${result.paths?.length || 0} managed files. No commit or push performed. Rebuild the public guide when ready.`,
    );
  });
  await changes().catch((reason) => {
    $("#changes-note").textContent =
      `Saved successfully; file change summary unavailable: ${reason.message}`;
  });
}
async function changes() {
  const result = await api("/api/changes");
  $("#file-changes").replaceChildren();
  for (const entry of (result.files || []).slice(0, 100))
    $("#file-changes").append(node("li", `${entry.status}: ${entry.path}`));
  $("#changes-note").textContent =
    `${result.gitAvailable ? "Git" : "Managed metadata"} summary · ${(result.files || []).length} entries${result.truncated || (result.files || []).length > 100 ? " (bounded/truncated)" : ""}. Unrelated files and private data are excluded.`;
}
function requestRemoval(group, index) {
  assert(!busy, "Wait for the current operation to finish");
  const record = draft?.[group]?.[index];
  assert(record, "Select a record first");
  const uses = recordUses(draft, record.id, {
    ...assetSources,
    ...Object.fromEntries(uploads),
  }).filter((use) => use.group !== group || use.index !== index);

  removal = { group, id: record.id, generation, allowed: uses.length === 0 };
  $("#remove-summary").textContent =
    `${record.name || record.title || record.id}: ${uses.length ? "Removal blocked. Reassign or remove these references explicitly first." : "No dependents found. Removal changes only the draft until Save to repository."}`;
  $("#remove-usage").replaceChildren();
  for (const use of uses.slice(0, 100))
    $("#remove-usage").append(
      node(
        "li",
        `${use.name} · ${use.path.endsWith(".parentAssetId") ? "thumbnail parent relationship · " : ""}${use.path}`,
      ),
    );
  $("#confirm-remove").disabled = uses.length > 0;
  $("#remove-stage").hidden = false;
  $("#remove-stage").scrollIntoView({ block: "nearest" });
  $("#cancel-remove").focus();
}
function downloadDraft() {
  assert(draft, "No draft to download");
  const data = {
    format: "dmz-repository-draft-recovery",
    version: 1,
    warning:
      "Unvalidated recovery draft; not a public pack import or successful save. Use Repository recovery draft import for strict preview. Preserve this original if validation fails.",
    packKey: key,
    expectedRevision,
    pack: draft,
    uploads: [...uploads.values()],
  };
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    ),
    a = node("a");
  a.href = url;
  a.download = "dmz-repository-UNSAVED-recovery.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function discardAllowed(
  message = "Discard the unsaved draft? Download it first if needed.",
) {
  return (!dirty && !media?.hasPending()) || confirm(message);
}
function newCatalog() {
  const title = $("#new-catalog-title").value.trim();
  assert(title, "Enter a catalog title");
  if (!discardAllowed()) return;
  const isFictional = $("#new-catalog-fictional").checked,
    next = defaultFieldValue(schema, schema),
    baseId = `community:${slug(title)}`;
  let id = $("#new-catalog-id").value.trim() || baseId,
    n = 2;
  if (!$("#new-catalog-id").value.trim())
    while (entries.some((entry) => entry.pack.id === id))
      id = `${baseId}-${n++}`;
  assert(ID.test(id), "Catalog ID must use a lowercase namespace:name");
  assert(
    !entries.some((entry) => entry.pack.id === id),
    "That catalog ID already exists; select it instead",
  );
  Object.assign(next, {
    id,
    title,
    contentVersion: $("#new-catalog-version").value.trim(),
    game: {
      id: isFictional
        ? "fictional-training"
        : $("#new-catalog-game").value.trim() || "unknown",
      mode: $("#new-catalog-mode").value.trim() || "unknown",
      build: $("#new-catalog-build").value.trim() || "unknown",
    },
    description: "",
    coverage: {
      expectedTotal: null,
      note: isFictional
        ? "Fictional training catalog. Not real game facts."
        : "Incomplete contributor catalog; unknown facts remain unknown.",
    },
  });
  assert(next.contentVersion, "Enter a content version");
  validatePack(next, schema, { profile: "published" });
  invalidate();
  key = uniqueKey(title);
  draft = next;
  baseline = null;
  assetSources = {};
  uploads = new Map();
  expectedRevision = repositoryRevision;
  dirty = true;
  guided.resetPagination();
  media.reset();
  renderChoices();
  $("#editor-section").value = "metadata";
  render();
  $("#new-catalog-panel").open = false;
  clearError();
  status(
    `New unsaved catalog ${id}. Add records, then validate and save explicitly.`,
  );
}
async function importFile(recovery = false) {
  const file = $(recovery ? "#import-recovery" : "#import-content").files[0];
  if (!file) return;
  assert(!busy, "Wait for the current operation to finish");
  assert(
    file.size <= TRANSFER_LIMITS.envelopeBytes,
    "Portable import exceeds 20 MiB",
  );
  invalidate();
  const workspace = generation,
    signal = operation.signal,
    destination = $("#import-destination").value;
  status(
    "Validating import and normalizing bundled images. The current draft is unchanged.",
  );
  const text = await file.text();
  if (workspace !== generation) return;
  const parsed = recovery
    ? await parseRecoveryDraft(text, schema, {
        destination,
        key,
        currentPack: baseline,
        assetSources,
        entries,
        decodeRaster,
        signal,
      })
    : await parseTransfer(text, schema, { decodeRaster, signal });
  if (workspace !== generation) return;
  if (destination === "existing")
    assert(
      draft && parsed.pack.id === draft.id,
      "Import identity differs. Choose Import as a new repository catalog explicitly",
    );
  else
    assert(
      !entries.some((entry) => entry.pack.id === parsed.pack.id),
      "This catalog already exists. Select it and use Replace selected draft",
    );
  const next = clone(parsed.pack),
    nextUploads = new Map(),
    nextSources = recovery
      ? clone(parsed.sources)
      : destination === "existing"
        ? clone(assetSources)
        : {};
  const rights = next.assets.filter(
    (asset) =>
      asset.redistributionAllowed !== true ||
      !asset.rightsHolder?.trim() ||
      !asset.license?.trim() ||
      !asset.attribution?.trim(),
  );
  assert(
    !rights.length,
    "Every imported picture needs redistribution rights and attribution",
  );
  for (const payload of parsed.payloads) {
    const asset = next.assets.find((entry) => entry.id === payload.assetId),
      normalized = await normalizeRaster(bytesFromBase64(payload.base64), {
        keepOriginal: true,
        signal,
      });
    if (workspace !== generation) return;
    Object.assign(asset, {
      path: `assets/${asset.id.replace(":", "-")}-${normalized.sha256}.png`,
      mime: normalized.mime,
      bytes: normalized.bytes.length,
      width: normalized.width,
      height: normalized.height,
      sha256: normalized.sha256,
    });
    nextUploads.set(asset.id, {
      assetId: asset.id,
      base64: base64FromBytes(normalized.bytes),
      category: "other",
    });
  }
  if (!recovery && !parsed.selfContained && destination === "existing") {
    for (const asset of next.assets) {
      const previousAsset = draft.assets.find((entry) => entry.id === asset.id);
      if (!previousAsset || previousAsset.sha256 !== asset.sha256)
        delete nextSources[asset.id];
      else if (uploads.has(asset.id))
        nextUploads.set(asset.id, clone(uploads.get(asset.id)));
    }
  }
  validatePack(next, schema, { profile: "published" });
  assert(
    [...nextUploads.values()].reduce(
      (sum, upload) => sum + bytesFromBase64(upload.base64).length,
      0,
    ) <= LIMITS.totalAssetBytes,
    "Normalized pictures exceed 8 MiB",
  );
  if (workspace !== generation || signal.aborted) return;
  const missing = next.assets.filter(
    (asset) => !nextUploads.has(asset.id) && !nextSources[asset.id],
  );
  imported = {
    pack: next,
    uploads: nextUploads,
    sources: nextSources,
    destination,
    generation: workspace,
    key: destination === "existing" ? key : uniqueKey(next.title || next.id),
  };
  $("#import-summary").textContent =
    `${recovery ? "Recovery draft · " : ""}${next.title} · ${next.id} · version ${next.contentVersion}. ${recovery ? `Historical revision (abbreviated) ${parsed.historicalRevision.slice(0, 12)}; current revision protection retained. ` : ""}${GROUPS.reduce((n, group) => n + next[group].length, 0)} records; ${next.assets.length} pictures; ${nextUploads.size} normalized image payloads. ${missing.length ? `${missing.length} pictures have no bytes and will block repository save until supplied.` : "Image bytes are available."} Apply changes only the draft; review rights and visible image content before repository saving.`;
  showDiff($("#import-diff"), destination === "existing" ? draft : null, next);
  $("#import-rights").checked = false;
  $("#import-rights-label").hidden = next.assets.length === 0;
  $("#import-stage").hidden = false;
  $("#import-title").focus();
  status(
    "Import preview ready. Current draft and repository remain unchanged.",
  );
}
function action(selector, fn) {
  $(selector).addEventListener("click", () =>
    Promise.resolve()
      .then(() => {
        assert(!busy, "Wait for the current operation to finish");
        return fn();
      })
      .catch(fail),
  );
}
async function loadCatalog() {
  const [session, catalog] = await Promise.all([
    api("/api/session"),
    api("/api/catalog"),
  ]);
  token = session.token;
  schema = catalog.schema;
  entries = catalog.entries;
  repositoryRevision = catalog.revision;
  blocked = !!catalog.recovery;
  assert(
    Array.isArray(entries) && entries.length <= 32,
    "Invalid repository catalog response",
  );
  if (!guided) {
    guided = createGuidedEditor({
      onError: fail,
      schema,
      getDraft: () => draft,
      mutateDraft,
      searchPlaceholder: "Search this repository catalog",
      isIdentityReadOnly: (path, value) =>
        path.length === 3 &&
        path[2] === "id" &&
        !!baseline?.[path[0]]?.some((record) => record.id === value),
      onRender: () => {
        $("#new-record-controls").hidden =
          $("#editor-section").value === "metadata";
        media?.render();
        renderSavedPreview();
      },
    });
    media = createStudioMedia({
      schema,
      getDraft: () => draft,
      getKey: () => key,
      getUploads: () => uploads,
      getAssetSources: () => assetSources,
      getSelection: selected,
      getGeneration: () => generation,
      isLocked: () => busy,
      mutateDraft,
      uniqueId,
      onStatus: status,
      onError: fail,
      onRender: render,
      onRemove: requestRemoval,
      onSelect: selectRecord,
    });
  }
  // Resolve before loading any draft: stale or hostile links never fall back.
  const target =
    initialTarget && !initialTargetApplied
      ? resolveAuthorTarget(entries, initialTarget)
      : null;
  loadEntry(
    target?.entry ||
      entries.find((entry) => entry.key === key) ||
      entries[0] ||
      null,
  );
  if (target) {
    selectRecord(target.group, target.index);
    const context = $("#entry-context");
    context.hidden = false;
    $("#entry-identity").textContent =
      `${target.entry.pack.id} · ${target.record.id}`;
    $("#return-record").href = previewPath(initialTarget);
    initialTargetApplied = true;
  }
  $("#recovery-help").hidden = !blocked;
  if (blocked) {
    const reason = new Error(
      "A repository recovery is pending. Export any draft and follow the local recovery instructions before saving",
    );
    reason.code = "RECOVERY_REQUIRED";
    fail(reason);
  }
}
async function start() {
  initialTarget = parseAuthorTarget(new URLSearchParams(location.search));
  $("#pack-select").addEventListener("change", () => {
    if (
      busy ||
      !discardAllowed(
        "Discard the unsaved draft and switch repository catalogs?",
      )
    ) {
      $("#pack-select").value = key;
      return;
    }
    const entry = entries.find(
      (value) => value.key === $("#pack-select").value,
    );
    if (entry) loadEntry(entry);
  });
  window.addEventListener("beforeunload", (event) => {
    if (dirty || busy || media?.hasPending()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  $("#editor-section").addEventListener("change", render);
  $("#editor-record").addEventListener("change", () => guided.renderFields());
  $("#guided-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      preview();
    } catch (reason) {
      fail(reason);
    }
  });
  action("#create-catalog", newCatalog);
  action("#add-record", () => {
    const group = $("#editor-section").value;
    assert(GROUPS.includes(group), "Choose a record section first");
    const name = $("#new-record-name").value.trim();
    assert(
      name,
      "Enter a name for the new record; its stable ID is generated from that name",
    );
    assert(
      GROUPS.reduce((n, g) => n + draft[g].length, 0) < LIMITS.records,
      "Record limit reached",
    );
    const authorSchema = schemaForVersion(schema, draft.schemaVersion);
    const record = defaultFieldValue(
      authorSchema,
      authorSchema.properties[group].items,
      {
        fictional: draft.game.id === "fictional-training",
      },
    );
    record.id = uniqueId(name);
    if (Object.hasOwn(record, "name")) record.name = name;
    else if (Object.hasOwn(record, "title")) record.title = name;
    else if (Object.hasOwn(record, "label")) record.label = name;
    mutateDraft((pack) => pack[group].push(record));
    $("#new-record-name").value = "";
    render();
    $("#editor-record").value = String(draft[group].length - 1);
    guided.renderFields();
  });
  action("#remove-record", () => {
    const selectedRecord = selected();
    assert(selectedRecord, "Choose a record first");
    requestRemoval(selectedRecord.group, selectedRecord.index);
  });
  action("#confirm-remove", () => {
    const candidate = removal;
    assert(
      candidate?.allowed && candidate.generation === generation,
      "Removal is blocked or its preview expired",
    );
    mutateDraft((pack) => {
      const index = pack[candidate.group].findIndex(
        (r) => r.id === candidate.id,
      );
      assert(index >= 0, "Record no longer exists");
      pack[candidate.group].splice(index, 1);
      if (candidate.group === "assets") uploads.delete(candidate.id);
    });
    render();
    status(
      "Record removed from the unsaved draft. Repository files remain unchanged until saving.",
    );
  });
  action("#cancel-remove", () => {
    removal = null;
    $("#remove-stage").hidden = true;
    $("#remove-record").focus();
  });
  action("#review-again", preview);
  action("#apply-review-version", () => {
    const version = $("#review-version").value.trim();
    assert(
      version && version.length <= 80,
      "Enter a content version, up to 80 characters",
    );
    mutateDraft((pack) => {
      pack.contentVersion = version;
    });
    $("#pack-note").textContent =
      `${draft.title} · ${draft.id} · ${draft.contentVersion} · Unsaved repository draft`;
    status(
      "Draft version changed. Old preview expired; validate and preview again before saving.",
    );
  });
  action("#save-repository", save);
  action("#cancel-content", () => {
    stage = null;
    $("#content-stage").hidden = true;
    $("#preview-content").focus();
    status("Save preview canceled; the unsaved draft is retained.");
  });
  action("#export-draft", downloadDraft);
  action("#discard-draft", () => {
    if (discardAllowed())
      loadEntry(
        entries.find((entry) => entry.key === key) || entries[0] || null,
      );
  });
  action("#reload-repository", async () => {
    if (
      discardAllowed(
        "Reload repository and discard this draft? Download it first, especially after a conflict.",
      )
    )
      await withBusy(loadCatalog);
  });
  action("#refresh-changes", changes);
  action("#refresh-json", () => {
    assert(draft, "No draft loaded");
    $("#advanced-json").value = JSON.stringify(draft, null, 2);
  });
  action("#load-json", () => {
    const next = parseBounded($("#advanced-json").value);
    assert(
      draft &&
        next.id === draft.id &&
        next.schemaVersion === draft.schemaVersion,
      "Existing catalog identity/schemaVersion cannot change",
    );
    validate(next);
    mutateDraft(() => {
      draft = next;
      for (const id of uploads.keys())
        if (!draft.assets.some((asset) => asset.id === id)) uploads.delete(id);
    });
    render();
  });
  for (const selector of ["#import-content", "#import-recovery"])
    $(selector).addEventListener("change", () => {
      const pending = importFile(selector === "#import-recovery"),
        initiated = generation;
      pending.catch((reason) => {
        if (initiated === generation) fail(reason);
      });
    });
  $("#import-destination").addEventListener("change", () => {
    invalidate();
    status(
      "Import destination changed. Choose the file again for a fresh preview.",
    );
  });
  action("#apply-import", () => {
    const candidate = imported;
    assert(
      candidate && candidate.generation === generation,
      "Import preview expired; choose the file again",
    );
    assert(
      !candidate.pack.assets.length || $("#import-rights").checked,
      "Review imported pictures and confirm permission and privacy before applying the import",
    );
    if (
      !discardAllowed(
        "Replace the current unsaved draft with this import? Repository files remain unchanged.",
      )
    )
      return;
    invalidate();
    draft = candidate.pack;
    key = candidate.key;
    uploads = candidate.uploads;
    assetSources = candidate.sources;
    if (candidate.destination === "new") baseline = null;
    dirty = true;
    guided.resetPagination();
    media.reset();
    renderChoices();
    render();
    status(
      "Import applied to unsaved draft only. Review and save explicitly when ready.",
    );
  });
  action("#cancel-import", () => {
    invalidate();
    $("#import-stage").hidden = true;
    $("#import-content").value = "";
    $("#import-recovery").value = "";
    status("Import canceled; prior draft and repository unchanged.");
    $("#import-content").focus();
  });
  await withBusy(loadCatalog);
  if (initialTarget?.intent === "remove") {
    const selection = selected();
    requestRemoval(selection.group, selection.index);
  } else if (initialTarget) {
    const focus = $(
      initialTarget.intent === "images" ? "#picture-file" : "#editor-record",
    );
    focus.scrollIntoView({ block: "center" });
    focus.focus({ preventScroll: true });
  }
  await changes();
}
start().catch(fail);
