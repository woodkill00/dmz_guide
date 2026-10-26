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
} from "../domain/upgrade-progress.mjs";
let resetTarget = null,
  upgradeTarget = null,
  upgradeCandidate = null,
  navigation = 0,
  visibleRows = new Map(),
  saving = false,
  offset = 0;
const labelStatus = (value) =>
  value === "verified" ? "Source-backed · live build unverified" : value;
const reference = (ref) =>
  ref.url ? `<a href="${esc(ref.url)}">${esc(ref.name)}</a>` : esc(ref.name);
const provenance = (source) =>
  source.provenance
    ? `<p>Provenance: ${esc(source.provenance.kind)} · Capture date: ${esc(source.provenance.captureDate || "Unknown")} · Build identity: ${esc(source.provenance.buildStatus)}.</p><p>Observation: ${esc(source.provenance.observationKey)} · Lineage: ${esc(source.provenance.lineageKey)}.</p>`
    : "";
function setBusy(value) {
  for (const control of document.querySelectorAll(
    "#pack-select, #spoiler-toggle, #progress-reset, #progress-reset-yes, [data-progress-id], [data-upgrade-id], #upgrade-progress-apply, #upgrade-progress-cancel, #upgrade-progress-export",
  ))
    control.disabled = value || control.hasAttribute("data-upgrade-readonly");
}
function upgradeControls(row, guard) {
  const upgrade = row.upgrade,
    readonly = state.profile.schemaVersion !== 2,
    settings = `/settings/?pack=${encodeURIComponent(state.pack.id)}`,
    select = (field, values) =>
      `<label>Manual ${field} for ${esc(row.name)}<select data-upgrade-id="${esc(row.id)}" data-upgrade-field="${field}"${readonly ? " disabled data-upgrade-readonly" : ""}>${values.map((value) => `<option value="${value}"${upgrade[field] === value ? " selected" : ""}>${value === "completed" ? "Recorded completed" : value}</option>`).join("")}</select></label>`;
  return `<h3>Upgrade progress</h3>
<p>${upgrade.completion === "completed" ? "Recorded completed" : "Not marked complete"}. Availability is your separate report, not proof of purchase or live-game access.</p>
${upgrade.tierLabel ? `<p>Observed tier: ${esc(guard.text(upgrade.tierLabel))}. Other tiers are not inferred.</p>` : "<p>No tier label recorded. Missing tiers are unknown, not completed.</p>"}
${upgrade.reviewRequired ? '<p class="notice">Review required: check the recorded completion and availability against current evidence. Legacy ambiguity or changed content may need attention; historical completion is not automatically changed.</p>' : ""}
${readonly ? `<p class="notice">This older profile is read-only for upgrade progress. <a href="${esc(settings)}">Preview and confirm profile migration in Settings</a> before editing.</p>` : ""}
${select("completion", upgradeCompletionStates)}${select("availability", upgradeAvailabilityStates)}
<p>Recording progress only; update inventory after an in-game purchase. To undo or correct a record, select the previous state and confirm. No inventory is spent or refunded.</p>
<h3>Listed requirements</h3><ul>${row.requirements.map((requirement) => (requirement.hidden ? "<li>Spoiler-protected requirement. Reveal spoilers to inspect it.</li>" : `<li>${reference(requirement)}: ${requirement.quantity === null ? "Quantity unknown" : esc(requirement.quantity)} · ${requirement.consumption === "unknown" ? "Consumption unknown" : esc(requirement.consumption)}</li>`)).join("") || "<li>No requirements listed; this is not evidence of zero cost.</li>"}</ul>
<p>Listed requirements are not a remaining shopping budget. Unknown consumption or quantities prevent exact affected advice; recorded progress does not update held stock.</p>`;
}
function render() {
  const selectedSource = $("#progress-source").value;
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
  const rows = progressRows(state.pack, state.profile, {
    track: $("#progress-track").value,
    query: $("#progress-query").value,
    source: $("#progress-source").value,
    status: $("#progress-status").value,
    progress: $("#progress-state").value,
    offset,
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
          `<article class="panel"><p class="eyebrow">${esc(r.track)} · ${esc(labelStatus(r.status))}</p><h2>${esc(r.name)}</h2>${
            r.hidden
              ? "<p>Reveal spoilers to inspect or track this record.</p>"
              : `
<p>${esc(r.description)}</p>${r.disputed ? '<p class="notice">Sources disagree. Your manual state does not resolve this evidence conflict or verify readiness.</p>' : ""}
${
  r.type === "objective"
    ? `${r.upgrade ? upgradeControls(r, guard) : `<label>Manual state for ${esc(r.name)}<select data-progress-id="${esc(r.id)}">${progressStates.map((v) => `<option value="${v}" ${r.state === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`}
<h3>Prerequisite chain</h3>${r.upgrade?.prerequisiteStatus === "unknown" ? '<p class="notice">Prerequisite completeness is unknown. An empty list does not mean there are no prerequisites; missing tiers and unlock rules are not inferred.</p>' : ""}<ul>${r.prerequisites.map((p) => `<li>${reference(p)}: ${esc(p.state)} · evidence ${esc(labelStatus(p.status))}${p.depth ? ` · indirect prerequisite (depth ${p.depth + 1})` : ""}</li>`).join("") || "<li>No listed prerequisites; review source completeness.</li>"}</ul>
${r.effects.length ? `<h3>Recorded effects</h3><ul>${r.effects.map((e) => `<li>${esc(e.type)} · ${esc(e.target)}: ${esc(e.value)}</li>`).join("")}</ul><p>Effects use the record’s sources below. They do not create owned items or prove live-game access.</p>` : ""}`
    : ""
}
${r.detailsTruncated ? '<p class="notice">This is a bounded preview of a large dependency or evidence list. Open the selected private record to inspect direct details.</p>' : ""}
${r.related.length ? `<h3>Related records</h3><ul>${r.related.map((ref) => `<li>${reference(ref)}</li>`).join("")}</ul>` : ""}
<dl><dt>Scope</dt><dd>${esc(r.scope)}</dd><dt>Content version</dt><dd>${esc(r.contentVersion)}</dd></dl>
<h3>Evidence &amp; sources</h3><ul class="source-list">${r.sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" rel="noreferrer noopener">${esc(s.title)}</a>` : esc(s.title)}<p>${esc(s.supports)}</p><p>${esc(s.type)} · Published ${esc(s.publishedAt)} · Reviewed ${esc(s.reviewedAt)}</p>${provenance(s)}</li>`).join("") || "<li>No sources recorded. Treat this as unverified.</li>"}</ul>
${r.url ? `<p><a href="${esc(r.url)}">Open selected private record</a></p>` : ""}`
          }</article>`,
      )
      .join("") ||
    '<section class="panel"><h2>No matching records.</h2><p>This starter pack may not contain a verified catalog for this track. Clear filters or add a sourced record in the editor.</p></section>';
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
      `[data-upgrade-id="${CSS.escape(target.id)}"][data-upgrade-field="${target.field}"]`,
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
function requestUpgrade(control) {
  const id = control.dataset.upgradeId,
    field = control.dataset.upgradeField,
    value = control.value,
    row = visibleRows.get(id);
  if (!row?.upgrade || !["completion", "availability"].includes(field)) return;
  // Keep the visible row at its committed value until confirmation and CAS succeed.
  control.value = row.upgrade[field];
  if (saving || state.loading || upgradeTarget || value === row.upgrade[field])
    return;
  if (state.profile.schemaVersion !== 2) return;
  upgradeTarget = {
    id,
    field,
    value,
    packId: state.pack.id,
    contentVersion: state.pack.contentVersion,
    revision: state.revision,
    navigation,
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
  offset = 0;
  render();
});
$("#progress-filters").addEventListener("input", () => {
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
init(render).catch(error);
