import {
  matchesTokens,
  readHomeSearch,
  writeHomeSearch,
} from "../domain/reader-flow.mjs";
const home = document.querySelector(".home-search");
if (home)
  home.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      location.assign(
        writeHomeSearch(document.querySelector("#home-search").value),
      );
    } catch {
      document.querySelector("#home-search-status").textContent =
        "Search transfer unavailable. Open the catalog and enter your search there.";
    }
  });
const form = document.querySelector("#catalog-filters");
if (form) {
  const query = form.querySelector("#catalog-search"),
    type = form.querySelector('[name="type"]'),
    pack = form.querySelector('[name="pack"]'),
    sort = form.querySelector("#catalog-sort");
  const cards = [...document.querySelectorAll("[data-record-card]")];
  const allowed = (field, value) =>
    [...field.options].some((option) => option.value === value);
  function writeURL() {
    const params = new URLSearchParams();
    if (type.value && allowed(type, type.value)) params.set("type", type.value);
    if (allowed(pack, pack.value)) params.set("pack", pack.value);
    if (sort && allowed(sort, sort.value)) params.set("sort", sort.value);
    history.replaceState(
      null,
      "",
      location.pathname + (params.size ? "?" + params : ""),
    );
  }
  function readURL() {
    const params = new URLSearchParams(location.search);
    query.value = (params.get("q") || "").slice(0, 200);
    type.value = allowed(type, params.get("type")) ? params.get("type") : "";
    pack.value = allowed(pack, params.get("pack"))
      ? params.get("pack")
      : form.dataset.defaultPack || "";
    if (sort)
      sort.value = allowed(sort, params.get("sort"))
        ? params.get("sort")
        : "name";
    const token = params.get("search");
    // Strip arbitrary query/token/unknown params even if transfer parsing fails.
    writeURL();
    let transferError = false;
    if (token !== null) {
      try {
        query.value = readHomeSearch(token);
      } catch {
        transferError = true;
        query.value = "";
      }
    }
    filter(false);
    if (transferError)
      document.querySelector("#catalog-count").textContent =
        "Search transfer unavailable. Enter your search here.";
  }
  function filter(update) {
    for (const anchor of document.querySelectorAll(".site-nav a[href]")) {
      const target = new URL(anchor.href, location.href);
      if (pack.value && allowed(pack, pack.value))
        target.searchParams.set("pack", pack.value);
      else target.searchParams.delete("pack");
      anchor.href = target.href;
    }
    if (sort)
      for (const container of document.querySelectorAll(".item-directory")) {
        const rows = [...container.querySelectorAll("[data-record-card]")];
        rows.sort(
          (a, b) =>
            (a.dataset[sort.value] || "").localeCompare(
              b.dataset[sort.value] || "",
            ) || a.dataset.name.localeCompare(b.dataset.name),
        );
        container.append(...rows);
      }
    let count = 0;
    for (const card of cards) {
      const show =
        matchesTokens(card.dataset.search, query.value) &&
        (!type.value || card.dataset.type === type.value) &&
        (!pack.value || card.dataset.pack === pack.value);
      card.hidden = !show;
      if (show) count++;
    }
    for (const section of document.querySelectorAll("[data-catalog-section]"))
      section.hidden = ![
        ...section.querySelectorAll("[data-record-card]"),
      ].some((card) => !card.hidden);
    document.querySelector("#catalog-count").textContent =
      `${count} matching record${count === 1 ? "" : "s"}. Coverage not established.`;
    document.querySelector("#catalog-empty").hidden = count !== 0;
    if (update) writeURL();
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    filter(true);
  });
  form.addEventListener("input", () => filter(true));
  form.addEventListener("change", () => filter(true));
  window.addEventListener("popstate", readURL);
  readURL();
}
