import { upgradeNeeds } from "../domain/upgrade-needs.mjs";
import {
  upgradeNeedCell,
  needsValues,
  upgradeNeedsDetail,
} from "./upgrade-needs-view.mjs";
import { itemUses } from "../domain/item-uses.mjs";
import { useLabels, useCell, usesList } from "./compact-lists.mjs";
import {
  spendingActions,
  renderSpendingSummary,
  installSpending,
} from "./upgrade-spending.mjs";
import {
  upgradeProgressFor,
  setUpgradeProgress,
  upgradeCompletionStates,
  upgradeAvailabilityStates,
} from "../domain/upgrade-progress.mjs";
import { setCompletion } from "../domain/progression.mjs";
import { closeDialog } from "./dialog-focus.mjs";
import {
  INVENTORY_PAGE_SIZE,
  INVALID_NUMBER_DRAFT,
  createInventoryDraft,
  filterInventoryIds,
  inventoryPage,
} from "./inventory-window.mjs";
import {
  profileChangeSummary,
  safeReferenceCount,
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
  resetProfile,
  stockLimit,
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
let inventoryUses = new Map();
let inventoryLedger = new Map();
let inventoryPlanWarning = "";
let inventoryUpgradeNeeds = null,
  needsPack = null,
  needsFingerprint = "";
let inventoryPack = null;
const collapsedGroups = new Set();
function groupFor(item) {
  return item.category || item.kind || "Other";
}
function derivedInventory() {
  inventoryLedger = new Map();
  inventoryPlanWarning = "";
  const fingerprint = JSON.stringify([
    state.profile.schemaVersion,
    state.profile.contentVersion,
    state.profile.spoilers,
    state.profile.inventory,
    state.profile.reserves,
    state.profile.completion,
    state.profile.upgradeProgress,
    state.profile.routes,
  ]);
  if (needsPack !== state.pack || fingerprint !== needsFingerprint) {
    inventoryUpgradeNeeds = upgradeNeeds(state.pack, state.profile);
    needsPack = state.pack;
    needsFingerprint = fingerprint;
  }

  try {
    inventoryLedger = new Map(
      planShared(state.pack, state.profile).ledger.map((row) => [row.id, row]),
    );
  } catch {
    inventoryPlanWarning =
      "Plan preview unavailable: check quantities, content binding and unresolved requirements.";
  }
  if (inventoryUpgradeNeeds.collection.limited)
    inventoryPlanWarning +=
      " Collection needs reached a safety limit; membership and quantities are incomplete. Resolve content before relying on this list.";
}
function updateInventoryPreview() {
  for (const input of document.querySelectorAll(
    "#inventory-fields [data-field]",
  )) {
    const prefix = input.dataset.field === "inventory" ? "owned" : "reserve";
    const incomplete =
      inventoryDraft.raw.get(`${prefix}:${input.dataset.id}`) ===
      INVALID_NUMBER_DRAFT;
    input.setCustomValidity(
      incomplete
        ? "Incomplete numeric entry retained. Enter a complete number or explicitly clear the stock."
        : "",
    );
    input.setAttribute(
      "aria-invalid",
      String(incomplete || !input.validity.valid),
    );
  }
  derivedInventory();
  const warning = $("#inventory-plan-warning");
  if (warning) {
    warning.hidden = !inventoryPlanWarning;
    warning.textContent = inventoryPlanWarning;
  }
  for (const node of document.querySelectorAll("[data-plan-item]")) {
    const ledger = inventoryLedger.get(node.dataset.planItem);
    const field = node.dataset.planField;
    node.textContent =
      inventoryPlanWarning ||
      (field === "missing" &&
        inventoryDraft.raw.get(`owned:${node.dataset.planItem}`) === "")
        ? "Unknown"
        : !ledger
          ? "—"
          : field === "needed"
            ? `${ledger.consumed} / ${ledger.retained}`
            : `${ledger.missing} / ${ledger.retainedMissing}`;
  }
  for (const cell of document.querySelectorAll("[data-upgrade-need]")) {
    const values = needsValues(
      inventoryUpgradeNeeds[cell.dataset.upgradeNeed],
      cell.dataset.item,
    );
    cell.querySelector("[data-tier-required]").textContent = values.required;
    cell.querySelector("[data-tier-missing]").textContent = values.missing;
    const scope = inventoryUpgradeNeeds[cell.dataset.upgradeNeed];
    cell.querySelector("[data-tier-uncertainty]").textContent =
      scope.used.has(cell.dataset.item) && scope.partial
        ? "Partial / unknown scope"
        : "";
  }
  for (const badge of document.querySelectorAll("[data-collection-state]")) {
    const need = inventoryUpgradeNeeds.collection.get(
      badge.dataset.collectionState,
    );
    badge.hidden = !need?.used;
    badge.dataset.state = need?.state || "none";
    const description = need?.used
      ? `${need.label}${need.craft ? " · Crafting ingredient" : ""}`
      : "";
    badge.setAttribute("aria-label", description);
    badge.title = description;
    badge.querySelector(".collection-short").textContent = need?.used
      ? { short: "Short", covered: "Met", review: "Check" }[need.state]
      : "";
    badge.querySelector(".collection-kind").textContent = need?.craft
      ? "Craft"
      : "";
    badge.querySelector(".collection-description").textContent = description;
  }
  for (const details of document.querySelectorAll(
    "[data-upgrade-needs-detail]",
  ))
    details.innerHTML = upgradeNeedsDetail(
      state.pack,
      inventoryUpgradeNeeds,
      details.dataset.upgradeNeedsDetail,
    );
  for (const node of document.querySelectorAll("[data-available]")) {
    const raw = inventoryDraft.raw.get(`owned:${node.dataset.available}`),
      reserve = inventoryDraft.raw.get(`reserve:${node.dataset.available}`);
    node.textContent =
      raw === ""
        ? "Not entered"
        : inventoryDraft.firstInvalid()
          ? "Unknown (invalid draft)"
          : String(Math.max(0, Number(raw) - Number(reserve)));
  }
  for (const button of document.querySelectorAll("[data-stock-step]")) {
    const raw = inventoryDraft.raw.get(`owned:${button.dataset.id}`);
    button.disabled =
      state.saving ||
      raw === "" ||
      !Number.isInteger(Number(raw)) ||
      Number(raw) < 0;
  }
}
function checkpointInventory() {
  inventoryDraft?.checkpoint();
  const notice = $("#error");
  if (
    !inventoryDraft?.firstInvalid() &&
    notice?.textContent?.includes("Review the focused inventory quantity")
  ) {
    notice.textContent = "";
    notice.hidden = true;
  }
}
function revealInvalidInventory() {
  const invalid = inventoryDraft?.firstInvalid();
  if (!invalid || !$("#inventory-fields")) return;
  $("#inventory-query").value = "";
  $("#inventory-view").value = "all";
  if ($("#inventory-section")) $("#inventory-section").value = "";
  if ($("#inventory-sort")) $("#inventory-sort").value = "source";
  if ($("#inventory-use-filter")) $("#inventory-use-filter").value = "";
  collapsedGroups.delete(groupFor(inventoryIndex.get(invalid.id)));
  const ids = [...inventoryIndex.keys()];
  inventoryPageNumber = Math.floor(
    ids.indexOf(invalid.id) / INVENTORY_PAGE_SIZE,
  );
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
  const groups = new Map();
  for (const id of page.ids) {
    const item = inventoryIndex.get(id),
      key = groupFor(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  $("#inventory-fields").innerHTML =
    [...groups]
      .map(([key, items]) => {
        const total = [...inventoryIndex.values()].filter(
          (item) => groupFor(item) === key,
        ).length;
        const matching = matches.filter(
          (id) => groupFor(inventoryIndex.get(id)) === key,
        ).length;
        return `<section class="inventory-group"><h2><button type="button" data-inventory-group="${esc(key)}" aria-expanded="${!collapsedGroups.has(key)}">${esc(key)} <small>${items.length} on this page · ${matching} matching / ${total} visible catalog items</small></button></h2><div role="list" aria-label="${esc(key)} items" ${collapsedGroups.has(key) ? "hidden" : ""}><div class="inventory-row inventory-head" aria-hidden="true"><span>Item / unit</span><span>Owned</span><span>Reserve</span><span>Goal need</span><span>Goal missing</span><span>Next upgrade tiers<br><small>Required / missing</small></span><span>All unfinished upgrades<br><small>Required / missing</small></span>${Object.values(
          useLabels,
        )
          .map((label) => `<span class="inventory-use">${label}</span>`)
          .join("")}<span>Details</span></div>${items
          .map((r) => {
            const uses = inventoryUses.get(r.id);
            const url = `/local/?pack=${encodeURIComponent(state.pack.id)}&id=${encodeURIComponent(r.id)}`;
            const quantity = (field, prefix, label) =>
              `<label class="quantity-cell"><span class="mobile-label">${label}</span><input aria-label="${label} for ${esc(r.name)}" name="${prefix}:${esc(r.id)}" data-id="${esc(r.id)}" data-field="${field}" type="number" min="0" max="${stockLimit(state.profile, r)}" value="${esc(inventoryDraft.raw.get(`${prefix}:${r.id}`) === INVALID_NUMBER_DRAFT ? "" : inventoryDraft.raw.get(`${prefix}:${r.id}`))}" ${field === "reserves" ? "required" : `placeholder="${inventoryDraft.raw.get(`${prefix}:${r.id}`) === INVALID_NUMBER_DRAFT ? "Invalid entry" : "Not entered"}"`}></label>`;
            return `<div class="inventory-entry" role="listitem" data-inventory-item="${esc(r.id)}"><div class="inventory-row"><div class="inventory-name"><a href="${esc(url)}" tabindex="0" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a><small>${esc(r.unit)}</small><small class="collection-state" data-collection-state="${esc(r.id)}" hidden><span class="collection-short"></span><span class="collection-kind"></span><span class="sr-only collection-description"></span></small></div><div class="owned-cell">${quantity("inventory", "owned", "Owned")}<div class="stock-steps"><button type="button" data-stock-step="-1" data-id="${esc(r.id)}" aria-label="Decrease owned ${esc(r.name)}">−</button><button type="button" data-stock-step="1" data-id="${esc(r.id)}" aria-label="Increase owned ${esc(r.name)}">+</button></div></div>${quantity("reserves", "reserve", "Reserve")}<span class="inventory-plan" role="group" aria-label="Needed, consumed / retained"><span class="mobile-label">Goal need</span><span data-plan-item="${esc(r.id)}" data-plan-field="needed"></span></span><span class="inventory-plan" role="group" aria-label="Missing, consumed / retained"><span class="mobile-label">Goal missing</span><span data-plan-item="${esc(r.id)}" data-plan-field="missing"></span></span>${upgradeNeedCell(r.id, "next", "Next upgrade tiers")}${upgradeNeedCell(r.id, "all", "All unfinished upgrades")}${Object.keys(
              useLabels,
            )
              .map((kind) => useCell(uses[kind], kind, r.id))
              .join(
                "",
              )}<button type="button" data-show-use="${esc(r.id)}" aria-expanded="false" aria-label="Uses and details for ${esc(r.name)}">Uses</button></div><div class="inventory-details" data-item-detail="${esc(r.id)}" hidden><h3>${esc(r.name)} · draft details</h3><p>Available after your fixed reserve: <span data-available="${esc(r.id)}"></span>. Blank owned is not entered. Needed/Missing are separate consumed quantities and retained tool floors from your selected goals; units are never combined.</p><button type="button" data-clear-stock="${esc(r.id)}">Clear stock (not entered)</button><p>Catalog uses are references, not quantities allocated or advice to discard.</p><div data-upgrade-needs-detail="${esc(r.id)}"></div>${Object.entries(
              useLabels,
            )
              .map(
                ([kind, label]) =>
                  `<section data-uses-kind="${kind}" data-uses-item="${esc(r.id)}"><h4>${label}</h4><div class="uses-page">${usesList(uses[kind])}</div></section>`,
              )
              .join(
                "",
              )}<section data-uses-kind="acquisition" data-uses-item="${esc(r.id)}"><h4>Obtaining this item: producing recipes</h4><div class="uses-page">${usesList(uses.acquisition)}</div></section></div></div>`;
          })
          .join("")}</div></section>`;
      })
      .join("") || "<p>No matching visible items.</p>";
  $("#inventory-pagination").hidden = matches.length <= INVENTORY_PAGE_SIZE;
  updateInventoryPreview();
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
    inventoryUses = itemUses(state.pack, state.profile);
    inventoryIndex = new Map(
      [...inventoryUses].map(([id, uses]) => [id, uses.item]),
    );
    if (inventoryPack !== state.pack) {
      inventoryPageNumber = 0;
      collapsedGroups.clear();
    }
    inventoryPack = state.pack;
    const section = $("#inventory-section");
    if (section) {
      const selected = section.value;
      section.innerHTML =
        '<option value="">All sections</option>' +
        [...new Set([...inventoryIndex.values()].map(groupFor))]
          .map((key) => `<option value="${esc(key)}">${esc(key)}</option>`)
          .join("");
      section.value = selected;
    }
    inventoryDraft = createInventoryDraft(state.pack.items, state.profile);
    $("#completion-fields").innerHTML = state.pack.objectives
      .filter((r) => !r.spoiler)
      .map((r) =>
        r.track === "dmz-upgrade"
          ? upgradeControls(r)
          : `<label>${esc(r.name)}<select data-completion="${esc(r.id)}">${["unknown", "locked", "unlocked", "completed"].map((v) => `<option ${state.profile.completion[r.id] === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`,
      )
      .join("");
    checkpointInventory();
    filterInventory(false);
  }
  renderSpendingSummary();
  if ($("#migrate-upgrade-profile"))
    $("#migrate-upgrade-profile").hidden = state.profile.schemaVersion === 3;
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
      { badInput: input.validity.badInput },
    );
    updateInventoryPreview();
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
      error(
        new Error(
          "Quantity must be a nonnegative integer within this field’s displayed limit (1000000, or 2000000 for v3 currency).",
        ),
      );
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
    const id = e.target.dataset.completion;
    const candidate = setCompletion(
      state.pack,
      state.profile,
      id,
      e.target.value,
    );
    if (await persist(candidate)) {
      render();
      document.querySelector(`[data-completion="${CSS.escape(id)}"]`)?.focus();
    }
  }
});
function preview(p) {
  const summary = profileChangeSummary(state.profile, p, state.pack);
  staged = p;
  stagedPack = state.pack.id;
  stagedRevision = state.revision;
  $("#restore-summary").innerHTML =
    `<p><strong>Replace this profile, not add quantities.</strong></p>${summary.historyChanged ? '<p class="notice"><strong>Recorded spending history will be replaced.</strong> Restoring a backup never replays purchases or deducts stock. Earlier/manual game spending may be absent; keep an export and the previous snapshot before replacement.</p>' : ""}<p>Catalog: ${esc(summary.catalog)}. Current version: ${esc(summary.currentVersion)}. Proposed version: ${esc(summary.proposedVersion)}.</p><p>${summary.versionMismatch ? "Different content version: planning remains blocked until explicit rebind." : "Content versions match."} Unresolved references: ${summary.unresolvedCount}.</p><p>Unknown version text is withheld while spoilers are hidden. Use the existing spoiler preference before previewing if you want to inspect it.</p>` +
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
    const count = (ids, noun) => {
      const visible = safeReferenceCount(
        ids,
        pack,
        state.profile.spoilers,
        content?.previous?.pack,
      );
      return visible === null
        ? `Protected or unresolved ${noun} (count withheld)`
        : `${visible} ${noun}`;
    };
    $("#restore-summary").insertAdjacentHTML(
      "afterbegin",
      `<p>Upgrade evidence review: ${count(review.changed, "saved records require review")}; ${count(review.retired, "retired references remain recoverable")}; ${count(review.added, "new definitions have no inferred progress")}. ${review.comparisonKnown ? "Compared with the retained prior content snapshot." : "Prior content facts unavailable: compare the current requirements and sources manually; no unchanged-cost claim is made."} Historical completion and stock are retained.</p>`,
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
    `Clear inventory, reserves, goals and progress for ${state.pack.title}? Recorded spending history and duplicate-purchase guards stay unchanged. A previous snapshot is retained.`;
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
  const candidate = {
    ...resetProfile(state.profile, state.pack),
    revision: state.revision,
  };
  if (await persist(candidate)) {
    $("#reset-confirm").hidden = true;
    render();
  }
});
$("#migrate-upgrade-profile")?.addEventListener("click", () => {
  try {
    const migration = previewUpgradeMigration(state.profile, state.pack);
    preview(migration.candidate);
    const moved = safeReferenceCount(
        migration.moved,
        state.pack,
        state.profile.spoilers,
      ),
      ambiguous = safeReferenceCount(
        migration.ambiguous,
        state.pack,
        state.profile.spoilers,
      );
    const detail =
      moved === null || ambiguous === null
        ? "Protected migration details withheld; reveal spoilers to inspect. Legacy ambiguity still requires review."
        : `${moved} resolved entries; ${ambiguous} ambiguous legacy unlocked entries require review.`;
    $("#restore-summary").insertAdjacentHTML(
      "afterbegin",
      `<p>Upgrade format migration: ${detail} Profile v3 enables future spending records only; earlier/manual spending remains unrecorded. Inventory is unchanged. Cancel leaves the original profile untouched.</p>`,
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
  const button = event.target.closest("button");
  if (!button || state.saving || state.loading) return;
  if (button.dataset.inventoryGroup !== undefined) {
    const key = button.dataset.inventoryGroup;
    if (collapsedGroups.has(key)) collapsedGroups.delete(key);
    else collapsedGroups.add(key);
    button.setAttribute("aria-expanded", String(!collapsedGroups.has(key)));
    button.closest("section").querySelector(":scope > div").hidden =
      collapsedGroups.has(key);
  }
  if (button.dataset.showUse) {
    const id = button.dataset.showUse;
    const detail = [...document.querySelectorAll("[data-item-detail]")].find(
      (node) => node.dataset.itemDetail === id,
    );
    const opening = detail.hidden;
    for (const node of document.querySelectorAll("[data-item-detail]"))
      node.hidden = true;
    for (const node of document.querySelectorAll(
      "[data-show-use][aria-expanded]",
    ))
      node.setAttribute("aria-expanded", "false");
    detail.hidden = !opening;
    if (opening)
      button
        .closest(".inventory-entry")
        .querySelector("[aria-expanded]")
        .setAttribute("aria-expanded", "true");
    updateInventoryPreview();
  }
  if (button.dataset.usePage) {
    const section = button.closest("[data-uses-kind]"),
      offset = Number(button.dataset.usePage);
    section.querySelector(".uses-page").innerHTML = usesList(
      inventoryUses.get(section.dataset.usesItem)[section.dataset.usesKind],
      offset,
    );
    section.querySelector("h4").tabIndex = -1;
    section.querySelector("h4").focus();
  }
  const id = button.dataset.clearStock || button.dataset.id;
  if (!id) return;
  const input = [...document.querySelectorAll('[data-field="inventory"]')].find(
    (node) => node.dataset.id === id,
  );
  if (button.dataset.clearStock) input.value = "";
  else if (button.dataset.stockStep) {
    if (input.value === "" || !Number.isInteger(Number(input.value))) return;
    input.value = String(
      Math.max(
        0,
        Math.min(
          stockLimit(state.profile, inventoryIndex.get(id)),
          Number(input.value) + Number(button.dataset.stockStep),
        ),
      ),
    );
  } else return;
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
function upgradeControls(record) {
  const progress = upgradeProgressFor(state.pack, state.profile, record.id);
  if (state.profile.schemaVersion < 2)
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
    )}<p>These manual controls correct status only; stock and recorded spending remain unchanged.${progress.reviewRequired ? " Review required against current evidence." : ""}</p>${spendingActions(state.pack, state.profile, record.id)}</fieldset>`;
}
let pendingUpgrade = null;
function dismissUpgradeProgress({ focus = true } = {}) {
  const pending = pendingUpgrade,
    revision = state.revision;
  pendingUpgrade = null;
  const dialog = $("#upgrade-progress-confirm");
  if (!dialog) return;
  closeDialog(
    dialog,
    focus
      ? () => {
          if (
            pending &&
            pending.pack === state.pack &&
            revision === state.revision &&
            !state.loading &&
            !pendingUpgrade
          )
            document
              .querySelector(
                `[data-upgrade-id="${CSS.escape(pending.id)}"][data-upgrade-field="${pending.field}"]`,
              )
              ?.focus();
        }
      : undefined,
  );
}
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
      '<h2 id="upgrade-progress-title">Confirm manual progress</h2><p>Status-only correction: no stock deduction, refund or spending record. If stock already reflects the purchase, this avoids recording it twice.</p><p id="upgrade-progress-target"></p><button id="upgrade-progress-apply">Record progress</button><button id="upgrade-progress-cancel">Cancel</button><p id="upgrade-progress-result" role="status"></p><button id="upgrade-progress-export" hidden>Export unsaved progress candidate</button>';
    document.body.append(dialog);
    $("#upgrade-progress-cancel").onclick = () => {
      if (state.saving) return;
      dismissUpgradeProgress();
    };
    dialog.oncancel = (event) => {
      event.preventDefault();
      if (state.saving) {
        return;
      }
      dismissUpgradeProgress();
    };
    $("#upgrade-progress-apply").onclick = async () => {
      const pending = pendingUpgrade;
      if (!pending || state.saving) return;
      if (
        pending.pack !== state.pack ||
        pending.revision !== state.revision ||
        hasUnsavedDraft()
      ) {
        dismissUpgradeProgress({ focus: false });
        error(new Error("Progress confirmation expired; review again."));
        return;
      }
      $("#upgrade-progress-apply").disabled = true;
      $("#upgrade-progress-cancel").disabled = true;
      if (await persist(pending.candidate)) {
        dismissUpgradeProgress();
        render();
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
  dismissUpgradeProgress({ focus: false });
});
installSpending({ onSaved: render, isDirty: hasUnsavedDraft });
init(render).catch(error);

function filterInventory(reset = true) {
  if (reset) inventoryPageNumber = 0;
  if (!$("#inventory-query")) return;
  const q = $("#inventory-query").value.trim().toLowerCase(),
    mode = $("#inventory-view").value;
  let needed = new Set(),
    warning = "";
  if (["needed", "upgrade-next", "upgrade-all"].includes(mode)) {
    derivedInventory();
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
  if (mode === "needed") needed = new Set();
  if (mode === "needed")
    for (const id of inventoryIndex.keys())
      if (inventoryUpgradeNeeds.collection.get(id)?.used) needed.add(id);
  let matches = filterInventoryIds(
    inventoryIndex,
    state.profile,
    q,
    mode,
    needed,
  );
  if (mode === "upgrade-next" || mode === "upgrade-all") {
    const scope =
      inventoryUpgradeNeeds[mode === "upgrade-next" ? "next" : "all"];
    matches = matches.filter(
      (id) => scope.used.has(id) || scope.membershipLimited,
    );
  }
  const section = $("#inventory-section")?.value || "",
    usage = $("#inventory-use-filter")?.value || "";
  const view = $("#inventory-view").value;
  if (section)
    matches = matches.filter(
      (id) => groupFor(inventoryIndex.get(id)) === section,
    );
  if (usage)
    matches = matches.filter((id) => inventoryUses.get(id)[usage].length);
  if (view === "not-entered")
    matches = matches.filter(
      (id) => inventoryDraft.raw.get(`owned:${id}`) === "",
    );
  if (view === "missing") {
    derivedInventory();
    matches = matches.filter((id) => {
      const row = inventoryLedger.get(id);
      const upgrade = inventoryUpgradeNeeds.all.rows.get(id);
      return (
        (row && (row.missing || row.retainedMissing)) || upgrade?.search > 0
      );
    });
  }
  const sort = $("#inventory-sort")?.value;
  if (sort === "name")
    matches.sort((a, b) =>
      inventoryIndex.get(a).name.localeCompare(inventoryIndex.get(b).name),
    );
  renderInventoryPage(matches);
  $("#inventory-count").textContent =
    `${matches.length} of ${inventoryIndex.size} visible catalog items match.` +
    warning;
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

for (const id of [
  "inventory-section",
  "inventory-sort",
  "inventory-use-filter",
])
  $(`#${id}`)?.addEventListener("change", () => filterInventory());
for (const [id, collapse] of [
  ["inventory-collapse", true],
  ["inventory-expand", false],
])
  $(`#${id}`)?.addEventListener("click", () => {
    for (const item of inventoryIndex.values()) {
      if (collapse) collapsedGroups.add(groupFor(item));
      else collapsedGroups.delete(groupFor(item));
    }
    filterInventory(false);
  });
$("#inventory-density")?.addEventListener("change", (event) => {
  $("#inventory-fields").classList.toggle(
    "comfortable",
    event.target.value === "comfortable",
  );
  try {
    localStorage.setItem("dmz-inventory-density", event.target.value);
  } catch {}
});
try {
  if ($("#inventory-density")) {
    $("#inventory-density").value =
      localStorage.getItem("dmz-inventory-density") || "compact";
    $("#inventory-density").dispatchEvent(new Event("change"));
  }
} catch {}

// Pointer targets are already hit-tested at the press position. Do not move
// them between press and release; keyboard/programmatic focus still reveals
// controls hidden by the sticky header/footer.
let inventoryPointerFocus = null;
$("#inventory-fields")?.addEventListener(
  "pointerdown",
  (event) => {
    inventoryPointerFocus = event.target.closest("input,button,a,summary");
  },
  true,
);
for (const type of ["pointerup", "pointercancel", "keydown"])
  document.addEventListener(
    type,
    () => {
      inventoryPointerFocus = null;
    },
    true,
  );
$("#inventory-fields")?.addEventListener("focusin", (event) => {
  const target = event.target.closest("input,button,a,summary");
  if (!target || target === inventoryPointerFocus) return;
  const rect = target.getBoundingClientRect(),
    bar = $(".inventory-save-bar");
  if (bar && getComputedStyle(bar).position === "sticky") {
    const bounds = bar.getBoundingClientRect();
    if (rect.bottom > bounds.top - 12 && rect.top < bounds.bottom) {
      window.scrollBy(0, rect.bottom - bounds.top + 12);
      return;
    }
  }
  const head = target
    .closest(".inventory-group")
    ?.querySelector(".inventory-head");
  if (head) {
    const bounds = head.getBoundingClientRect();
    if (bounds.height && rect.top < bounds.bottom && rect.bottom > bounds.top)
      window.scrollBy(0, rect.top - bounds.bottom - 12);
  }
});
