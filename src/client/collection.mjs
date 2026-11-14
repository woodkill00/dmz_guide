import { inventoryBlueprintOwnershipLabel } from "../domain/inventory-presentation.mjs";
import { connectedPreparation } from "../domain/connected-preparation.mjs";
import {
  init,
  state,
  $,
  esc,
  error,
  persist,
  status,
  download,
} from "./common.mjs";
import {
  collectionWorkbench,
  filterShopping,
  whyNeeded,
  coverageIssues,
  shoppingText,
  sourceLink,
} from "../domain/collection-workbench.mjs";
import {
  previewCraft,
  craftReceipt,
  reverseCraft,
} from "../domain/craft-transaction.mjs";
import { requirementFacts } from "../content/validate.mjs";
import {
  collectionRoutePoint,
  loadCollectionRoute,
  saveCollectionRoute,
  validateCollectionRoute,
  createCollectionRouteContext,
} from "../domain/collection-route.mjs";
import { floorOf, placementReason } from "../domain/locations.mjs";
import { createReaderContext } from "../domain/reader-flow.mjs";
import { closeDialog } from "./dialog-focus.mjs";
let renderEpoch = 0;
let model = null,
  packRef = null,
  profileRef = null,
  shoppingPage = 0,
  recipePage = 0,
  coveragePage = 0;
let routeIds = [],
  routeWarning = "",
  whyItem = "",
  whyPages = { roots: 0, steps: 0, locations: 0 },
  whyTrigger = null;
let pending = null,
  undo = null,
  failed = null,
  busy = false,
  craftTrigger = null,
  craftCostPage = 0;
const link = (id) =>
  `/local/?pack=${encodeURIComponent(state.pack.id)}&id=${encodeURIComponent(id)}`;
