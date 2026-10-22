import { profileChangeSummary } from "../domain/profile-preview.mjs";
import { planShared } from "../domain/shared-plan.mjs";
import {
  init,
  state,
  $,
  esc,
  error,
  persist,
  registerDraftGuard,
  hasUnsavedDraft,
  status,
} from "./common.mjs";
import {
  newProfile,
  parseProfile,
  previewProfile,
} from "../domain/profile.mjs";
import { loadProfile } from "../storage/store.mjs";
let staged = null,
  stagedPack = null,
  stagedRevision = null,
  resetPack = null,
  resetRevision = null;
document.addEventListener("pack-changing", () => {
  staged = null;
  stagedPack = null;
  stagedRevision = null;
  resetPack = null;
  resetRevision = null;
  if ($("#reset-confirm")) $("#reset-confirm").hidden = true;
  if ($("#restore-preview")) $("#restore-preview").hidden = true;
});
let inventoryCheckpoint = new Map();
let inventoryIndex = new Map();
function checkpointInventory() {
  inventoryCheckpoint = new Map(
    [...document.querySelectorAll("#inventory-form [data-field]")].map(
      (input) => [input.name, input.value],
    ),
  );
}
registerDraftGuard({
  isDirty: () =>
    [...document.querySelectorAll("#inventory-form [data-field]")].some(
      (input) => input.value !== inventoryCheckpoint.get(input.name),
    ),
});
document.addEventListener("profile-saved", checkpointInventory);
function render() {
  if ($("#inventory-fields")) {
    inventoryIndex = new Map(state.pack.items.map((item) => [item.id, item]));
    $("#inventory-fields").innerHTML = state.pack.items
      .map(
        (r) =>
          `<fieldset class="panel" data-inventory-item="${esc(r.id)}"><legend>${esc(r.name)} <small>(${esc(r.unit)})</small></legend><label>Owned quantity<input name="owned:${esc(r.id)}" data-id="${esc(r.id)}" data-field="inventory" type="number" min="0" max="1000000" value="${state.profile.inventory[r.id] || 0}" required></label><label>Protected reserve<input name="reserve:${esc(r.id)}" data-id="${esc(r.id)}" data-field="reserves" type="number" min="0" max="1000000" value="${state.profile.reserves[r.id] || 0}" required></label></fieldset>`,
      )
      .join("");
    $("#completion-fields").innerHTML = state.pack.objectives
      .filter((r) => !r.spoiler)
      .map(
        (r) =>
          `<label>${esc(r.name)}<select data-completion="${esc(r.id)}">${["unknown", "locked", "unlocked", "completed"].map((v) => `<option ${state.profile.completion[r.id] === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`,
      )
      .join("");
    checkpointInventory();
    filterInventory();
  }
  if ($("#version-status")) {
    const summary = profileChangeSummary(
      state.profile,
      state.profile,
      state.pack,
    );
    $("#version-status").textContent =
      `Profile content: ${summary.currentVersion}; active content: ${summary.activeVersion}. ${summary.versionMismatch ? "Planning blocked until explicit rebind." : "Versions match."} Unresolved references: ${summary.unresolvedCount}.`;
  }
}
$("#inventory-form")?.addEventListener("input", (e) => {
  const input = e.target;
  if (input.dataset.field) {
    state.profile[input.dataset.field][input.dataset.id] =
      input.value === "" ? NaN : Number(input.value);
    status(
      hasUnsavedDraft()
        ? "Unsaved inventory edits · save locally or export a validated backup."
        : "Saved values unchanged · no unsaved inventory edits.",
    );
  }
});
$("#inventory-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  for (const input of document.querySelectorAll("[data-field]"))
    state.profile[input.dataset.field][input.dataset.id] =
      input.value === "" ? NaN : Number(input.value);
  await persist();
});
$("#completion-fields")?.addEventListener("change", async (e) => {
  if (e.target.dataset.completion) {
    state.profile.completion[e.target.dataset.completion] = e.target.value;
    await persist();
  }
});
function preview(p) {
  const summary = profileChangeSummary(state.profile, p, state.pack);
  staged = p;
  stagedPack = state.pack.id;
  stagedRevision = state.revision;
  $("#restore-summary").innerHTML =
    `<p><strong>Replace this profile, not add quantities.</strong></p><p>Catalog: ${esc(summary.catalog)}. Current version: ${esc(summary.currentVersion)}. Proposed version: ${esc(summary.proposedVersion)}.</p><p>${summary.versionMismatch ? "Different content version: planning remains blocked until explicit rebind." : "Content versions match."} Unresolved references: ${summary.unresolvedCount}.</p><p>Unknown version text is withheld while spoilers are hidden. Use the existing spoiler preference before previewing if you want to inspect it.</p>` +
    summary.sections
      .map(
        (section) =>
          `<section><h4>${esc(section.title)}</h4>${section.changes.length ? `<ul>${section.changes.map((change) => `<li><strong>${esc(change.label)}</strong>: ${esc(change.before)} → ${esc(change.after)}</li>`).join("")}</ul>` : "<p>Unchanged.</p>"}</section>`,
      )
      .join("");
  $("#restore-detail").textContent = JSON.stringify(summary, null, 2);
  $("#restore-preview").hidden = false;
}
$("#import-profile")?.addEventListener("change", async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 1048576) throw new Error("Backup exceeds 1 MiB");
    preview(parseProfile(await f.text()));
  } catch (e) {
    staged = null;
    $("#restore-preview").hidden = true;
    error(e);
  }
});
$("#cancel-restore")?.addEventListener("click", () => {
  staged = null;
  $("#restore-preview").hidden = true;
});
$("#apply-restore")?.addEventListener("click", async () => {
  if (!staged) return;
  if (stagedPack !== state.pack.id || stagedRevision !== state.revision) {
    error(new Error("Preview is stale. Review the backup again."));
    return;
  }
  try {
    previewProfile(staged, state.pack);
  } catch (e) {
    error(e);
    return;
  }
  const candidate = { ...staged, revision: state.revision };
  if (await persist(candidate)) {
    staged = null;
    $("#restore-preview").hidden = true;
    render();
  }
});
$("#rebind-profile")?.addEventListener("click", () =>
  preview({ ...state.profile, contentVersion: state.pack.contentVersion }),
);
$("#recover-profile")?.addEventListener("click", async () => {
  try {
    const saved = await loadProfile(state.pack.id);
    if (!saved?.previous) throw new Error("No previous snapshot is available.");
    preview(saved.previous);
  } catch (e) {
    error(e);
  }
});
$("#reset-profile")?.addEventListener("click", () => {
  resetPack = state.pack.id;
  resetRevision = state.revision;
  $("#reset-confirm").hidden = false;
  $("#reset-confirm p").textContent =
    `Clear inventory, reserves, goals and progress for ${state.pack.title}? A previous snapshot is retained.`;
});
$("#cancel-reset")?.addEventListener(
  "click",
  () => ($("#reset-confirm").hidden = true),
);
$("#confirm-reset")?.addEventListener("click", async () => {
  if (resetPack !== state.pack.id || resetRevision !== state.revision) {
    $("#reset-confirm").hidden = true;
    error(new Error("Reset confirmation is stale. Review the target again."));
    return;
  }
  const candidate = { ...newProfile(state.pack), revision: state.revision };
  if (await persist(candidate)) {
    $("#reset-confirm").hidden = true;
    render();
  }
});
init(render).catch(error);

function filterInventory() {
  if (!$("#inventory-query")) return;
  const q = $("#inventory-query").value.trim().toLowerCase(),
    mode = $("#inventory-view").value;
  let needed = new Set(),
    warning = "";
  if (mode === "needed") {
    try {
      needed = new Set(
        planShared(state.pack, state.profile)
          .ledger.filter((r) => r.missing || r.retainedMissing)
          .map((r) => r.id),
      );
    } catch {
      warning =
        " Planning unavailable; clear the filter or resolve profile/content mismatch.";
    }
  }
  let count = 0;
  for (const node of document.querySelectorAll("[data-inventory-item]")) {
    const id = node.dataset.inventoryItem,
      item = inventoryIndex.get(id);
    node.hidden =
      ![item.name, item.category, id].join(" ").toLowerCase().includes(q) ||
      (mode === "owned" &&
        !state.profile.inventory[id] &&
        !state.profile.reserves[id]) ||
      (mode === "needed" && !needed.has(id));
    if (!node.hidden) count++;
  }
  $("#inventory-count").textContent =
    `${count} of ${state.pack.items.length} items shown.` + warning;
}
$("#inventory-query")?.addEventListener("input", filterInventory);
$("#inventory-view")?.addEventListener("change", filterInventory);
