import {
  upgradeProgressFor,
  setUpgradeProgress,
  upgradeCompletionStates,
  upgradeAvailabilityStates,
} from "../domain/upgrade-progress.mjs";
import { setCompletion } from "../domain/progression.mjs";
import {
  INVENTORY_PAGE_SIZE,
  createInventoryDraft,
  filterInventoryIds,
  inventoryPage,
} from "./inventory-window.mjs";
import {
  profileChangeSummary,
  previewContentRebind,
} from "../domain/profile-preview.mjs";
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
  download,
} from "./common.mjs";
import {
  newProfile,
  parseProfile,
  previewProfile,
  previewUpgradeMigration,
} from "../domain/profile.mjs";
import { loadProfile, readRecord } from "../storage/store.mjs";
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
let inventoryDraft = null;
let pendingInventoryInvalid = null;
let inventoryIndex = new Map();
let inventoryPageNumber = 0;
function checkpointInventory() {
  inventoryDraft?.checkpoint();
}
function revealInvalidInventory() {
  const invalid = inventoryDraft?.firstInvalid();
  if (!invalid || !$("#inventory-fields")) return;
  $("#inventory-query").value = "";
  $("#inventory-view").value = "all";
  inventoryPageNumber = Math.floor(invalid.index / INVENTORY_PAGE_SIZE);
  filterInventory(false);
  $("#error").textContent +=
    " Review the focused inventory quantity; all other edits are retained.";
  for (const input of document.querySelectorAll("#inventory-form [data-field]"))
    if (input.name === invalid.name) {
      input.focus();
      break;
    }
}
registerDraftGuard({
  isDirty: () => inventoryDraft?.isDirty() || false,
  revealInvalid: revealInvalidInventory,
});
document.addEventListener("profile-saved", checkpointInventory);
function renderInventoryPage(matches) {
  const page = inventoryPage(matches, inventoryPageNumber);
  inventoryPageNumber = page.page;
  const small = state.pack.items.length <= INVENTORY_PAGE_SIZE;
  const ids = small ? [...inventoryIndex.keys()] : page.ids;
  const visible = new Set(matches);
  $("#inventory-fields").innerHTML = ids
    .map((id) => {
      const r = inventoryIndex.get(id);
      return `<fieldset class="panel" data-inventory-item="${esc(r.id)}" ${small && !visible.has(id) ? "hidden" : ""}><legend>${esc(r.name)} <small>(${esc(r.unit)})</small></legend><label>Owned quantity<input name="owned:${esc(r.id)}" data-id="${esc(r.id)}" data-field="inventory" type="number" min="0" max="1000000" value="${esc(inventoryDraft.raw.get(`owned:${r.id}`))}" placeholder="Not entered"></label><button type="button" data-clear-stock="${esc(r.id)}">Clear stock (not entered)</button><label>Protected reserve<input name="reserve:${esc(r.id)}" data-id="${esc(r.id)}" data-field="reserves" type="number" min="0" max="1000000" value="${esc(inventoryDraft.raw.get(`reserve:${r.id}`))}" required></label></fieldset>`;
    })
    .join("");
  $("#inventory-pagination").hidden = small;
  $("#inventory-page-status").textContent =
    `Items ${page.first}–${page.last} of ${matches.length} matches. Page ${page.page + 1} of ${page.pages}.`;
  $("#inventory-previous").setAttribute(
    "aria-disabled",
    String(page.page === 0),
  );
  $("#inventory-next").setAttribute(
    "aria-disabled",
    String(page.page === page.pages - 1),
  );
  $("#inventory-previous").textContent =
    `Previous page${!matches.length ? " (no matches)" : page.page === 0 ? " (first page)" : ""}`;
  $("#inventory-next").textContent =
    `Next page${!matches.length ? " (no matches)" : page.page === page.pages - 1 ? " (last page)" : ""}`;
}
function render() {
  pendingInventoryInvalid = null;
  if ($("#inventory-fields")) {
    inventoryIndex = new Map(state.pack.items.map((item) => [item.id, item]));
    inventoryDraft = createInventoryDraft(state.pack.items, state.profile);
    inventoryPageNumber = 0;
    $("#completion-fields").innerHTML = state.pack.objectives
      .filter((r) => !r.spoiler)
      .map((r) =>
        r.track === "dmz-upgrade"
          ? upgradeControls(r)
          : `<label>${esc(r.name)}<select data-completion="${esc(r.id)}">${["unknown", "locked", "unlocked", "completed"].map((v) => `<option ${state.profile.completion[r.id] === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`,
      )
      .join("");
    checkpointInventory();
    filterInventory();
  }
  if ($("#migrate-upgrade-profile"))
    $("#migrate-upgrade-profile").hidden = state.profile.schemaVersion === 2;
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
    inventoryDraft.set(
      input.dataset.field,
      input.dataset.id,
      input.value,
      state.profile,
    );
    status(
      hasUnsavedDraft()
        ? "Unsaved inventory edits · save locally or export a validated backup."
        : "Saved values unchanged · no unsaved inventory edits.",
    );
  }
});
$("#inventory-form")?.addEventListener(
  "invalid",
  (event) => {
    if (!event.target.dataset.field) return;
    event.preventDefault();
    if (pendingInventoryInvalid) return;
    const pending = { draft: inventoryDraft, pack: state.pack };
    pendingInventoryInvalid = pending;
    // Native validation may invoke several invalid callbacks before finishing.
    // Keep all original controls mounted until a later task, not a microtask.
    setTimeout(() => {
      if (pendingInventoryInvalid !== pending) return;
      pendingInventoryInvalid = null;
      if (
        inventoryDraft !== pending.draft ||
        state.pack !== pending.pack ||
        state.loading ||
        state.saving ||
        !inventoryDraft?.firstInvalid()
      )
        return;
      error(new Error("Quantity must be an integer from 0 to 1000000."));
      revealInvalidInventory();
    }, 0);
  },
  true,
);
for (const event of ["input", "pointerdown", "keydown"])
  document.addEventListener(
    event,
    () => {
      pendingInventoryInvalid = null;
    },
    true,
  );
$("#inventory-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await persist();
});
$("#completion-fields")?.addEventListener("change", async (e) => {
  if (state.saving || state.loading) return;
  if (hasUnsavedDraft()) {
    error(
      new Error(
        "Save or cancel your inventory edits before recording progress; progress never saves stock changes.",
      ),
    );
    const id = e.target.dataset.upgradeId || e.target.dataset.completion;
    e.target.value = e.target.dataset.upgradeField
      ? upgradeProgressFor(state.pack, state.profile, id)[
          e.target.dataset.upgradeField
        ]
      : state.profile.completion[id] || "unknown";
    return;
  }
  if (e.target.dataset.upgradeId) {
    stageUpgradeProgress(e.target);
    return;
  }
  if (e.target.dataset.completion) {
    const candidate = setCompletion(
      state.pack,
      state.profile,
      e.target.dataset.completion,
      e.target.value,
    );
    await persist(candidate);
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
$("#rebind-profile")?.addEventListener("click", async () => {
  const pack = state.pack,
    revision = state.revision;
  try {
    const content = await readRecord("content", pack.id);
    if (pack !== state.pack || revision !== state.revision)
      throw new Error("Rebind target changed; preview again.");
    const review = previewContentRebind(
      state.profile,
      pack,
      content?.previous?.pack || null,
    );
    preview(review.candidate);
    $("#restore-summary").insertAdjacentHTML(
      "afterbegin",
      `<p>Upgrade evidence review: ${review.changed.length} saved records require review; ${review.retired.length} retired references remain recoverable; ${review.added.length} new definitions have no inferred progress. ${review.comparisonKnown ? "Compared with the retained prior content snapshot." : "Prior content facts unavailable: compare the current requirements and sources manually; no unchanged-cost claim is made."} Historical completion and stock are retained.</p>`,
    );
  } catch (reason) {
    error(reason);
  }
});
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
$("#migrate-upgrade-profile")?.addEventListener("click", () => {
  try {
    const migration = previewUpgradeMigration(state.profile, state.pack);
    preview(migration.candidate);
    $("#restore-summary").insertAdjacentHTML(
      "afterbegin",
      `<p>Upgrade format migration: ${migration.moved.length} resolved entries; ${migration.ambiguous.length} ambiguous legacy unlocked entries require review. Inventory is unchanged. Cancel leaves the original profile untouched.</p>`,
    );
  } catch (reason) {
    error(reason);
  }
});
$("#cancel-inventory")?.addEventListener("click", async () => {
  if (state.saving || state.loading) return;
  try {
    const pack = state.pack;
    const record = await loadProfile(pack.id);
    if (pack !== state.pack) return;
    state.profile = record?.value || newProfile(pack);
    state.revision = state.profile.revision;
    render();
    status("Inventory edits canceled; saved profile restored.");
  } catch (reason) {
    error(reason);
  }
});
$("#inventory-fields")?.addEventListener("click", (event) => {
  const id = event.target.dataset.clearStock;
  if (!id || state.saving) return;
  inventoryDraft.set("inventory", id, "", state.profile);
  filterInventory(false);
  status("Stock unset in draft; reserve unchanged. Save inventory to commit.");
  document.querySelector(`[data-clear-stock="${CSS.escape(id)}"]`)?.focus();
});
function upgradeControls(record) {
  const progress = upgradeProgressFor(state.pack, state.profile, record.id);
  if (state.profile.schemaVersion !== 2)
    return `<p>${esc(record.name)}: ${esc(progress.completion)} · ${progress.reviewRequired ? "Legacy unlocked needs review. " : ""}<a href="/settings/?pack=${encodeURIComponent(state.pack.id)}">Preview and confirm upgrade progress migration</a></p>`;
  return `<fieldset><legend>${esc(record.name)}</legend>${[
    ["completion", upgradeCompletionStates],
    ["availability", upgradeAvailabilityStates],
  ]
    .map(
      ([field, values]) =>
        `<label>${field} for ${esc(record.name)}<select data-upgrade-id="${esc(record.id)}" data-upgrade-field="${field}">${values.map((value) => `<option value="${value}" ${progress[field] === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>`,
    )
    .join(
      "",
    )}<p>Recording progress only; update inventory after an in-game purchase.${progress.reviewRequired ? " Legacy unlocked requires review." : ""}</p></fieldset>`;
}
let pendingUpgrade = null;
function stageUpgradeProgress(control) {
  const id = control.dataset.upgradeId,
    field = control.dataset.upgradeField;
  const current = upgradeProgressFor(state.pack, state.profile, id);
  if (current[field] === control.value && !current.reviewRequired) {
    status("Progress unchanged; no save needed.");
    return;
  }
  const candidate = setUpgradeProgress(state.pack, state.profile, id, {
    [field]: control.value,
  });
  control.value = upgradeProgressFor(state.pack, state.profile, id)[field];
  let dialog = $("#upgrade-progress-confirm");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "upgrade-progress-confirm";
    dialog.setAttribute("aria-labelledby", "upgrade-progress-title");
    dialog.innerHTML =
      '<h2 id="upgrade-progress-title">Confirm manual progress</h2><p>Recording progress only; update inventory after an in-game purchase.</p><p id="upgrade-progress-target"></p><button id="upgrade-progress-apply">Record progress</button><button id="upgrade-progress-cancel">Cancel</button><p id="upgrade-progress-result" role="status"></p><button id="upgrade-progress-export" hidden>Export unsaved progress candidate</button>';
    document.body.append(dialog);
    $("#upgrade-progress-cancel").onclick = () => {
      if (state.saving) return;
      pendingUpgrade?.control.focus();
      pendingUpgrade = null;
      dialog.close();
    };
    dialog.oncancel = (event) => {
      if (state.saving) {
        event.preventDefault();
        return;
      }
      pendingUpgrade = null;
    };
    $("#upgrade-progress-apply").onclick = async () => {
      const pending = pendingUpgrade;
      if (!pending || state.saving) return;
      if (
        pending.pack !== state.pack ||
        pending.revision !== state.revision ||
        hasUnsavedDraft()
      ) {
        pendingUpgrade = null;
        dialog.close();
        error(new Error("Progress confirmation expired; review again."));
        return;
      }
      $("#upgrade-progress-apply").disabled = true;
      $("#upgrade-progress-cancel").disabled = true;
      if (await persist(pending.candidate)) {
        pendingUpgrade = null;
        dialog.close();
        render();
        document
          .querySelector(
            `[data-upgrade-id="${CSS.escape(pending.id)}"][data-upgrade-field="${pending.field}"]`,
          )
          ?.focus();
      } else {
        $("#upgrade-progress-cancel").disabled = false;
        $("#upgrade-progress-result").textContent =
          "Progress was not saved. Export this candidate, then cancel and reload/reconcile explicitly; no automatic retry.";
        $("#upgrade-progress-export").hidden = false;
        $("#upgrade-progress-export").onclick = () =>
          download("dmz-unsaved-upgrade-progress.json", pending.candidate);
        $("#upgrade-progress-export").focus();
      }
    };
  }
  $("#upgrade-progress-result").textContent = "";
  $("#upgrade-progress-export").hidden = true;
  $("#upgrade-progress-apply").disabled = false;
  $("#upgrade-progress-cancel").disabled = false;
  pendingUpgrade = {
    candidate,
    id,
    field,
    control,
    pack: state.pack,
    revision: state.revision,
  };
  $("#upgrade-progress-target").textContent =
    `${state.pack.objectives.find((r) => r.id === id).name}: ${field} → ${candidate.upgradeProgress[id][field]}. Stock, reserves and focus remain unchanged.`;
  dialog.showModal();
  $("#upgrade-progress-cancel").focus();
}
document.addEventListener("pack-changing", () => {
  pendingUpgrade = null;
  $("#upgrade-progress-confirm")?.close();
});
init(render).catch(error);

function filterInventory(reset = true) {
  if (reset) inventoryPageNumber = 0;
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
  const matches = filterInventoryIds(
    inventoryIndex,
    state.profile,
    q,
    mode,
    needed,
  );
  renderInventoryPage(matches);
  $("#inventory-count").textContent =
    `${matches.length} of ${state.pack.items.length} items match.` + warning;
}
for (const [id, direction] of [
  ["inventory-previous", -1],
  ["inventory-next", 1],
])
  $(`#${id}`)?.addEventListener("click", (event) => {
    if (state.loading || state.saving) return;
    event.currentTarget.focus();
    if (event.currentTarget.getAttribute("aria-disabled") === "true") return;
    inventoryPageNumber += direction;
    filterInventory(false);
  });
$("#inventory-query")?.addEventListener("input", filterInventory);
$("#inventory-view")?.addEventListener("change", filterInventory);
