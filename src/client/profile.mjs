import { hydrateInventoryIcons } from "./inventory-icons.mjs";
import { buildTargetControl } from "../ui/build-target-control.mjs";
import { inventoryReviewReasons } from "../domain/inventory-review.mjs";
import {
  automaticIngredientBlueprint,
  inventoryBlueprintAvailable,
  inventoryUpgradeUse,
  compareInventoryMaterialItems,
  currencyQuantityText,
  currencyQuantityRaw,
} from "../domain/inventory-presentation.mjs";
import {
  compactInventoryRows,
  inventoryDirtyState,
  refreshTrackerContext,
} from "./quick-tracker.mjs";
import {
  inventoryFamily,
  inventoryFamilyLabel,
  inventoryTypeLabel,
  inventoryInputLimit,
  itemSection,
  itemRarity,
  compareItems,
  compareInventorySections,
  compareInventoryFamilies,
} from "../domain/inventory-items.mjs";
import { inventorySaveAction } from "./inventory-save.mjs";
import { upgradeNeeds } from "../domain/upgrade-needs.mjs";
import {
  upgradeNeedCell,
  needsValues,
  collectionNeedsValues,
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
  validateProfile,
  resetProfile,
  parseProfile,
  previewProfile,
  previewUpgradeMigration,
} from "../domain/profile.mjs";
import {
  PROFILE_BACKUP_SCOPE,
  PROFILE_BACKUP_EXCLUSIONS,
  verifiedBackupStatus,
} from "../domain/backup-scope.mjs";
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
let inventoryMatches = [];
let inventoryUses = new Map();
let inventoryLedger = new Map();
let inventoryPlanWarning = "";
let inventoryUpgradeNeeds = null,
  needsPack = null,
  needsFingerprint = "";
