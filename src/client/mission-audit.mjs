import {
  init,
  state,
  $,
  esc,
  error,
  download,
  registerDraftGuard,
} from "./common.mjs";
import {
  missionAuditTargets,
  missionAuditRestorePreview,
  validateMissionAudit,
} from "../domain/mission-audit.mjs";
import { missionPageHref } from "../domain/mission-links.mjs";

const key = (id) => `dmz:mission-audit:v1:${id}`;
const undoKey = (id) => `dmz:mission-audit:undo:${id}`;
let audit = null;
let targets = [];
let active = null;
let previous = null;
let importCandidate = null;
let importRevision = 0;
let dirty = false;
let loadBlocked = false;
let loadedRaw = null;
let writing = false;
const labelState = (value) => value.replaceAll("-", " ");
const empty = (pack) => ({
  version: 1,
  packId: pack.id,
  contentVersion: pack.contentVersion,
  pageSet: "hajin-launch",
  entries: [],
  history: [],
});
const entryFor = (id) => audit.entries.find((entry) => entry.id === id);
const readUndoReceipt = (id) => {
  try {
    const raw = sessionStorage.getItem(undoKey(id));
    if (!raw || raw.length > 500) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const setUndoReceipt = (id, event) => {
  try {
    if (event)
      sessionStorage.setItem(
        undoKey(id),
        JSON.stringify({ id: event.id, at: event.at }),
      );
    else sessionStorage.removeItem(undoKey(id));
  } catch {
    // A missing receipt only removes reloadable Undo; the saved audit is intact.
  }
};
const report = (message) => {
  $("#save-status").textContent = message;
};
const isCurrent = (target) =>
  targets.some((candidate) => candidate.id === target.id);
const selectedMissionHref = (id) => missionPageHref(state.pack.id, id);

function load(pack) {
  importRevision += 1;
  importCandidate = null;
  $("#mission-audit-restore").hidden = true;
  loadBlocked = false;
  try {
    const raw = localStorage.getItem(key(pack.id));
    loadedRaw = raw;
    audit = raw ? validateMissionAudit(JSON.parse(raw), pack.id) : empty(pack);
    report(raw ? "Local audit loaded." : "No local audit yet.");
  } catch (reason) {
    loadBlocked = true;
    audit = empty(pack);
    report(
      `Saved audit could not be read: ${reason.message}. Original data was retained; do not save until recovered.`,
    );
    $("#mission-audit-save").disabled = true;
    return;
  }
  $("#mission-audit-save").disabled = false;
}
function matches(target) {
  const query = $("#mission-audit-search").value.trim().toLowerCase();
  const filter = $("#mission-audit-filter").value;
  const row = entryFor(target.id);
  return (
    (!filter || (row?.state || "not-checked") === filter) &&
    (!query ||
      `${target.label} ${target.section} ${target.page || ""}`
        .toLowerCase()
        .includes(query))
  );
}
function renderList(rows, selector, emptyText) {
  const visible = rows.filter(matches);
  $(selector).innerHTML = visible.length
    ? `<div class="mission-audit-list">${visible
        .map((target) => {
          const saved = entryFor(target.id);
          const status = saved?.state || "not-checked";
          const button = `<button type="button" class="mission-audit-row" data-audit-id="${esc(target.id)}" aria-pressed="${active?.id === target.id}"><span>${esc(target.label)}${target.kind === "mission" ? ` · ${esc(target.section)}` : ""}</span><small>${esc(labelState(status))}${target.warning ? " · evidence gap" : ""}</small></button>`;
          if (
            target.kind !== "mission" ||
            target.section !== "identity" ||
            (target.spoiler && !state.profile?.spoilers)
          )
            return button;
          return `<div class="mission-audit-entry">${button}<a href="${esc(selectedMissionHref(target.objectiveId))}">Open mission page ↗</a></div>`;
        })
        .join("")}</div>`
    : `<p>${esc(emptyText)}</p>`;
}
function render() {
  if (!state.pack || !audit) return;
  const draft =
    dirty && active
      ? {
          status: $("#mission-audit-state").value,
          note: $("#mission-audit-note").value,
          reviewer: $("#mission-audit-reviewer").value,
          staleReviewed: $("#mission-audit-stale-review").checked,
        }
      : null;
  targets = missionAuditTargets(state.pack);
  const pages = targets.filter(
    (target) => target.kind === "page" && target.orderSet !== "x01",
  );
  const x01Pages = targets.filter(
    (target) => target.kind === "page" && target.orderSet === "x01",
  );
  const missions = targets.filter((target) => target.kind === "mission");
  const incomplete = pages.filter((target) => !target.recorded).length;
  const later = audit.entries.filter(
    (entry) =>
      entry.state === "fill-later" &&
      targets.some((target) => target.id === entry.id),
  ).length;
  const stale = audit.entries.filter((entry) => {
    const target = targets.find((candidate) => candidate.id === entry.id);
    return !target || entry.sourceFingerprint !== target.sourceFingerprint;
  }).length;
  $("#mission-audit-summary").textContent =
    `${pages.length} Hajin pages · ${incomplete} unrecorded Hajin pages · ${x01Pages.length} X01 pages · ${missions.length / 9} recorded missions · ${later} sections to fill later${stale ? ` · ${stale} stale review entries` : ""}.`;
  renderList(
    pages,
    "#mission-audit-pages",
    "No Orders pages match this filter.",
  );
  renderList(
    x01Pages,
    "#mission-audit-x01-pages",
    "No X01 pages match this filter.",
  );
  renderList(
    missions,
    "#mission-audit-missions",
    missions.length
      ? "No recorded mission sections match this filter."
      : "No Order or Story Mission records are in this catalog yet.",
  );
  if (active && !isCurrent(active)) active = null;
  const hiddenSpoiler = Boolean(active?.spoiler && !state.profile?.spoilers);
  $("#mission-audit-spoiler-notice").hidden = !hiddenSpoiler;
  $("#mission-audit-editor").hidden = !active || hiddenSpoiler;
  if (hiddenSpoiler) {
    $("#mission-audit-note").value = "";
    $("#mission-audit-reviewer").value = "";
    $("#mission-audit-links").replaceChildren();
  }
  if (!active || hiddenSpoiler) return;
  const saved = entryFor(active.id);
  const last = audit.history.at(-1);
  const receipt = readUndoReceipt(state.pack.id);
  if (
    !previous &&
    receipt?.id === last?.id &&
    receipt?.at === last?.at &&
    last?.id === active.id &&
    JSON.stringify(last.after) === JSON.stringify(saved || null)
  )
    previous = { id: active.id, old: last.before, current: last.after };
  $("#mission-audit-target").textContent =
    `${active.label} · ${active.section}`;
  const staleReview =
    saved && saved.sourceFingerprint !== active.sourceFingerprint;
  $("#mission-audit-stale-review-label").hidden = !staleReview;
  $("#mission-audit-stale-review").checked = false;
  $("#mission-audit-evidence").textContent =
    `${staleReview ? "Source content changed since this review; check it before saving again. " : ""}${
      active.warning ||
      (active.kind === "page" && !active.recorded
        ? "Roster not recorded. This page is a content gap."
        : "Editorial status does not verify source evidence.")
    }`;
  $("#mission-audit-state").value = saved?.state || "not-checked";
  $("#mission-audit-note").value = saved?.note || "";
  $("#mission-audit-reviewer").value = saved?.reviewer || "";
  if (draft) {
    $("#mission-audit-state").value = draft.status;
    $("#mission-audit-note").value = draft.note;
    $("#mission-audit-reviewer").value = draft.reviewer;
    $("#mission-audit-stale-review").checked = draft.staleReviewed;
  }
  $("#mission-audit-undo").disabled = !previous || previous.id !== active.id;
  const descriptor = state.catalogs.find((row) => row.id === state.pack.id);
  const packKey = descriptor?.path.match(/\/([a-z0-9-]+)\.json$/)?.[1];
  const studio = packKey
    ? active.kind === "mission"
      ? `/?${new URLSearchParams({ packKey, packId: state.pack.id, id: active.objectiveId, intent: "edit" })}`
      : `/?${new URLSearchParams({ create: "objectives", packKey, packId: state.pack.id })}`
    : null;
  const pageLinks =
    active.kind === "page"
      ? `<a href="/missions/#${active.orderSet === "x01" ? "x01" : "hajin"}-page-${active.page}">Open page in Missions</a>${active.objectiveIds
          .map((id) => state.pack.objectives.find((record) => record.id === id))
          .filter(
            (record) => record && (!record.spoiler || state.profile?.spoilers),
          )
          .map(
            (record) =>
              ` · <a href="${esc(selectedMissionHref(record.id))}">${esc(record.name)}</a>`,
          )
          .join("")} · `
      : "";
  $("#mission-audit-links").innerHTML =
    pageLinks +
    `${active.kind === "mission" ? `<a href="${esc(selectedMissionHref(active.objectiveId))}">Open mission page</a> · ` : ""}` +
    (studio
      ? `<a href="${esc(`http://127.0.0.1:4174${studio}`)}" rel="noreferrer">${active.kind === "mission" ? "Edit this mission" : "Add mission in Content Studio"}</a> <small>Start the local Content Studio first. No record is created until you review and save it there.</small>`
      : "Repository authoring is unavailable for this private catalog; open its private editor from the catalog tools.");
}
async function write(candidate) {
  if (writing) throw Error("An audit save is already in progress.");
  if (loadBlocked)
    throw Error(
      "The saved audit could not be read. Recover it before replacing this catalog's audit.",
    );
  const packId = state.pack.id;
  candidate = validateMissionAudit(candidate, packId);
  if (!navigator.locks?.request)
    throw Error(
      "Safe audit saving requires browser lock support; copy your unsaved note before leaving.",
    );
  const serialized = JSON.stringify(candidate);
  const expectedRaw = loadedRaw;
  const controls = [
    "#mission-audit-save",
    "#mission-audit-undo",
    "#mission-audit-restore",
    "#mission-audit-import",
    "#mission-audit-import-cancel",
    "#mission-audit-export",
    "#mission-audit-state",
    "#mission-audit-note",
    "#mission-audit-reviewer",
    "#mission-audit-stale-review",
    "#mission-audit-search",
    "#mission-audit-filter",
    "#pack-select",
  ].map((selector) => $(selector));
  const disabledBefore = controls.map((control) => control.disabled);
  writing = true;
  controls.forEach((control) => (control.disabled = true));
  report("Saving audit…");
  try {
    await navigator.locks.request(`dmz:mission-audit:v1:${packId}`, () => {
      if (localStorage.getItem(key(packId)) !== expectedRaw)
        throw Error(
          "Another tab changed this audit. Your edits remain here; copy them before reloading.",
        );
      localStorage.setItem(key(packId), serialized);
    });
    if (state.pack.id !== packId) return false;
    loadedRaw = serialized;
    audit = candidate;
    dirty = false;
    report("Audit saved on this device.");
    render();
    return true;
  } finally {
    writing = false;
    controls.forEach((control, index) => {
      control.disabled = disabledBefore[index];
    });
    $("#mission-audit-save").disabled = loadBlocked;
  }
}
async function save() {
  if (!active || !audit) return;
  const old = entryFor(active.id);
  if (
    old &&
    old.sourceFingerprint !== active.sourceFingerprint &&
    !$("#mission-audit-stale-review").checked
  ) {
    report(
      "Review the changed source content and check the confirmation before saving this section.",
    );
    $("#mission-audit-stale-review").focus();
    return;
  }
  const next = {
    id: active.id,
    state: $("#mission-audit-state").value,
    note: $("#mission-audit-note").value,
    reviewer: $("#mission-audit-reviewer").value,
    reviewedAt: new Date().toISOString(),
    sourceFingerprint: active.sourceFingerprint,
    revision: (old?.revision || 0) + 1,
  };
  const candidate = {
    ...audit,
    contentVersion: state.pack.contentVersion,
    entries: [...audit.entries.filter((entry) => entry.id !== active.id), next],
    history: [
      ...audit.history,
      { id: active.id, before: old || null, after: next, at: next.reviewedAt },
    ].slice(-1000),
  };
  try {
    if (!(await write(candidate))) return;
    previous = { id: active.id, old, current: next };
    setUndoReceipt(state.pack.id, candidate.history.at(-1));
    $("#mission-audit-undo").disabled = false;
  } catch (reason) {
    report(
      `Audit not saved: ${reason.message}. Your edits remain in the form.`,
    );
  }
}
async function undo() {
  if (!active || !previous || previous.id !== active.id) return;
  if (
    dirty &&
    !confirm("Discard unsaved audit edits and undo the last saved change?")
  )
    return;
  const candidate = {
    ...audit,
    entries: [
      ...audit.entries.filter((entry) => entry.id !== active.id),
      ...(previous.old ? [previous.old] : []),
    ],
    history: [
      ...audit.history,
      {
        id: active.id,
        before: previous.current,
        after: previous.old || null,
        at: new Date().toISOString(),
      },
    ].slice(-1000),
  };
  try {
    if (!(await write(candidate))) return;
    previous = null;
    setUndoReceipt(state.pack.id, null);
    $("#mission-audit-undo").disabled = true;
  } catch (reason) {
    report(`Undo not saved: ${reason.message}`);
  }
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-audit-id]");
  if (!button || !audit) return;
  if (writing) return;
  if (dirty && !confirm("Discard unsaved audit edits?")) return;
  active =
    targets.find((target) => target.id === button.dataset.auditId) || null;
  dirty = false;
  render();
  const hiddenSpoiler = Boolean(active?.spoiler && !state.profile?.spoilers);
  $(
    hiddenSpoiler ? "#mission-audit-spoiler-notice" : "#mission-audit-editor",
  ).scrollIntoView({ block: "nearest" });
});
for (const selector of ["#mission-audit-search", "#mission-audit-filter"])
  $(selector).addEventListener("input", render);
