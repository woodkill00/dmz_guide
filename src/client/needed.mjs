import { collectionBudget } from "../domain/collection-budget.mjs";
import {
  compareInventoryFamilies,
  inventoryTypeLabel,
} from "../domain/inventory-items.mjs";
import { refreshTrackerContext } from "./quick-tracker.mjs";
import {
  groupNeededRows,
  neededCategory,
  setNeededGroups,
} from "./needed-groups.mjs";
import { init, state, $, esc, error, persist } from "./common.mjs";
import { loadProfile } from "../storage/store.mjs";
import { upgradeBudget } from "../domain/upgrade-budget.mjs";
import {
  installBudgetSetup,
  renderBudgetSummary,
} from "./upgrade-budget-setup.mjs";
let model = null,
  page = 0;
const n = (value) =>
  value === null ? "Not entered / unknown" : Number(value).toLocaleString();
// A known positive gap is a shortage; unknown or provisional coverage is never green.
function quantity(value, gap, uncertain = false) {
  const status =
    value !== null && gap !== null && Number.isFinite(gap) && gap > 0
      ? "short"
      : value !== null && gap === 0 && !uncertain
        ? "covered"
        : "review";
  const label = {
    short: "Shortage",
    covered: "Covered",
    review: "Needs review",
  }[status];
  return `<span class="needed-number" data-needed-number="${status}">${n(value)}</span><span class="sr-only"> · ${label}</span>`;
}
function table(headers, rows) {
  return `<table class="needed-table"><thead><tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}
function render() {
  refreshTrackerContext();
  model = upgradeBudget(state.pack, state.profile);
  renderBudgetSummary(state, model);
  const combined = $("#needed-scope").value === "collection";
  const view = combined ? collectionBudget(state.pack, state.profile) : model;
  $("#needed-items-heading").textContent = combined
    ? "Required items and crafting inputs"
    : "Direct upgrade items";
  $("#needed-scope-note").textContent = combined
    ? "Unfinished upgrades and missions, with crafting inputs for missing outputs. Collect an output or its inputs, not both. Manual crafting goals remain in Planner."
    : "Unfinished upgrades only. Missing includes replenishing your protected reserve. Printing forecasts use shared excess stock.";

  const q = $("#needed-query").value.trim().toLowerCase(),
    hide = $("#needed-hide-covered").checked;
  const itemIndex = new Map(state.pack.items.map((item) => [item.id, item]));
  const categoryFor = (id) => neededCategory(state.pack, id, itemIndex);
  const category = $("#needed-category"),
    selected = category.value;
  const categories = [
    ...new Set(
      [...view.items, ...(combined ? [] : model.printInputs)].map((row) =>
        categoryFor(row.id),
      ),
    ),
  ].sort(compareInventoryFamilies);
  category.innerHTML =
    '<option value="">All categories</option>' +
    categories
      .map(
        (name) =>
          `<option value="${esc(name)}">${esc(inventoryTypeLabel(name))}</option>`,
      )
      .join("");
  category.value = categories.includes(selected) ? selected : "";
  const rows = view.items.filter(
    (r) =>
      (!hide || r.missing !== 0) &&
      (!category.value || categoryFor(r.id) === category.value) &&
      [r.name, ...r.contributors].join(" ").toLowerCase().includes(q),
  );
  page = Math.max(
    0,
    Math.min(page, Math.max(0, Math.ceil(rows.length / 50) - 1)),
  );
  $("#needed-count").textContent =
    view.status === "ok"
      ? `${rows.length} matching item types · page ${page + 1} of ${Math.max(1, Math.ceil(rows.length / 50))}`
      : "Calculation paused until tracking is updated.";
  if (combined) {
    $("#needed-list").innerHTML = rows.length
      ? table(
          [
            "Item / unit",
            "Required",
            "Saved owned",
            "Protected reserve",
            "Remaining",
            "Consumed requirements",
            "Retained tool floor",
          ],
          rows
            .slice(page * 50, page * 50 + 50)
            .map(
              (r) =>
                `<tr data-needed-item="${esc(r.id)}"><th scope="row"><a href="/local/?pack=${encodeURIComponent(state.pack.id)}&id=${encodeURIComponent(r.id)}">${esc(r.name)}</a><small>${esc(r.unit)}${r.craft ? " - crafting ingredient" : ""}${r.partial ? " - partial / unknown" : ""}</small><details><summary>Required by ${r.contributors.length} references</summary><p>${r.contributors.map(esc).join(", ")}</p></details></th><td data-needed-required>${r.required == null && r.knownRequired > 0 ? "At least " + quantity(r.knownRequired, r.missing, true) : quantity(r.required, r.missing, r.partial)}</td><td data-needed-held>${quantity(r.held, r.missing, r.partial)}</td><td>${n(r.reserve)}</td><td data-needed-missing>${r.lowerBound ? "At least " : ""}${quantity(r.missing, r.missing, r.partial)}</td><td>${n(r.consumed)}</td><td>${n(r.retained)}</td></tr>`,
            ),
        )
      : "<p>No matching unfinished requirements. Unknown or unlisted costs are not zero.</p>";
  } else {
    $("#needed-list").innerHTML = rows.length
      ? table(
          [
            "Item / unit",
            "Listed needed",
            "Saved owned",
            "Protected",
            "Remaining",
            "Shared print forecast",
            "Still to collect",
          ],
          rows
            .slice(page * 50, page * 50 + 50)
            .map(
              (r) =>
                `<tr data-needed-item="${esc(r.id)}"><th scope="row"><a href="/local/?pack=${encodeURIComponent(state.pack.id)}&id=${encodeURIComponent(r.id)}">${esc(r.name)}</a><small>${esc(r.unit)}${r.partial || r.unknown ? " · partial / provisional" : ""}</small><details><summary>Used by ${r.contributors.length} upgrades</summary><p>${r.contributors.map(esc).join(", ")}</p></details></th><td data-needed-required>${quantity(r.required, r.missing, r.partial || r.unknown)}</td><td data-needed-held>${quantity(r.held, r.missing, r.partial || r.unknown)}</td><td>${n(r.reserve)}</td><td data-needed-missing>${quantity(r.missing, r.missing, r.partial || r.unknown)}</td><td data-needed-printable>${quantity(r.printable, r.afterPrint, r.printable === null || r.partial || r.unknown)}<small>${esc(r.printReason)}</small>${r.printCosts.length ? `<details><summary>Per print</summary><ul>${r.printCosts.map((c) => `<li>${esc(c.name)}: ${n(c.quantity)}</li>`).join("")}</ul></details>` : ""}</td><td data-needed-after>${quantity(r.afterPrint, r.afterPrint, r.printable === null || r.partial || r.unknown)}</td></tr>`,
            ),
        )
      : "<p>No matching outstanding items. Unknown catalog costs are not evidence of zero cost.</p>";
  }
  groupNeededRows(state.pack, state.profile);
  $("#needed-prev").disabled = page === 0;
  $("#needed-next").disabled = (page + 1) * 50 >= rows.length;
  const inputs = (combined ? [] : model.printInputs).filter(
    (r) =>
      r.required > 0 &&
      (!category.value || categoryFor(r.id) === category.value),
  );
  $("#needed-print-inputs").innerHTML = inputs.length
    ? table(
        [
          "Input / unit",
          "For all shortage prints",
          "Saved excess after direct needs",
          "Still needed",
        ],
        inputs.map(
          (r) =>
            `<tr data-needed-print-input="${esc(r.id)}"><th scope="row">${esc(r.name)}<small>${esc(r.unit)}</small></th><td>${quantity(r.required, r.missing)}</td><td>${quantity(r.available, r.missing)}</td><td>${quantity(r.missing, r.missing)}</td></tr>`,
        ),
      )
    : combined
      ? "<p>Switch to Upgrades for the upgrade-only shared printing forecast. This collection view already lists recipe inputs as alternatives to finding missing outputs; no stock is spent.</p>"
      : "<p>No unlocked shortage prints with known amounts. Complete the relevant ingredient-printing upgrade and enter your stock to calculate them.</p>";
  groupNeededRows(state.pack, state.profile, { inputs: true });
}
for (const id of [
  "needed-query",
  "needed-hide-covered",
  "needed-category",
  "needed-scope",
])
  $("#" + id).addEventListener(
    id === "needed-query" ? "input" : "change",
    () => {
      page = 0;
      render();
    },
  );
$("#needed-expand").addEventListener("click", () => setNeededGroups(true));
$("#needed-collapse").addEventListener("click", () => setNeededGroups(false));
for (const [id, delta] of [
  ["needed-prev", -1],
  ["needed-next", 1],
])
  $("#" + id).addEventListener("click", () => {
    page += delta;
    render();
  });
$("#needed-refresh").addEventListener("click", async () => {
  if (state.loading || state.saving) return;
  const pack = state.pack;
  try {
    const saved = await loadProfile(pack.id);
    if (state.pack !== pack) return;
    if (saved?.value) {
      state.profile = saved.value;
      state.revision = saved.value.revision;
    }
    render();
  } catch (cause) {
    error(cause);
  }
});
installBudgetSetup({ state, persist, render, error });
init(render).catch(error);