let inventoryPack = null;
const collapsedGroups = new Set();
const loadedInventoryGroups = new Set();
const collapsedCategories = new Set();
function groupFor(item) {
  return itemSection(item);
}
const groupIdentity = (item) =>
  JSON.stringify([inventoryFamily(item), groupFor(item)]);
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
  if (state.profile.contentVersion !== state.pack.contentVersion)
    inventoryPlanWarning =
      "This inventory is linked to an older catalog. Review the tracking update to restore Needed and Missing counts; your saved stock is retained.";
  if (inventoryUpgradeNeeds.collection.limited)
    inventoryPlanWarning +=
      " Collection needs reached a safety limit; membership and quantities are incomplete. Resolve content before relying on this list.";
}
function updateInventoryPreview() {
  inventoryDirtyState(inventoryDraft?.isDirty() || false);
  for (const input of document.querySelectorAll(
    "#inventory-fields [data-field]",
  )) {
    const prefix = input.dataset.field === "inventory" ? "owned" : "reserve";
    const incomplete =
      inventoryDraft.raw.get(`${prefix}:${input.dataset.id}`) ===
      INVALID_NUMBER_DRAFT;
    const raw = inventoryDraft.raw.get(`${prefix}:${input.dataset.id}`);
    const badCurrency =
      input.dataset.currencyQuantity &&
      !(
        (raw === "" && prefix === "owned") ||
        (/^\d+$/.test(raw) &&
          Number(raw) <=
            inventoryInputLimit(
              state.profile,
              inventoryIndex.get(input.dataset.id),
            ))
      );
    input.setCustomValidity(
      incomplete || badCurrency
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
    let trackingLink = document.querySelector("#inventory-tracking-update");
    if (!trackingLink) {
      trackingLink = document.createElement("a");
      trackingLink.id = "inventory-tracking-update";
      trackingLink.textContent = "Review tracking update";
      warning.after(trackingLink);
    }
    trackingLink.href =
      "/needed/?pack=" + encodeURIComponent(state.pack.id) + "#budget-setup";
    trackingLink.hidden =
      state.profile.contentVersion === state.pack.contentVersion;
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
    const combined = cell.dataset.upgradeNeed === "collection";
    const values = combined
      ? collectionNeedsValues(
          inventoryUpgradeNeeds.listedCollection,
          cell.dataset.item,
          inventoryUses.get(cell.dataset.item),
        )
      : needsValues(
          inventoryUpgradeNeeds[cell.dataset.upgradeNeed],
          cell.dataset.item,
        );
    for (const number of cell.querySelectorAll(
      "[data-tier-required],[data-tier-missing]",
    )) {
      number.classList.add("needed-number");
      if (combined) number.dataset.neededNumber = values.state;
    }
    cell.title = values.note;

    cell.querySelector("[data-tier-required]").textContent = values.required;
    cell.querySelector("[data-tier-missing]").textContent = values.missing;
    const scope = inventoryUpgradeNeeds[cell.dataset.upgradeNeed];
    cell.querySelector("[data-tier-uncertainty]").textContent =
      combined && values.emptyReason === "completed"
        ? "All listed requirements completed"
        : combined && values.emptyReason === "unlisted"
          ? "No listed requirement"
          : combined && values.emptyReason === "blocked"
            ? "Review tracking / quantities"
            : combined &&
                inventoryUpgradeNeeds.listedCollection.get(cell.dataset.item)
                  ?.craftEstimate
              ? inventoryUpgradeNeeds.listedCollection.get(cell.dataset.item)
                  ?.estimated
                ? "Craft estimate; blank outputs = 0"
                : "Listed crafting inputs"
              : !combined && values.provisional
                ? "Listed / provisional"
                : combined &&
                    inventoryUpgradeNeeds.listedCollection.get(
                      cell.dataset.item,
                    )?.listed
                  ? "Listed / provisional"
                  : (
                        combined
                          ? inventoryUpgradeNeeds.collection.get(
                              cell.dataset.item,
                            )?.unknown
                          : scope.used.has(cell.dataset.item) && scope.partial
                      )
                    ? "Partial / unknown scope"
                    : "";
  }
  for (const badge of document.querySelectorAll("[data-collection-state]")) {
    const need = inventoryUpgradeNeeds.listedCollection.get(
      badge.dataset.collectionState,
    );
    badge.hidden = !need?.used;
    badge.dataset.state = need?.state || "none";
    const description = need?.used
      ? inventoryReviewReasons(
          state.pack,
          state.profile,
          inventoryUpgradeNeeds.listedCollection,
          need,
        )
          .map((r) => r.text)
          .join(" ") || need.label
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
      state.profile,
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
      state.saving || !Number.isInteger(Number(raw)) || Number(raw) < 0;
  }
}
function checkpointInventory() {
  inventoryDraft?.checkpoint();
  inventoryDirtyState(inventoryDraft?.isDirty() || false);
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
  collapsedGroups.delete(groupIdentity(inventoryIndex.get(invalid.id)));
  collapsedCategories.delete(inventoryFamily(inventoryIndex.get(invalid.id)));
  const ids = [...inventoryIndex.keys()];
  inventoryPageNumber = Math.floor(
    ids.indexOf(invalid.id) / INVENTORY_PAGE_SIZE,
  );
  filterInventory(false);
  $("#error").textContent +=
    " Review the focused inventory quantity; all other edits are retained.";
  for (const input of document.querySelectorAll(
    "#inventory-form [data-field],#inventory-form [data-build-quantity]",
  ))
    if (input.name === invalid.name) {
      const detail = input.closest("[data-item-detail]");
      if (detail) {
        detail.hidden = false;
        detail
          .closest(".inventory-entry")
          .querySelector("[data-show-use]")
          .setAttribute("aria-expanded", "true");
      }
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
  inventoryMatches = matches;
  const pageIds = new Set(page.ids),
    totals = new Map(),
    groups = new Map();
  for (const item of inventoryIndex.values()) {
    const identity = groupIdentity(item);
    totals.set(identity, (totals.get(identity) || 0) + 1);
  }
  for (const [index, id] of matches.entries()) {
    const item = inventoryIndex.get(id),
      identity = groupIdentity(item);
    if (!groups.has(identity))
      groups.set(identity, {
        representative: item,
        items: [],
        matching: 0,
        firstIndex: index,
      });
    const group = groups.get(identity);
    group.matching++;
    if (pageIds.has(id) || loadedInventoryGroups.has(identity))
      group.items.push(item);
  }
  const upgradeIdentity = JSON.stringify(["Materials", "Upgrade materials"]);
  if ($("#inventory-section")?.value === "Upgrade materials") groups.clear();
  const upgradeItems = matches
    .map((id) => inventoryIndex.get(id))
    .filter(
      (item) =>
        item.kind !== "currency" &&
        item.kind !== "weapon" &&
        inventoryUpgradeUse(inventoryUses.get(item.id)).remaining > 0,
    );
  if (
    upgradeItems.length &&
    (!$("#inventory-section")?.value ||
      $("#inventory-section").value === "Upgrade materials")
  ) {
    const visible = upgradeItems
      .filter(
        (item) =>
          pageIds.has(item.id) || loadedInventoryGroups.has(upgradeIdentity),
      )
      .sort(compareInventoryMaterialItems);
    groups.set(upgradeIdentity, {
      representative: upgradeItems[0],
      items: visible,
      matching: upgradeItems.length,
      firstIndex: matches.indexOf(upgradeItems[0].id),
      upgradeView: true,
    });
    totals.set(upgradeIdentity, upgradeItems.length);
  }
  const renderedGroups = [...groups]
    .sort(([, a], [, b]) =>
      compareInventorySections(
        groupFor(a.representative),
        groupFor(b.representative),
      ),
    )
    .map(
      ([
        identity,
        { items, representative, matching, firstIndex, upgradeView },
      ]) => {
        const key = upgradeView
            ? "Upgrade materials"
            : groupFor(representative),
          total = totals.get(identity);
        return {
          family: upgradeView ? "Materials" : inventoryFamily(representative),
          count: items.length,
          html: `<section class="inventory-group"><h3><button type="button" data-inventory-group="${esc(key)}" data-inventory-group-key="${esc(identity)}" aria-expanded="${!collapsedGroups.has(identity)}">${esc(inventoryTypeLabel(key))} <small>${items.length} on this page · ${matching} matching / ${total} visible catalog items</small></button></h3><div role="list" aria-label="${esc(inventoryTypeLabel(key))} items" ${collapsedGroups.has(identity) ? "hidden" : ""}><div class="inventory-row inventory-head" aria-hidden="true" ${items.length ? "" : "hidden"}><span>Item / unit</span><span>Icon</span><span>Owned</span><span>Blueprint</span><span>Reserve</span><span>Goal need</span><span>Goal missing</span><span>Upgrades + missions</span><span>Next upgrade tiers<br><small>Required / missing</small></span><span>All unfinished upgrades<br><small>Required / missing</small></span>${Object.values(
            useLabels,
          )
            .map((label) => `<span class="inventory-use">${label}</span>`)
            .join("")}<span>Details</span></div>${items
            .map((r) => {
              const uses = inventoryUses.get(r.id);
              const granted = automaticIngredientBlueprint(
                state.pack,
                state.profile,
                r,
              );
              const upgradeUse = inventoryUpgradeUse(uses);
              const url = `/local/?pack=${encodeURIComponent(state.pack.id)}&id=${encodeURIComponent(r.id)}`;
              const quantity = (field, prefix, label) =>
                `<label class="quantity-cell"><span class="mobile-label">${label}</span><input aria-label="${label} for ${esc(r.name)}" name="${prefix}:${esc(r.id)}" data-id="${esc(r.id)}" data-field="${field}" type="${r.kind === "currency" ? "text" : "number"}" ${r.kind === "currency" ? 'inputmode="numeric" data-currency-quantity="true"' : ""} min="0" max="${inventoryInputLimit(state.profile, r)}" value="${esc(inventoryDraft.raw.get(`${prefix}:${r.id}`) === INVALID_NUMBER_DRAFT ? "" : r.kind === "currency" ? currencyQuantityText(inventoryDraft.raw.get(`${prefix}:${r.id}`)) : inventoryDraft.raw.get(`${prefix}:${r.id}`))}" ${field === "reserves" ? "required" : `placeholder="${inventoryDraft.raw.get(`${prefix}:${r.id}`) === INVALID_NUMBER_DRAFT ? "Invalid entry" : "Not entered"}"`}></label>`;
              return `<div class="inventory-entry" role="listitem" data-inventory-item="${esc(r.id)}"><div class="inventory-row"><div class="inventory-name"><a href="${esc(url)}" tabindex="0" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a><small>${esc(r.unit)} · Rarity: ${esc(itemRarity(r))}</small>${upgradeUse.used ? `<small class="inventory-upgrade-use">${upgradeUse.completed ? "* Upgrade use completed" : `Upgrade item - ${upgradeUse.remaining} unfinished`}</small>` : ""}<small class="collection-state" data-collection-state="${esc(r.id)}" hidden><span class="collection-short"></span><span class="collection-kind"></span><span class="sr-only collection-description"></span></small></div><div class="inventory-item-icon" data-inventory-icon="${esc(r.id)}" data-icon-status="missing"><span aria-hidden="true" class="inventory-icon-placeholder">+</span><small>Icon needed</small></div><div class="owned-cell">${quantity("inventory", "owned", "Owned")}<div class="stock-steps"><button type="button" data-stock-step="-1" data-id="${esc(r.id)}" aria-label="Decrease owned ${esc(r.name)}">−</button><button type="button" data-stock-step="1" data-id="${esc(r.id)}" aria-label="Increase owned ${esc(r.name)}">+</button></div></div><div class="inventory-blueprint">${inventoryBlueprintAvailable(r, uses) ? `<label><input type="checkbox" data-item-blueprint="${esc(r.id)}" aria-label="Blueprint owned for ${esc(r.name)}" ${granted || inventoryDraft.blueprintOwned(r.id) ? "checked" : ""} ${granted ? `disabled title="Granted by ${esc(granted.name)}"` : ""}><span>Blueprint owned${granted ? " - upgrade" : ""}</span></label>` : '<span class="inventory-blueprint-unavailable" aria-label="No listed crafting recipe">&mdash;</span>'}</div>${quantity("reserves", "reserve", "Reserve")}<span class="inventory-plan" role="group" aria-label="Needed, consumed / retained"><span class="mobile-label">Goal need</span><span data-plan-item="${esc(r.id)}" data-plan-field="needed"></span></span><span class="inventory-plan" role="group" aria-label="Missing, consumed / retained"><span class="mobile-label">Goal missing</span><span data-plan-item="${esc(r.id)}" data-plan-field="missing"></span></span>${upgradeNeedCell(r.id, "collection", "Upgrades + missions")}${upgradeNeedCell(r.id, "next", "Next upgrade tiers")}${upgradeNeedCell(r.id, "all", "All unfinished upgrades")}${Object.keys(
                useLabels,
              )
                .map((kind) => useCell(uses[kind], kind, r.id))
                .join(
                  "",
                )}<button type="button" data-show-use="${esc(r.id)}" aria-expanded="false" aria-label="Uses and details for ${esc(r.name)}">Uses</button></div><div class="inventory-details" data-item-detail="${esc(r.id)}" hidden><h3>${esc(r.name)} · draft details</h3><p>Rarity: ${esc(itemRarity(r))}. ${esc(r.description || "No acquisition information recorded.")}</p><p>Available after your fixed reserve: <span data-available="${esc(r.id)}"></span>. Blank owned is not entered. Needed/Missing are separate consumed quantities and retained tool floors from your selected goals; units are never combined.</p><button type="button" data-clear-stock="${esc(r.id)}">Clear stock (not entered)</button><p>Catalog uses are references, not quantities allocated or advice to discard.</p><div data-upgrade-needs-detail="${esc(r.id)}"></div>${Object.entries(
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
            .join(
              "",
            )}${items.length === matching ? "" : `<div role="listitem" class="inventory-offpage"><button type="button" data-inventory-page-for="${firstIndex}" data-inventory-load-group="${esc(identity)}">${esc(inventoryTypeLabel(key))}</button></div>`}</div></section>`,
        };
      },
    );
  const families = new Map();
  for (const row of renderedGroups) {
    if (!families.has(row.family)) families.set(row.family, []);
    families.get(row.family).push(row);
  }
  $("#inventory-fields").innerHTML =
    [...families]
      .sort(([a], [b]) => compareInventoryFamilies(a, b))
      .map(([family, rows]) => {
        const matching = matches.filter(
          (id) => inventoryFamily(inventoryIndex.get(id)) === family,
        ).length;
        return `<section class="inventory-category"><h2><button type="button" data-inventory-category="${esc(family)}" aria-expanded="${!collapsedCategories.has(family)}">${esc(inventoryFamilyLabel(family))} <small>${matching} matching · ${rows.reduce((n, r) => n + r.count, 0)} on this page</small></button></h2><div data-inventory-category-body ${collapsedCategories.has(family) ? "hidden" : ""}>${rows.map((r) => r.html).join("")}</div></section>`;
      })
      .join("") || "<p>No matching visible items.</p>";
  // Keep the pager and its focus target available while filtering a large catalog,
  // including the no-results state. Filtering must not remove active navigation.
  $("#inventory-pagination").hidden =
    inventoryIndex.size <= INVENTORY_PAGE_SIZE;
  for (const entry of document.querySelectorAll(".inventory-entry")) {
    const id = entry.dataset.inventoryItem,
      cell = document.createElement("div");
    cell.className = "inventory-build-target";
    cell.innerHTML = buildTargetControl(state.pack, id, state.profile);
    const control = cell.querySelector("[data-build-control]");
    if (control) {
      control.querySelector("[data-build-select]").checked =
        inventoryDraft.buildSelected(id);
      const input = control.querySelector("[data-build-quantity]");
      input.value = inventoryDraft.buildQuantity(id);
      input.disabled = !inventoryDraft.buildSelected(id);
    }
    const row = entry.querySelector(".inventory-row");
    row.insertBefore(cell, row.querySelector(":scope > [data-show-use]"));
  }
  compactInventoryRows();
  void hydrateInventoryIcons(state.pack);
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
  refreshTrackerContext();
  pendingInventoryInvalid = null;
  if ($("#inventory-fields")) {
    inventoryUses = itemUses(state.pack, state.profile);
    inventoryIndex = new Map(
      [...inventoryUses].map(([id, uses]) => [id, uses.item]),
    );
    if (inventoryPack !== state.pack) {
      inventoryPageNumber = 0;
      loadedInventoryGroups.clear();
      collapsedGroups.clear();
      collapsedCategories.clear();
    }
    inventoryPack = state.pack;
    const section = $("#inventory-section");
    if (section) {
      const selected = section.value;
      section.innerHTML =
        '<option value="">All sections</option>' +
        [
          ...new Set(
            [...inventoryIndex.values()]
              .map(groupFor)
              .concat(
                [...inventoryUses.values()].some((u) => u.upgrades.length)
                  ? ["Upgrade materials"]
                  : [],
              ),
          ),
        ]
          .sort(compareInventorySections)
          .map(
            (key) =>
              `<option value="${esc(key)}">${esc(inventoryTypeLabel(key))}</option>`,
          )
          .join("");
      section.value = selected;
    }
    inventoryDraft = createInventoryDraft(state.pack.items, state.profile, {
      allowCurrencyUpgrade: true,
    });
    $("#completion-fields").innerHTML = state.pack.objectives
      .filter((r) => !r.spoiler)
      .map((r) =>
        r.track === "dmz-upgrade"
          ? upgradeControls(r)
          : `<label>${esc(r.name)}<select data-completion="${esc(r.id)}">${["unknown", "locked", "unlocked", "completed"].map((v) => `<option ${state.profile.completion[r.id] === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`,
      )
      .join("");
    checkpointInventory();
    if (new URL(location.href).searchParams.has("item")) {
      const item = inventoryIndex.get(
        new URL(location.href).searchParams.get("item"),
      );
      if (item) $("#inventory-query").value = item.name;
    }
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
  renderBackupScope();
}
function renderBackupScope() {
  const node = $("#backup-scope-status");
  if (!node || !state.pack) return;
  let saved = null;
  try {
    saved = verifiedBackupStatus(
      JSON.parse(
        localStorage.getItem(`dmz-verified-profile-backup:${state.pack.id}`) ||
          "null",
      ),
      state.pack.id,
    );
  } catch {
    /* Storage status may be unavailable; never infer a successful save. */
  }
  node.textContent = `${saved ? `Last confirmed profile file write: ${saved.savedAt} (revision ${saved.revision}).` : "No confirmed profile file write on this browser."} Includes: ${PROFILE_BACKUP_SCOPE.join(", ")}. Excludes: ${PROFILE_BACKUP_EXCLUSIONS.join(", ")}. Ordinary downloads cannot be verified by this page.`;
}
$("#save-verified-profile")?.addEventListener("click", async () => {
  try {
    if (hasUnsavedDraft())
      throw Error(
        "Save or discard current edits before backing up the saved profile.",
      );
    if (!window.showSaveFilePicker)
      throw Error(
        "Verified file saving is unavailable in this browser. Use Export private backup and confirm the download yourself.",
      );
    validateProfile(state.profile);
    const snapshot = state.profile;
    const content = JSON.stringify(snapshot, null, 2);
    const handle = await window.showSaveFilePicker({
      suggestedName: `dmz-profile-${snapshot.revision}.json`,
      types: [
        {
          description: "DMZ profile JSON",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    const writable = await handle.createWritable();
    try {
      await writable.write(content);
      await writable.close();
    } catch (cause) {
      try {
        await writable.abort();
      } catch {}
      throw cause;
    }
    try {
      localStorage.setItem(
        `dmz-verified-profile-backup:${state.pack.id}`,
        JSON.stringify({
          packId: state.pack.id,
          revision: snapshot.revision,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      /* File is saved; date cannot be retained. */
    }
    renderBackupScope();
    status(
      "Profile backup file write confirmed. Check excluded workspaces for separate backups.",
    );
  } catch (cause) {
    if (cause?.name !== "AbortError") error(cause);
  }
});
$("#inventory-form")?.addEventListener("keydown", (event) => {
  if (
    event.key !== "Enter" ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !event.target.matches('[data-field="inventory"]')
  )
    return;
  event.preventDefault();
  if (state.saving || state.loading) return;
  if (!event.target.checkValidity()) {
    event.target.reportValidity();
    return;
  }
  const fields = [
    ...document.querySelectorAll('#inventory-fields [data-field="inventory"]'),
  ].filter((input) => input.getClientRects().length && !input.disabled);
  const next = fields[fields.indexOf(event.target) + 1];
  if (next) {
    next.focus();
    next.select();
  } else
    document.querySelector('#inventory-form button[type="submit"]')?.focus();
});
$("#inventory-form")?.addEventListener("change", (event) => {
  const build = event.target.closest(
    "[data-build-select],[data-build-quantity]",
  );
  if (build && !state.saving && !state.loading) {
    const root = build.closest("[data-build-control]"),
      id = root.dataset.buildItem,
      selected = root.querySelector("[data-build-select]");
    try {
      inventoryDraft.setBuild(
        id,
        selected.checked
          ? root.querySelector("[data-build-quantity]").value
          : null,
        state.profile,
      );
      for (const peer of document.querySelectorAll("[data-build-control]"))
        if (peer.dataset.buildItem === id) {
          peer.querySelector("[data-build-select]").checked =
            inventoryDraft.buildSelected(id);
          peer.querySelector("[data-build-quantity]").disabled =
            !inventoryDraft.buildSelected(id);
          peer.querySelector("[data-build-quantity]").value =
            inventoryDraft.buildQuantity(id);
        }
      updateInventoryPreview();
    } catch (reason) {
      selected.checked = inventoryDraft.buildSelected(id);
      error(reason);
    }
    return;
  }
  const control = event.target.closest("[data-item-blueprint]");
  if (
    !control ||
    state.saving ||
    state.loading ||
    !inventoryBlueprintAvailable(
      inventoryIndex.get(control.dataset.itemBlueprint),
      inventoryUses.get(control.dataset.itemBlueprint),
    )
  )
    return;
  inventoryDraft.setBlueprint(
    control.dataset.itemBlueprint,
    control.checked,
    state.profile,
  );
  for (const peer of document.querySelectorAll("[data-item-blueprint]"))
    if (
      peer.dataset.itemBlueprint === control.dataset.itemBlueprint &&
      peer !== control
    )
      peer.checked = control.checked;
  inventoryDirtyState(inventoryDraft.isDirty());
  status(
    inventoryDraft.isDirty()
      ? "Unsaved inventory edits \u00b7 save locally or export a validated backup."
      : "Saved values unchanged / no unsaved inventory edits.",
  );
});
$("#inventory-form")?.addEventListener("focusout", (event) => {
  const input = event.target;
  if (input.dataset.currencyQuantity)
    input.value = currencyQuantityText(currencyQuantityRaw(input.value));
});
$("#inventory-form")?.addEventListener("input", (e) => {
  const input = e.target;
  if (input.hasAttribute("data-build-quantity")) {
    const control = input.closest("[data-build-control]"),
      id = control.dataset.buildItem;
    if (!control.querySelector("[data-build-select]").checked) return;
    inventoryDraft.setBuild(id, input.value, state.profile);
    for (const peer of document.querySelectorAll("[data-build-control]"))
      if (peer.dataset.buildItem === id && peer !== control)
        peer.querySelector("[data-build-quantity]").value = input.value;
    inventoryDirtyState(inventoryDraft.isDirty());
    return;
  }
  if (input.dataset.field) {
    inventoryDraft.set(
      input.dataset.field,
      input.dataset.id,
      input.dataset.currencyQuantity
        ? currencyQuantityRaw(input.value)
        : input.value,
      state.profile,
      { badInput: input.validity.badInput },
    );
    for (const peer of document.querySelectorAll(
      "#inventory-fields [data-field]",
    ))
      if (
        peer !== input &&
        peer.dataset.id === input.dataset.id &&
        peer.dataset.field === input.dataset.field
      )
        peer.value = input.value;
    const focusedTop = input.getBoundingClientRect().top;
    updateInventoryPreview();
    status(
      hasUnsavedDraft()
        ? "Unsaved inventory edits · save locally or export a validated backup."
        : "Saved values unchanged · no unsaved inventory edits.",
    );
    if (document.activeElement === input) {
      const shift = input.getBoundingClientRect().top - focusedTop;
      if (Math.abs(shift) > 1) window.scrollBy(0, shift);
    }
  }
});
$("#inventory-form")?.addEventListener(
  "invalid",
  (event) => {
    if (
      !event.target.dataset.field &&
      !event.target.hasAttribute("data-build-quantity")
    )
      return;
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
          "Enter a whole nonnegative quantity: up to 2,000,000 for currency, or 1,000,000 for other items.",
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
const saveInventory = inventorySaveAction({
  state,
  getDraft: () => inventoryDraft,
  persist,
  render,
  error,
  revealInvalid: revealInvalidInventory,
});
$("#inventory-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveInventory();
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
    `Clear inventory, build targets, reserves, goals and progress for ${state.pack.title}? Recorded spending history and duplicate-purchase guards stay unchanged. A previous snapshot is retained.`;
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
    $("#error").hidden = true;
    $("#error").textContent = "";
    status("Inventory edits canceled; saved profile restored.");
  } catch (reason) {
    error(reason);
  }
});
$("#inventory-fields")?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || state.saving || state.loading) return;
  if (button.dataset.inventoryPageFor !== undefined) {
    const index = Number(button.dataset.inventoryPageFor);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= inventoryMatches.length
    )
      return;
    const item = inventoryIndex.get(inventoryMatches[index]),
      identity = button.dataset.inventoryLoadGroup || groupIdentity(item);
    collapsedCategories.delete(
      identity === JSON.stringify(["Materials", "Upgrade materials"])
        ? "Materials"
        : inventoryFamily(item),
    );
    collapsedGroups.delete(identity);
    loadedInventoryGroups.add(button.dataset.inventoryLoadGroup || identity);
    filterInventory(false);
    [...document.querySelectorAll("[data-inventory-group-key]")]
      .find((node) => node.dataset.inventoryGroupKey === identity)
      ?.focus();
    return;
  }
  if (button.dataset.inventoryCategory !== undefined) {
    const key = button.dataset.inventoryCategory;
    if (collapsedCategories.has(key)) collapsedCategories.delete(key);
    else collapsedCategories.add(key);
    button.setAttribute("aria-expanded", String(!collapsedCategories.has(key)));
    button
      .closest(".inventory-category")
      .querySelector(":scope > [data-inventory-category-body]").hidden =
      collapsedCategories.has(key);
  }
  if (button.dataset.inventoryGroup !== undefined) {
    const key = button.dataset.inventoryGroupKey;
    if (collapsedGroups.has(key)) collapsedGroups.delete(key);
    else collapsedGroups.add(key);
    button.setAttribute("aria-expanded", String(!collapsedGroups.has(key)));
    button.closest("section").querySelector(":scope > div").hidden =
      collapsedGroups.has(key);
  }
  if (button.dataset.showUse) {
    const id = button.dataset.showUse;
    const detail = [
      ...(button.closest(".inventory-entry") || document).querySelectorAll(
        "[data-item-detail]",
      ),
    ].find((node) => node.dataset.itemDetail === id);
    if (button.dataset.kind && !detail.hidden) {
      const section = [...detail.querySelectorAll("[data-uses-kind]")].find(
        (node) => node.dataset.usesKind === button.dataset.kind,
      );
      const heading = section?.querySelector("h4");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
      return;
    }
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
  const input = [
    ...(button.closest(".inventory-entry") || document).querySelectorAll(
      '[data-field="inventory"]',
    ),
  ].find((node) => node.dataset.id === id);
  if (button.dataset.clearStock) input.value = "";
  else if (button.dataset.stockStep) {
    if (
      input.validity.badInput ||
      !Number.isInteger(
        Number(
          input.dataset.currencyQuantity
            ? currencyQuantityRaw(input.value)
            : input.value,
        ),
      )
    )
      return;
    input.value = String(
      Math.max(
        0,
        Math.min(
          inventoryInputLimit(state.profile, inventoryIndex.get(id)),
          Number(
            input.dataset.currencyQuantity
              ? currencyQuantityRaw(input.value)
              : input.value,
          ) + Number(button.dataset.stockStep),
        ),
      ),
    );
  } else return;
  if (input.dataset.currencyQuantity)
    input.value = currencyQuantityText(currencyQuantityRaw(input.value));
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
  if (reset) {
    inventoryPageNumber = 0;
    loadedInventoryGroups.clear();
  }
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
    matches = matches.filter((id) =>
      section === "Upgrade materials"
        ? inventoryIndex.get(id).kind !== "currency" &&
          inventoryIndex.get(id).kind !== "weapon" &&
          inventoryUpgradeUse(inventoryUses.get(id)).remaining > 0
        : groupFor(inventoryIndex.get(id)) === section,
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
  if (sort === "name" || sort === "rarity")
    matches.sort((a, b) =>
      compareItems(inventoryIndex.get(a), inventoryIndex.get(b), sort),
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
      if (collapse) {
        collapsedGroups.add(groupIdentity(item));
        collapsedCategories.add(inventoryFamily(item));
      } else {
        collapsedGroups.delete(groupIdentity(item));
        collapsedCategories.delete(inventoryFamily(item));
      }
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
