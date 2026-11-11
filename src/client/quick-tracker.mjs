const $ = (s) => document.querySelector(s);
const nav = $(".quick-tracker-nav");
if (nav) {
  $("main").classList.add("quick-tracker");
  // Move existing controls rather than making duplicate live forms or storage owners.
  const heading = $(".page-heading");
  if (heading) {
    const explanation = document.createElement("details");
    explanation.className = "tracker-explanation";
    const summary = document.createElement("summary");
    summary.textContent = "About this tracker";
    explanation.append(summary);
    for (const paragraph of [...heading.querySelectorAll("p:not(.eyebrow)")])
      explanation.append(paragraph);
    heading.append(explanation);
  }
  const note = $("#pack-note");
  if (note) {
    const details = document.createElement("details");
    details.className = "tracker-catalog-note";
    const summary = document.createElement("summary");
    summary.textContent = "Catalog coverage and sources";
    note.before(details);
    details.append(summary, note);
  }
  const picker = $(".profile-toolbar");
  if (picker) {
    const context = document.createElement("details");
    context.className = "tracker-context catalog-context";
    const summary = document.createElement("summary");
    summary.textContent = "Data & backup";
    summary.dataset.trackerContextLabel = "";
    nav.append(context);
    context.append(summary, picker);
    const coverage = $(".tracker-catalog-note");
    if (coverage) context.append(coverage);
  }
  const filter =
    $("#inventory-query")?.closest(".filter-bar") || $("#progress-filters");
  if (filter) {
    const ids = $("#inventory-query")
      ? ["inventory-use-filter", "inventory-sort", "inventory-density"]
      : ["progress-source", "progress-status", "progress-state"];
    const details = document.createElement("details");
    details.className = "tracker-more-filters";
    const summary = document.createElement("summary");
    summary.textContent = "More filters";
    details.append(summary);
    const body = document.createElement("div");
    body.className = "tracker-filter-options";
    details.append(body);
    for (const id of ids) {
      const label = $("#" + id)?.closest("label");
      if (label) body.append(label);
    }
    filter.append(details);
    const update = () => {
      const countIds = [
        ...ids,
        ...["upgrade-layout", "upgrade-quick", "upgrade-density"].filter((id) =>
          $("#" + id),
        ),
      ];
      const count = countIds.filter((id) => {
        const input = $("#" + id);
        return input && input.selectedIndex > 0;
      }).length;
      summary.textContent = `More filters${count ? " · " + count + " active" : ""}`;
    };
    filter.addEventListener("change", () => queueMicrotask(update));
    document.addEventListener("tracker-refreshed", update);
    filter.addEventListener("reset", () => queueMicrotask(update));
    filter.addEventListener("click", () => queueMicrotask(update));
    document.addEventListener("profile-saved", () => queueMicrotask(update));
    update();
  }
  const inventoryForm = $("#inventory-form");
  if (inventoryForm && filter) {
    // Keep task controls first; explanatory links and recovery remain available below.
    filter.after(inventoryForm);
    const count = $("#inventory-count");
    const pager = $("#inventory-pagination");
    if (count && pager) pager.prepend(count);
    if (pager) inventoryForm.after(pager);
  }
  if ($("#progress-filters") && document.body.dataset.page === "upgrades") {
    const fixedTrack = $("#progress-track")?.closest("label");
    if (fixedTrack) $(".tracker-filter-options")?.prepend(fixedTrack);
    const spoiler = $("#spoiler-toggle"),
      coverage = spoiler?.nextElementSibling;
    if (spoiler) $(".tracker-explanation")?.append(spoiler);
    if (coverage?.matches(".notice"))
      $(".tracker-explanation")?.append(coverage);
    const viewControls = $(".upgrade-view-controls");
    if (viewControls) $(".tracker-filter-options")?.append(viewControls);
    const groupExplanation = $("#upgrade-group-explanation");
    if (groupExplanation) $(".tracker-explanation")?.append(groupExplanation);
    const budget = $("#upgrade-budget-summary")?.closest(".panel");
    if (budget) {
      budget.classList.add("tracker-budget-panel");
      const options = document.createElement("details");
      options.className = "tracker-budget-details";
      const summary = document.createElement("summary");
      summary.textContent = "Budget options and remaining items";
      options.append(summary);
      for (const child of [...budget.children])
        if (!child.matches("#upgrade-budget-summary,#budget-setup"))
          options.append(child);
      budget.append(options);
    }
  }
  if (document.body.dataset.page === "upgrades") {
    const rows = $(".upgrade-list-shell"),
      pager = $("#progress-previous")?.closest(".toolbar");
    if (rows && pager) rows.after(pager);
    const overview = $(".upgrade-overview-bar");
    if (rows && overview) rows.after(overview);
  }
  if (document.body.dataset.page === "needed") {
    const panel = $("#upgrade-budget-summary")?.closest(".panel");
    if (panel) {
      const details = document.createElement("details"),
        summary = document.createElement("summary");
      summary.textContent = "Budget tools and recipe links";
      details.append(summary);
      const links = document.querySelector(
        'nav[aria-label="Upgrade preparation"]',
      );
      if (links) details.append(links);
      for (const child of [...panel.children])
        if (!child.matches("#upgrade-budget-summary,#budget-setup"))
          details.append(child);
      panel.append(details);
    }
  }
  const budgetPanel = $("#upgrade-budget-summary")?.closest(".panel");
  if (budgetPanel) budgetPanel.classList.add("tracker-budget-panel");
  const titles = {
    inventory: "Inventory",
    upgrades: "Upgrades",
    needed: "Needed / remaining items",
  };
  const title = titles[document.body.dataset.page];
  // Page attributes differ between skins; keep existing accessible headings as fallback.
  if (title && heading?.querySelector("h1"))
    heading.querySelector("h1").textContent = title;
  const syncLinks = () => {
    const pack =
      $("#pack-select")?.value ||
      new URL(location.href).searchParams.get("pack");
    for (const link of nav.querySelectorAll("a")) {
      const url = new URL(link.href);
      if (url.pathname.startsWith("/armory/")) continue;
      if (pack) url.searchParams.set("pack", pack);
      link.href = url.pathname + url.search + url.hash;
    }
  };
  $("#pack-select")?.addEventListener("change", syncLinks);
  syncLinks();
}

