import { dashboardShell } from "./dashboard-page.mjs";
import { features, featureGroups, featureURL } from "./feature-registry.mjs";
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const card = (f) =>
  `<article class="hub-card" data-feature-card data-search="${e([f.label, f.group, f.description].join(" ").toLowerCase())}"><div><span class="eyebrow">${e(f.group)}</span><h3><a data-feature-id="${f.id}" href="${e(featureURL(f))}"${f.kind !== "guide" ? ' target="_blank" rel="noopener noreferrer"' : ""}>${e(f.label)}${f.kind !== "guide" ? " ↗" : ""}</a></h3><p>${e(f.description)}</p></div><button type="button" data-pin-feature="${f.id}" aria-label="Pin ${e(f.label)}" aria-pressed="false" hidden>☆</button></article>`;
export function renderDashboard() {
  const quick = [
    "quick-collect",
    "inventory",
    "upgrades",
    "missions",
    "safe-runs",
    "loot-runs",
    "keys",
  ]
    .map((id) => {
      const feature = features.find((f) => f.id === id);
      return `<a href="${e(featureURL(feature))}" data-feature-id="${id}"${feature.kind !== "guide" ? ' target="_blank" rel="noopener noreferrer"' : ""}>${e(id === "safe-runs" ? "Safe Run map" : id === "missions" ? "Orders" : feature.label)}</a>`;
    })
    .join(" · ");
  return `<header class="hub-heading"><div><p class="eyebrow">YOUR FIELD DESK</p><h1>Ready for your next run.</h1><p>Your items, plans and progression at a glance.</p></div><div class="actions"><a class="button primary" href="/map/" data-feature-id="hajin-map" target="_blank" rel="noopener noreferrer">Open map ↗</a><a href="/dmz-guide/" data-feature-id="dmz-guide">DMZ Guide</a><a href="/dmz-fob/" data-feature-id="dmz-fob">DMZ FOB</a><a href="/dmz-weapons/" data-feature-id="dmz-weapons">DMZ Weapons</a><a id="hub-continue" href="/run-plan/">Prepare next run</a></div></header><div class="dash-quick-tools" aria-label="Quick tools">${quick}</div><form action="/search/" method="get" class="hub-search"><label for="hub-query">Search everything</label><div class="actions"><input id="hub-query" name="q" type="search" maxlength="200" placeholder="Items, missions, upgrades, weapons…"><button>Search</button></div></form>${dashboardShell()}<section class="hub-personal" aria-label="Your shortcuts"><div><h2>Pinned tools</h2><p id="hub-preference-status" role="status"></p><div id="hub-pins"></div><p><a href="/features/">Choose tools to pin · All features</a></p></div><div><h2>Recent work</h2><div id="hub-recent"></div></div></section><details class="panel"><summary>Local services</summary><button id="hub-service-check" type="button">Check services</button><ul id="hub-services"><li>Services unchecked.</li></ul><p id="hub-key-summary" role="status">Open Keys to review your stash.</p><a href="/keys/">Keys</a> · <a href="/sitemap/">Site map</a> · <a href="/missions/audit/">Mission audit</a></details>`;
}
export function featurePages() {
  return [
    {
      path: "/features/",
      title: "All features",
      page: "features",
      body: `<header class="page-heading"><h1>All features</h1><p>Every workspace and map tool, organized around your next task. ↗ opens a companion.</p></header><label>Find a feature<input id="feature-query" type="search" maxlength="100"></label><p id="feature-count" role="status"></p>${featureGroups
        .map(
          (group) =>
            `<section id="${group.toLowerCase()}" data-feature-group><h2>${group}</h2><div class="hub-grid">${features
              .filter((f) => f.group === group)
              .map(card)
              .join("")}</div></section>`,
        )
        .join("")}`,
      scripts: ["/assets/src/client/hub.mjs"],
    },
    {
      path: "/search/",
      title: "Search everything",
      page: "search",
      body: `<header class="page-heading"><h1>Search everything</h1><p>Public records and tools across the guide. Spoiler records and private notes are excluded. <a href="/map/?tool=workspace-search" target="_blank" rel="noopener noreferrer">Search the separate map workspace ↗</a>.</p></header><form id="unified-search" class="filter-bar"><label>Search<input id="unified-query" name="q" type="search" maxlength="200"></label><label>Type<select id="unified-type"><option value="">All types</option>${[
        "feature",
        "key",
        "weapon",
        "attachment",
        "item",
        "recipe",
        "upgrade",
        "mission",
        "progression",
        "guide",
        "location",
        "map",
      ]
        .map((t) => `<option>${t}</option>`)
        .join(
          "",
        )}</select></label><button>Search</button></form><p id="unified-status" role="status">Loading public search index…</p><div id="unified-results"></div><button id="unified-more" type="button" hidden>Show next 100</button><noscript><a href="/features/">Browse all features</a> or <a href="/catalog/">browse the catalog</a>.</noscript>`,
      scripts: ["/assets/src/client/unified-search.mjs"],
    },
  ];
}