const val = (n) => (n === null || n === undefined ? "Unknown" : String(n));
const preferenceKey = () => `dmz-collection-view:${state.pack.id}`;
function act({ recovery = false } = {}) {
  if (
    state.loading ||
    state.saving ||
    busy ||
    !model ||
    model.pack !== state.pack
  )
    throw new Error("Wait for the selected content and current action.");
  if (failed && !recovery) {
    $("#craft-recovery").focus();
    throw new Error(
      "Export or discard the unsaved candidate before another action.",
    );
  }
}
function report(reason) {
  error(
    new Error(
      model?.visible.guard.text(reason.message) ||
        "Collection action unavailable.",
    ),
  );
}
function preferences(load = false) {
  try {
    if (load) {
      const raw = localStorage.getItem(preferenceKey());
      if (!raw || raw.length > 4096) return;
      const p = JSON.parse(raw);
      if (["all", "short", "covered", "review", "craft"].includes(p.state))
        $("#shopping-state").value = p.state;
      if (["next", "tracked", "helped", "shortage", "name"].includes(p.sort))
        $("#shopping-sort").value = p.sort;
      if (typeof p.hideCovered === "boolean")
        $("#shopping-hide-covered").checked = p.hideCovered;
    } else
      localStorage.setItem(preferenceKey(), JSON.stringify(shoppingOptions()));
  } catch {
    /* Session filters remain usable; no profile write depends on preferences. */
  }
}
function shoppingOptions() {
  return {
    state: $("#shopping-state").value,
    sort: $("#shopping-sort").value,
    hideCovered: $("#shopping-hide-covered").checked,
  };
}
function pager(selector, page, total) {
  for (const b of document.querySelectorAll(selector)) {
    const delta = Number(
      b.dataset.shoppingPage ?? b.dataset.recipePage ?? b.dataset.coveragePage,
    );
    b.disabled = delta < 0 ? page === 0 : (page + 1) * 50 >= total;
  }
}
function renderSummary() {
  const s = model.summary;
  $("#collection-summary").innerHTML = [
    [
      "Upgrades recorded complete",
      `${val(s.upgradesComplete)} / ${s.upgrades} listed records`,
    ],
    [
      "Missions recorded complete",
      `${val(s.missionsComplete)} / ${s.missions} listed records`,
    ],
    ["Items with known shortages", s.short],
    ["Items covered for listed costs", s.covered],
    ["Items needing review", s.review],
  ]
    .map(
      ([label, value]) =>
        `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`,
    )
    .join("");
  $("#collection-warning").hidden = !(model.limited || model.craftWarning);
  $("#collection-warning").textContent = model.limited
    ? "Collection scope or explanations are incomplete. Resolve content/profile limits before treating the list as complete."
    : model.craftWarning;
  $("#craft-undo").disabled = !undo;
}
function renderConnectedActions() {
  const result = connectedPreparation(model);
  const amount = (action) =>
    action.missing !== null
      ? `Missing ${esc(action.missing)} ${esc(action.unit)}`
      : action.knownMissing > 0
        ? `At least ${esc(action.knownMissing)} ${esc(action.unit)} missing; total unknown`
        : "Amount unknown";
  const renderAction = (action) =>
    `<li><a href="${esc(link(action.id))}">${esc(action.name)}</a> · ${amount(action)} · ${esc(action.cause)}${action.key ? " · Key" : ""}${action.craft ? " · Crafting ingredient" : ""}${action.recipes.length ? ` · Recipes: ${action.recipes.map((recipe) => `<a href="${esc(link(recipe.id))}">${esc(recipe.name)}</a>${recipe.ready ? " (ready)" : " (review/collect first)"}`).join(", ")}` : ""}${action.areas.length ? ` · Areas: ${action.areas.map((area) => `<a href="${esc(area.referenceURL)}">${esc(area.name)}</a>`).join(", ")}` : " · Area unknown"} <button type="button" data-next-why-item="${esc(action.id)}">Why needed / locations</button></li>`;
  $("#connected-actions-list").innerHTML = result.actions.length
    ? `<ol class="collection-list">${result.actions.map(renderAction).join("")}</ol><p>${result.total} outstanding listed items${result.partial ? " · projection incomplete" : ""}. <a href="#shopping">See the full shopping list</a>.</p>`
    : "<p>No known outstanding item actions. Unrecorded requirements may still need review.</p>";
}
function renderShopping() {
  const rows = filterShopping(model, {
    ...shoppingOptions(),
    query: $("#shopping-query").value,
  });
  shoppingPage = Math.max(
    0,
    Math.min(shoppingPage, Math.max(0, Math.ceil(rows.length / 50) - 1)),
  );
  $("#shopping-count").textContent =
    `${rows.length} matching needed items · ${shoppingPage * 50 + 1 > rows.length ? 0 : shoppingPage * 50 + 1}–${Math.min(rows.length, (shoppingPage + 1) * 50)} shown. Root counts${model.limited ? " are incomplete" : ""}; shortages sort within units.`;
  $("#shopping-list").innerHTML =
    rows
      .slice(shoppingPage * 50, shoppingPage * 50 + 50)
      .map(
        (d) =>
          `<article class="collection-item" data-shopping-item="${esc(d.id)}"><div><h3><a href="${esc(link(d.id))}">${esc(d.item.name)}</a></h3><small>${esc(d.group)} · ${esc(d.item.unit)}</small><p class="collection-badge" data-state="${d.state}">${esc(d.label)}${d.craft ? " · Crafting ingredient" : ""}</p></div><div><strong>Required ${esc(val(d.required))}</strong><p>Missing ${esc(d.missing ?? (d.knownMissing > 0 ? `at least ${d.knownMissing}` : "Unknown"))}</p><small>${d.rootIds.length} known unfinished roots${model.limited ? " (incomplete)" : ""}${d.next ? " · Next upgrade" : ""}${d.tracked ? " · Tracked mission" : ""}</small></div><div class="actions"><button type="button" data-why-item="${esc(d.id)}">Why needed / locations</button><button type="button" data-compare-item="${esc(d.id)}">Compare recipes</button></div></article>`,
      )
      .join("") ||
    "<p>No items match. Clear filters to inspect covered or uncertain requirements.</p>";
  pager("[data-shopping-page]", shoppingPage, rows.length);
}
function renderRecipes() {
  const q = $("#recipe-query").value.trim().toLocaleLowerCase(),
    filter = $("#recipe-state").value;
  const rows = model.crafts.filter(
    (c) =>
      (!q ||
        `${c.recipe.name} ${model.visible.items.get(c.recipe.output.itemId)?.name}`
          .toLocaleLowerCase()
          .includes(q)) &&
      (filter === "all" ||
        (filter === "ready" && c.ready) ||
        (filter === "covered" && c.quantityReady) ||
        (filter === "review" && !c.ready)),
  );
  recipePage = Math.max(
    0,
    Math.min(recipePage, Math.max(0, Math.ceil(rows.length / 50) - 1)),
  );
  $("#recipe-count").textContent =
    `${rows.length} matching recipes · ${Math.min(rows.length, recipePage * 50 + 1)}–${Math.min(rows.length, (recipePage + 1) * 50)} shown. Each preview is independent.${model.craftReviewLimited ? " Readiness review is incomplete: safety work limit reached. Ready and covered results may omit unchecked recipes; preview a recipe individually for a focused check." : ""}`;
  $("#recipe-list").innerHTML =
    rows
      .slice(recipePage * 50, recipePage * 50 + 50)
      .map((c) => {
        const r = c.recipe,
          output = model.visible.items.get(r.output.itemId);
        return `<article class="collection-item" data-recipe-item="${esc(r.id)}"><div><h3><a href="${esc(link(r.id))}">${esc(r.name)}</a></h3><p>Yield ${esc(r.output.quantity)} ${esc(output.name)} / batch</p><p>${c.ready ? "Ready for confirmation" : c.quantityReady ? "Listed inputs covered; access/output checks remain" : "Blocked or inputs still needed"} · ${esc(r.status)}</p></div><div><p>${r.inputs
          .slice(0, 3)
          .map((raw) => {
            const line = requirementFacts(state.pack, raw);
            return `${esc(val(line.quantity))} ${esc(model.visible.items.get(line.itemId).name)} (${esc(line.consumption)})`;
          })
          .join(
            "; ",
          )}</p>${r.inputs.length > 3 ? `<p>Inspect all ${r.inputs.length} inputs in preview.</p>` : ""}<small class="item-blueprint-state" data-item-blueprint-for="${esc(r.output.itemId)}">${esc(inventoryBlueprintOwnershipLabel(state.pack, state.profile, r.output.itemId))}</small><p>${esc(c.reasons[0] || c.warnings[0] || "Check game access before recording.")}</p></div><div class="actions"><button type="button" data-compare-item="${esc(r.output.itemId)}">Compare / choose route</button><button type="button" data-craft-id="${esc(r.id)}">Craft preview…</button></div></article>`;
      })
      .join("") ||
    "<p>No recipes match, or readiness is unresolved. Unknown recipes are never invented.</p>";
  pager("[data-recipe-page]", recipePage, rows.length);
}
function renderCoverage() {
  const { issues, limited } = coverageIssues(
    model,
    $("#coverage-before").value,
  );
  coveragePage = Math.max(
    0,
    Math.min(coveragePage, Math.max(0, Math.ceil(issues.length / 50) - 1)),
  );
  $("#coverage-count").textContent =
    `${issues.length} review entries${limited ? " · incomplete work-limited review" : ""}; a review entry is not proof of incorrect game data.`;
  $("#coverage-list").innerHTML =
    issues
      .slice(coveragePage * 50, coveragePage * 50 + 50)
      .map(
        (r) =>
          `<article class="collection-item"><div><h3>${model.visible.sources.has(r.id) ? esc(r.name) : `<a href="${esc(link(r.id))}">${esc(r.name)}</a>`}</h3><strong>${esc(r.kind)}</strong></div><p>${esc(r.detail)}</p>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open source</a>` : ""}</article>`,
      )
      .join("") ||
    "<p>No issues match this bounded review. This does not certify complete current-game data.</p>";
  pager("[data-coverage-page]", coveragePage, issues.length);
}
function renderRoute() {
  let route;
  try {
    route = validateCollectionRoute(state.pack, state.profile, routeIds);
  } catch {
    routeIds = [];
    routeWarning =
      "Route content or calibration changed. Select locations again.";
    route = { stops: [] };
  }
  $("#collection-route-stops").innerHTML =
    route.stops
      .map(
        (l, i) =>
          `<li><span>${esc(l.name)} · ${esc(floorOf(l))} · ${esc(l.grid || "grid unknown")}</span><div class="actions"><button type="button" data-route-move="${i}" data-delta="-1" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(l.name)} up">Up</button><button type="button" data-route-move="${i}" data-delta="1" ${i === routeIds.length - 1 ? "disabled" : ""} aria-label="Move ${esc(l.name)} down">Down</button><button type="button" data-route-remove="${i}" aria-label="Remove ${esc(l.name)}">Remove</button></div></li>`,
      )
      .join("") || "<li>No route stops yet.</li>";
  $("#route-notice").textContent =
    routeWarning ||
    `${routeIds.length}/50 stops · manual order, not an optimized road route.`;
  $("#collection-route-open").disabled = routeIds.length === 0;
  $("#collection-route-clear").disabled =
    routeIds.length === 0 && !routeWarning;
}
async function changeRoute(ids) {
  const pack = state.pack,
    profile = state.profile;
  validateCollectionRoute(pack, profile, ids);
  busy = true;
  let warning = "";
  try {
    await saveCollectionRoute(pack, profile, ids);
  } catch {
    warning =
      "Route works in this page session, but browser storage did not save it.";
  } finally {
    busy = false;
  }
  if (state.pack !== pack || state.profile !== profile) {
    syncDerived();
    return;
  }
  routeIds = [...ids];
  routeWarning = warning;
  renderRoute();
  if (whyItem) renderWhy();
}