export function refreshTrackerContext() {
  if (!nav) return;
  queueMicrotask(() => document.dispatchEvent(new Event("tracker-refreshed")));
  const select = $("#pack-select");
  for (const link of nav.querySelectorAll("a[data-tracker-link]")) {
    const url = new URL(link.href);
    if (url.pathname.startsWith("/armory/")) continue;
    if (select?.value) url.searchParams.set("pack", select.value);
    link.href = url.pathname + url.search + url.hash;
  }
}
export function compactInventoryRows() {
  if (!nav) return;
  for (const entry of document.querySelectorAll(
    ".inventory-entry:not([data-quick-row])",
  )) {
    entry.dataset.quickRow = "true";
    const row = entry.querySelector(".inventory-row"),
      detail = entry.querySelector(".inventory-details");
    const advanced = document.createElement("div");
    advanced.className = "tracker-inventory-math";
    for (const cell of [...row.children]) {
      if (
        cell.matches(
          ".inventory-name,.inventory-item-icon,.owned-cell,.inventory-blueprint,.inventory-build-target,[data-show-use]",
        )
      )
        continue;
      // Combined unfinished requirements stay visible; upgrade-only scopes remain in details.
      if (cell.matches('[data-upgrade-need="collection"]')) continue;
      advanced.append(cell);
    }
    detail.prepend(advanced);
  }
}
export function inventoryDirtyState(dirty) {
  const bar = $(".inventory-save-bar");
  if (!nav || !bar) return;
  bar.dataset.dirty = String(dirty);
  let label = bar.querySelector("[data-tracker-dirty]");
  if (!label) {
    label = document.createElement("span");
    label.dataset.trackerDirty = "";
    label.setAttribute("role", "status");
    bar.prepend(label);
  }
  label.textContent = dirty ? "Unsaved inventory edits" : "Saved inventory";
}