for (const selector of [
  "#mission-audit-state",
  "#mission-audit-note",
  "#mission-audit-reviewer",
])
  $(selector).addEventListener("input", () => {
    dirty = true;
  });
$("#mission-audit-save").addEventListener("click", save);
$("#mission-audit-undo").addEventListener("click", () => {
  if (!writing) undo();
});
$("#mission-audit-export").addEventListener("click", () => {
  if (!audit) return;
  download(`mission-audit-${state.pack.id.replaceAll(":", "-")}.json`, audit);
  report(
    "Audit export requested. Check your downloads; the file may contain spoilers.",
  );
});
$("#mission-audit-import").addEventListener("change", async (event) => {
  if (writing) return;
  const revision = ++importRevision;
  importCandidate = null;
  $("#mission-audit-restore").hidden = true;
  try {
    const file = event.target.files?.[0];
    if (!file || file.size > 2_000_000)
      throw Error("Choose a JSON file under 2 MB.");
    const parsed = JSON.parse(await file.text());
    if (revision !== importRevision) return;
    importCandidate = validateMissionAudit(parsed, state.pack.id);
    const preview = missionAuditRestorePreview(audit, importCandidate, targets);
    $("#mission-audit-import-preview").textContent =
      `${preview.added} added, ${preview.changed} changed, ${preview.removed} removed, ${preview.stale} stale or missing source bindings. Restoring replaces the current local audit for ${state.pack.id}; your current entries remain until you confirm.`;
    $("#mission-audit-restore").hidden = false;
  } catch (reason) {
    if (revision !== importRevision) return;
    importCandidate = null;
    $("#mission-audit-restore").hidden = true;
    $("#mission-audit-import-preview").textContent =
      `Import rejected: ${reason.message}`;
  }
});
$("#mission-audit-restore").addEventListener("click", async () => {
  if (!importCandidate || writing) return;
  if (
    dirty &&
    !confirm("Discard unsaved section edits and restore the previewed audit?")
  )
    return;
  try {
    if (!(await write(importCandidate))) return;
    previous = null;
    setUndoReceipt(state.pack.id, null);
    $("#mission-audit-undo").disabled = true;
    importCandidate = null;
    $("#mission-audit-restore").hidden = true;
    $("#mission-audit-import-preview").textContent =
      "Audit restored on this device.";
  } catch (reason) {
    report(`Restore failed: ${reason.message}. Original audit retained.`);
  }
});
$("#mission-audit-import-cancel").addEventListener("click", () => {
  if (writing) return;
  importRevision += 1;
  importCandidate = null;
  $("#mission-audit-import").value = "";
  $("#mission-audit-restore").hidden = true;
  $("#mission-audit-import-preview").textContent =
    "Import cancelled. Current audit retained.";
});
registerDraftGuard({ isDirty: () => dirty || writing });
init(() => {
  active = null;
  previous = null;
  dirty = false;
  load(state.pack);
  render();
  const requested = new URLSearchParams(location.search).get("target");
  if (requested && requested.length <= 400) {
    active = targets.find((target) => target.id === requested) || null;
    if (active) {
      render();
      requestAnimationFrame(() => {
        $(
          active.spoiler && !state.profile?.spoilers
            ? "#mission-audit-spoiler-notice"
            : "#mission-audit-editor",
        )?.scrollIntoView({ block: "nearest" });
      });
    }
  }
}).catch((reason) => {
  console.error(reason);
  error(reason);
});
