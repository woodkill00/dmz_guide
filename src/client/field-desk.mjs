import "./quick-tracker.mjs";
import { bytesFromBase64 } from "../content/portable.mjs";
import { spoilerGuard } from "../domain/progression.mjs";
import {
  init,
  state,
  persist,
  esc,
  error,
  download,
  registerDraftGuard,
} from "./common.mjs";
import {
  fieldCandidate,
  previewFieldChanges,
  previewTransfer,
  previewReturnCarried,
  previewRunChanges,
  previewFieldUndo,
  addDiscovery,
} from "../domain/field-ops.mjs";
import { matchScanText, combineScanRows } from "../domain/stash-scan.mjs";
import { quickCollect } from "../domain/quick-collect.mjs";
import { buildTargetNeeds } from "../domain/build-targets.mjs";
import { itemMapAreas } from "../domain/item-map-areas.mjs";
import { itemOverview } from "../ui/item-summary.mjs";
import { validateCollectionHandoff } from "../domain/collection-handoff.mjs";
import { parseBounded } from "../content/limits.mjs";
import { createRunReviewQueue } from "./run-review-queue.mjs";
import {
  startMatchSession,
  previewMatchSession,
  previewMatchUndo,
} from "../domain/match-session.mjs";
import { loadRunPlans } from "../domain/run-plans.mjs";
import { validateProfile, previewProfile } from "../domain/profile.mjs";
import {
  decodeStashImage,
  recognizeStash,
  stopStashOCR,
} from "./stash-ocr.mjs";
import {
  makeFieldPhoto,
  validateFieldPhoto,
  readFieldPhoto,
  saveFieldPhoto,
} from "./field-photos.mjs";
const $ = (selector) => document.querySelector(selector),
  n = (value) =>
    value == null ? "Not entered" : Number(value).toLocaleString("en-US");
let scanJob = 0;
let applying = false,
  editingDiscovery = null,
  cachedPack = null,
  cachedSpoilers = null,
  cachedItems = [],
  cachedGuard = null;
let scanRows = [],
  runRows = [],
  matchSession = null,
  matchObjectives = [],
  matchStops = [],
  matchPlans = null,
  staged = null,
  dirty = false,
  recognizing = false,
  generation = 0,
  photoURLs = [];
