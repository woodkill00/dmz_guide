import { features, featureURL, navigationConfig } from "./feature-registry.mjs";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// Presentation only: tab identities, labels and destinations come from the shared registry.
export function quickTrackerPage(page) {
  const tabs = navigationConfig.trackerTabs;
  if (page.page !== "planner" && !tabs.some((tab) => tab.id === page.page))
    return page;
  const links = tabs
    .map((tab) => {
      const feature = features.find((row) => row.id === tab.id);
      if (!feature) throw Error("Unknown tracker feature");
      const url = new URL(featureURL(feature), "https://navigation.invalid");
      if (tab.hash) url.hash = tab.hash;
      return `<a href="${e(url.pathname + url.search + url.hash)}" data-tracker-link data-tracker-feature="${e(tab.id)}"${page.page === tab.id ? ' aria-current="page"' : ""}>${e(tab.label)}</a>`;
    })
    .join("");
  return {
    ...page,
    styles: [...(page.styles || []), "/assets/src/ui/quick-tracker.css"],
    body: `<nav class="quick-tracker-nav" aria-label="Quick tracker">${links}</nav>${page.body}`,
  };
}