function recovery() {
  const panel = $("#craft-recovery");
  panel.hidden = !failed;
}
function resetPending() {
  pending = null;
  undo = null;
  closeDialog($("#craft-dialog"));
  closeDialog($("#collection-why"));
  whyItem = "";
}
async function render() {
  const epoch = ++renderEpoch,
    requestedPack = state.pack;
  const changed = packRef !== state.pack;
  if (changed) {
    resetPending();
    packRef = state.pack;
    profileRef = null;
    shoppingPage = recipePage = coveragePage = 0;
    routeIds = [];
    routeWarning = "";
    $("#shopping-query").value = "";
    $("#recipe-query").value = "";
    $("#shopping-state").value = "all";
    $("#shopping-sort").value = "next";
    $("#shopping-hide-covered").checked = true;
    preferences(true);
    try {
      const loaded = await loadCollectionRoute(state.pack, state.profile);
      if (epoch !== renderEpoch || state.pack !== requestedPack) return;
      routeIds = loaded;
    } catch {
      if (epoch !== renderEpoch || state.pack !== requestedPack) return;
      routeWarning =
        "Saved route could not be validated. Clear it before selecting current locations.";
    }
  }
  if (profileRef !== state.profile || !model) {
    model = collectionWorkbench(state.pack, state.profile);
    profileRef = state.profile;
  }
  const selectedOption = [...$("#pack-select").options].find(
    (o) => o.value === state.pack.id,
  );
  if (selectedOption)
    selectedOption.textContent = model.visible.guard.text(state.pack.title);
  $("#pack-note").textContent = model.visible.guard.text(
    $("#pack-note").textContent,
  );
  renderSummary();
  renderConnectedActions();
  renderShopping();
  renderRecipes();
  renderCoverage();
  renderRoute();
  recovery();
}
function sourceLinks(record) {
  return (record.sourceIds || [])
    .map((id) => model.visible.sources.get(id))
    .filter(Boolean)
    .map((s) => {
      const url = sourceLink(model, s);
      return url
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`
        : esc(s.title);
    })
    .join(" · ");
}
function pageSection(kind, title, rows, renderRow) {
  const page = whyPages[kind];
  return `<section><h3>${title}</h3><p>${rows.length} listed · ${Math.min(rows.length, page * 50 + 1)}–${Math.min(rows.length, (page + 1) * 50)}</p><ul>${rows
    .slice(page * 50, page * 50 + 50)
    .map(renderRow)
    .join(
      "",
    )}</ul><div class="actions"><button type="button" data-why-page="${kind}" data-delta="-1" ${page === 0 ? "disabled" : ""}>Previous ${kind}</button><button type="button" data-why-page="${kind}" data-delta="1" ${(page + 1) * 50 >= rows.length ? "disabled" : ""}>Next ${kind}</button></div></section>`;
}
function renderWhy() {
  const item = model.visible.items.get(whyItem);
  if (!item) return;
  const trace = whyNeeded(model, whyItem),
    recipes = [...model.visible.recipes.values()].filter(
      (r) => r.output.itemId === whyItem,
    ),
    locations = [...model.visible.locations.values()].filter((l) =>
      l.itemIds.includes(whyItem),
    );
  $("#why-title").textContent = `Why needed: ${item.name}`;
  const need = model.needs.collection.get(whyItem);
  $("#why-body").innerHTML =
    `<p>${esc(need?.label || "No known unfinished use.")} · required ${esc(val(need?.required))}; missing ${esc(val(need?.missing))}. ${trace.limited ? "Explanation incomplete or unresolved; inspect the available source records." : ""}</p>${pageSection("roots", "Unfinished roots", trace.roots, (r) => `<li><a href="${esc(link(r.id))}">${r.track === "campaign" ? "Campaign: " : ""}${esc(r.name)}</a> · ${esc(r.track)}<small>${sourceLinks(r)}</small></li>`)}${pageSection("steps", "Crafting chain steps", trace.steps, (c) => `<li><a href="${esc(link(c.itemId))}">${esc(model.visible.items.get(c.itemId).name)}</a> → <a href="${esc(link(c.id))}">${esc(c.name)}</a> → <button type="button" data-why-item="${esc(c.parentItemId)}">${esc(model.visible.items.get(c.parentItemId).name)}</button><p>${esc(val(c.quantity))} / ${esc(c.consumption)} · quantity is this chain contribution, not an additional total.</p></li>`)}<section><h3>Compare producing recipes</h3><p>Choose an explicit route or keep automatic sole-visible-recipe advice. This does not craft or add a goal.</p><label>Recipe route<select id="why-route"><option value="">Automatic sole visible recipe</option>${recipes.map((r) => `<option value="${esc(r.id)}" ${state.profile.routes[whyItem] === r.id ? "selected" : ""}>${esc(r.name)} · yield ${r.output.quantity} · ${esc(r.status)}</option>`).join("")}</select></label><button type="button" id="why-save-route">Save recipe route</button><p id="why-result" role="alert"></p>${recipes.length === 0 ? "<p>No producing recipe is listed; this does not prove one exists.</p>" : ""}<p>${recipes
      .slice(0, 50)
      .map((r) => `<a href="${esc(link(r.id))}">${esc(r.name)}</a>`)
      .join(" · ")}</p></section>${pageSection(
      "locations",
      "Declared locations",
      locations,
      (l) => {
        const map = model.visible.maps.get(l.mapId),
          point = collectionRoutePoint(map, l);
        const fits =
          routeIds.length === 0 ||
          (model.visible.locations.get(routeIds[0])?.mapId === l.mapId &&
            floorOf(model.visible.locations.get(routeIds[0])) === floorOf(l));
        return `<li><a href="${esc(link(l.id))}">${esc(l.name)}</a> · ${esc(l.spawnKind)} · ${esc(l.grid || "grid unknown")}<p>${esc(point ? "Calibrated location, not a guaranteed spawn." : placementReason(map, l) || "Coordinate projection is invalid; list only.")}</p><button type="button" data-route-add="${esc(l.id)}" ${!point || !fits || routeIds.includes(l.id) || routeIds.length >= 50 ? "disabled" : ""}>${routeIds.includes(l.id) ? "Already on route" : !fits ? "Different map/floor" : "Add to collection route"}</button></li>`;
      },
    )}<button type="button" data-open-item-map="${esc(item.id)}">Open known locations on map</button>`;
}
function openWhy(id, trigger) {
  if (!model.visible.items.has(id)) throw new Error("Item unavailable.");
  whyItem = id;
  whyPages = { roots: 0, steps: 0, locations: 0 };
  whyTrigger = trigger;
  renderWhy();
  if (!$("#collection-why").open) $("#collection-why").showModal();
  $("#why-title").focus();
}
function closeWhy() {
  whyItem = "";
  closeDialog($("#collection-why"), () => {
    if (whyTrigger?.isConnected) whyTrigger.focus();
    else $("#shopping-query").focus();
  });
}
function renderCraft() {
  const p = pending;
  if (!p) return;
  $("#craft-title").textContent =
    p.kind === "undo" ? "Reverse the last local craft" : "Preview local craft";
  $("#craft-result").textContent = "";
  $("#craft-ack-label").hidden = p.kind === "undo";
  $("#craft-batches-label").hidden = p.kind === "undo";
  $("#craft-ack").checked = false;
  $("#craft-export").hidden = !p.failed;
  if (p.kind === "undo")
    $("#craft-preview").innerHTML =
      "<p>Restore the inventory from immediately before this craft. Other profile fields remain unchanged. This does not refund anything in the game.</p>";
  else {
    const t = p.transition;
    $("#craft-preview").innerHTML =
      `<h3>${esc(t.recipe.name)}</h3><p class="item-blueprint-state">${esc(inventoryBlueprintOwnershipLabel(state.pack, state.profile, t.recipe.output.itemId))}. Materials and recipe access are checked separately.</p><p>Output: +${t.output.produced} ${esc(t.output.name)}; previously ${esc(val(t.output.held))}. Station: ${esc(model.visible.guard.text(t.recipe.station))}; pool: ${esc(t.recipe.eligibility)}.</p><ul>${t.inputs
        .slice(craftCostPage * 50, craftCostPage * 50 + 50)
        .map(
          (c) =>
            `<li>${esc(c.name)}: consume ${c.consumed}; retain ${c.retained}; held ${esc(val(c.held))}; reserve ${c.reserve}; missing ${esc(val(c.missing))}</li>`,
        )
        .join(
          "",
        )}</ul><div class="actions"><button type="button" data-craft-cost-page="-1" ${craftCostPage === 0 ? "disabled" : ""}>Previous costs</button><button type="button" data-craft-cost-page="1" ${(craftCostPage + 1) * 50 >= t.inputs.length ? "disabled" : ""}>Next costs</button><span>${t.inputs.length} combined input lines</span></div><ul>${[...t.reasons, ...t.warnings].map((s) => `<li>${esc(s)}</li>`).join("")}</ul><p>Retained tools and reserves are checked against original stock before output is credited.</p>`;
  }
  $("#craft-apply").disabled = Boolean(
    p.failed ||
      (p.kind === "craft" &&
        (!p.transition.ready ||
          !$("#craft-batches").validity.valid ||
          Number($("#craft-batches").value) !== p.batches)),
  );
  $("#craft-apply").textContent =
    p.kind === "undo" ? "Confirm reversal" : "Confirm local craft";
}
function openCraft(id, trigger) {
  act();
  if (pending) throw new Error("Close the current preview first.");
  const transition = previewCraft(state.pack, state.profile, id, 1);
  pending = {
    kind: "craft",
    id,
    batches: 1,
    transition,
    candidate: transition.candidate,
    baseline: JSON.stringify(state.profile),
    revision: state.revision,
    pack: state.pack,
    failed: false,
  };
  craftTrigger = trigger;
  craftCostPage = 0;
  $("#craft-batches").value = "1";
  $("#craft-batches").setCustomValidity("");
  $("#craft-batches").setAttribute("aria-invalid", "false");
  renderCraft();
  $("#craft-dialog").showModal();
  $("#craft-title").focus();
}
function closeCraft() {
  if (busy) return;
  if (pending?.failed && !failed) failed = { candidate: pending.candidate };
  pending = null;
  closeDialog($("#craft-dialog"), () => {
    if (craftTrigger?.isConnected && !craftTrigger.disabled)
      craftTrigger.focus();
    else $("#recipe-query").focus();
  });
  recovery();
}
function previewUndo(trigger) {
  act();
  if (!undo) throw new Error("No current session craft can be reversed.");
  const candidate = reverseCraft(state.pack, state.profile, undo);
  pending = {
    kind: "undo",
    candidate,
    baseline: JSON.stringify(state.profile),
    revision: state.revision,
    pack: state.pack,
    failed: false,
  };
  craftTrigger = trigger;
  renderCraft();
  $("#craft-dialog").showModal();
  $("#craft-title").focus();
}
async function applyCraft() {
  act();
  const p = pending;
  if (
    !p ||
    p.failed ||
    p.pack !== state.pack ||
    p.revision !== state.revision ||
    p.baseline !== JSON.stringify(state.profile)
  )
    throw new Error(
      "Preview expired. Close it and inspect the latest profile.",
    );
  if (p.kind === "craft") {
    if (
      !$("#craft-batches").validity.valid ||
      Number($("#craft-batches").value) !== p.batches
    )
      throw new Error("Batch quantity changed. Inspect a valid preview.");
    if (!$("#craft-ack").checked)
      throw new Error(
        "Confirm that you checked in-game access and pre-craft stock.",
      );
    const checked = previewCraft(state.pack, state.profile, p.id, p.batches);
    if (
      !checked.ready ||
      checked.identity !== p.transition.identity ||
      JSON.stringify(checked.candidate) !== JSON.stringify(p.candidate)
    )
      throw new Error("Recipe preview changed. Inspect a new preview.");
  } else if (
    JSON.stringify(reverseCraft(state.pack, state.profile, undo)) !==
    JSON.stringify(p.candidate)
  )
    throw new Error("Reversal changed. Inspect again.");
  const before = structuredClone(state.profile);
  busy = true;
  $("#craft-apply").disabled = true;
  $("#craft-cancel").disabled = true;
  let saved = false;
  try {
    saved = await persist(p.candidate);
  } finally {
    busy = false;
    $("#craft-cancel").disabled = false;
  }
  if (!saved) {
    p.failed = true;
    failed = { candidate: p.candidate };
    $("#craft-result").textContent =
      "Save was not confirmed. The candidate remains separate; export or explicitly discard it before leaving. Nothing is retried.";
    $("#craft-export").hidden = false;
    $("#craft-apply").disabled = true;
    recovery();
    return;
  }
  if (p.pack !== state.pack) {
    pending = null;
    undo = null;
    await render();
    return;
  }
  undo =
    p.kind === "craft"
      ? craftReceipt(state.pack, before, state.profile, p.transition)
      : null;
  pending = null;
  closeDialog($("#craft-dialog"), () => {
    if (craftTrigger?.isConnected && !craftTrigger.disabled)
      craftTrigger.focus();
    else $("#recipe-query").focus();
  });
  model = null;
  await render();
  status(
    p.kind === "craft"
      ? "Craft recorded locally. Inventory updated atomically."
      : "Local craft reversed. Inventory restored.",
  );
}
async function saveRouteChoice() {
  act();
  if (
    state.profile.contentVersion !== state.pack.contentVersion ||
    state.profile.packId !== state.pack.id
  )
    throw new Error("Rebind the profile before saving recipe routes.");
  if (pending) throw new Error("Close the craft preview first.");
  const value = $("#why-route").value;
  if (value && model.visible.recipes.get(value)?.output.itemId !== whyItem)
    throw new Error("Invalid producing recipe.");
  const candidate = structuredClone(state.profile);
  if (value) candidate.routes[whyItem] = value;
  else delete candidate.routes[whyItem];
  busy = true;
  let saved;
  try {
    saved = await persist(candidate);
  } finally {
    busy = false;
  }
  if (saved) {
    undo = null;
    model = null;
    await render();
    renderWhy();
    $("#why-title").focus();
  } else
    $("#why-result").textContent =
      "Recipe route was not saved. Your selection remains here; committed profile is unchanged.";
}
function exportCandidate() {
  if (!failed) throw new Error("No unsaved candidate retained.");
  download("dmz-unsaved-craft-candidate.json", failed.candidate);
  status(
    "Private candidate export requested. It has not been saved; discard explicitly when reconciled.",
  );
}
for (const id of [
  "shopping-query",
  "shopping-state",
  "shopping-sort",
  "shopping-hide-covered",
])
  $("#" + id).addEventListener(
    id === "shopping-query" ? "input" : "change",
    () => {
      if (!model || state.loading || busy) return;
      shoppingPage = 0;
      preferences();
      renderShopping();
    },
  );
for (const id of ["recipe-query", "recipe-state"])
  $("#" + id).addEventListener(
    id === "recipe-query" ? "input" : "change",
    () => {
      if (!model || state.loading || busy) return;
      recipePage = 0;
      renderRecipes();
    },
  );
$("#coverage-before").addEventListener("change", () => {
  if (!model || state.loading || busy) return;
  try {
    coveragePage = 0;
    renderCoverage();
  } catch (e) {
    report(e);
  }
});
$("#craft-batches").addEventListener("input", (event) => {
  if (event.target.id !== "craft-batches" || !pending || busy) return;
  event.target.setCustomValidity("");
  event.target.setAttribute("aria-invalid", "false");
  try {
    const n = Number(event.target.value);
    const t = previewCraft(state.pack, state.profile, pending.id, n);
    pending = {
      ...pending,
      batches: n,
      transition: t,
      candidate: t.candidate,
      failed: false,
    };
    craftCostPage = 0;
    renderCraft();
  } catch {
    event.target.setCustomValidity(
      "Enter a whole batch quantity from 1 to 1,000,000.",
    );
    event.target.setAttribute("aria-invalid", "true");
    $("#craft-apply").disabled = true;
    $("#craft-result").textContent =
      "Enter a valid whole batch quantity; no change has been saved.";
  }
});
$("main").addEventListener("click", async (event) => {
  const b = event.target.closest("button");
  if (!b) return;
  try {
    if (b.hasAttribute("data-candidate-export")) {
      act({ recovery: true });
      exportCandidate();
      return;
    }
    if (b.id === "candidate-discard") {
      act({ recovery: true });
      if (
        confirm(
          "Discard this unsaved craft candidate? Saved inventory will not change.",
        )
      ) {
        failed = null;
        pending = null;
        closeDialog($("#craft-dialog"));
        recovery();
        $("#shopping-query").focus();
      }
      return;
    }
    if (b.id === "candidate-stay") {
      recovery();
      $("#craft-recovery").focus();
      return;
    }
    if (b.id === "craft-cancel") {
      closeCraft();
      return;
    }
    if (b.id === "why-close") {
      closeWhy();
      return;
    }
    if (b.id === "craft-apply") {
      event.preventDefault();
      await applyCraft();
      return;
    }
    if (
      b.hasAttribute("data-why-item") ||
      b.hasAttribute("data-next-why-item")
    ) {
      act({ recovery: true });
      openWhy(b.dataset.whyItem || b.dataset.nextWhyItem, b);
      return;
    }
    if (b.hasAttribute("data-compare-item")) {
      act({ recovery: true });
      openWhy(b.dataset.compareItem, b);
      return;
    }
    if (b.hasAttribute("data-why-page")) {
      act({ recovery: true });
      const kind = b.dataset.whyPage;
      whyPages[kind] += Number(b.dataset.delta);
      renderWhy();
      $("#why-title").focus();
      return;
    }
    if (b.id === "why-save-route") {
      await saveRouteChoice();
      return;
    }
    if (b.hasAttribute("data-craft-id")) {
      openCraft(b.dataset.craftId, b);
      return;
    }
    if (b.hasAttribute("data-craft-cost-page")) {
      act();
      craftCostPage += Number(b.dataset.craftCostPage);
      renderCraft();
      $("#craft-title").focus();
      return;
    }
    if (b.id === "craft-undo") {
      previewUndo(b);
      return;
    }
    if (b.id === "shopping-export") {
      act({ recovery: true });
      download(
        "dmz-private-shopping-list.txt",
        shoppingText(
          model,
          filterShopping(model, {
            ...shoppingOptions(),
            query: $("#shopping-query").value,
          }),
        ),
        "text/plain;charset=utf-8",
      );
      return;
    }
    if (b.hasAttribute("data-shopping-page")) {
      act({ recovery: true });
      shoppingPage += Number(b.dataset.shoppingPage);
      renderShopping();
      $("#shopping-title").tabIndex = -1;
      $("#shopping-title").focus();
      return;
    }
    if (b.hasAttribute("data-recipe-page")) {
      act({ recovery: true });
      recipePage += Number(b.dataset.recipePage);
      renderRecipes();
      $("#crafting-title").tabIndex = -1;
      $("#crafting-title").focus();
      return;
    }
    if (b.hasAttribute("data-coverage-page")) {
      act({ recovery: true });
      coveragePage += Number(b.dataset.coveragePage);
      renderCoverage();
      $("#coverage-title").tabIndex = -1;
      $("#coverage-title").focus();
      return;
    }
    if (b.hasAttribute("data-route-add")) {
      act();
      await changeRoute([...routeIds, b.dataset.routeAdd]);
      return;
    }
    if (b.hasAttribute("data-route-remove")) {
      act();
      await changeRoute(
        routeIds.filter((_, i) => i !== Number(b.dataset.routeRemove)),
      );
      return;
    }
    if (b.hasAttribute("data-route-move")) {
      act();
      const i = Number(b.dataset.routeMove),
        j = i + Number(b.dataset.delta),
        ids = [...routeIds];
      if (j < 0 || j >= ids.length) throw new Error("Route order changed.");
      [ids[i], ids[j]] = [ids[j], ids[i]];
      await changeRoute(ids);
      return;
    }
    if (b.id === "collection-route-clear") {
      act();
      if (confirm("Clear all selected collection route stops?"))
        await changeRoute([]);
      return;
    }
    if (b.id === "collection-route-open") {
      act();
      const pack = state.pack,
        profile = state.profile;
      const ids = [...routeIds];
      busy = true;
      let url;
      try {
        url = await createCollectionRouteContext(pack, profile, ids);
      } finally {
        busy = false;
        if (!state.loading && model?.pack === state.pack) syncDerived();
      }
      if (
        pack !== state.pack ||
        profile !== state.profile ||
        JSON.stringify(ids) !== JSON.stringify(routeIds)
      )
        throw new Error("Content or route changed; open the route again.");
      location.assign(url);
      return;
    }
    if (b.hasAttribute("data-open-item-map")) {
      act();
      const pack = state.pack,
        url = await createReaderContext(pack, b.dataset.openItemMap, "maps");
      if (pack !== state.pack || failed)
        throw new Error("Content changed; open the locations again.");
      location.assign(url);
      return;
    }
  } catch (reason) {
    if ($("#craft-dialog").open)
      $("#craft-result").textContent =
        model?.visible.guard.text(reason.message) || "Action unavailable.";
    else if ($("#collection-why").open)
      $("#why-result").textContent =
        model?.visible.guard.text(reason.message) || "Action unavailable.";
    else report(reason);
  }
});
$("#craft-dialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  closeCraft();
});
$("#collection-why").addEventListener("cancel", (event) => {
  event.preventDefault();
  closeWhy();
});
$("#pack-select").addEventListener(
  "change",
  (event) => {
    if (failed) {
      event.stopImmediatePropagation();
      event.target.value = state.pack.id;
      report(
        new Error(
          "Export or discard the retained candidate before changing catalogs.",
        ),
      );
      $("#craft-recovery").focus();
    }
  },
  true,
);
document.addEventListener(
  "click",
  (event) => {
    if (!failed) return;
    const a = event.target.closest?.("a[href]");
    if (
      !a ||
      a.target === "_blank" ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    const target = new URL(a.href, location.href);
    if (
      target.origin === location.origin &&
      target.pathname === location.pathname &&
      target.search === location.search
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    report(
      new Error(
        "Stay here to export or discard the unsaved candidate before leaving.",
      ),
    );
    $("#craft-recovery").focus();
  },
  true,
);
window.addEventListener("beforeunload", (event) => {
  if (failed) {
    event.preventDefault();
    event.returnValue = "";
  }
});
document.addEventListener("profile-saved", () => {
  if (busy) return;
  undo = null;
  pending = null;
  closeDialog($("#craft-dialog"));
  model = null;
  void render().catch(report);
});
document.addEventListener("pack-changing", () => {
  renderEpoch++;
  resetPending();
});
function syncDerived() {
  if (
    !state.loading &&
    !state.saving &&
    !busy &&
    model &&
    $("main").getAttribute("aria-busy") === "false"
  ) {
    renderSummary();
    renderShopping();
    renderRecipes();
    renderCoverage();
    renderRoute();
  }
}
new MutationObserver(syncDerived).observe($("main"), {
  attributes: true,
  attributeFilter: ["aria-busy"],
});
init(render).catch(report);
