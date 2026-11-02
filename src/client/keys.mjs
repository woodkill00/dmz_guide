import { normalizeKeySearch } from "../domain/key-search.mjs";
import { keyStock } from "../domain/key-workspace.mjs";
import { mountKeyWorkspace } from "./key-workspace-ui.mjs";
const form = document.querySelector("#key-filters"),
  search = document.querySelector("#key-search"),
  type = document.querySelector("#key-type"),
  locationFilter = document.querySelector("#key-location"),
  view = document.querySelector("#key-view"),
  groups = [...document.querySelectorAll("[data-key-group]")],
  rows = [...document.querySelectorAll("[data-key-row]")];
let workspace;
function filter(preserveActive = false) {
  if (!form) return;
  const words = normalizeKeySearch(search.value).split(/\s+/).filter(Boolean),
    state = workspace?.getState(),
    selected = workspace?.isReady() ? view.value : "all";
  let visible = 0;
  const unique = new Set();
  for (const row of rows) {
    const stock = state ? keyStock(state, row.dataset.keyId) : null,
      text = normalizeKeySearch(
        row.dataset.search + " " + (stock?.notes || ""),
      ),
      readiness = workspace?.readiness(
        row.querySelector("[data-target-use]")?.dataset.targetUse,
      );
    let matches =
      (!type.value || type.value === row.dataset.category) &&
      (!locationFilter.value || locationFilter.value === row.dataset.group) &&
      words.every((w) => text.includes(w));
    if (selected === "owned") matches &&= stock.quantity > 0;
    if (selected === "ready") matches &&= readiness?.state === "recorded-ready";
    if (selected === "missing") matches &&= readiness?.state === "missing";
    if (selected === "favorites")
      matches &&= state.favorites.includes(row.dataset.keyId);
    if (selected === "unopened")
      matches &&= !state.openedUseIds.includes(
        row.querySelector("[data-target-use]")?.dataset.targetUse,
      );
    const editing =
      preserveActive &&
      row.contains(document.activeElement) &&
      document.activeElement.matches(
        "[data-private-field],[data-key-action],[data-target-use],[data-opened-use]",
      );
    row.hidden = !matches && !editing;
    if (!row.hidden) {
      visible++;
      unique.add(row.dataset.keyId);
    }
  }
  let count = 0;
  for (const group of groups) {
    const shown = [...group.querySelectorAll("[data-key-row]")].filter(
      (row) => !row.hidden,
    );
    group.hidden = !shown.length;
    if (!group.hidden) count++;
    const n = new Set(shown.map((row) => row.dataset.keyId)).size;
    group.querySelector("[data-group-count]").textContent =
      `(${n} ${n === 1 ? "key" : "keys"})`;
    if (
      words.length ||
      type.value ||
      locationFilter.value ||
      selected !== "all"
    )
      group.open = true;
  }
  document.querySelector("#key-count").textContent =
    `${unique.size} of ${new Set(rows.map((row) => row.dataset.keyId)).size} keys · ${visible} matching ${visible === 1 ? "use location" : "use locations"} · ${count} map ${count === 1 ? "area" : "areas"}`;
  document.querySelector("#key-empty").hidden = !!visible;
}
workspace = mountKeyWorkspace(() => filter(true));
if (form) {
  form.hidden = false;
  const menu = document.querySelector("#key-filter-menu");
  if (menu && matchMedia("(max-width:600px)").matches) menu.open = false;
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("input", () => filter());
  form.addEventListener("change", () => filter());
  form.addEventListener("reset", (event) => {
    event.preventDefault();
    search.value = "";
    type.value = "";
    locationFilter.value = "";
    view.value = "all";
    groups.forEach((group) => (group.open = true));
    filter();
  });
  document.addEventListener("focusout", (event) => {
    const row = event.target.closest("[data-key-row]");
    if (row && !row.contains(event.relatedTarget))
      queueMicrotask(() => filter());
  });
  filter();
}
