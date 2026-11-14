import { refreshTrackerContext } from "./quick-tracker.mjs";
import { hajinOrderSequence } from "../content/hajin-order-sequence.mjs";
import { fobUpgradeMaterials, parseUpgradeStock } from "./fob-upgrade-card.mjs";
import { hydrateInventoryIcons } from "./inventory-icons.mjs";
import { registerDraftGuard } from "./common.mjs";
import { upgradeBudget } from "../domain/upgrade-budget.mjs";
import {
  installBudgetSetup,
  renderBudgetSummary,
} from "./upgrade-budget-setup.mjs";
import { upgradeFamilies } from "../domain/upgrade-families.mjs";
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
  ordersPageCoverage,
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
let budget = null;
const stockDrafts = new Map();
let overview = null,
  view = null,
  viewPack = null,
  undoProgress = null;
let familyModel = null,
  openFamily = null,
  familyPage = 0;
let missionAnchorApplied = false;
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
    "#pack-select, #spoiler-toggle, #progress-reset, #progress-reset-yes, [data-progress-id], [data-upgrade-id], [data-complete-upgrade], [data-fob-owned], [data-fob-step], [data-fob-save], [data-fob-cancel], #upgrade-progress-apply, #upgrade-progress-cancel, #upgrade-progress-export, #upgrade-undo",
  ))
    control.disabled = value || control.hasAttribute("data-upgrade-readonly");
}
function upgradeControls(row, guard) {
  const upgrade = row.upgrade,
    readonly =
      state.profile.schemaVersion < 2 ||
      state.profile.contentVersion !== state.pack.contentVersion,
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
const focusedMissions = !!document.querySelector("[data-focused-missions]");
let selectedOrdersPage = null;
document
  .querySelector("#orders-coverage")
  ?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-orders-page]");
    if (!button) return;
    selectedOrdersPage =
      button.dataset.ordersPage === "all"
        ? null
        : Number(button.dataset.ordersPage);
    if (selectedOrdersPage)
      document.querySelector("#progress-track").value = "dmz-order";
    offset = 0;
    render();
    document.querySelector("#progress-count")?.focus({ preventScroll: true });
  });
if (focusedMissions) {
  document
    .querySelector('#progress-state option[value="not-completed"]')
    ?.remove();
  for (const o of [...document.querySelector("#progress-track").options])
    if (o.value && !["dmz-order", "dmz-story"].includes(o.value)) o.remove();
}
document
  .querySelector("#show-story-missions")
  ?.addEventListener("click", () => {
    document.querySelector("#progress-track").value = "dmz-story";
    selectedOrdersPage = null;
    offset = 0;
    render();
    document.querySelector("#progress-count")?.focus({ preventScroll: true });
  });
const focusedUpgrades = !!document.querySelector("[data-focused-upgrades]");
if (focusedUpgrades) {
  $("#progress-track").value = "dmz-upgrade";
  $("#progress-track").disabled = true;
}
function summaryFor(row, guard) {
  if (!row.upgrade) return "";
  if (focusedUpgrades)
    return `<span class="upgrade-manual"><label class="upgrade-completion-check"><input type="checkbox" data-complete-upgrade="${esc(row.id)}" aria-label="Completed: ${esc(row.name)}"${row.upgrade.completion === "completed" ? " checked" : ""}${state.profile.schemaVersion < 2 || state.profile.contentVersion !== state.pack.contentVersion ? " disabled data-upgrade-readonly" : ""}><span>Completed</span></label><small>Tier ${esc(guard.text(row.upgrade.tierLabel || "—"))}</small></span>`;
  const unknownCost =
    !row.requirements.length ||
    row.requirements.some(
      (r) => r.hidden || r.quantity === null || r.consumption === "unknown",
    );
  const record = state.pack.objectives.find((r) => r.id === row.id);
  const reasons = upgradeReadinessReasons(state.pack, state.profile, record);
  return `<span class="upgrade-manual">${!row.hidden ? `<label class="upgrade-completion-check"><input type="checkbox" data-complete-upgrade="${esc(row.id)}" aria-label="Completed: ${esc(row.name)}"${row.upgrade.completion === "completed" ? " checked" : ""}${state.profile.schemaVersion < 2 || state.profile.contentVersion !== state.pack.contentVersion ? " disabled data-upgrade-readonly" : ""}><span>Completed</span></label>` : ""}${row.upgrade.tierLabel ? `<small>${esc(guard.text(row.upgrade.tierLabel))}</small>` : ""}</span><span class="upgrade-requirements" data-upgrade-column="materials">${focusedUpgrades ? missingMarkup(state.pack, overview?.rows.get(row.id)) : `${row.requirements.filter((r) => !r.hidden).length} visible requirements`}</span><span class="upgrade-blocker" data-upgrade-column="readiness"><span class="upgrade-cell-label">Readiness</span>${row.disputed ? "Evidence conflict · " : ""}${unknownCost ? "Unknown price / consumption · " : ""}${row.upgrade.completion === "completed" ? "Manual report only" : reasons.length ? "Eligibility unknown / blocked" : "Readiness not certified"}</span>`;
}
const missionHref = (id) =>
  `/objectives/${encodeURIComponent(id).replace(/%3A/gi, "--")}/`;
