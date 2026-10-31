import {
  upgradeOverview,
  overviewMatches,
} from "../domain/upgrade-overview.mjs";
import {
  readUpgradeView,
  writeUpgradeView,
  missingMarkup,
  materialPanel,
} from "./upgrade-dashboard.mjs";
import { upgradeAdvice } from "../domain/upgrade-advice.mjs";
import { singleExpansion } from "./compact-lists.mjs";
import { validateProfile } from "../domain/profile.mjs";
import {
  spendingActions,
  renderSpendingSummary,
  installSpending,
} from "./upgrade-spending.mjs";
import { init, state, $, esc, error, persist, download } from "./common.mjs";
import { closeDialog } from "./dialog-focus.mjs";
import {
  progressRows,
  progressSources,
  progressStates,
  spoilerGuard,
  setCompletion,
  resetProgress,
} from "../domain/progression.mjs";
import {
  upgradeCompletionStates,
  upgradeAvailabilityStates,
  setUpgradeProgress,
  upgradeReadinessReasons,
} from "../domain/upgrade-progress.mjs";
let resetTarget = null,
  upgradeTarget = null,
  upgradeCandidate = null,
  navigation = 0,
  visibleRows = new Map(),
  saving = false,
  offset = 0;
let overview = null,
  view = null,
  viewPack = null,
  undoProgress = null;
let overviewPack = null,
  overviewProfile = null;
const labelStatus = (value) =>
  value === "verified" ? "Source-backed · live build unverified" : value;
const reference = (ref) =>
  ref.url
    ? `<a href="${esc(ref.url)}" tabindex="0">${esc(ref.name)}</a>`
    : esc(ref.name);
const provenance = (source) =>
  source.provenance
    ? `<p>Provenance: ${esc(source.provenance.kind)} · Capture date: ${esc(source.provenance.captureDate || "Unknown")} · Build identity: ${esc(source.provenance.buildStatus)}.</p><p>Observation: ${esc(source.provenance.observationKey)} · Lineage: ${esc(source.provenance.lineageKey)}.</p>`
    : "";
