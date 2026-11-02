import { normalizeKeySearch } from "../domain/key-search.mjs";
const form = document.querySelector("#key-filters"),
  search = document.querySelector("#key-search"),
  type = document.querySelector("#key-type"),
  locationFilter = document.querySelector("#key-location"),
  groups = [...document.querySelectorAll("[data-key-group]")],
  rows = [...document.querySelectorAll("[data-key-row]")];
function filter() {
  const words = normalizeKeySearch(search.value).split(/\s+/).filter(Boolean);
  let visible = 0;
  const unique = new Set();
  for (const row of rows) {
    const text = normalizeKeySearch(row.dataset.search);
    row.hidden =
      (!!type.value && type.value !== row.dataset.category) ||
      (!!locationFilter.value && locationFilter.value !== row.dataset.group) ||
      !words.every((w) => text.includes(w));
    if (!row.hidden) {
      visible++;
      unique.add(row.dataset.keyId);
    }
  }
  let groupCount = 0;
  for (const group of groups) {
    const shown = [...group.querySelectorAll("[data-key-row]")].filter(
      (row) => !row.hidden,
    );
    group.hidden = shown.length === 0;
    if (!group.hidden) groupCount++;
    const count = new Set(shown.map((row) => row.dataset.keyId)).size;
    group.querySelector("[data-group-count]").textContent =
      `(${count} ${count === 1 ? "key" : "keys"})`;
    if (words.length || type.value || locationFilter.value) group.open = true;
  }
  document.querySelector("#key-count").textContent =
    `${unique.size} of ${new Set(rows.map((row) => row.dataset.keyId)).size} keys · ${visible} matching ${visible === 1 ? "use location" : "use locations"} · ${groupCount} map ${groupCount === 1 ? "area" : "areas"}`;
  document.querySelector("#key-empty").hidden = visible !== 0;
}
form.hidden = false;
form.addEventListener("submit", (event) => event.preventDefault());
form.addEventListener("input", filter);
form.addEventListener("change", filter);
form.addEventListener("reset", () => {
  search.value = "";
  type.value = "";
  locationFilter.value = "";
  groups.forEach((group) => (group.open = true));
  filter();
});
filter();
