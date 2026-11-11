import { init, state, esc, error, persist } from "./common.mjs";
import { quickCollect, addFound } from "../domain/quick-collect.mjs";
import { upgradeBudget } from "../domain/upgrade-budget.mjs";
import {
  installBudgetSetup,
  renderBudgetSummary,
} from "./upgrade-budget-setup.mjs";
import { loadProfile } from "../storage/store.mjs";
import { hydrateInventoryIcons } from "./inventory-icons.mjs";
import { refreshTrackerContext } from "./quick-tracker.mjs";
import { buildTargetNeeds, setBuildTarget } from "../domain/build-targets.mjs";
import { mountBuildSummary } from "./build-summary.mjs";
import {
  buildGroupsMarkup,
  buildSummaryMarkup,
  outstandingSummaryMarkup,
} from "./build-collect-view.mjs";
const $ = (s) => document.querySelector(s),
  n = (v) => (v == null ? "Review" : Number(v).toLocaleString("en-US"));
let identity = null,
  ids = [],
  lastRows = new Map(),
  amounts = new Map(),
  busy = false,
  undo = null;
let buildIds = new Set();
let buildsPack = null,
  buildsProfile = null,
  buildsModel = null;
function fresh() {
  identity = null;
  undo = null;
  amounts.clear();
  render();
}
function render() {
  refreshTrackerContext();
  if (!document.querySelector(".collect-actions")) {
    const about = document.querySelector(".tracker-explanation");
    if (about)
      about.append(
        $("#upgrade-budget-summary"),
        $(".collect-help"),
        $("#collect-crafting").closest("label"),
      );
    const actions = document.createElement("div");
    actions.className = "collect-actions";
    actions.append(
      $("#collect-hide"),
      $("#collect-refresh"),
      $("#collect-undo"),
    );
    $("#collect-query").closest(".filter-bar").append(actions);
  }
  const key =
    state.pack.id +
    ":" +
    state.pack.contentVersion +
    ":" +
    $("#collect-crafting").checked;
  const model = quickCollect(state.pack, state.profile, {
    crafting: $("#collect-crafting").checked,
  });
  renderBudgetSummary(state, upgradeBudget(state.pack, state.profile));
  let buildRoot = $("#build-collect");
  if (!buildRoot) {
    buildRoot = document.createElement("section");
    buildRoot.id = "build-collect";
    buildRoot.className = "build-collect";
    $("#collect-query").closest(".filter-bar").before(buildRoot);
  }
  const open = new Map(
    [...buildRoot.querySelectorAll("details[data-build-group]")].map((d) => [
      d.dataset.buildGroup,
      d.open,
    ]),
  );
  for (const d of buildRoot.querySelectorAll("[data-build-alternatives]"))
    open.set("alt:" + d.dataset.buildAlternatives, d.open);
  for (const d of buildRoot.querySelectorAll("[data-build-options]"))
    open.set("opt:" + d.dataset.buildOptions, d.open);
  if (buildsPack !== state.pack || buildsProfile !== state.profile) {
    buildsModel = buildTargetNeeds(state.pack, state.profile);
    buildsPack = state.pack;
    buildsProfile = state.profile;
  }
  const builds = buildsModel;
  buildIds = new Set(
    [
      ...builds.combined,
      ...builds.groups.flatMap((g) => [g.root, ...g.direct, ...g.alternatives]),
    ]
      .filter(Boolean)
      .map((r) => r.id),
  );
  buildRoot.innerHTML =
    "<h2>Want to build / get</h2>" +
    buildGroupsMarkup(builds, state.pack, amounts, busy, open);
  for (const [id, markup] of [
    ["build-ingredients-summary", buildSummaryMarkup(builds, state.pack)],
    ["outstanding-items-summary", outstandingSummaryMarkup(model, state.pack)],
  ]) {
    let root = document.getElementById(id);
    if (!root) {
      root = document.createElement("section");
      root.id = id;
      root.className = "build-collect";
      buildRoot.before(root);
    }
    const pins = new Map(
      [...root.querySelectorAll("[data-build-summary-group]")].map((group) => [
        group.dataset.buildSummaryGroup,
        group.dataset.buildPinned || "",
      ]),
    );
    root.innerHTML = markup;
    const groups = [...root.querySelectorAll("[data-build-summary-group]")];
    if (groups.length)
      for (const group of groups) {
        group.dataset.buildPinned =
          pins.get(group.dataset.buildSummaryGroup) || "";
        mountBuildSummary(group);
      }
    else if (id !== "build-ingredients-summary") mountBuildSummary(root);
  }
  if (identity !== key) {
    identity = key;
    ids = model.items.filter((r) => r.remaining !== 0).map((r) => r.id);
    lastRows = new Map();
    amounts.clear();
    undo = null;
  }
  const current = new Map(model.items.map((r) => [r.id, r]));
  for (const r of model.items) lastRows.set(r.id, r);
  const query = $("#collect-query").value.trim().toLowerCase();
  const rows =
    model.status === "ok"
      ? ids
          .map(
            (id) =>
              current.get(id) || {
                ...lastRows.get(id),
                required: 0,
                remaining: 0,
              },
          )
          .filter((r) => r.name.toLowerCase().includes(query))
      : [];
  $("#collect-count").textContent =
    model.status !== "ok"
      ? "Update tracking before using these counts."
      : `${rows.filter((r) => r.remaining !== 0).length} outstanding item types${rows.some((r) => r.remaining === 0) ? " · collected rows kept in place" : ""}${rows.length > 200 ? " · showing first 200; search to narrow" : ""}`;
  $("#collect-empty").hidden = model.status !== "ok" || rows.length > 0;
  $("#collect-list").innerHTML = rows
    .slice(0, 200)
    .map(
      (r) =>
        `<li data-collect-row="${esc(r.id)}" class="collect-row" data-covered="${r.remaining === 0}"><div class="collect-icon" data-inventory-icon="${esc(r.id)}" data-icon-status="missing"><span aria-label="Icon needed">◇</span></div><div class="collect-name"><a href="/local/?pack=${encodeURIComponent(state.pack.id)}&amp;id=${encodeURIComponent(r.id)}">${esc(r.name)}</a><small>Owned ${r.held == null ? "not entered" : n(r.held)}${r.alternative ? " · Crafting alternative" : ""}${r.partial ? " · Listed / provisional" : ""}</small></div><div class="collect-remaining"><small>Remaining</small><strong data-collect-remaining>${r.minimum && r.remaining != null ? "At least " : ""}${n(r.remaining)}</strong>${r.assumedZero ? "<small>Assumes 0 owned</small>" : ""}</div><form data-collect-add="${esc(r.id)}"><label class="sr-only" for="collect-amount-${esc(r.id)}">Found amount for ${esc(r.name)}</label><input id="collect-amount-${esc(r.id)}" type="text" inputmode="numeric" value="${esc(amounts.get(r.id) ?? "1")}" data-found-amount="${esc(r.id)}" aria-label="Found amount for ${esc(r.name)}"><button type="submit" aria-label="Add found ${esc(r.name)}"${busy ? " disabled" : ""}>+ Add</button></form></li>`,
    )
    .join("");
  $("#collect-undo").hidden = false;
  $("#collect-undo").disabled =
    busy || !undo || undo.revision !== state.revision;
  hydrateInventoryIcons(state.pack);
}
function lock(value) {
  busy = value;
  for (const el of document.querySelectorAll(
    "#collect-list input,#collect-list button,#build-collect input,#build-collect button,#collect-refresh,#collect-hide,#collect-crafting,#collect-undo",
  ))
    el.disabled = value;
}
$("main").addEventListener("input", (event) => {
  if (event.target.dataset.foundAmount) {
    event.target.setCustomValidity("");
    event.target.removeAttribute("aria-invalid");
    amounts.set(event.target.dataset.foundAmount, event.target.value);
  }
});
$("main").addEventListener("submit", async (event) => {
  if (!event.target.matches("form[data-collect-add]")) return;
  event.preventDefault();
  if (busy || state.saving || state.loading) return;
  const id = event.target.dataset.collectAdd;
  if (!ids.includes(id) && !buildIds.has(id)) return;
  const formKey = event.target.dataset.collectKey;
  const raw = event.target.querySelector("input").value,
    y = scrollY;
  let change;
  try {
    change = addFound(state.pack, state.profile, id, raw);
  } catch (reason) {
    const input = event.target.querySelector("input");
    input.setCustomValidity(reason.message || String(reason));
    input.setAttribute("aria-invalid", "true");
    input.reportValidity();
    return;
  }
  lock(true);
  try {
    if (await persist(change.candidate)) {
      undo = {
        id,
        before: change.before,
        after: change.after,
        revision: state.revision,
        pack: state.pack.id,
      };
      amounts.delete(id);
      render();
      const input = formKey
        ? document.querySelector(
            `form[data-collect-key="${CSS.escape(formKey)}"] [data-found-amount="${CSS.escape(id)}"]`,
          )
        : $("#collect-list").querySelector(
            `[data-found-amount="${CSS.escape(id)}"]`,
          );
      input?.focus({ preventScroll: true });
      scrollTo({ top: y });
    }
  } finally {
    lock(false);
    if ($("#collect-undo"))
      $("#collect-undo").disabled = !undo || undo.revision !== state.revision;
  }
});
$("#collect-query").addEventListener("input", render);
$("#collect-crafting").addEventListener("change", fresh);
$("#collect-hide").addEventListener("click", () => {
  identity = null;
  render();
});
$("#collect-refresh").addEventListener("click", async () => {
  if (busy) return;
  try {
    const pack = state.pack;
    const record = await loadProfile(pack.id);
    if (state.pack !== pack) return;
    if (record?.value) {
      state.profile = record.value;
      state.revision = record.value.revision;
    }
    fresh();
  } catch (reason) {
    error(reason);
  }
});
$("#collect-undo").addEventListener("click", async () => {
  if (
    busy ||
    !undo ||
    undo.pack !== state.pack.id ||
    undo.revision !== state.revision ||
    state.profile.inventory[undo.id] !== undo.after
  )
    return;
  const candidate = structuredClone(state.profile);
  if (undo.before === undefined) delete candidate.inventory[undo.id];
  else candidate.inventory[undo.id] = undo.before;
  lock(true);
  try {
    if (await persist(candidate)) {
      undo = null;
      render();
    }
  } finally {
    lock(false);
    $("#collect-undo").disabled = !undo;
  }
});
document.addEventListener("pack-changing", () => {
  identity = null;
  undo = null;
  amounts.clear();
});
async function changeTarget(id, quantity) {
  if (busy || state.saving) return;
  try {
    const candidate = setBuildTarget(state.pack, state.profile, id, quantity);
    lock(true);
    if (await persist(candidate)) {
      undo = null;
      render();
    }
  } catch (reason) {
    error(reason);
  } finally {
    lock(false);
    $("#collect-undo").disabled = !undo;
  }
}
$("main").addEventListener("change", (event) => {
  if (event.target.dataset.buildCount)
    changeTarget(event.target.dataset.buildCount, Number(event.target.value));
});
$("main").addEventListener("click", (event) => {
  const button = event.target.closest("[data-build-remove]");
  if (button) changeTarget(button.dataset.buildRemove, null);
});
installBudgetSetup({
  state,
  persist,
  render: () => {
    identity = null;
    render();
  },
  error,
});
init(render).catch(error);
