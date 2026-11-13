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
  validateMissionAudit,
} from "../domain/mission-audit.mjs";

const key = (id) => `dmz:mission-audit:v1:${id}`;
let audit = null;
let targets = [];
let active = null;
let previous = null;
let importCandidate = null;
let dirty = false;
let loadBlocked = false;
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
const report = (message) => {
  $("#save-status").textContent = message;
};
const isCurrent = (target) =>
  targets.some((candidate) => candidate.id === target.id);

function load(pack) {
  loadBlocked = false;
  try {
    const raw = localStorage.getItem(key(pack.id));
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
          return `<button type="button" class="mission-audit-row" data-audit-id="${esc(target.id)}" aria-pressed="${active?.id === target.id}"><span>${esc(target.label)}${target.kind === "mission" ? ` · ${esc(target.section)}` : ""}</span><small>${esc(labelState(status))}${target.warning ? " · evidence gap" : ""}</small></button>`;
        })
        .join("")}</div>`
    : `<p>${esc(emptyText)}</p>`;
}
function render() {
  if (!state.pack || !audit) return;
  targets = missionAuditTargets(state.pack);
  const pages = targets.filter((target) => target.kind === "page");
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
    `${pages.length} scoped Orders pages · ${incomplete} unrecorded · ${missions.length / 9} recorded missions · ${later} sections to fill later${stale ? ` · ${stale} stale review entries` : ""}.`;
  renderList(
    pages,
    "#mission-audit-pages",
    "No Orders pages match this filter.",
  );
  renderList(
    missions,
    "#mission-audit-missions",
    missions.length
      ? "No recorded mission sections match this filter."
      : "No Order or Story Mission records are in this catalog yet.",
  );
  if (active && !isCurrent(active)) active = null;
  $("#mission-audit-editor").hidden = !active;
  if (!active) return;
  const saved = entryFor(active.id);
  const last = audit.history.at(-1);
  if (
    !previous &&
    last?.id === active.id &&
    JSON.stringify(last.after) === JSON.stringify(saved || null)
  )
    previous = { id: active.id, old: last.before, current: last.after };
  $("#mission-audit-target").textContent =
    `${active.label} · ${active.section}`;
  const staleReview =
    saved && saved.sourceFingerprint !== active.sourceFingerprint;
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
  $("#mission-audit-undo").disabled = !previous || previous.id !== active.id;
  $("#mission-audit-links").innerHTML =
    active.kind === "mission"
      ? `<a href="/local/?pack=${encodeURIComponent(state.pack.id)}&amp;id=${encodeURIComponent(active.objectiveId)}">Open recorded mission</a>`
      : "Unrecorded page: no mission record to open.";
}
function write(candidate) {
  if (loadBlocked)
    throw Error(
      "The saved audit could not be read. Recover it before replacing this catalog's audit.",
    );
  validateMissionAudit(candidate, state.pack.id);
  localStorage.setItem(key(state.pack.id), JSON.stringify(candidate));
  audit = candidate;
  dirty = false;
  report("Audit saved on this device.");
  render();
}
function save() {
  if (!active || !audit) return;
  const old = entryFor(active.id);
  const next = {
    id: active.id,
    state: $("#mission-audit-state").value,
    note: $("#mission-audit-note").value,
    reviewer: $("#mission-audit-reviewer").value,
    reviewedAt: new Date().toISOString(),
    sourceFingerprint: active.sourceFingerprint,
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
    write(candidate);
    previous = { id: active.id, old, current: next };
    $("#mission-audit-undo").disabled = false;
  } catch (reason) {
    report(
      `Audit not saved: ${reason.message}. Your edits remain in the form.`,
    );
  }
}
function undo() {
  if (!active || !previous || previous.id !== active.id) return;
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
    write(candidate);
    previous = null;
  } catch (reason) {
    report(`Undo not saved: ${reason.message}`);
  }
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-audit-id]");
  if (!button || !audit) return;
  if (dirty && !confirm("Discard unsaved audit edits?")) return;
  active =
    targets.find((target) => target.id === button.dataset.auditId) || null;
  dirty = false;
  render();
  $("#mission-audit-editor").scrollIntoView({ block: "nearest" });
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
$("#mission-audit-undo").addEventListener("click", undo);
$("#mission-audit-export").addEventListener("click", () => {
  if (!audit) return;
  download(`mission-audit-${state.pack.id.replaceAll(":", "-")}.json`, audit);
  report(
    "Audit export requested. Check your downloads; the file may contain spoilers.",
  );
});
$("#mission-audit-import").addEventListener("change", async (event) => {
  importCandidate = null;
  $("#mission-audit-restore").hidden = true;
  try {
    const file = event.target.files?.[0];
    if (!file || file.size > 2_000_000)
      throw Error("Choose a JSON file under 2 MB.");
    importCandidate = validateMissionAudit(
      JSON.parse(await file.text()),
      state.pack.id,
    );
    $("#mission-audit-import-preview").textContent =
      `${importCandidate.entries.length} entries for ${state.pack.id}. Restoring replaces the current local audit for this catalog. Current entries: ${audit.entries.length}.`;
    $("#mission-audit-restore").hidden = false;
  } catch (reason) {
    $("#mission-audit-import-preview").textContent =
      `Import rejected: ${reason.message}`;
  }
});
$("#mission-audit-restore").addEventListener("click", () => {
  if (!importCandidate) return;
  try {
    write(importCandidate);
    importCandidate = null;
    $("#mission-audit-restore").hidden = true;
  } catch (reason) {
    report(`Restore failed: ${reason.message}. Original audit retained.`);
  }
});
registerDraftGuard({ isDirty: () => dirty });
init(() => {
  active = null;
  previous = null;
  dirty = false;
  load(state.pack);
  render();
}).catch((reason) => {
  console.error(reason);
  error(reason);
});
