import mapDestinations from "./map-destinations.json" with { type: "json" };
// Authored destinations only. No query/private state crosses application origins.
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const defaults = [
  { path: "/maps/", page: "maps", title: "Maps" },
  { path: "/progression/", page: "progression", title: "Progress" },
  { path: "/editor/", page: "editor", title: "Editor" },
  { path: "/community/", page: "community", title: "Community" },
];
export function renderMainNavigation({
  page = "",
  packId = "",
  extra = defaults,
  surface = "guide",
} = {}) {
  const companion = surface !== "guide";
  const guide = companion ? "http://127.0.0.1:4173" : "";
  const map =
    surface === "map" || surface === "help" ? "" : "http://127.0.0.1:5175";
  const primary = [
    ["/catalog/", "Catalog", "catalog"],
    ["/items/", "Items", "items"],
    ["/planner/", "Planner", "planner"],
    ["/inventory/", "Inventory", "inventory"],
    ["/collection/", "Collect", "collection"],
    ["/upgrades/", "Upgrades", "upgrades"],
    [map + "/?tool=boss-checklist", "Boss checklist", "boss-checklist", "tool"],
  ];
  const secondary = [
    ["/", "Home", "home"],
    ["/weapons/", "Weapons", "weapons"],
    ["/recipes/", "Recipes", "recipes"],
    ["/guides/", "Guides", "guides"],
    ...extra
      .filter((p) => p.page !== "upgrades")
      .map((p) => [
        p.path,
        {
          editor: "Editor",
          maps: "Maps",
          progression: "Progress",
          community: "Community",
        }[p.page] || p.title,
        p.page,
      ]),
    ["/local/", "Private reader", "local"],
    ["/map-workspace/", "Local map workspace", "map-workspace"],
    ["/settings/", "Settings", "settings"],
    [map + "/", "Interactive map", "hajin-map", "map"],
    [map + "/help.html", "Map help", "map-help", "map"],
  ];
  secondary.push(
    surface === "studio"
      ? ["", "Content Studio", "studio", "current"]
      : ["http://127.0.0.1:4174/", "Content Studio", "studio", "external"],
  );
  const tools = mapDestinations.tools.map(([id, label]) => [
    map + "/?tool=" + encodeURIComponent(id),
    label,
    "tool-" + id,
    "tool",
  ]);
  const planner = mapDestinations.planner
    .filter(([id]) => id !== "boss-checklist")
    .map(([id, label]) => [
      map + "/?tool=" + encodeURIComponent(id),
      label,
      "tool-" + id,
      "tool",
    ]);
  const link = ([path, label, key, kind = "guide"]) => {
    if (kind === "current")
      return `<span aria-current="page">${escape(label)}</span>`;
    const href =
      kind === "guide"
        ? guide +
          path +
          (packId && !companion ? "?pack=" + encodeURIComponent(packId) : "")
        : path;
    const newTab =
      kind === "tool" ||
      kind === "external" ||
      (kind === "guide" && companion) ||
      (kind === "map" && surface !== "map" && surface !== "help") ||
      (surface === "map" && key === "map-help");
    return `<a href="${escape(href)}"${page === key ? ' aria-current="page"' : ""}${newTab ? ' target="_blank" rel="noopener noreferrer" title="Opens in a new tab"' : ""} tabindex="0">${escape(label)}</a>`;
  };
  const active = secondary.find(([, , key]) => key === page);
  return `<nav class="site-nav${companion ? " companion-nav" : ""}" aria-label="Main navigation" data-navigation-surface="${escape(surface)}">${primary.map(link).join("")}${link(["/sitemap/", "Site map", "sitemap"])}<details class="nav-more"><summary>More${active ? " · " + escape(active[1]) : ""}</summary><div><section class="nav-menu-group" aria-label="Guide pages and authoring"><p class="nav-group-label">Guide pages &amp; authoring</p>${secondary.map(link).join("")}</section><section class="nav-menu-group" aria-label="Map workspace tools"><p class="nav-group-label">Map workspace tools</p>${tools.map(link).join("")}</section><section class="nav-menu-group" aria-label="Map planning and trackers"><p class="nav-group-label">Map planning &amp; trackers</p>${planner.map(link).join("")}</section></div></details></nav>`;
}
