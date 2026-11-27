import { renderWorkspaceTools } from "./site-tools.mjs";
import {
  navigationConfig,
  navigationGroup,
  validateNavigationConfig,
} from "./navigation-config.mjs";
import { resolvePresentation } from "./presentation-config.mjs";
import { featureHub, featureLabel } from "./workspace-shell.mjs";
import {
  features as registeredFeatures,
  featureGroups,
  featureURL,
  featureForPage,
} from "./feature-registry.mjs";
// Stable compatibility identities remain available to saved shortcuts and the
// feature directory, but the navigation exposes one weapon workspace entry.
const features = registeredFeatures.filter(
  (f) =>
    ![
      "weapons",
      "armory-workbench",
      "weapon-acquisition",
      "weapon-camos",
    ].includes(f.id),
);
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function navigationHref(
  feature,
  { surface = "guide", mapBase, packId = "" } = {},
) {
  let url = featureURL(feature, surface, { mapBase });
  if (packId && surface === "guide" && feature.kind === "guide") {
    const destination = new URL(url, "https://navigation.invalid");
    destination.searchParams.set("pack", packId);
    url = destination.pathname + destination.search + destination.hash;
  }
  return url;
}
export function renderMainNavigation({
  page = "",
  packId = "",
  extra = [],
  surface = "guide",
  mapBase,
  navigation = navigationConfig,
} = {}) {
  let current = featureForPage(page);
  validateNavigationConfig(navigation);
  const primary = navigation.primary.map((entry) => entry.id);
  const labels = Object.fromEntries(
    navigation.primary.map((entry) => [entry.id, entry.label]),
  );
  const link = (f, label = f.label) => {
    const legacyBossWindow =
      f.id === "boss-checklist" &&
      ["map", "help"].includes(surface) &&
      resolvePresentation(page === "safe-runs" ? "safe-runs" : "map")
        .variant === "legacy";
    const external =
      legacyBossWindow ||
      (f.kind !== "guide" &&
        !(f.kind === "map" && ["map", "help"].includes(surface))) ||
      (surface !== "guide" && f.kind === "guide");
    const url = navigationHref(f, { surface, mapBase, packId });
    return `<a href="${e(url)}" ${page === f.id ? 'aria-current="page" ' : ""}data-feature-id="${e(f.id)}"${page !== "home" && ["planner", "missions", "catalog", "settings", "hajin-map"].includes(f.id) && current?.group === f.group ? ' data-active-group="true"' : ""}${external ? ' target="_blank" rel="noopener noreferrer" title="Opens in a new tab"' : ""}>${e(label)}</a>`;
  };
  const additional = extra
    .filter((p) => !features.some((f) => f.path === p.path))
    .map((p) => ({
      id: p.page,
      label: p.title,
      group: p.page === "run-plan" ? "Prepare" : "Reference",
      path: p.path,
      kind: "guide",
    }));
  if (!current) current = additional.find((f) => f.id === page);
  const rolloutSurface =
    page === "safe-runs" ? "safe-runs" : surface === "help" ? "map" : surface;
  if (resolvePresentation(rolloutSurface).variant === "modern") {
    const activeHub =
        surface === "manager" ? "DMZ Weapons" : featureHub(current),
      activeHubLabel =
        navigation.hubs.find((hub) => hub.key === activeHub)?.label ||
        labels[current?.id] ||
        activeHub,
      modernLink = (f, label = featureLabel(f, navigation)) => {
        let markup = link(f, label);
        if (
          navigation.modernPrimary.includes(f.id) &&
          activeHub === featureHub(f) &&
          page !== f.id
        )
          markup = markup.replace("<a ", '<a data-active-group="true" ');
        return markup;
      };
    const primaryMarkup = navigation.modernPrimary
      .map((id) => modernLink(features.find((f) => f.id === id)))
      .join("");
    return `<nav class="site-nav${surface !== "guide" ? " companion-nav" : ""}" aria-label="Main navigation" data-navigation-surface="${e(surface)}" data-ui-navigation="modern"><details class="ui-mobile-sections"><summary>${e(activeHub === "Tools" ? "Sections" : activeHubLabel)} · Sections</summary><div class="ui-primary-links">${primaryMarkup}</div></details>${modernLink(
      features.find((f) => f.id === "search"),
      labels.search,
    )}<details class="nav-more"><summary>${e(navigation.hubs.find((hub) => hub.key === "Tools").label)} · All features</summary><div><input data-navigation-filter hidden type="search" maxlength="100" aria-label="Find a link in this menu" placeholder="Find a workspace…"><button type="button" data-ui-density aria-pressed="false">Compact spacing</button>${["map", "help"].includes(surface) ? '<button type="button" id="theme-toggle">Light mode</button>' : ""}${navigation.hubs
      .map(
        (group) =>
          `<section class="nav-menu-group" data-navigation-hub="${e(group.key)}" aria-label="${e(group.label)}"><p class="nav-group-label">${e(group.label)}</p>${[
            ...features,
            ...additional,
          ]
            .filter(
              (f) =>
                featureHub(f) === group.key &&
                !navigation.modernPrimary.includes(f.id) &&
                f.id !== "search",
            )
            .map((f) => modernLink(f))
            .join("")}</section>`,
      )
      .join(
        "",
      )}</div></details>${renderWorkspaceTools({ surface, mapBase })}</nav>`;
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
        `<section class="nav-menu-group" data-navigation-group="${e(group)}" aria-label="${e(navigationGroup(group, navigation).label)}"><p class="nav-group-label">${e(navigationGroup(group, navigation).label)}</p>${[
          ...features,
          ...additional,
        ]
          .filter((f) => f.group === group && !primary.includes(f.id))
          .map((f) => link(f))
          .join("")}</section>`,
    )
    .join(
      "",
    )}</div></details>${renderWorkspaceTools({ surface, mapBase })}</nav>`;
}
export function renderBreadcrumbs(
  page,
  title = "",
  navigation = navigationConfig,
) {
  const f = featureForPage(page);
  return page === "home"
    ? ""
    : page === "run-plan"
      ? `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${e(featureURL(features.find((f) => f.id === "home")))}">${e(navigation.primary.find((f) => f.id === "home").label)}</a><span aria-hidden="true">/</span><a href="${e(featureURL(features.find((f) => f.id === "dmz-fob")))}">${e(navigationGroup("Prepare", navigation).label)}</a><span aria-hidden="true">/</span><span aria-current="page">${e(title || "Next run plan")}</span></nav>`
      : `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${e(featureURL(features.find((f) => f.id === "home")))}">${e(navigation.primary.find((f) => f.id === "home").label)}</a><span aria-hidden="true">/</span>${f ? `<a href="${e(featureURL(features.find((f) => f.id === "features")))}#${e(navigationGroup(f.group, navigation).id)}">${e(navigationGroup(f.group, navigation).label)}</a><span aria-hidden="true">/</span>${title && title !== f.label ? `<a href="${e(featureURL(f))}">${e(f.label)}</a><span aria-hidden="true">/</span><span aria-current="page">${e(title)}</span>` : `<span aria-current="page">${e(f.label)}</span>`}` : "<span>Details</span>"}</nav>`;
}