function setBusy(value) {
  for (const control of document.querySelectorAll(
    "#pack-select, #spoiler-toggle, #progress-reset, #progress-reset-yes, [data-progress-id], [data-upgrade-id], [data-complete-upgrade], #upgrade-progress-apply, #upgrade-progress-cancel, #upgrade-progress-export, #upgrade-undo",
  ))
    control.disabled = value || control.hasAttribute("data-upgrade-readonly");
}
function upgradeControls(row, guard) {
  const upgrade = row.upgrade,
    readonly = state.profile.schemaVersion < 2,
    settings = `/settings/?pack=${encodeURIComponent(state.pack.id)}`,
    select = (field, values) =>
      `<label>Manual ${field} for ${esc(row.name)}<select data-upgrade-id="${esc(row.id)}" data-upgrade-field="${field}"${readonly ? " disabled data-upgrade-readonly" : ""}>${values.map((value) => `<option value="${value}"${upgrade[field] === value ? " selected" : ""}>${value === "completed" ? "Recorded completed" : value}</option>`).join("")}</select></label>`;
  return `<h3>Upgrade progress</h3>
<p>${upgrade.completion === "completed" ? "Recorded completed" : "Not marked complete"}. Availability is your separate report, not proof of purchase or live-game access.</p>
${upgrade.tierLabel ? `<p>Observed tier: ${esc(guard.text(upgrade.tierLabel))}. Other tiers are not inferred.</p>` : "<p>No tier label recorded. Missing tiers are unknown, not completed.</p>"}
${upgrade.reviewRequired ? '<p class="notice">Review required: check the recorded completion and availability against current evidence. Legacy ambiguity or changed content may need attention; historical completion is not automatically changed.</p>' : ""}
${readonly ? `<p class="notice">This older profile is read-only for upgrade progress. <a href="${esc(settings)}">Preview and confirm profile migration in Settings</a> before editing.</p>` : ""}
${select("completion", upgradeCompletionStates)}${select("availability", upgradeAvailabilityStates)}
<p>These manual controls correct status only; they never change stock or recorded spending. Use Record in-game purchase below only when saved stock still predates the purchase.</p>
${spendingActions(state.pack, state.profile, row.id)}
<div data-upgrade-budget="${esc(row.id)}"></div><h3>Listed requirements</h3><ul>${row.requirements.map((requirement) => (requirement.hidden ? "<li>Spoiler-protected requirement. Reveal spoilers to inspect it.</li>" : `<li>${reference(requirement)}: ${requirement.quantity === null ? "Quantity unknown" : esc(requirement.quantity)} · ${requirement.consumption === "unknown" ? "Consumption unknown" : esc(requirement.consumption)}</li>`)).join("") || "<li>No requirements listed; this is not evidence of zero cost.</li>"}</ul>
<p>Listed requirements are not a remaining shopping budget. Unknown consumption or quantities prevent exact affected advice; recorded progress does not update held stock.</p>`;
}
const focusedUpgrades = !!document.querySelector("[data-focused-upgrades]");
if (focusedUpgrades) {
  $("#progress-track").value = "dmz-upgrade";
  $("#progress-track").disabled = true;
}
function summaryFor(row, guard) {
  if (!row.upgrade) return "";
  const unknownCost =
    !row.requirements.length ||
    row.requirements.some(
      (r) => r.hidden || r.quantity === null || r.consumption === "unknown",
    );
  const record = state.pack.objectives.find((r) => r.id === row.id);
  const reasons = upgradeReadinessReasons(state.pack, state.profile, record);
  return `<span class="upgrade-manual">${!row.hidden ? `<label class="upgrade-completion-check"><input type="checkbox" data-complete-upgrade="${esc(row.id)}" aria-label="Completed: ${esc(row.name)}"${row.upgrade.completion === "completed" ? " checked" : ""}${state.profile.schemaVersion < 2 ? " disabled data-upgrade-readonly" : ""}><span>Completed</span></label>` : ""}${row.upgrade.tierLabel ? `<small>${esc(guard.text(row.upgrade.tierLabel))}</small>` : ""}</span><span class="upgrade-requirements" data-upgrade-column="materials">${focusedUpgrades ? missingMarkup(state.pack, overview?.rows.get(row.id)) : `${row.requirements.filter((r) => !r.hidden).length} visible requirements`}</span><span class="upgrade-blocker" data-upgrade-column="readiness"><span class="upgrade-cell-label">Readiness</span>${row.disputed ? "Evidence conflict · " : ""}${unknownCost ? "Unknown price / consumption · " : ""}${row.upgrade.completion === "completed" ? "Manual report only" : reasons.length ? "Eligibility unknown / blocked" : "Readiness not certified"}</span>`;
}
function render() {
  if (focusedUpgrades) $("#progress-track").value = "dmz-upgrade";
  const openIds = new Set(
    [...document.querySelectorAll("details[data-progress-detail][open]")].map(
      (node) => node.dataset.progressDetail,
    ),
  );
  if (focusedUpgrades) {
    if (viewPack !== state.pack.id) {
      viewPack = state.pack.id;
      view = readUpgradeView(viewPack);
      $("#upgrade-quick").value = view.quick;
      $("#upgrade-density").value = view.density;
      for (const key of ["materials", "readiness", "evidence"])
        $("#upgrade-show-" + key).checked = view[key];
      $("#progress-status").value = view.status;
      $("#progress-state").value = view.progress;
      undoProgress = null;
    }
    if (overviewPack !== state.pack || overviewProfile !== state.profile) {
      overview = upgradeOverview(state.pack, state.profile);
      overviewPack = state.pack;
      overviewProfile = state.profile;
    }
    $("#upgrade-catalog-summary").textContent =
      `${overview.completed} recorded completed / ${overview.total} visible upgrades in this catalog; ${overview.total - overview.completed} not marked complete. Coverage is incomplete; these are not game-wide totals.`;
    if (
      undoProgress &&
      (undoProgress.packId !== state.pack.id ||
        undoProgress.revision !== state.revision ||
        !overview.rows.has(undoProgress.id))
    )
      undoProgress = null;
    $("#upgrade-undo").hidden = !undoProgress;
    if (!undoProgress) $("#upgrade-feedback").textContent = "";
    const shell = $(".upgrade-list-shell");
    shell.dataset.density = view.density;
    for (const key of ["materials", "readiness", "evidence"])
      shell.classList.toggle("hide-" + key, !view[key]);
  }
  const selectedSource = focusedUpgrades
    ? view.source
    : $("#progress-source").value;
  const sources = progressSources(state.pack, {
    reveal: state.profile.spoilers,
    track: $("#progress-track").value,
  });
  $("#progress-source").innerHTML =
    '<option value="">All visible sources</option>' +
    sources
      .map((s) => `<option value="${esc(s.id)}">${esc(s.title)}</option>`)
      .join("");
  if (
    [...$("#progress-source").options].some((o) => o.value === selectedSource)
  )
    $("#progress-source").value = selectedSource;
  if (
    focusedUpgrades &&
    view.source &&
    [...$("#progress-source").options].some((o) => o.value === view.source)
  )
    $("#progress-source").value = view.source;
  const rows = progressRows(state.pack, state.profile, {
    track: $("#progress-track").value,
    query: $("#progress-query").value,
    source: $("#progress-source").value,
    status: $("#progress-status").value,
    progress: $("#progress-state").value,
    offset,
    allowedIds:
      focusedUpgrades && view.quick !== "all"
        ? new Set(
            [...overview.rows.values()]
              .filter((r) => overviewMatches(r, view.quick))
              .map((r) => r.id),
          )
        : null,
  });
  const guard = spoilerGuard(state.pack, state.profile.spoilers);
  visibleRows = new Map(
    rows.filter((row) => !row.hidden).map((row) => [row.id, row]),
  );
  $("#pack-note").textContent = guard.text(
    `${state.pack.title} · ${state.pack.contentVersion}. ${state.pack.coverage.note}`,
  );
  $("#spoiler-toggle").textContent = state.profile.spoilers
    ? "Hide spoilers"
    : "Reveal spoilers";
  $("#spoiler-toggle").setAttribute(
    "aria-pressed",
    String(state.profile.spoilers),
  );
  offset = rows.offset;
  $("#progress-count").textContent =
    `Showing ${rows.length ? offset + 1 : 0}–${offset + rows.length} of ${rows.total} matching records. This is not a completion percentage; coverage is incomplete.`;
  $("#progress-previous").disabled = offset === 0;
  $("#progress-next").disabled = !rows.more;
  $("#progress-limit-note").hidden = !rows.privacyLimited && !sources.truncated;
  $("#progress-limit-note").textContent = rows.privacyLimited
    ? "This large spoiler dictionary exceeds the protected-display budget. Text is conservatively hidden; reveal spoilers or use a smaller pack to inspect it."
    : "The source chooser shows its first 500 choices. Narrow the track to reduce this list.";
  $("#progress-rows").innerHTML =
    rows
      .map(
        (r) =>
          `<article class="panel compact-progress${r.upgrade?.completion === "completed" ? " upgrade-is-completed" : ""}"><div class="upgrade-summary"><div><h2>${r.url && !r.hidden ? `<a href="${esc(r.url)}" ${focusedUpgrades ? `data-open-upgrade="${esc(r.id)}" aria-expanded="${openIds.has(r.id)}" aria-controls="progress-detail-${esc(r.id)}"` : ""} tabindex="0">${esc(r.name)}</a>` : esc(r.name)}</h2><small data-upgrade-column="evidence">${focusedUpgrades ? "" : `${esc(r.track)} / `}${esc(labelStatus(r.status))}</small>${r.upgrade?.completion === "completed" ? "<small>Recorded completed</small>" : ""}${focusedUpgrades && !r.hidden && (r.disputed || r.upgrade?.reviewRequired || overview?.rows.get(r.id)?.unknown) ? `<small class="upgrade-critical">${r.disputed ? "Evidence conflict. " : ""}${r.upgrade?.reviewRequired ? "Progress needs review. " : ""}${overview?.rows.get(r.id)?.unknown ? "Costs / stock unknown or partial." : ""}</small>` : ""}</div>${summaryFor(r, guard)}${r.upgrade && !r.hidden ? `<button type="button" data-track-upgrade="${esc(r.id)}" ${state.profile.goals.some((g) => g.id === r.id) ? "disabled" : ""}>${state.profile.goals.some((g) => g.id === r.id) ? "Tracked" : "Track"}</button>` : ""}</div><details ${r.hidden ? "" : `id="progress-detail-${esc(r.id)}"`} data-progress-detail="${r.hidden ? "protected" : esc(r.id)}" ${openIds.has(r.id) ? "open" : ""}><summary>Details / progress${r.upgrade?.reviewRequired ? " · Review required" : ""}</summary>${
            r.hidden
              ? "<p>Reveal spoilers to inspect or track this record.</p>"
              : `
<p>${esc(r.description)}</p>${r.disputed ? '<p class="notice">Sources disagree. Your manual state does not resolve this evidence conflict or verify readiness.</p>' : ""}
${
  r.type === "objective"
    ? `${r.upgrade ? `${focusedUpgrades ? `<div data-direct-materials="${esc(r.id)}"></div>` : ""}${upgradeControls(r, guard)}` : `<label>Manual state for ${esc(r.name)}<select data-progress-id="${esc(r.id)}">${progressStates.map((v) => `<option value="${v}" ${r.state === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`}
<h3>Prerequisite chain</h3>${r.upgrade?.prerequisiteStatus === "unknown" ? '<p class="notice">Prerequisite completeness is unknown. An empty list does not mean there are no prerequisites; missing tiers and unlock rules are not inferred.</p>' : ""}<ul>${r.prerequisites.map((p) => `<li>${reference(p)}: ${esc(p.state)} · evidence ${esc(labelStatus(p.status))}${p.depth ? ` · indirect prerequisite (depth ${p.depth + 1})` : ""}</li>`).join("") || "<li>No listed prerequisites; review source completeness.</li>"}</ul>
${r.effects.length ? `<h3>Recorded effects</h3><ul>${r.effects.map((e) => `<li>${esc(e.type)} · ${esc(e.target)}: ${esc(e.value)}</li>`).join("")}</ul><p>Effects use the record’s sources below. They do not create owned items or prove live-game access.</p>` : ""}`
    : ""
}
${r.detailsTruncated ? '<p class="notice">This is a bounded preview of a large dependency or evidence list. Open the selected private record to inspect direct details.</p>' : ""}
${r.related.length ? `<h3>Related records</h3><ul>${r.related.map((ref) => `<li>${reference(ref)}</li>`).join("")}</ul>` : ""}
<dl><dt>Scope</dt><dd>${esc(r.scope)}</dd><dt>Content version</dt><dd>${esc(r.contentVersion)}</dd></dl>
<h3>Evidence &amp; sources</h3><ul class="source-list">${r.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" rel="noreferrer noopener">${esc(s.title)}</a>` : esc(s.title)}<p>${esc(s.supports)}</p><p>${esc(s.type)} · Published ${esc(s.publishedAt)} · Reviewed ${esc(s.reviewedAt)}</p>${provenance(s)}</li>`).join("") || "<li>No sources recorded. Treat this as unverified.</li>"}</ul>
${r.url ? `<p><a href="${esc(r.url)}">Open selected private record</a></p>` : ""}`
          }</details></article>`,
      )
      .join("") ||
    '<section class="panel"><h2>No matching records.</h2><p>This starter pack may not contain a verified catalog for this track. Clear filters or add a sourced record in the editor.</p></section>';
  for (const details of document.querySelectorAll(
    "details[data-progress-detail][open]",
  ))
    renderRequirementBudget(details);
  renderSpendingSummary();
  setBusy(saving);
}
// One save at a time avoids local controls racing the revision used by persist.
async function save(candidate) {
  if (saving) return false;
  saving = true;
  const focused = document.activeElement;
  setBusy(true);
  let saved = false;
  try {
    saved = await persist(candidate);
    return saved;
  } finally {
    saving = false;
    setBusy(false);
    if (saved && focused?.isConnected && focused.matches("[data-progress-id]"))
      focused.focus();
  }
}
function focusUpgrade(target) {
  if (!target || target.packId !== state.pack?.id) return;
  (
    document.querySelector(
      target.inline
        ? `[data-complete-upgrade="${CSS.escape(target.id)}"]`
        : `[data-upgrade-id="${CSS.escape(target.id)}"][data-upgrade-field="${target.field}"]`,
    ) || $("#progress-count")
  ).focus();
}
function dismissUpgrade({ focus = true } = {}) {
  const target = upgradeTarget,
    revision = state.revision;
  upgradeTarget = null;
  upgradeCandidate = null;
  const dialog = $("#upgrade-progress-confirm");
  closeDialog(
    dialog,
    focus
      ? () => {
          if (
            target?.navigation === navigation &&
            revision === state.revision &&
            !state.loading &&
            !upgradeTarget
          )
            focusUpgrade(target);
        }
      : undefined,
  );
  $("#upgrade-progress-export").hidden = true;
  $("#upgrade-progress-result").textContent = "";
}
function requestUpgrade(control, inline = false, savedRow = null) {
  const id = control.dataset.upgradeId,
    field = control.dataset.upgradeField,
    value = control.value,
    row = savedRow || visibleRows.get(id);
  if (!row?.upgrade || !["completion", "availability"].includes(field)) return;
  // Keep the visible row at its committed value until confirmation and CAS succeed.
  control.value = row.upgrade[field];
  if (saving || state.loading || upgradeTarget || value === row.upgrade[field])
    return;
  if (state.profile.schemaVersion < 2) return;
  upgradeTarget = {
    id,
    field,
    value,
    packId: state.pack.id,
    contentVersion: state.pack.contentVersion,
    revision: state.revision,
    navigation,
    inline,
    previous: row.upgrade[field],
    row,
  };
  $("#upgrade-progress-target").textContent =
    `${row.name}: change manual ${field} from ${row.upgrade[field]} to ${value}? Selected catalog ${spoilerGuard(state.pack, state.profile.spoilers).text(state.pack.title)}, saved revision ${state.revision}.`;
  $("#upgrade-progress-result").textContent = "";
  $("#upgrade-progress-export").hidden = true;
  $("#upgrade-progress-confirm").showModal();
  $("#upgrade-progress-cancel").focus();
}
$("#upgrade-progress-cancel").addEventListener("click", () => {
  if (!saving) dismissUpgrade();
});
$("#upgrade-progress-confirm").addEventListener("cancel", (event) => {
  event.preventDefault();
  if (!saving) dismissUpgrade();
});
$("#upgrade-progress-confirm").addEventListener("close", () => {
  if (upgradeTarget && !saving && !$("#upgrade-progress-confirm").open)
    dismissUpgrade();
});
$("#upgrade-progress-export").addEventListener("click", () => {
  if (!saving && upgradeCandidate)
    download("dmz-unsaved-upgrade-progress.json", upgradeCandidate);
});
$("#upgrade-progress-apply").addEventListener("click", async () => {
  if (saving || !upgradeTarget) return;
  const target = upgradeTarget;
  if (
    state.loading ||
    target.navigation !== navigation ||
    target.packId !== state.pack.id ||
    target.contentVersion !== state.pack.contentVersion ||
    target.revision !== state.revision ||
    target.revision !== state.profile.revision
  ) {
    dismissUpgrade();
    error(
      new Error(
        "Progress confirmation expired. Review the selected catalog again.",
      ),
    );
    return;
  }
  try {
    upgradeCandidate = setUpgradeProgress(
      state.pack,
      state.profile,
      target.id,
      { [target.field]: target.value },
      target.revision,
    );
    const saved = await save(upgradeCandidate);
    if (target !== upgradeTarget || target.navigation !== navigation) return;
    if (saved) {
      if (focusedUpgrades) {
        undoProgress =
          target.field === "completion"
            ? { ...target, revision: state.revision }
            : null;
        $("#upgrade-feedback").textContent =
          `${target.row.name}: saved ${target.field} as ${target.value}.`;
      }
      dismissUpgrade();
      render();
    } else {
      $("#upgrade-progress-result").textContent =
        `Not saved. ${$("#error").textContent} Your committed progress has not changed. Export this unsaved candidate before cancelling or leaving; resolve the conflict in Settings before trying a new revision.`;
      $("#upgrade-progress-export").hidden = false;
      $("#upgrade-progress-export").focus();
    }
  } catch (reason) {
    $("#upgrade-progress-result").textContent = reason.message;
  }
});
$("#progress-filters").addEventListener("submit", (event) => {
  event.preventDefault();
  rememberView();
  offset = 0;
  render();
});
$("#progress-filters").addEventListener("input", () => {
  rememberView();
  offset = 0;
  render();
});
$("#progress-previous").addEventListener("click", () => {
  offset = Math.max(0, offset - 50);
  render();
  $("#progress-count").focus();
});
$("#progress-next").addEventListener("click", () => {
  offset += 50;
  render();
  $("#progress-count").focus();
});
$("#progress-clear").addEventListener("click", () => {
  $("#progress-filters").reset();
  if (focusedUpgrades) {
    $("#upgrade-quick").value = "all";
    rememberView();
  }
  if (focusedUpgrades) $("#progress-track").value = "dmz-upgrade";
  offset = 0;
  render();
});
$("#spoiler-toggle").addEventListener("click", async () => {
  if (saving) return;
  state.profile = { ...state.profile, spoilers: !state.profile.spoilers };
  offset = 0;
  // Hide immediately, including when storage is unavailable or another tab saved.
  render();
  await save(state.profile);
  $("#spoiler-toggle").focus();
});
$("#progress-rows").addEventListener("change", async (event) => {
  if (event.target.dataset.upgradeId) {
    requestUpgrade(event.target);
    return;
  }
  const id = event.target.dataset.progressId;
  if (!id || saving) return;
  try {
    state.profile = setCompletion(
      state.pack,
      state.profile,
      id,
      event.target.value,
    );
    const saved = await save(state.profile);
    render();
    if (saved)
      (
        document.querySelector(`[data-progress-id="${CSS.escape(id)}"]`) ||
        $("#progress-state")
      ).focus();
  } catch (reason) {
    error(reason);
  }
});
$("#progress-reset").addEventListener("click", () => {
  if (saving) return;
  resetTarget = { packId: state.pack.id, revision: state.revision };
  $("#progress-reset-target").textContent =
    `Clear only manual progress for ${state.pack.title}, saved revision ${state.revision}? Inventory, reserves and goals stay unchanged. A previous saved snapshot will be kept.`;
  $("#progress-reset-confirm").hidden = false;
  $("#progress-reset-yes").focus();
});
$("#progress-reset-no").addEventListener("click", () => {
  resetTarget = null;
  $("#progress-reset-confirm").hidden = true;
  $("#progress-reset").focus();
});
$("#progress-reset-yes").addEventListener("click", async () => {
  if (saving) return;
  if (
    !resetTarget ||
    resetTarget.packId !== state.pack.id ||
    resetTarget.revision !== state.revision
  ) {
    error(
      new Error("Reset confirmation expired. Review the selected pack again."),
    );
    return;
  }
  if (await save(resetProgress(state.profile))) {
    resetTarget = null;
    $("#progress-reset-confirm").hidden = true;
    render();
    $("#progress-reset").focus();
  }
});
document.addEventListener("pack-changing", () => {
  navigation++;
  undoProgress = null;
  if (focusedUpgrades) $("#upgrade-feedback").textContent = "";
  dismissUpgrade({ focus: false });
  resetTarget = null;
  offset = 0;
  $("#progress-reset-confirm").hidden = true;
});
$("#pack-select").addEventListener(
  "change",
  () => {
    navigation++;
    dismissUpgrade({ focus: false });
  },
  true,
);
window.addEventListener("pagehide", () => {
  navigation++;
  dismissUpgrade({ focus: false });
});
window.addEventListener("popstate", () => {
  navigation++;
  dismissUpgrade({ focus: false });
});
installSpending({ onSaved: render, isDirty: () => saving });
init(render).catch(error);

singleExpansion($("#progress-rows"), "details[data-progress-detail]");
$("#progress-rows").addEventListener("click", async (event) => {
  const opener = event.target.closest("[data-open-upgrade]");
  if (
    opener &&
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  ) {
    event.preventDefault();
    const details = opener
      .closest("article")
      .querySelector("details[data-progress-detail]");
    details.open = !details.open;
    details.querySelector(":scope > summary").focus();
    return;
  }
  const scanRow = event.target.closest(".upgrade-summary");
  if (
    focusedUpgrades &&
    scanRow &&
    !event.target.closest("a, button, input, label, select, summary") &&
    !window.getSelection()?.toString()
  ) {
    const details = scanRow
      .closest("article")
      .querySelector("details[data-progress-detail]");
    details.open = !details.open;
    details.querySelector(":scope > summary").focus();
    return;
  }
  const completion = event.target.closest("[data-complete-upgrade]");
  if (completion) {
    event.preventDefault();
    const row = visibleRows.get(completion.dataset.completeUpgrade);
    if (row?.upgrade)
      requestUpgrade(
        {
          dataset: { upgradeId: row.id, upgradeField: "completion" },
          value:
            row.upgrade.completion === "completed" ? "incomplete" : "completed",
        },
        true,
      );
    return;
  }
  const id = event.target.closest("[data-track-upgrade]")?.dataset.trackUpgrade;
  if (!id || saving || state.loading || !visibleRows.get(id)?.upgrade) return;
  try {
    if (state.profile.goals.some((g) => g.id === id)) return;
    if (state.profile.goals.length >= 100)
      throw new Error("Maximum 100 goals. Remove a goal in Planner first.");
    const candidate = structuredClone(state.profile);
    candidate.goals.push({ id, quantity: 1 });
    validateProfile(candidate);
    if (await save(candidate)) render();
  } catch (reason) {
    error(reason);
  }
});

function renderRequirementBudget(details) {
  const direct = details.querySelector("[data-direct-materials]");
  if (direct)
    direct.innerHTML = materialPanel(
      state.pack,
      state.profile,
      overview?.rows.get(direct.dataset.directMaterials),
    );
  const root = details.querySelector("[data-upgrade-budget]");
  if (!root) return;
  try {
    const advice = upgradeAdvice(
      state.pack,
      {
        ...state.profile,
        goals: [{ id: root.dataset.upgradeBudget, quantity: 1 }],
      },
      { scope: "focused" },
    );
    const amount = (n) => (n === null ? "Unknown" : esc(n));
    root.innerHTML =
      advice.status === "blocked"
        ? `<p class="notice">Requirement preview unavailable: ${advice.reasons.map(esc).join("; ")}</p>`
        : `<h3>Focused upgrade · requirement preview</h3><p>This upgrade and its known unfinished prerequisites, not your shared goal allocation or proof of readiness. Required quantities and retained roles remain distinct; current stock is your saved manual report.</p><div class="table-wrap"><table><thead><tr><th scope="col">Item / unit</th><th scope="col">Owned</th><th scope="col">Reserve</th><th scope="col">Available</th><th scope="col">Required</th><th scope="col">Known consumed</th><th scope="col">Known retained</th><th scope="col">Missing</th><th scope="col">Kept for / uses</th></tr></thead><tbody>${advice.rows
            .filter((row) => row.contributors.length)
            .slice(0, 50)
            .map(
              (row) =>
                `<tr><th scope="row"><a href="/local/?pack=${encodeURIComponent(state.pack.id)}&amp;id=${encodeURIComponent(row.id)}" tabindex="0" target="_blank" rel="noopener noreferrer">${esc(row.name)}</a> · ${esc(row.unit)}</th><td>${row.inventoryEntered ? amount(row.held) : "Not entered"}</td><td>${amount(row.reserve)}</td><td>${row.inventoryEntered ? amount(row.held === null ? null : Math.max(0, row.held - row.reserve)) : "Unknown"}</td><td>${amount(row.required)}</td><td>${amount(row.knownConsumed)}</td><td>${amount(row.knownRetained)}</td><td>${amount(row.upgradeGap)}</td><td><details><summary>Known uses</summary><ul>${row.contributors
                  .slice(0, 50)
                  .map(
                    (use) =>
                      `<li><a href="/local/?pack=${encodeURIComponent(state.pack.id)}&amp;id=${encodeURIComponent(use.id)}" tabindex="0" target="_blank" rel="noopener noreferrer">${esc(use.name)}</a> · ${amount(use.quantity)} · ${esc(use.consumption)}</li>`,
                  )
                  .join(
                    "",
                  )}</ul>${row.contributors.length > 50 ? "<p>First 50 uses; inspect linked records for more.</p>" : ""}</details></td></tr>`,
            )
            .join(
              "",
            )}</tbody></table></div><p>Up to 50 visible unfinished material lines. Full listed costs remain below even after completion; no listed rows is not evidence of zero cost.</p>`;
  } catch {
    root.innerHTML =
      '<p class="notice">Requirement preview unavailable. Check the profile/content binding; unknown costs are not zero.</p>';
  }
}
$("#progress-rows").addEventListener(
  "toggle",
  (event) => {
    if (event.target.matches("details[data-progress-detail]")) {
      event.target
        .closest("article")
        .querySelector("[data-open-upgrade]")
        ?.setAttribute("aria-expanded", String(event.target.open));
    }
    if (
      event.target.matches("details[data-progress-detail]") &&
      event.target.open
    )
      renderRequirementBudget(event.target);
  },
  true,
);

function rememberView() {
  if (!focusedUpgrades || !view) return;
  view.quick = $("#upgrade-quick").value;
  view.density = $("#upgrade-density").value;
  view.source = $("#progress-source").value;
  view.status = $("#progress-status").value;
  view.progress = $("#progress-state").value;
  for (const key of ["materials", "readiness", "evidence"])
    view[key] = $("#upgrade-show-" + key).checked;
  $("#upgrade-view-note").textContent = writeUpgradeView(state.pack.id, view)
    ? "View preferences saved on this browser."
    : "View changed for this session; browser storage unavailable.";
}
if (focusedUpgrades) {
  document.addEventListener("profile-saved", () => {
    undoProgress = null;
    $("#upgrade-undo").hidden = true;
    $("#upgrade-feedback").textContent = "";
  });
  $(".upgrade-view-controls").addEventListener("change", () => {
    rememberView();
    offset = 0;
    render();
  });
  $("#upgrade-undo").addEventListener("click", () => {
    const undo = undoProgress;
    if (
      !undo ||
      saving ||
      state.loading ||
      undo.packId !== state.pack.id ||
      undo.contentVersion !== state.pack.contentVersion ||
      undo.revision !== state.revision
    )
      return;
    const row = {
      ...undo.row,
      upgrade: { ...undo.row.upgrade, [undo.field]: undo.value },
    };
    requestUpgrade(
      {
        dataset: { upgradeId: undo.id, upgradeField: undo.field },
        value: undo.previous,
      },
      undo.inline,
      row,
    );
  });
}
