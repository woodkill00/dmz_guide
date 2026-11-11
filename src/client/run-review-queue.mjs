import {
  addReviewEntry, commitReviewedOwner, loadRunReview, saveRunReview,
  markReviewUncertain, reconcileUncertainEntry, rejectReviewEntry,
} from "../domain/run-review.mjs";
import { previewReviewOwner } from "../domain/run-review-actions.mjs";
import { spoilerGuard } from "../domain/progression.mjs";
import { upgradeProgressFor } from "../domain/upgrade-progress.mjs";
import { loadProfile } from "../storage/store.mjs";

const $ = (selector) => document.querySelector(selector);
const safeInteger = (value, nullable = false) => {
  if (nullable && value === "") return null;
  if (!/^-?\d+$/.test(value)) throw Error("Enter a whole quantity.");
  return Number(value);
};
const bossId = (value) => {
  const trimmed = String(value).trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const url = new URL(trimmed);
    if (!["127.0.0.1", "localhost"].includes(url.hostname))
      throw Error("Use a local map boss detail link or its ID.");
    const ids = url.searchParams.getAll("boss");
    if (ids.length !== 1) throw Error("Choose one boss detail link.");
    return ids[0];
  }
  return trimmed;
};

export function createRunReviewQueue({ state, persist, visibleItems, esc, report }) {
  let doc = null, selected = null, loading = 0, busy = false, handoff = null;
  const status = (value) => { $("#review-queue-status").textContent = value; };
  const safeLabel = (entry) => spoilerGuard(state.pack, !!state.profile.spoilers).text(entry.label);
  const visibleObjectives = () => state.pack.objectives
    .filter((row) => state.profile.spoilers || !row.spoiler)
    .sort((a, b) => (a.name || a.title).localeCompare(b.name || b.title));
  function fillOptions() {
    const itemOptions = '<option value="">Choose item</option>' + visibleItems().map((row) => `<option value="${esc(row.id)}">${esc(row.name)}</option>`).join("");
    for (const select of document.querySelectorAll("[data-review-items]")) select.innerHTML = itemOptions;
    $("[data-review-objectives]").innerHTML = '<option value="">Choose objective</option>' + visibleObjectives().map((row) => `<option value="${esc(row.id)}">${esc(row.name || row.title)}</option>`).join("");
    $("[data-review-locations]").innerHTML = '<option value="">No linked location</option>' + state.pack.locations.filter((row) => state.profile.spoilers || !row.spoiler).map((row) => `<option value="${esc(row.id)}">${esc(row.name)}</option>`).join("");
    const date = $("[data-review-form='boss'] [name='date']");
    if (!date.value) {
      const now = new Date();
      const localDay = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      date.value = localDay.toISOString().slice(0, 10);
    }
  }
  function render() {
    if (!doc || doc.packId !== state.pack.id) return;
    const list = $("#review-queue-list");
    list.innerHTML = doc.entries.length
      ? `<ol class="run-review-list">${doc.entries.map((entry) => {
          const receipt = doc.receipts.find((row) => row.entryId === entry.id);
          const actions = entry.state === "staged"
            ? `<button type="button" data-review-preview="${esc(entry.id)}">Preview</button><button type="button" data-review-reject="${esc(entry.id)}">Remove</button>`
            : entry.state === "uncertain"
              ? `<button type="button" data-review-check="${esc(entry.id)}">Check owner</button>${entry.owner === "boss" ? `<button type="button" data-review-map="${esc(entry.id)}">Reopen map check</button>` : ""}`
              : "";
          return `<li><strong>${esc(safeLabel(entry))}</strong> <small>${esc(entry.owner)} · ${esc(entry.state)}${receipt ? ` · owner revision ${receipt.ownerRevision}` : ""}</small><div class="field-inline">${actions}</div></li>`;
        }).join("")}</ol>`
      : "<p>No reports staged. Add stock, progress, discovery or boss reports below.</p>";
  }
  async function load() {
    const token = ++loading, packId = state.pack.id;
    selected = null;
    $("#review-queue-preview").hidden = true;
    try {
      const value = await loadRunReview(packId);
      if (token !== loading || state.pack.id !== packId) return;
      doc = value;
      fillOptions();
      render();
      status(`${doc.entries.filter((row) => row.state === "staged").length} staged · ${doc.entries.filter((row) => row.state === "uncertain").length} need outcome check · ${doc.receipts.length} saved`);
    } catch (reason) { if (token === loading) report(reason); }
  }
  async function mutate(work) {
    if (busy || state.loading || state.saving) throw Error("Wait for the current save to finish.");
    if (!doc || doc.packId !== state.pack.id) throw Error("Review queue is still loading.");
    busy = true;
    try {
      doc = await saveRunReview(work(doc), doc.revision);
      selected = null;
      $("#review-queue-preview").hidden = true;
      render();
      status("Review queue saved locally.");
    } catch (reason) {
      await load();
      throw reason;
    } finally { busy = false; }
  }
  function payloadFrom(form, owner) {
    const data = new FormData(form), value = (key) => String(data.get(key) || "");
    if (owner === "inventory") return {itemId:value("itemId"),pool:value("pool"),mode:value("mode"),quantity:safeInteger(value("quantity"))};
    if (owner === "progression") return {objectiveId:value("objectiveId"),status:value("status")};
    if (owner === "observation") return {itemId:value("itemId"),locationId:value("locationId") || null,place:value("place"),container:value("container"),notes:value("notes"),quantity:safeInteger(value("quantity"), true)};
    return {bossId:bossId(value("bossId")),event:value("event"),date:value("date"),notes:value("notes")};
  }
  function labelFor(owner, payload) {
    if (owner === "boss") return `Boss ${payload.event} · ${payload.bossId}`;
    if (owner === "progression") return `${visibleObjectives().find((row) => row.id === payload.objectiveId)?.name || "Objective"} · ${payload.status}`;
    return `${visibleItems().find((row) => row.id === payload.itemId)?.name || "Item"} · ${owner}`;
  }
  async function stage(form) {
    const owner = form.dataset.reviewForm, payload = payloadFrom(form, owner);
    const entry = {id:crypto.randomUUID(),owner,label:labelFor(owner,payload),expectedRevision:owner === "boss" ? 0 : state.revision,payload};
    // A current owner preview catches missing references and invalid reports before staging.
    previewReviewOwner(state.pack, state.profile, entry);
    await mutate((current) => addReviewEntry(current, entry));
    form.reset();
    status(`Staged ${owner} report. Preview it in the queue before saving.`);
  }
  function preview(id) {
    const entry = doc.entries.find((row) => row.id === id);
    if (!entry || entry.state !== "staged") throw Error("This report is no longer staged.");
    const result = previewReviewOwner(state.pack, state.profile, entry);
    selected = {id, revision: state.revision, packId: state.pack.id, result};
    const target = $("#review-queue-preview");
    target.innerHTML = `<h3>Review ${esc(safeLabel(entry))}</h3><p>${esc(result.summary)}</p><p>${entry.owner === "boss" ? "The separate map must confirm the exact boss and event before saving." : `Current profile revision ${state.revision}. A changed profile requires a new preview.`}</p><div class="field-inline"><button type="button" data-review-confirm="${esc(id)}">${entry.owner === "boss" ? "Review on map" : "Confirm owner save"}</button><button type="button" data-review-cancel>Cancel preview</button></div>`;
    target.hidden = false;
    target.focus();
  }
  async function save(id) {
    const pending = selected, entry = doc.entries.find((row) => row.id === id);
    if (!pending || pending.id !== id || pending.packId !== state.pack.id || pending.revision !== state.revision || !entry || entry.state !== "staged")
      throw Error("Profile or review changed. Preview this row again before saving.");
    selected = null;
    $("#review-queue-preview").hidden = true;
    if (entry.owner === "boss") return openMap(entry);
    busy = true;
    try {
      doc = await commitReviewedOwner(doc, id, async () => {
        if (state.revision !== pending.revision || state.pack.id !== pending.packId)
          throw Error("Profile changed before the owner save. Check the outcome.");
        const saved = await persist(pending.result.candidate, {kind:"run-review",label:`After-run ${entry.owner}`,entryId:id});
        if (!saved) throw Error("Owner save was not confirmed. Check its saved state before retrying.");
        return state.revision;
      });
      render();
      status(`${entry.owner} saved at owner revision ${state.revision}. Other rows remain staged.`);
    } catch (reason) {
      doc = await loadRunReview(state.pack.id);
      render();
      status("Save outcome uncertain. Check the owner before another attempt.");
      throw reason;
    } finally { busy = false; }
  }
  async function check(id) {
    const entry = doc.entries.find((row) => row.id === id);
    if (!entry || entry.state !== "uncertain") throw Error("Only uncertain reports need an outcome check.");
    if (entry.owner === "boss") return openMap(entry);
    const stored = await loadProfile(state.pack.id);
    const owner = stored?.value;
    if (!owner) throw Error("Saved profile unavailable. Restore storage before checking this report.");
    const baseline = entry.expectedRevision, current = owner.revision;
    const exact = entry.owner === "inventory"
      ? owner.fieldOps?.history.some((row) => row.id === id)
      : entry.owner === "observation"
        ? owner.fieldOps?.discoveries.some((row) => row.id === id)
        : state.pack.objectives.find((row) => row.id === entry.payload.objectiveId)?.track === "dmz-upgrade"
          ? upgradeProgressFor(state.pack, owner, entry.payload.objectiveId).completion === entry.payload.status
          : owner.completion?.[entry.payload.objectiveId] === entry.payload.status;
    const target = $("#review-queue-preview");
    target.innerHTML = `<h3>Check ${esc(safeLabel(entry))}</h3><p>Owner revision ${current}; staged against ${baseline}. ${exact ? "The saved owner matches this report." : "No exact saved event was found."}</p><div class="field-inline">${exact && current > baseline ? `<button type="button" data-review-resolve="${esc(id)}" data-outcome="saved" data-owner-revision="${current}">Confirm saved receipt</button>` : ""}${current === baseline ? `<button type="button" data-review-resolve="${esc(id)}" data-outcome="not-saved">Confirm no owner write</button>` : ""}<button type="button" data-review-cancel>Close</button></div><p>${current > baseline && !exact ? "Another owner change may have occurred. Inspect its page or restore a backup; this report cannot be replayed automatically." : "Saved rows are never applied again."}</p>`;
    target.hidden = false;
    target.focus();
  }
  async function resolve(id, outcome, revision) {
    await mutate((current) => reconcileUncertainEntry(current, id, outcome, outcome === "saved" ? {ownerRevision:revision,savedAt:new Date().toISOString()} : undefined));
    status(outcome === "saved" ? "Owner receipt confirmed; this report cannot replay." : "No owner write confirmed; preview again before saving.");
  }
  async function openMap(entry) {
    if (handoff) throw Error("Finish the current map handoff first.");
    const nonce = crypto.randomUUID();
    const target = window.open(`http://127.0.0.1:5175/?tool=planner&boss-review=${nonce}`, "_blank");
    if (!target) throw Error("Allow the local map window, then retry this reviewed boss report.");
    if (entry.state === "staged") {
      try { doc = await saveRunReview(markReviewUncertain(doc, entry.id), doc.revision); }
      catch (reason) { target.close(); await load(); throw reason; }
    }
    render();
    status("Map handoff open. Confirm or decline in the map; a closed window leaves this report uncertain.");
    const finish = () => { window.removeEventListener("message", onMessage); clearTimeout(timeout); handoff = null; };
    const onMessage = async (event) => {
      if (event.origin !== "http://127.0.0.1:5175" || event.source !== target || event.data?.nonce !== nonce || handoff?.entryId !== entry.id) return;
      if (event.data.type === "dmz-boss-review-ready") {
        target.postMessage({type:"dmz-boss-review-report",nonce,entryId:entry.id,payload:entry.payload},event.origin);
        return;
      }
      if (event.data.type === "dmz-boss-review-saved" || event.data.type === "dmz-boss-review-declined") {
        if (event.data.entryId !== entry.id) return;
        finish();
        try {
          const revision = event.data.ownerRevision;
          const outcome = event.data.type === "dmz-boss-review-saved" ? "saved" : "not-saved";
          await resolve(entry.id, outcome, revision);
        } catch (reason) { report(reason); await load(); }
      }
    };
    window.addEventListener("message", onMessage);
    const timeout = setTimeout(() => { finish(); status("Map response timed out. This boss row remains uncertain; reopen its map check to reconcile the exact event ID."); }, 30000);
    handoff = {entryId:entry.id,nonce,target};
  }
  $("#run-review-queue").addEventListener("submit", (event) => {
    const form = event.target.closest("[data-review-form]");
    if (!form) return;
    event.preventDefault();
    void stage(form).catch(report);
  });
  $("#run-review-queue").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const id = button.dataset.reviewPreview || button.dataset.reviewReject || button.dataset.reviewCheck || button.dataset.reviewMap || button.dataset.reviewConfirm || button.dataset.reviewResolve;
    if (button.dataset.reviewPreview) { try { preview(id); } catch (reason) { report(reason); } }
    else if (button.dataset.reviewReject) void mutate((current) => rejectReviewEntry(current, id)).catch(report);
    else if (button.dataset.reviewCheck) void check(id).catch(report);
    else if (button.dataset.reviewMap) void openMap(doc.entries.find((row) => row.id === id)).catch(report);
    else if (button.dataset.reviewConfirm) void save(id).catch(report);
    else if (button.dataset.reviewResolve) void resolve(id, button.dataset.outcome, Number(button.dataset.ownerRevision)).catch(report);
    else if (button.dataset.reviewCancel !== undefined) { selected = null; $("#review-queue-preview").hidden = true; }
  });
  return {load,render};
}