let previewURL = null;
function visibleItems() {
  if (cachedPack !== state.pack || cachedSpoilers !== state.profile.spoilers) {
    cachedPack = state.pack;
    cachedSpoilers = state.profile.spoilers;
    cachedGuard = spoilerGuard(state.pack, !!state.profile.spoilers);
    cachedItems = state.pack.items
      .filter(
        (item) =>
          state.profile.spoilers ||
          (!item.spoiler &&
            !cachedGuard.limited &&
            !cachedGuard.contains(item.id) &&
            !cachedGuard.contains(item.name)),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return cachedItems;
}
const safeText = (value) => {
  visibleItems();
  return cachedGuard.text(String(value || ""));
};
const name = (id) =>
  visibleItems().find((item) => item.id === id)?.name ||
  "Retired / protected item";
const options = (chosen = "") =>
  '<option value="">Choose item…</option>' +
  visibleItems()
    .map(
      (item) =>
        `<option value="${esc(item.id)}"${chosen === item.id ? " selected" : ""}>${esc(item.name)}</option>`,
    )
    .join("");
const table = (headers, rows) =>
  `<div class="field-table-wrap"><table class="field-table"><thead><tr>${headers.map((text) => `<th scope="col">${text}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
function message(text) {
  $("#field-status").textContent = text;
}
function report(reason) {
  error(reason);
  message(reason.message || String(reason));
}
const reviewQueue = createRunReviewQueue({
  state,
  persist,
  visibleItems,
  esc,
  report,
});
function releasePhotos() {
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = null;
  for (const url of photoURLs) URL.revokeObjectURL(url);
  photoURLs = [];
}
function invalidateReview() {
  staged = null;
  $("#field-review").hidden = true;
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = null;
}
function discard() {
  generation++;
  scanJob++;
  void stopStashOCR();
  recognizing = false;
  scanRows = [];
  runRows = [];
  matchSession = null;
  matchObjectives = [];
  matchStops = [];
  staged = null;
  editingDiscovery = null;
  dirty = false;
  $("#field-review").hidden = true;
  $("#scan-files").value = "";
  $("#scan-text").value = "";
  $("#discovery-form").reset();
  $("#scan-progress").textContent = "";
  renderScan();
  renderRun();
}
registerDraftGuard({
  isDirty: () => dirty || recognizing,
  save: async () => {
    message(
      "Review and confirm the staged field operation, or discard it, before leaving.",
    );
    $("#field-review").focus();
    return false;
  },
  discard,
  export: () => {
    if (staged) download("pending-field-operation.json", staged.candidate);
  },
});
function renderScan() {
  $("#scan-rows").innerHTML = scanRows.length
    ? table(
        ["Use", "Recognized text", "Item", "Total", "Review"],
        scanRows
          .map(
            (row, index) =>
              `<tr data-scan-row="${index}"><td><input type="checkbox" data-scan-select="${index}" aria-label="Use recognized row ${index + 1}"${row.selected ? " checked" : ""}></td><td>${esc(row.raw)}</td><td><select data-scan-item="${index}" aria-label="Item for row ${index + 1}">${options(row.itemId)}</select></td><td><input data-scan-count="${index}" aria-label="Total for row ${index + 1}" type="number" min="0" max="2000000" step="1" value="${row.quantity ?? ""}"></td><td>${esc(row.confidence)}</td></tr>`,
          )
          .join(""),
      )
    : "";
}
function renderRun() {
  $("#match-status").textContent = matchSession
    ? `${matchSession.name} · profile revision ${matchSession.revision}${matchSession.planId ? ` · preparation plan ${matchPlans?.plans.find((row) => row.id === matchSession.planId)?.name || matchSession.planId} at plan revision ${matchSession.planRevision}` : ""}. ${matchObjectives.length} objective reports · ${matchStops.length} stops.`
    : "No match started.";
  const matches = state.profile?.fieldOps?.matches || [];
  $("#match-history").innerHTML = matches.length
    ? `<details><summary>Saved matches (${matches.length})</summary><ul>${matches
        .slice()
        .reverse()
        .map(
          (match) =>
            `<li><strong>${esc(match.name)}</strong> · ${esc(new Date(match.at).toLocaleString())}${match.planId ? ` · plan ${esc(match.planId)} at revision ${match.planRevision}` : ""} · ${match.progress.length} objectives · ${match.stops.length} stops${match.undoneAt ? " · undone" : ` <button type="button" data-undo-match="${esc(match.id)}">Preview undo</button>`}${match.stops.length ? `<details><summary>Visited stops</summary><ul>${match.stops.map((stop) => `<li>${esc(stop)}</li>`).join("")}</ul></details>` : ""}</li>`,
        )
        .join("")}</ul></details>`
    : "";
  $("#run-rows").innerHTML = runRows.length
    ? table(
        ["Item", "Pool", "Report", "Amount", ""],
        runRows
          .map(
            (row, index) =>
              `<tr><td>${esc(name(row.itemId))}</td><td>${esc(row.pool)}</td><td>${esc(row.action)}</td><td>${n(row.quantity)}</td><td><button type="button" data-remove-run="${index}">Remove</button></td></tr>`,
          )
          .join(""),
      )
    : "<p>No finds staged.</p>";
  if (matchObjectives.length || matchStops.length) {
    $("#run-rows").insertAdjacentHTML(
      "beforeend",
      `<ul>${matchObjectives.map((row, index) => `<li>${esc(state.pack.objectives.find((o) => o.id === row.id)?.name || "Objective")} · ${esc(row.status)} <button type="button" data-remove-objective="${index}">Remove</button></li>`).join("")}${matchStops.map((stop, index) => `<li>Stop: ${esc(stop)} <button type="button" data-remove-stop="${index}">Remove</button></li>`).join("")}</ul>`,
    );
  }
}
function renderCarried() {
  const query = $("#field-query").value.trim().toLowerCase(),
    items = visibleItems().filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  $("#carried-items").innerHTML =
    table(
      ["Item", "Stash", "Carried", "Move quantity", "Transfer"],
      items
        .slice(0, 50)
        .map(
          (item) =>
            `<tr><td><a href="/local/?pack=${encodeURIComponent(state.pack.id)}&amp;id=${encodeURIComponent(item.id)}">${esc(item.name)}</a></td><td>${n(state.profile.inventory[item.id])}</td><td>${n(state.profile.fieldOps?.carried?.[item.id])}</td><td><input type="number" min="1" max="2000000" step="1" value="1" data-transfer-count="${esc(item.id)}" aria-label="Transfer quantity for ${esc(item.name)}"></td><td><button type="button" data-transfer-out="${esc(item.id)}">Carry →</button> <button type="button" data-transfer-in="${esc(item.id)}">← Stash</button></td></tr>`,
        )
        .join(""),
    ) +
    `<p class="field-meta">${items.length > 50 ? `First 50 of ${items.length}; search to narrow. ` : ""}${state.profile.fieldOps ? "History enabled." : "History will begin with your first confirmed field operation."}</p>`;
  $("#field-enable").disabled = !!state.profile.fieldOps;
}
function planCandidates() {
  const scope = $("#plan-scope").value;
  return scope === "builds"
    ? buildTargetNeeds(state.pack, state.profile).combined
    : quickCollect(state.pack, state.profile, { crafting: true }).items;
}
function renderPlan() {
  const rows = planCandidates().filter(
    (row) => Number.isSafeInteger(row.remaining) && row.remaining > 0,
  );
  $("#plan-rows").innerHTML =
    `<p>${rows.length} known shortage rows. Unknown quantities require review in Inventory.</p><div class="field-plan-list">${rows.map((row) => `<label><input type="checkbox" data-plan-item="${esc(row.id)}" checked><span>${esc(row.name)} · ${row.minimum ? "at least " : ""}${n(row.remaining)}</span></label>`).join("")}</div>`;
}
function collectionPlan() {
  const selected = new Set(
    [...document.querySelectorAll("[data-plan-item]:checked")].map(
      (node) => node.dataset.planItem,
    ),
  );
  return validateCollectionHandoff({
    kind: "dmz-collection-plan",
    version: 1,
    packId: state.pack.id,
    contentVersion: state.pack.contentVersion,
    createdAt: new Date().toISOString(),
    scope: $("#plan-scope").value,
    items: planCandidates()
      .filter((row) => selected.has(row.id))
      .map((row) => {
        const item = state.pack.items.find((item) => item.id === row.id);
        return {
          itemId: row.id,
          name: item.name,
          needed: row.remaining,
          minimum: !!row.minimum,
          areas: itemMapAreas(item, state.pack, itemOverview(item, state.pack))
            .filter((area) => area.mapId === "mw4:hajin")
            .map((area) => ({ id: area.id, name: area.name })),
        };
      }),
  });
}
function renderHistory() {
  const history = state.profile.fieldOps?.history || [];
  $("#field-history").innerHTML = history.length
    ? history
        .filter((event) =>
          event.changes.every((change) =>
            visibleItems().some((item) => item.id === change.itemId),
          ),
        )
        .slice()
        .reverse()
        .map(
          (event) =>
            `<details class="field-history-entry"><summary>${esc(safeText(event.label))} · ${esc(new Date(event.at).toLocaleString())} · ${event.changes.length} changes</summary>${table(["Item", "Pool", "Before", "After"], event.changes.map((change) => `<tr><td>${esc(name(change.itemId))}</td><td>${esc(change.pool)}</td><td>${n(change.before)}</td><td>${n(change.after)}</td></tr>`).join(""))}${state.profile.fieldOps?.matches?.some((match) => match.id === event.id) ? "<p>Use Saved matches above to undo stock and objectives together.</p>" : `<button type="button" data-undo-field="${esc(event.id)}">Preview undo</button>`}</details>`,
        )
        .join("")
    : "<p>No recorded quantity changes yet.</p>";
}
async function renderDiscoveries() {
  releasePhotos();
  const token = generation,
    entries = state.profile.fieldOps?.discoveries || [];
  $("#discovery-list").innerHTML =
    entries
      .filter((entry) =>
        visibleItems().some((item) => item.id === entry.itemId),
      )
      .map(
        (entry) =>
          `<details class="field-history-entry" id="discovery-${esc(entry.id)}"><summary>${esc(name(entry.itemId))} · ${esc(safeText(entry.place || "Place not specified"))} · ${esc(new Date(entry.at).toLocaleDateString())}</summary><p>Player-reported · ${esc(safeText(entry.container || "Container not recorded"))} · ${n(entry.quantity)}</p><p>${esc(safeText(entry.notes))}</p>${entry.locationId ? `<a href="/maps/?pack=${encodeURIComponent(state.pack.id)}&amp;location=${encodeURIComponent(entry.locationId)}">Location reference</a>` : ""}<button type="button" data-edit-discovery="${esc(entry.id)}">Edit observation</button><button type="button" data-remove-discovery="${esc(entry.id)}">Preview remove observation</button>${entry.photoId ? `<div data-discovery-photo="${esc(entry.photoId)}"><button type="button" data-show-photo="${esc(entry.photoId)}">Show saved photo</button></div>` : ""}</details>`,
      )
      .join("") || "<p>No private discoveries recorded.</p>";
  if (token !== generation) return;
  const linked = /^#discovery-([a-zA-Z0-9:._-]{1,120})$/.exec(location.hash);
  if (linked) {
    const details = document.getElementById(`discovery-${linked[1]}`);
    if (details) {
      details.open = true;
      details.querySelector("summary")?.focus({ preventScroll: true });
      details.scrollIntoView({ block: "center" });
    }
  }
}
function render() {
  generation++;
  releasePhotos();
  discard();
  matchPlans = null;
  $("#match-plan").innerHTML = '<option value="">Loading saved plans…</option>';
  $("#run-item").innerHTML = options();
  $("#match-objective").innerHTML =
    '<option value="">Choose objective…</option>' +
    state.pack.objectives
      .filter((objective) => !objective.spoiler || state.profile.spoilers)
      .map(
        (objective) =>
          `<option value="${esc(objective.id)}">${esc(objective.name)}</option>`,
      )
      .join("");
  $("#discovery-item").innerHTML = options();
  $("#discovery-location").innerHTML =
    '<option value="">No linked location</option>' +
    state.pack.locations
      .filter((location) => !location.spoiler || state.profile.spoilers)
      .map(
        (location) =>
          `<option value="${esc(location.id)}">${esc(location.name)}</option>`,
      )
      .join("");
  const requested = new URL(location.href).searchParams.get("item");
  const item = visibleItems().find((item) => item.id === requested);
  if (item) {
    $("#field-query").value = item.name;
    $("#run-item").value = item.id;
    $("#discovery-item").value = item.id;
  }
  renderCarried();
  renderPlan();
  renderHistory();
  const planToken = generation;
  loadRunPlans(state.pack)
    .then((doc) => {
      if (planToken !== generation || doc.packId !== state.pack.id) return;
      matchPlans = doc;
      $("#match-plan").innerHTML =
        '<option value="">No saved plan</option>' +
        doc.plans
          .map(
            (plan) =>
              `<option value="${esc(plan.id)}">${esc(plan.name)}</option>`,
          )
          .join("");
    })
    .catch(() => {
      if (planToken === generation)
        $("#match-plan").innerHTML =
          '<option value="">Saved plans unavailable</option>';
    });
  void renderDiscoveries();
  void reviewQueue.load();
}
function stage(preview, meta, extra = {}) {
  staged = {
    ...preview,
    revision: state.revision,
    packId: state.pack.id,
    meta,
    ...extra,
  };
  dirty = true;
  const allChanges = preview.changes || [];
  const changes = allChanges.filter((change) =>
    visibleItems().some((item) => item.id === change.itemId),
  );
  $("#field-review").innerHTML =
    `<h2>Review: ${esc(meta.label)}</h2>${changes.length ? table(["Item", "Pool", "Before", "After"], changes.map((change) => `<tr><td>${esc(name(change.itemId))}</td><td>${esc(change.pool)}</td><td>${n(change.before)}</td><td>${n(change.after)}</td></tr>`).join("")) : "<p>This updates private field records. No unlisted quantities change.</p>"}${allChanges.length !== changes.length ? "<p>Protected quantity changes are withheld. Review spoiler visibility in Settings if needed.</p>" : ""}${extra.restore ? "<p>Restores the reviewed profile, carried counts, history and discoveries. Existing previous-snapshot recovery is retained.</p>" : ""}<div class="field-inline"><button id="field-confirm" type="button">Confirm local save</button><button id="field-cancel-review" type="button">Cancel review</button><button id="field-export-pending" type="button">Export pending profile</button></div>`;
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = null;
  if (extra.discovery) {
    const entry = extra.discovery,
      description = document.createElement("p");
    description.textContent = `${name(entry.itemId)} · ${entry.place || "Place not specified"} · ${entry.container || "Container not specified"} · ${entry.quantity == null ? "Quantity not entered" : entry.quantity}. ${entry.notes}`;
    $("#field-review").append(description);
  }
  if (extra.photos?.length === 1 && !extra.restore) {
    const photo = extra.photos[0],
      image = document.createElement("img");
    previewURL = URL.createObjectURL(
      new Blob([bytesFromBase64(photo.base64)], { type: photo.mime }),
    );
    image.src = previewURL;
    image.alt = "Discovery photo to be saved privately";
    image.className = "field-photo";
    $("#field-review").append(image);
  }
  $("#field-review").hidden = false;
  $("#field-review").focus();
  $("#field-review").scrollIntoView({ block: "start" });
}
async function scanFiles(files) {
  if (recognizing) throw Error("Wait for recognition or cancel it first");
  if (!files.length || files.length > 12)
    throw Error("Choose 1–12 screenshots per batch");
  invalidateReview();
  recognizing = true;
  dirty = true;
  const token = generation,
    job = ++scanJob,
    pack = state.pack;
  try {
    for (const file of files) {
      const { canvas, fingerprint } = await decodeStashImage(file);
      if (
        state.profile.fieldOps?.receipts.includes(fingerprint) ||
        scanRows.some((row) => row.fingerprint === fingerprint)
      ) {
        message("Skipped an already imported or staged screenshot.");
        continue;
      }
      if (token !== generation || job !== scanJob) return;
      const result = await recognizeStash(canvas, (status, percent) => {
        $("#scan-progress").textContent = `${status} · ${percent}%`;
      });
      if (token !== generation || pack !== state.pack || job !== scanJob)
        return;
      $("#scan-text").value = result.text;
      const rows = matchScanText(result.text, pack, {
        spoilers: state.profile.spoilers,
      }).filter((row) => row.candidates.length || row.quantity !== null);
      if (rows.length > 100 || scanRows.length + rows.length > 200)
        throw Error(
          "Too many review rows. Crop the image or import a smaller batch (100 rows per image / 200 per batch).",
        );
      scanRows.push(
        ...rows.map((row) => ({
          ...row,
          fingerprint,
          pool: $("#scan-pool").value,
          selected: !!row.itemId && row.quantity !== null,
          confidence: `${row.confidence} · image OCR ${Math.round(result.confidence)}%`,
        })),
      );
      renderScan();
    }
    $("#scan-progress").textContent =
      "Recognition complete. Review selected names and absolute totals before saving.";
  } catch (reason) {
    if (token !== generation || job !== scanJob) return;
    throw reason;
  } finally {
    if (token === generation && job === scanJob) recognizing = false;
  }
}
async function completeBackup(profile = state.profile, extraPhotos = []) {
  const ids = [
      ...new Set(
        (profile.fieldOps?.discoveries || [])
          .map((entry) => entry.photoId)
          .filter(Boolean),
      ),
    ],
    photos = [];
  for (const id of ids) {
    const photo =
      extraPhotos.find((photo) => photo.id === id) ||
      (await readFieldPhoto(id));
    if (!photo)
      throw Error(
        "A discovery photo is missing. Export your profile separately and recover the photo before a complete backup.",
      );
    await validateFieldPhoto(photo);
    photos.push(photo);
  }
  return { kind: "dmz-field-backup", version: 1, profile, photos };
}
async function restoreFile(file) {
  invalidateReview();
  dirty = true;
  const token = generation,
    packId = state.pack.id,
    revision = state.revision;
  if (file.size > 16 * 1024 * 1024) throw Error("Field backup exceeds 16 MiB");
  const bundle = parseBounded(await file.text(), 16 * 1024 * 1024, {
    depth: 16,
    nodes: 30000,
    string: 400000,
  });
  if (
    !bundle ||
    Object.keys(bundle).sort().join() !== "kind,photos,profile,version" ||
    bundle.kind !== "dmz-field-backup" ||
    bundle.version !== 1 ||
    !Array.isArray(bundle.photos) ||
    bundle.photos.length > 32
  )
    throw Error("Invalid complete field backup");
  validateProfile(bundle.profile);
  const comparison = previewProfile(bundle.profile, state.pack);
  if (comparison.versionMismatch || comparison.unresolved.length)
    throw Error(
      "Backup catalog differs or contains retired items. Use Settings to review/rebind it first.",
    );
  const ids = [
    ...new Set(
      (bundle.profile.fieldOps?.discoveries || [])
        .map((entry) => entry.photoId)
        .filter(Boolean),
    ),
  ];
  if (
    new Set(bundle.photos.map((photo) => photo.id)).size !==
      bundle.photos.length ||
    ids.length !== bundle.photos.length ||
    ids.some((id) => !bundle.photos.some((photo) => photo.id === id))
  )
    throw Error("Backup photo references are incomplete or duplicated");
  for (const photo of bundle.photos) await validateFieldPhoto(photo);
  if (
    token !== generation ||
    packId !== state.pack.id ||
    revision !== state.revision
  )
    throw Error(
      "The selected profile changed while validating the backup. Import it again to review current values.",
    );
  const candidate = structuredClone(bundle.profile);
  candidate.revision = state.revision;
  const changes = [];
  for (const pool of ["stash", "carried"]) {
    const before =
        pool === "stash"
          ? state.profile.inventory
          : state.profile.fieldOps?.carried || {},
      after =
        pool === "stash"
          ? candidate.inventory
          : candidate.fieldOps?.carried || {};
    for (const itemId of new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]))
      if ((before[itemId] ?? null) !== (after[itemId] ?? null))
        changes.push({
          itemId,
          pool,
          before: before[itemId] ?? null,
          after: after[itemId] ?? null,
        });
  }
  stage(
    { candidate, changes },
    { label: "Restore field backup", kind: "restore" },
    { photos: bundle.photos, restore: true },
  );
}
$("main").addEventListener("input", (event) => {
  const node = event.target;
  if (node.matches("[data-scan-select]"))
    scanRows[Number(node.dataset.scanSelect)].selected = node.checked;
  if (node.matches("[data-scan-item]"))
    scanRows[Number(node.dataset.scanItem)].itemId = node.value;
  if (node.matches("[data-scan-count]"))
    scanRows[Number(node.dataset.scanCount)].quantity =
      node.value === "" ? null : Number(node.value);
  if (node.id === "field-query") {
    renderCarried();
    return;
  }
  if (
    node.closest("#run-form,#discovery-form,#scan") ||
    node.matches("[data-transfer-count]")
  ) {
    invalidateReview();
    dirty = true;
  }
});
$("main").addEventListener("change", (event) => {
  if (event.target.id === "plan-scope") renderPlan();
});
$("#scan-files").addEventListener("change", (event) => {
  void scanFiles([...event.target.files]).catch(report);
});
document.addEventListener("paste", (event) => {
  const files = [...(event.clipboardData?.files || [])];
  if (files.length) {
    event.preventDefault();
    void scanFiles(files).catch(report);
  }
});
$("main").addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || state.saving || applying || state.loading) return;
  try {
    if (
      ["scan-preview", "run-preview", "return-carried"].includes(button.id) ||
      button.dataset.transferOut ||
      button.dataset.transferIn ||
      button.dataset.undoField ||
      button.dataset.removeDiscovery ||
      button.id === "field-reset-receipts"
    ) {
      staged = null;
      $("#field-review").hidden = true;
    }
    if (button.dataset.editDiscovery) {
      const entry = state.profile.fieldOps?.discoveries.find(
        (entry) => entry.id === button.dataset.editDiscovery,
      );
      if (!entry || !visibleItems().some((item) => item.id === entry.itemId))
        throw Error("Discovery is unavailable");
      editingDiscovery = entry.id;
      $("#discovery-form").reset();
      for (const [id, key] of [
        ["discovery-item", "itemId"],
        ["discovery-location", "locationId"],
        ["discovery-place", "place"],
        ["discovery-container", "container"],
        ["discovery-notes", "notes"],
        ["discovery-quantity", "quantity"],
      ])
        $("#" + id).value = entry[key] ?? "";
      dirty = true;
      $("#discovery-item").focus();
    }
    if (button.id === "scan-stop") {
      scanJob++;
      await stopStashOCR();
      recognizing = false;
      message("Recognition canceled. Existing review rows are retained.");
    }
    if (button.id === "scan-parse") {
      const { hashBytes } = await import("../content/portable.mjs"),
        fingerprint = await hashBytes(
          new TextEncoder().encode($("#scan-text").value),
        );
      scanRows = matchScanText($("#scan-text").value, state.pack, {
        spoilers: state.profile.spoilers,
      }).map((row) => ({
        ...row,
        fingerprint,
        pool: $("#scan-pool").value,
        selected: !!row.itemId && row.quantity !== null,
      }));
      if (scanRows.length > 200) {
        scanRows = [];
        throw Error("Review up to 200 text rows at a time");
      }
      dirty = true;
      renderScan();
    }
    if (button.id === "scan-preview") {
      if (recognizing) throw Error("Wait for recognition to finish");
      const rows = combineScanRows(scanRows),
        receipts = [
          ...new Set(
            scanRows
              .filter((row) => row.selected)
              .map((row) => row.fingerprint),
          ),
        ];
      stage(
        previewFieldChanges(state.profile, state.pack, rows, { receipts }),
        { label: "Reviewed stash scan", kind: "scan" },
      );
    }
    if (button.id === "field-reset-receipts") {
      const candidate = fieldCandidate(state.profile, state.pack);
      candidate.fieldOps.receipts = [];
      stage(
        { candidate },
        {
          label: "Reset remembered screenshots (quantities stay unchanged)",
          kind: "receipts",
        },
      );
    }
    if (button.dataset.removeDiscovery) {
      const candidate = fieldCandidate(state.profile, state.pack);
      if (
        !candidate.fieldOps.discoveries.some(
          (entry) => entry.id === button.dataset.removeDiscovery,
        )
      )
        throw Error("Observation was already removed");
      candidate.fieldOps.discoveries = candidate.fieldOps.discoveries.filter(
        (entry) => entry.id !== button.dataset.removeDiscovery,
      );
      stage(
        { candidate },
        {
          label: "Remove private observation (quantities stay unchanged)",
          kind: "discovery",
        },
      );
    }
    if (button.id === "field-enable") {
      const candidate = fieldCandidate(state.profile, state.pack);
      if (await persist(candidate)) {
        render();
        message(
          "Quantity history enabled. Earlier edits are not reconstructed.",
        );
      }
    }
    if (button.dataset.transferOut || button.dataset.transferIn) {
      const itemId = button.dataset.transferOut || button.dataset.transferIn,
        raw = document.querySelector(
          `[data-transfer-count="${CSS.escape(itemId)}"]`,
        ).value;
      stage(
        previewTransfer(
          state.profile,
          state.pack,
          itemId,
          Number(raw),
          button.dataset.transferIn ? "carried" : "stash",
        ),
        {
          label: button.dataset.transferIn
            ? "Return carried item"
            : "Prepare carried gear",
          kind: "transfer",
        },
      );
    }
    if (button.id === "return-carried")
      stage(previewReturnCarried(state.profile, state.pack), {
        label: "Return all carried gear",
        kind: "transfer",
      });
    if (button.dataset.removeRun) {
      invalidateReview();
      runRows.splice(Number(button.dataset.removeRun), 1);
      renderRun();
    }
    if (button.id === "match-start") {
      if (runRows.length || matchObjectives.length || matchStops.length)
        throw Error(
          "Review or discard the current match reports before starting another match",
        );
      matchSession = startMatchSession(
        state.pack,
        state.profile,
        $("#match-name").value,
        matchPlans?.plans.find((plan) => plan.id === $("#match-plan").value) ||
          null,
        $("#match-plan").value ? matchPlans?.revision : null,
      );
      dirty = true;
      renderRun();
    }
    if (button.id === "match-add-objective") {
      if (!matchSession) throw Error("Start a named match first");
      const id = $("#match-objective").value;
      if (!id || matchObjectives.some((row) => row.id === id))
        throw Error("Choose an objective that is not already in this match");
      matchObjectives.push({ id, status: $("#match-objective-status").value });
      invalidateReview();
      dirty = true;
      renderRun();
    }
    if (button.id === "match-add-stop") {
      if (!matchSession) throw Error("Start a named match first");
      const stop = $("#match-stop").value.trim();
      if (!stop || matchStops.length >= 100)
        throw Error("Enter a stop of at most 160 characters");
      matchStops.push(stop);
      $("#match-stop").value = "";
      invalidateReview();
      dirty = true;
      renderRun();
    }
    if (button.dataset.removeObjective !== undefined) {
      matchObjectives.splice(Number(button.dataset.removeObjective), 1);
      invalidateReview();
      renderRun();
    }
    if (button.dataset.removeStop !== undefined) {
      matchStops.splice(Number(button.dataset.removeStop), 1);
      invalidateReview();
      renderRun();
    }
    if (button.id === "run-preview") {
      if (!matchSession) throw Error("Start a named match first");
      const preview = previewMatchSession(
        state.pack,
        state.profile,
        matchSession,
        runRows,
        matchObjectives,
        matchStops,
      );
      stage(preview, {
        label: `Match: ${matchSession.name}`,
        kind: "run",
        entryId: matchSession.id,
      });
      if (preview.progress.length || preview.stops.length)
        $("#field-review").insertAdjacentHTML(
          "beforeend",
          `<p>${preview.progress.length} objective result${preview.progress.length === 1 ? "" : "s"}: ${preview.progress.map((row) => `${esc(state.pack.objectives.find((objective) => objective.id === row.id)?.name || "Objective")} ${esc(row.before)} → ${esc(row.after)}`).join("; ")}. ${preview.stops.length} visited stop${preview.stops.length === 1 ? "" : "s"} will be saved as player-reported match evidence.</p>`,
        );
    }
    if (button.dataset.undoMatch) {
      const undo = previewMatchUndo(
        state.pack,
        state.profile,
        button.dataset.undoMatch,
      );
      stage(undo, { label: "Undo match", kind: "undo", undoOf: undo.undoOf });
      $("#field-review").insertAdjacentHTML(
        "beforeend",
        `<p>${undo.progress.length} objective results will be restored. Match evidence remains in history, marked undone.</p>`,
      );
    }
    if (button.dataset.undoField) {
      const undo = previewFieldUndo(
        state.profile,
        state.pack,
        button.dataset.undoField,
      );
      stage(undo, {
        label: "Undo inventory change",
        kind: "undo",
        undoOf: undo.undoOf,
      });
    }
    if (button.id === "field-cancel-review") {
      staged = null;
      $("#field-review").hidden = true;
      message("Review canceled; input rows are retained.");
    }
    if (button.id === "field-confirm") {
      if (
        !staged ||
        staged.packId !== state.pack.id ||
        staged.revision !== state.revision
      )
        throw Error("Profile changed. Preview again before saving");
      const pending = staged,
        controls = [
          ...document.querySelectorAll(
            "main input,main button,main select,main textarea",
          ),
        ].map((node) => [node, node.disabled]);
      applying = true;
      for (const [node] of controls) node.disabled = true;
      try {
        for (const photo of pending.photos || []) await saveFieldPhoto(photo);
        if (
          pending.packId !== state.pack.id ||
          pending.revision !== state.revision
        )
          throw Error(
            "Profile changed while saving photos. Review again; quantity changes were not applied.",
          );
        if (await persist(pending.candidate, pending.meta)) {
          render();
          message(
            "Field operation saved locally. Quantity trackers now use the updated stash.",
          );
        }
      } finally {
        applying = false;
        for (const [node, disabled] of controls) node.disabled = disabled;
      }
    }
    if (button.id === "field-export-pending" && staged)
      download(
        "pending-field-backup.json",
        await completeBackup(staged.candidate, staged.photos || []),
      );
    if (button.id === "field-discard") {
      discard();
      message("Pending field edits discarded. Saved quantities unchanged.");
    }
    if (button.id === "field-export")
      download("dmz-complete-field-backup.json", await completeBackup());
    if (button.id === "plan-select-all" || button.id === "plan-select-none")
      for (const checkbox of document.querySelectorAll("[data-plan-item]"))
        checkbox.checked = button.id === "plan-select-all";
    if (["plan-send", "plan-export"].includes(button.id) && dirty)
      throw Error(
        "Confirm or discard pending field edits first. Map plans use your saved stash.",
      );
    if (button.id === "plan-export")
      download("dmz-collection-plan.json", collectionPlan());
    if (button.id === "plan-send") {
      const plan = collectionPlan(),
        nonce = crypto.randomUUID(),
        target = window.open(
          `http://127.0.0.1:5175/?tool=explore&collection=${nonce}`,
          "_blank",
        );
      if (!target)
        throw Error(
          "Allow this local map window, or download the plan and import it on the map",
        );
      $("#plan-status").textContent =
        "Waiting for the local map. File download/import is also available.";
      const handler = (event) => {
        if (
          event.origin !== "http://127.0.0.1:5175" ||
          event.source !== target ||
          event.data?.nonce !== nonce
        )
          return;
        if (event.data?.type === "dmz-collection-ready")
          target.postMessage(
            { type: "dmz-collection-plan", nonce, plan },
            "http://127.0.0.1:5175",
          );
        if (event.data?.type === "dmz-collection-received") {
          window.removeEventListener("message", handler);
          clearTimeout(timeout);
          $("#plan-status").textContent =
            "Plan received for review in the map. No inventory or route was changed automatically.";
        }
      };
      window.addEventListener("message", handler);
      const timeout = setTimeout(() => {
        window.removeEventListener("message", handler);
        $("#plan-status").textContent =
          "Map handoff timed out. Download the plan and choose Import collection plan in map search.";
      }, 15000);
    }
    if (button.dataset.showPhoto) {
      const photo = await readFieldPhoto(button.dataset.showPhoto);
      await validateFieldPhoto(photo);
      const { bytesFromBase64 } = await import("../content/portable.mjs"),
        url = URL.createObjectURL(
          new Blob([bytesFromBase64(photo.base64)], { type: photo.mime }),
        );
      photoURLs.push(url);
      const image = document.createElement("img");
      image.src = url;
      image.alt = "Private player-reported discovery photo";
      image.className = "field-photo";
      button.replaceWith(image);
    }
  } catch (reason) {
    report(reason);
  }
});
$("#run-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.loading || state.saving || applying) return;
  try {
    if (!matchSession) throw Error("Start a named match first");
    const action = $("#run-action").value,
      quantity = Number($("#run-quantity").value),
      itemId = $("#run-item").value;
    if (
      !itemId ||
      !/^\d+$/.test($("#run-quantity").value) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      (action !== "set" && quantity === 0) ||
      runRows.length >= 200
    )
      throw Error("Choose an item and a whole quantity");
    invalidateReview();
    runRows.push({
      itemId,
      pool: $("#run-pool").value,
      action,
      mode: action === "set" ? "set" : "delta",
      quantity: ["lost", "spent"].includes(action) ? -quantity : quantity,
    });
    dirty = true;
    renderRun();
  } catch (reason) {
    report(reason);
  }
});
$("#discovery-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.loading || applying) return;
  staged = null;
  $("#field-review").hidden = true;
  try {
    const revision = state.revision,
      packId = state.pack.id,
      file = $("#discovery-photo").files[0],
      photo = file ? await makeFieldPhoto(file) : null;
    if (revision !== state.revision || packId !== state.pack.id)
      throw Error("Profile changed during photo preparation. Review again");
    const entry = {
      itemId: $("#discovery-item").value,
      quantity:
        $("#discovery-quantity").value === ""
          ? null
          : Number($("#discovery-quantity").value),
      place: $("#discovery-place").value,
      locationId: $("#discovery-location").value || null,
      container: $("#discovery-container").value,
      notes: $("#discovery-notes").value,
      photoId:
        photo?.id ||
        (editingDiscovery
          ? state.profile.fieldOps?.discoveries.find(
              (entry) => entry.id === editingDiscovery,
            )?.photoId
          : null) ||
        null,
    };
    stage(
      {
        candidate: addDiscovery(
          state.profile,
          state.pack,
          entry,
          editingDiscovery,
        ),
      },
      { label: "Save private discovery", kind: "discovery" },
      { photos: photo ? [photo] : [] },
    );
  } catch (reason) {
    report(reason);
  }
});
$("#field-import").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) void restoreFile(file).catch(report);
});
document.addEventListener("pack-changing", () => {
  discard();
  releasePhotos();
});
window.addEventListener("pagehide", releasePhotos);
init(render).catch(report);
