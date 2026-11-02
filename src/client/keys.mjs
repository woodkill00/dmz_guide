import { normalizeKeySearch } from "../domain/key-search.mjs";
const form = document.querySelector("#key-filters"),
  search = document.querySelector("#key-search"),
  type = document.querySelector("#key-type"),
  rows = [...document.querySelectorAll("[data-key-row]")];
function filter() {
  const words = normalizeKeySearch(search.value).split(/\s+/).filter(Boolean);
  let visible = 0;
  for (const row of rows) {
    const text = normalizeKeySearch(row.dataset.search);
    row.hidden =
      (!!type.value && type.value !== row.dataset.category) ||
      !words.every((w) => text.includes(w));
    if (!row.hidden) visible++;
  }
  document.querySelector("#key-count").textContent =
    `${visible} of ${rows.length} keys`;
  document.querySelector("#key-empty").hidden = visible !== 0;
}
form.hidden = false;
form.addEventListener("submit", (event) => event.preventDefault());
form.addEventListener("input", filter);
form.addEventListener("change", filter);
form.addEventListener("reset", () => {
  search.value = "";
  type.value = "";
  filter();
});
filter();
