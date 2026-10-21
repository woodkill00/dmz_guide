import { escapeHTML as esc } from "./render.mjs";
const option = (value, label = value) =>
  `<option value="${esc(value)}">${esc(label)}</option>`;
export function featurePages(packs) {
  return [
    {
      path: "/progression/",
      title: "Progression & field guides",
      page: "progression",
      body: `
<header class="page-heading"><p class="eyebrow">SEPARATE TRACKS / CLEAR CHOICES</p><h1>Progress without the spoilers.</h1><p>DMZ Orders, upgrades and campaign are separate. Manual completion never consumes your inventory or proves a game unlock.</p></header>
<noscript><p class="notice">Private progress and filters require JavaScript. <a href="/guides/">Read public field guides</a> instead. Spoiler records there use a separate, manual disclosure.</p></noscript>
<label>Content pack<select id="pack-select">${packs.map((p) => option(p.id, p.title)).join("")}</select></label>
<button id="export-current-profile">Export current private profile</button><p id="pack-note" class="notice"></p><p id="save-status" role="status" aria-live="polite"></p><p id="error" role="alert" tabindex="-1" hidden></p>
<form id="progress-filters" class="filter-bar">
<label>Track<select id="progress-track">${option("", "All tracks (not a shared unlock system)")}${[
        ["dmz-order", "DMZ Orders"],
        ["dmz-upgrade", "DMZ upgrades"],
        ["dmz-story", "DMZ story"],
        ["progression", "Progression"],
        ["campaign", "Campaign"],
        ["crafting", "Crafting guides"],
        ["weapons", "Weapon guides"],
        ["orders", "Order guides"],
        ["getting-started", "Getting started"],
        ["locations", "Location guides"],
        ["contributing", "Contributing"],
      ]
        .map(([v, l]) => option(v, l))
        .join("")}</select></label>
<label>Search visible records<input id="progress-query" type="search"></label>
<label>Source<select id="progress-source">${option("", "All visible sources")}</select></label>
<label>Evidence status<select id="progress-status">${option("", "All evidence statuses")}${["verified", "observed", "unverified", "unknown", "disputed", "stale", "fictional"].map((s) => option(s, s === "verified" ? "Source-backed (live build unverified)" : s)).join("")}</select></label>
<label>Manual progress<select id="progress-state">${option("", "All manual states")}${["unknown", "locked", "unlocked", "completed"].map((s) => option(s)).join("")}${option("not-applicable", "Guides (no completion state)")}</select></label>
<button type="submit">Filter</button><button type="button" id="progress-clear">Clear filters</button></form>
<button id="spoiler-toggle" aria-pressed="false">Reveal spoilers</button><p class="notice">Coverage is incomplete. Missing mission records are unknown, not completed. Source-backed does not mean live-build verified. A manual state is your report, not verified readiness.</p>
<p id="progress-count" role="status" aria-live="polite" tabindex="-1"></p><p id="progress-limit-note" class="notice" hidden></p><div class="toolbar"><button id="progress-previous">Previous 50 records</button><button id="progress-next">Next 50 records</button></div><div id="progress-rows"></div>
<section class="panel"><h2>Progress-only reset</h2><button id="progress-reset">Reset manual progress…</button><div id="progress-reset-confirm" role="group" aria-labelledby="progress-reset-target" hidden><p id="progress-reset-target"></p><button id="progress-reset-yes">Confirm progress reset</button><button id="progress-reset-no">Cancel</button></div><p><a href="/settings/">Restore a previous profile snapshot</a></p></section>`,
      scripts: ["/assets/src/client/progression.mjs"],
    },
  ];
}
