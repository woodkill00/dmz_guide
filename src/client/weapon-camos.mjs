const query = document.querySelector("#camo-overview")
    ? null
    : document.querySelector("[data-camo-query]"),
  category = document.querySelector("[data-camo-class]");
function filter() {
  let visible = 0;
  for (const row of document.querySelectorAll("[data-camo-weapon]")) {
    row.hidden = !(
      row.dataset.search.includes(query.value.trim().toLowerCase()) &&
      (!category.value || row.dataset.class === category.value)
    );
    if (!row.hidden) visible++;
  }
  document.querySelector("[data-camo-count]").textContent =
    `${visible} weapons`;
  document.querySelector("[data-camo-empty]").hidden = visible > 0;
}
query?.addEventListener("input", filter);
if (query) category?.addEventListener("change", filter);
query?.form?.addEventListener("submit", (event) => event.preventDefault());
query?.form?.addEventListener("reset", () => setTimeout(filter, 0));
// A fast native navigation can expose the input before this module finishes.
// Apply its current value so an early keystroke is never lost.
if (query) filter();
function fail(image) {
  image.hidden = true;
  const fallback = image
    .closest(".camo-swatch, .camo-tile-image")
    ?.querySelector(".camo-image-fallback");
  if (fallback) fallback.textContent = "Image unavailable locally";
  image
    .closest(".camo-swatch, .camo-tile-image")
    ?.classList.add("camo-art-missing");
}
document.addEventListener(
  "error",
  (event) => {
    if (event.target?.matches?.("[data-camo-image]")) fail(event.target);
  },
  true,
);
for (const image of document.querySelectorAll("[data-camo-image]"))
  if (image.complete && !image.naturalWidth) fail(image);
