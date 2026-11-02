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
  return `<header class="hub-heading"><div><p class="eyebrow">YOUR FIELD DESK</p><h1>Ready for your next run.</h1><p>Find your next task, check what you need, and get back to the map.</p></div><div class="actions"><a class="button primary" href="http://127.0.0.1:5175/" data-feature-id="hajin-map" target="_blank" rel="noopener noreferrer">Open map ↗</a><a class="button secondary" id="hub-continue" href="/planner/">Continue planning</a></div></header><form action="/search/" method="get" class="hub-search"><label for="hub-query">Search everything</label><div class="actions"><input id="hub-query" name="q" type="search" maxlength="200" placeholder="Keys, upgrades, missions, weapons, locations or tools…"><button>Search</button><a href="/search/">Ctrl / ⌘ K</a></div></form><section class="hub-personal" aria-label="Your shortcuts"><div><h2>Pinned tools</h2><p id="hub-preference-status" role="status"></p><div id="hub-pins"><a href="/features/">Choose tools to pin</a></div></div><div><h2>Recent work</h2><div id="hub-recent"><p>Visited workspaces appear here on this device.</p></div></div></section><section class="panel"><h2>Your recorded progress</h2><label>Catalog<select id="hub-pack"><option>Loading catalogs…</option></select></label><p id="hub-progress" role="status">Choose a catalog to read its saved progress. No game progress is detected.</p><p id="hub-key-summary" role="status">Key stash not checked.</p><button id="hub-refresh" type="button">Refresh summaries</button><a href="/settings/">Backups and recovery</a></section><section class="hub-sections" aria-label="Main features">${featureGroups
    .map(
      (group) =>
        `<section id="${group.toLowerCase()}"><h2>${group}</h2><div class="hub-grid">${features
          .filter(
            (f) =>
              f.group === group &&
              !f.id.startsWith("tool-") &&
              ![
                "home",
                "search",
                "features",
                "sitemap",
                "studio",
                "local",
                "community",
                "map-help",
                "weapons",
                "map-workspace",
                "editor",
              ].includes(f.id),
          )
          .map(card)
          .join(
            "",
          )}</div><a href="/features/#${group.toLowerCase()}">All ${group.toLowerCase()} features →</a></section>`,
    )
    .join(
      "",
    )}</section><details class="panel"><summary>Local services</summary><p>Check reachability when a companion will not open. This does not start services or certify application health.</p><button type="button" id="hub-service-check">Check services</button><ul id="hub-services"><li>Guide, map, Studio and update manager: unchecked.</li></ul></details><p class="notice">Progress is your local record. Source coverage and requirements may be incomplete. Separate workspaces keep separate data.</p>`;
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
      body: `<header class="page-heading"><h1>Search everything</h1><p>Public records and tools across the guide. Spoiler records and private notes are excluded. <a href="http://127.0.0.1:5175/?tool=workspace-search" target="_blank" rel="noopener noreferrer">Search the separate map workspace ↗</a>.</p></header><form id="unified-search" class="filter-bar"><label>Search<input id="unified-query" name="q" type="search" maxlength="200"></label><label>Type<select id="unified-type"><option value="">All types</option>${[
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