const auditHref = (id) => `/missions/audit/?target=${encodeURIComponent(id)}`;
function renderMissionDirectory() {
  const hajin = $("#mission-directory-hajin");
  const x01 = $("#mission-directory-x01");
  if (!hajin || !x01) return;
  if (state.pack.id !== "official:mw4-dmz-starter") {
    hajin.innerHTML =
      "<p>This catalog has no reviewed Hajin page sequence.</p>";
    x01.replaceChildren();
    return;
  }
  const byId = new Map(state.pack.objectives.map((row) => [row.id, row]));
  const packId = encodeURIComponent(state.pack.id);
  const rowHTML = (id) => {
    const record = byId.get(id);
    if (!record) return "<li>Record missing · review source</li>";
    if (record.spoiler && !state.profile.spoilers)
      return "<li>Story mission · hidden until spoilers are enabled</li>";
    return `<li><a href="${esc(missionHref(id))}">${esc(record.name)}</a> <small>${record.status === "observed" ? "Source reported" : esc(record.status || "Unverified")}</small></li>`;
  };
  hajin.innerHTML =
    '<h3>Hajin · pages 1–24</h3><div class="mission-page-grid">' +
    hajinOrderSequence.pages
      .map(
        (row) =>
          `<section id="hajin-page-${row.page}" class="mission-page-card" aria-label="Hajin page ${row.page}"><h4>Page ${row.page} <small>${esc(row.label)}</small></h4><p>${row.placement === "fixed" ? "Fixed page roster" : "Reported chapter sequence · page may vary"}</p><ol>${row.objectiveIds.map(rowHTML).join("")}</ol><a href="${esc(auditHref(`page:${packId}:hajin-launch:${row.page}:roster`))}">Audit page ${row.page}</a></section>`,
      )
      .join("") +
    "</div>";
  const x01Pages = ordersPageCoverage(state.pack, 5, "x01");
  x01.innerHTML =
    '<h3>X01 · pages 1–5</h3><p>Community-reported tasks; confirm against your current Orders screen.</p><div class="mission-page-grid">' +
    x01Pages
      .map(
        (row) =>
          `<section id="x01-page-${row.page}" class="mission-page-card" aria-label="X01 page ${row.page}"><h4>Page ${row.page} <small>X01 ${row.page}/5</small></h4><p>${row.objectiveIds.length ? "Source-reported roster" : "No recorded Orders yet"}</p><ol>${row.objectiveIds.map(rowHTML).join("")}</ol><a href="${esc(auditHref(`page:${packId}:x01-season1:${row.page}:roster`))}">Audit X01 page ${row.page}</a></section>`,
      )
      .join("") +
    "</div>";
  if (
    !missionAnchorApplied &&
    /^#(?:hajin|x01)-page-(?:[1-9]|1\d|2[0-4])$/.test(location.hash)
  ) {
    missionAnchorApplied = true;
    requestAnimationFrame(() =>
      document
        .getElementById(location.hash.slice(1))
        ?.scrollIntoView({ block: "start" }),
    );
  }
}
function render() {
  refreshTrackerContext();
  if (focusedMissions) {
    renderMissionDirectory();
    const coverage = ordersPageCoverage(state.pack);
    if (
      selectedOrdersPage &&
      coverage[selectedOrdersPage - 1]?.state !== "recorded"
    )
      selectedOrdersPage = null;
    $("#orders-coverage").innerHTML =
      coverage
        .map((row) =>
          row.state === "recorded"
            ? `<button type="button" class="orders-page ${row.state}" data-orders-page="${row.page}" aria-pressed="${selectedOrdersPage === row.page}" title="Show recorded missions for page ${row.page}">Page ${row.page} · recorded</button>`
            : `<span class="orders-page ${row.state}" title="Page ${row.page}: unrecorded">Page ${row.page} · unrecorded</span>`,
        )
        .join("") +
      (selectedOrdersPage
        ? '<button type="button" data-orders-page="all">Show all recorded missions</button>'
        : "");
  }
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
      $("#upgrade-layout").value = view.layout;
      $("#upgrade-density").value = view.density;
      for (const key of ["materials", "readiness", "evidence"])
        $("#upgrade-show-" + key).checked = view[key];
      $("#progress-status").value = view.status;
      $("#progress-state").value = view.progress;
      undoProgress = null;
      openFamily = null;
      familyPage = 0;
    }
    if (overviewPack !== state.pack || overviewProfile !== state.profile) {
      overview = upgradeOverview(state.pack, state.profile);
      budget = upgradeBudget(state.pack, state.profile);
      if (budget.status === "ok")
        for (const [id, row] of overview.rows) {
          const own = budget.rows.get(id);
          if (own && !own.completed) {
            row.materials = own.materials;
            row.unknown = own.unknown;
          }
        }
      familyModel = upgradeFamilies(state.pack, state.profile, {
        completedIds: overview.completedUpgradeIds,
      });
      overviewPack = state.pack;
      overviewProfile = state.profile;
    }
    renderBudgetSummary(state, budget);
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
    shell.dataset.layout = view.layout;
    $("#upgrade-group-explanation").hidden = view.layout !== "grouped";
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
  const options = {
    track: $("#progress-track").value,
    query: $("#progress-query").value,
    source: $("#progress-source").value,
    status: $("#progress-status").value,
    progress: $("#progress-state").value,
    allowedIds: focusedMissions
      ? new Set(
          state.pack.objectives
            .filter(
              (r) =>
                ["dmz-order", "dmz-story"].includes(r.track) &&
                (selectedOrdersPage === null ||
                  (r.track === "dmz-order" &&
                    r.orderPage === selectedOrdersPage)),
            )
            .map((r) => r.id),
        )
      : focusedUpgrades && view.quick !== "all"
        ? new Set(
            [...overview.rows.values()]
              .filter((r) => overviewMatches(r, view.quick))
              .map((r) => r.id),
          )
        : null,
  };
  const groupedUpgrades = focusedUpgrades && view.layout !== "flat";
  let rows,
    familyWindow = [];
  if (groupedUpgrades) {
    const matches = new Set(
      progressRows(state.pack, state.profile, { ...options, idsOnly: true }),
    );
    const families = familyModel.families.filter((g) =>
      g.members.some((m) => matches.has(m.id)),
    );
    offset = Math.max(0, Math.min(offset, Math.max(0, families.length - 1)));
    familyWindow = families.slice(offset, offset + 50);
    const ids = new Set(familyWindow.map((g) => g.current.id));
    for (const group of familyWindow)
      if (group.id === openFamily) {
        const others = group.members.filter((m) => m.id !== group.current.id);
        familyPage = Math.min(
          familyPage,
          Math.max(0, Math.ceil(others.length / 50) - 1),
        );
        others
          .slice(familyPage * 50, familyPage * 50 + 50)
          .forEach((m) => ids.add(m.id));
      }
    rows = progressRows(state.pack, state.profile, {
      track: "dmz-upgrade",
      allowedIds: ids,
      limit: 100,
    });
    rows.total = families.length;
    rows.offset = offset;
    rows.more = offset + familyWindow.length < families.length;
  } else rows = progressRows(state.pack, state.profile, { ...options, offset });
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
    `Showing ${groupedUpgrades ? (familyWindow.length ? offset + 1 : 0) : rows.length ? offset + 1 : 0}–${offset + (groupedUpgrades ? familyWindow.length : rows.length)} of ${rows.total} matching ${groupedUpgrades ? "upgrade groups" : "records"}. This is not a completion percentage; coverage is incomplete.`;
  $("#progress-previous").disabled = offset === 0;
  $("#progress-next").disabled = !rows.more;
  $("#progress-limit-note").hidden = !rows.privacyLimited && !sources.truncated;
  $("#progress-limit-note").textContent = rows.privacyLimited
    ? "This large spoiler dictionary exceeds the protected-display budget. Text is conservatively hidden; reveal spoilers or use a smaller pack to inspect it."
    : "The source chooser shows its first 500 choices. Narrow the track to reduce this list.";
  const baseRowMarkup = (r) =>
    `<article class="panel compact-progress${r.upgrade?.completion === "completed" ? " upgrade-is-completed" : ""}"><div class="upgrade-summary"><div><${groupedUpgrades ? "h3" : "h2"}>${r.url && !r.hidden ? `<a href="${esc(r.url)}" ${focusedUpgrades ? `data-open-upgrade="${esc(r.id)}" aria-expanded="${openIds.has(r.id)}" aria-controls="progress-detail-${esc(r.id)}"` : ""} tabindex="0">${esc(r.name)}</a>` : esc(r.name)}</${groupedUpgrades ? "h3" : "h2"}><small data-upgrade-column="evidence">${focusedUpgrades ? "" : `${esc(r.track)} / `}${esc(labelStatus(r.status))}</small>${r.upgrade?.completion === "completed" ? "<small>Recorded completed</small>" : ""}${focusedUpgrades && familyModel.records.get(r.id)?.completed && !familyModel.records.get(r.id)?.ownCompleted ? "<small>Equivalent source identity recorded completed</small>" : ""}${focusedUpgrades && !r.hidden && (r.disputed || r.upgrade?.reviewRequired || overview?.rows.get(r.id)?.unknown) ? `<small class="upgrade-critical">${r.disputed ? "Evidence conflict. " : ""}${r.upgrade?.reviewRequired ? "Progress needs review. " : ""}${overview?.rows.get(r.id)?.unknown ? "Costs / stock unknown or partial." : ""}</small>` : ""}</div>${summaryFor(r, guard)}${r.upgrade && !r.hidden ? `<button type="button" data-track-upgrade="${esc(r.id)}" ${state.profile.goals.some((g) => g.id === r.id) ? "disabled" : ""}>${state.profile.goals.some((g) => g.id === r.id) ? "Tracked" : "Track"}</button>` : ""}</div><details ${r.hidden ? "" : `id="progress-detail-${esc(r.id)}"`} data-progress-detail="${r.hidden ? "protected" : esc(r.id)}" ${openIds.has(r.id) ? "open" : ""}><summary>Details / progress${r.upgrade?.reviewRequired ? " · Review required" : ""}</summary>${
      r.hidden
        ? "<p>Reveal spoilers to inspect or track this record.</p>"
        : `
