import { resolvePresentation } from "./presentation-config.mjs";
import { primaryHubs, featureHub, featureLabel } from "./workspace-shell.mjs";
import {
  features,
  featureGroups,
  featureURL,
  featureForPage,
} from "./feature-registry.mjs";
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function renderMainNavigation({
  page = "",
  packId = "",
  extra = [],
  surface = "guide",
} = {}) {
  const current = featureForPage(page),
    primary = [
      "home",
      "hajin-map",
      "planner",
      "missions",
      "catalog",
      "settings",
      "search",
    ];
  const labels = {
    "hajin-map": "Map",
    planner: "Prepare",
    missions: "Track",
    catalog: "Reference",
    settings: "Manage",
    search: "Search",
  };
  const link = (f, label = f.label) => {
    const legacyBossWindow=f.id==='boss-checklist'&&['map','help'].includes(surface)&&resolvePresentation(page==='safe-runs'?'safe-runs':'map').variant==='legacy';
    const external = legacyBossWindow ||
      (f.kind !== "guide" &&
        !(f.kind === "map" && ["map", "help"].includes(surface))) ||
      (surface !== "guide" && f.kind === "guide");
    let url = featureURL(f, surface);
    if (packId && surface === "guide" && f.kind === "guide")
      url += "?pack=" + encodeURIComponent(packId);
    return `<a href="${e(url)}" ${page === f.id ? 'aria-current="page" ' : ""}data-feature-id="${e(f.id)}"${page !== "home" && ["planner", "missions", "catalog", "settings", "hajin-map"].includes(f.id) && current?.group === f.group ? ' data-active-group="true"' : ""}${external ? ' target="_blank" rel="noopener noreferrer" title="Opens in a new tab"' : ""}>${e(label)}</a>`;
  };
  const additional = extra
    .filter((p) => !features.some((f) => f.path === p.path))
    .map((p) => ({
      id: p.page,
      label: p.title,
      group: "Reference",
      path: p.path,
      kind: "guide",
    }));
  const rolloutSurface =
    page === "safe-runs" ? "safe-runs" : surface === "help" ? "map" : surface;
  if (resolvePresentation(rolloutSurface).variant === "modern") {
    const activeHub =
        surface === "manager" ? "DMZ Weapons" : featureHub(current),
      modernLink = (f, label = featureLabel(f)) => {
        let markup = link(f, label);
        if (
          primaryHubs.includes(f.id) &&
          activeHub === featureHub(f) &&
          page !== f.id
        )
          markup = markup.replace("<a ", '<a data-active-group="true" ');
        return markup;
      };
    const primaryMarkup = primaryHubs
      .map((id) => modernLink(features.find((f) => f.id === id)))
      .join("");
    return `<nav class="site-nav${surface !== "guide" ? " companion-nav" : ""}" aria-label="Main navigation" data-navigation-surface="${e(surface)}" data-ui-navigation="modern"><details class="ui-mobile-sections"><summary>${e(activeHub === "Tools" ? "Sections" : activeHub)} · Sections</summary><div class="ui-primary-links">${primaryMarkup}</div></details>${modernLink(
      features.find((f) => f.id === "search"),
      "Search",
    )}<details class="nav-more"><summary>Tools · All features</summary><div><input data-navigation-filter hidden type="search" maxlength="100" aria-label="Find a link in this menu" placeholder="Find a workspace…"><button type="button" data-ui-density aria-pressed="false">Compact spacing</button>${["map","help"].includes(surface)?'<button type="button" id="theme-toggle">Light mode</button>':""}${[
      "Map",
      "DMZ Guide",
      "DMZ FOB",
      "DMZ Weapons",
      "Tools",
    ]
      .map(
        (group) =>
          `<section class="nav-menu-group" aria-label="${group}"><p class="nav-group-label">${group}</p>${[
            ...features,
            ...additional,
          ]
            .filter(
              (f) =>
                featureHub(f) === group &&
                !primaryHubs.includes(f.id) &&
                f.id !== "search",
            )
            .map((f) => modernLink(f))
            .join("")}</section>`,
      )
      .join("")}</div></details></nav>`;
  }
  return `<nav class="site-nav${surface !== "guide" ? " companion-nav" : ""}" aria-label="Main navigation" data-navigation-surface="${e(surface)}">${primary
    .map((id) =>
      link(
        features.find((f) => f.id === id),
        labels[id],
      ),
    )
    .join(
      "",
    )}<details class="nav-more"><summary>More · ${e(current && !primary.includes(current.id) ? current.label : "All features")}</summary><div><input data-navigation-filter hidden type="search" maxlength="100" aria-label="Find a link in this menu" placeholder="Find a tool…">${featureGroups
    .map(
      (group) =>
        `<section class="nav-menu-group" aria-label="${group}"><p class="nav-group-label">${group}</p>${[
          ...features,
          ...additional,
        ]
          .filter((f) => f.group === group && !primary.includes(f.id))
          .map((f) => link(f))
          .join("")}</section>`,
    )
    .join("")}</div></details></nav>`;
}
export function renderBreadcrumbs(page, title = "") {
  const f = featureForPage(page);
  return page === "home"
    ? ""
    : `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span>${f ? `<a href="/features/#${f.group.toLowerCase()}">${e(f.group)}</a><span aria-hidden="true">/</span>${title && title !== f.label ? `<a href="${e(featureURL(f))}">${e(f.label)}</a><span aria-hidden="true">/</span><span aria-current="page">${e(title)}</span>` : `<span aria-current="page">${e(f.label)}</span>`}` : "<span>Details</span>"}</nav>`;
}