<p>${esc(r.description)}</p>${r.track === "dmz-story" ? `<section class="story-mission-steps" aria-label="Recorded story mission steps"><h3>Recorded steps</h3>${r.steps.length ? `<ol>${r.steps.map((step) => `<li>${esc(step)}</li>`).join("")}</ol>` : "<p>No story steps recorded for this mission. Check the cited source and add verified steps to the catalog before treating it as a complete walkthrough.</p>"}<p><a href="/run-plan/?pack=${encodeURIComponent(state.pack.id)}">Add mission to a run plan</a> · <a href="http://127.0.0.1:5175/?tool=missions" target="_blank" rel="noopener noreferrer">Open map mission tracker</a></p></section>` : ""}${r.disputed ? '<p class="notice">Sources disagree. Your manual state does not resolve this evidence conflict or verify readiness.</p>' : ""}
${
  r.type === "objective"
    ? `${r.upgrade ? `${focusedUpgrades ? `<div data-direct-materials="${esc(r.id)}"></div>` : ""}${upgradeControls(r, guard)}` : `<label>Manual state for ${esc(r.name)}<select data-progress-id="${esc(r.id)}">${progressStates.map((v) => `<option value="${v}" ${r.state === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`}
${!r.upgrade ? `<h3>Listed requirements</h3><ul>${r.requirements.map((requirement) => (requirement.hidden ? "<li>Spoiler-protected requirement.</li>" : `<li>${reference(requirement)}: ${requirement.quantity === null ? "Quantity unknown" : esc(requirement.quantity)} · ${esc(requirement.consumption)}</li>`)).join("") || "<li>No requirements listed; source coverage may be incomplete.</li>"}</ul><p><a href="/collection/?pack=${encodeURIComponent(state.pack.id)}">Review collection needs</a></p>` : ""}
<h3>Prerequisite chain</h3>${r.upgrade?.prerequisiteStatus === "unknown" ? '<p class="notice">Prerequisite completeness is unknown. An empty list does not mean there are no prerequisites; missing tiers and unlock rules are not inferred.</p>' : ""}<ul>${r.prerequisites.map((p) => `<li>${reference(p)}: ${esc(p.state)} · evidence ${esc(labelStatus(p.status))}${p.depth ? ` · indirect prerequisite (depth ${p.depth + 1})` : ""}</li>`).join("") || "<li>No listed prerequisites; review source completeness.</li>"}</ul>
${r.effects.length ? `<h3>Recorded effects</h3><ul>${r.effects.map((e) => `<li>${esc(e.type)} · ${esc(e.target)}: ${esc(e.value)}</li>`).join("")}</ul><p>Effects use the record’s sources below. They do not create owned items or prove live-game access.</p>` : ""}`
    : ""
}
${r.detailsTruncated ? '<p class="notice">This is a bounded preview of a large dependency or evidence list. Open the selected private record to inspect direct details.</p>' : ""}
${r.related.length ? `<h3>Related records</h3><ul>${r.related.map((ref) => `<li>${reference(ref)}</li>`).join("")}</ul>` : ""}
<dl><dt>Scope</dt><dd>${esc(r.scope)}</dd><dt>Content version</dt><dd>${esc(r.contentVersion)}</dd></dl>
<h3>Evidence &amp; sources</h3><ul class="source-list">${r.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" rel="noreferrer noopener">${esc(s.title)}</a>` : esc(s.title)}<p>${esc(s.supports)}</p><p>${esc(s.type)} · Published ${esc(s.publishedAt)} · Reviewed ${esc(s.reviewedAt)}</p>${provenance(s)}</li>`).join("") || "<li>No sources recorded. Treat this as unverified.</li>"}</ul>
${r.url ? `<p><a href="${esc(r.url)}">Open selected private record</a></p>` : ""}`
    }</details></article>`;
  const rowMarkup = (r) => {
    const html = baseRowMarkup(r);
    if (!focusedUpgrades || r.hidden || !r.upgrade) return html;
    return html
      .replace(
        "panel compact-progress",
        "panel compact-progress fob-upgrade-card",
      )
      .replace(
        "<details ",
        () =>
          fobUpgradeMaterials(
            state.pack,
            state.profile,
            r,
            budget?.rows.get(r.id),
            stockDrafts,
          ) + "<details ",
      );
  };
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const empty =
    '<section class="panel"><h2>No matching records.</h2><p>Clear filters or select a catalog with known records for this track. Missing mission coverage is unknown.</p></section>';
  $("#progress-rows").innerHTML = groupedUpgrades
    ? familyWindow
        .map((group) => {
          const others = group.members.filter((m) => m.id !== group.current.id),
            expanded = group.id === openFamily;
          const tierRows = expanded
            ? others
                .slice(familyPage * 50, familyPage * 50 + 50)
                .map((m) => rowById.get(m.id))
                .filter(Boolean)
                .map(rowMarkup)
                .join("")
            : "";
          return `<section class="upgrade-family" data-upgrade-family-id="${esc(group.id)}" data-total-tiers="${group.members.length}"><h2>${esc(group.name)}<small>${group.complete ? "All listed tier identities recorded completed" : `Current: ${esc(group.current.name)} - lowest listed incomplete tier`}${group.ambiguous ? " - tier ordering needs review" : ""}</small></h2>${rowMarkup(rowById.get(group.current.id))}${others.length ? `<details data-tier-family="${esc(group.id)}" ${expanded ? "open" : ""}><summary data-toggle-tier-family="${esc(group.id)}">Other tiers (${others.length}) - current tier shown above</summary>${expanded ? `<div class="upgrade-tier-list">${tierRows}${others.length > 50 ? `<div class="draft-actions"><button type="button" data-tier-page="-1" ${familyPage === 0 ? "disabled" : ""}>Previous tiers</button><span>${familyPage * 50 + 1}-${Math.min(others.length, familyPage * 50 + 50)} of ${others.length} other tiers</span><button type="button" data-tier-page="1" ${(familyPage + 1) * 50 >= others.length ? "disabled" : ""}>Next tiers</button></div>` : ""}</div>` : ""}</details>` : ""}</section>`;
        })
        .join("") || empty
    : rows.map(rowMarkup).join("") || empty;
  for (const details of document.querySelectorAll(
    "details[data-progress-detail][open]",
  ))
    renderRequirementBudget(details);
  renderSpendingSummary();
  if (focusedUpgrades)
    for (const controls of document.querySelectorAll(".fob-stock-controls")) {
      const input = controls.querySelector("[data-fob-owned]"),
        cancel = document.createElement("button");
      cancel.type = "button";
      cancel.dataset.fobCancel = input.dataset.fobOwned;
      cancel.textContent = "×";
      cancel.setAttribute(
        "aria-label",
        "Cancel stock edit for " +
          state.pack.items.find((i) => i.id === input.dataset.fobOwned).name,
      );
      if (input.hasAttribute("data-upgrade-readonly"))
        cancel.setAttribute("data-upgrade-readonly", "");
      controls.insertBefore(cancel, controls.querySelector("[data-fob-dirty]"));
    }
  setBusy(saving);
  if (focusedUpgrades) hydrateInventoryIcons(state.pack);
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
    ) ||
    (focusedUpgrades && familyModel?.byRecord.get(target.id)
      ? document.querySelector(
          `[data-complete-upgrade="${CSS.escape(familyModel.byRecord.get(target.id).current.id)}"]`,
        )
      : null) ||
    $("#progress-count")
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
  if (stockDrafts.size) {
    error(
      new Error("Save or cancel your stock edits before changing completion."),
    );
    control.checked =
      visibleRows.get(
        control.dataset.upgradeId || control.dataset.completeUpgrade,
      )?.upgrade?.completion === "completed";
    render();
    return;
  }
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
  stockDrafts.clear();
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
if (focusedUpgrades) installBudgetSetup({ state, persist, render, error });
init(render).catch(error);

singleExpansion($("#progress-rows"), "details[data-progress-detail]");
$("#progress-rows").addEventListener("click", async (event) => {
  const familyToggle = event.target.closest("[data-toggle-tier-family]");
  if (familyToggle) {
    event.preventDefault();
    const id = familyToggle.dataset.toggleTierFamily;
    openFamily = openFamily === id ? null : id;
    familyPage = 0;
    render();
    document
      .querySelector(`[data-toggle-tier-family="${CSS.escape(id)}"]`)
      ?.focus();
    return;
  }
  const tierPage = event.target.closest("[data-tier-page]");
  if (tierPage) {
    familyPage = Math.max(0, familyPage + Number(tierPage.dataset.tierPage));
    render();
    document
      .querySelector(`[data-toggle-tier-family="${CSS.escape(openFamily)}"]`)
      ?.focus();
    return;
  }
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

async function commitStock(ids = [...stockDrafts.keys()]) {
  if (saving || state.loading || state.saving) return false;
  if (
    state.profile.contentVersion !== state.pack.contentVersion ||
    state.profile.schemaVersion < 2
  )
    return false;
  const candidate = structuredClone(state.profile);
  try {
    for (const id of ids) {
      const item = state.pack.items.find((i) => i.id === id);
      if (!item) throw new Error("This item is no longer in the catalog.");
      const value = parseUpgradeStock(
        stockDrafts.get(id) ?? String(candidate.inventory[id] ?? ""),
        item,
        candidate,
      );
      if (value === undefined) delete candidate.inventory[id];
      else candidate.inventory[id] = value;
    }
    const active = document.activeElement;
    const origin = active?.closest?.(".fob-upgrade-card");
    const upgrade = origin?.querySelector("[data-open-upgrade]")?.dataset
      .openUpgrade;
    const item =
      active?.dataset?.fobOwned ||
      active?.dataset?.item ||
      active?.dataset?.fobSave;
    const y = window.scrollY;
    if (!(await save(candidate))) return false;
    for (const id of ids) stockDrafts.delete(id);
    render();
    if (item)
      document
        .querySelector(
          `[data-fob-owned="${CSS.escape(item)}"][data-upgrade="${CSS.escape(upgrade || "")}"]`,
        )
        ?.focus({ preventScroll: true });
    window.scrollTo({ top: y });
    return true;
  } catch (reason) {
    error(reason);
    return false;
  }
}
if (focusedUpgrades) {
  registerDraftGuard({
    isDirty: () => stockDrafts.size > 0,
    save: () => commitStock(),
  });
  const root = $("#progress-rows");
  root.addEventListener("input", (event) => {
    const input = event.target.closest("[data-fob-owned]");
    if (!input) return;
    const id = input.dataset.fobOwned;
    stockDrafts.set(id, input.value);
    for (const mirror of root.querySelectorAll("[data-fob-owned]"))
      if (mirror.dataset.fobOwned === id && mirror !== input)
        mirror.value = input.value;
    for (const label of root.querySelectorAll("[data-fob-dirty]"))
      if (label.dataset.fobDirty === id) label.hidden = false;
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("[data-fob-owned]")) {
      event.preventDefault();
      commitStock([event.target.dataset.fobOwned]);
    }
    if (event.key === "Escape" && event.target.matches("[data-fob-owned]")) {
      stockDrafts.delete(event.target.dataset.fobOwned);
      render();
    }
  });
  root.addEventListener("click", async (event) => {
    const button = event.target.closest(
      "[data-fob-save],[data-fob-step],[data-fob-cancel]",
    );
    if (!button || saving || state.saving) return;
    const id =
      button.dataset.fobSave || button.dataset.item || button.dataset.fobCancel;
    if (button.dataset.fobCancel) {
      stockDrafts.delete(id);
      $("#error").hidden = true;
      const upgrade = button
        .closest(".fob-stock-controls")
        .querySelector("[data-fob-owned]").dataset.upgrade;
      const y = window.scrollY;
      render();
      document
        .querySelector(
          `[data-fob-owned="${CSS.escape(id)}"][data-upgrade="${CSS.escape(upgrade)}"]`,
        )
        ?.focus({ preventScroll: true });
      window.scrollTo({ top: y });
      return;
    }
    if (button.dataset.fobStep) {
      try {
        const item = state.pack.items.find((i) => i.id === id);
        const current =
          parseUpgradeStock(
            stockDrafts.get(id) ?? String(state.profile.inventory[id] ?? 0),
            item,
            state.profile,
          ) ?? 0;
        const next = String(
          Math.max(0, current + Number(button.dataset.fobStep)),
        );
        parseUpgradeStock(next, item, state.profile);
        stockDrafts.set(id, next);
      } catch (reason) {
        error(reason);
        return;
      }
    }
    await commitStock([id]);
  });
}
function renderRequirementBudget(details) {
  const direct = details.querySelector("[data-direct-materials]");
  if (direct)
    direct.innerHTML = materialPanel(
      state.pack,
      state.profile,
      overview?.rows.get(direct.dataset.directMaterials),
    );
  if (direct) {
    for (const link of direct.querySelectorAll(
      '.upgrade-material-card h4 a[href*="/local/"]',
    )) {
      const url = new URL(link.href);
      const item = state.pack.items.find(
        (i) => i.id === url.searchParams.get("id"),
      );
      if (!item) continue;
      const edit = document.createElement("a");
      edit.href =
        "/inventory/?pack=" +
        encodeURIComponent(state.pack.id) +
        "&item=" +
        encodeURIComponent(item.id);
      edit.textContent = "Edit global stock";
      edit.className = "tracker-edit-stock";
      link.after(document.createTextNode(" / "), edit);
    }
  }
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
  view.layout = $("#upgrade-layout").value;
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
