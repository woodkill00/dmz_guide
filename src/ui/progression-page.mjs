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
<header class="page-heading"><p class="eyebrow">SEPARATE TRACKS / CLEAR CHOICES</p><h1>Progress without the spoilers.</h1><p>DMZ Orders, upgrades and campaign are separate. Status-only corrections never consume stock. A separately confirmed purchase record deducts saved pre-purchase stock and tracks recorded usage; nothing triggers a game action.</p></header>
<noscript><p class="notice">Private progress and filters require JavaScript. <a href="/guides/">Read public field guides</a> instead. Spoiler records there use a separate, manual disclosure.</p></noscript>
<label>Content pack<select id="pack-select">${packs.map((p) => option(p.id, p.title)).join("")}</select></label>
<button disabled data-startup-disabled id="export-current-profile">Export current private profile</button><p id="pack-note" class="notice"></p><p id="save-status" role="status" aria-live="polite"></p><p id="error" role="alert" tabindex="-1" hidden></p>
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
<label>Manual progress<select id="progress-state">${option("", "All manual states")}${option("not-completed", "Upgrades: Not marked complete")}${["unknown", "incomplete", "locked", "unlocked", "completed"].map((s) => option(s)).join("")}${option("not-applicable", "Guides (no completion state)")}</select></label>
<button type="submit">Filter</button><button type="button" id="progress-clear">Clear filters</button></form>
<button id="spoiler-toggle" aria-pressed="false">Reveal spoilers</button><p class="notice">Coverage is incomplete. Missing mission records are unknown, not completed. Source-backed does not mean live-build verified. A manual state is your report, not verified readiness.</p>
<section id="upgrade-spending-summary" class="panel" aria-labelledby="upgrade-spending-title"></section>
<p id="progress-count" role="status" aria-live="polite" tabindex="-1"></p><p id="progress-limit-note" class="notice" hidden></p><div class="toolbar"><button id="progress-previous">Previous 50 records</button><button id="progress-next">Next 50 records</button></div><div id="progress-rows"></div>
<dialog id="upgrade-progress-confirm" class="panel" aria-labelledby="upgrade-progress-title" aria-describedby="upgrade-progress-target upgrade-progress-reminder"><h2 id="upgrade-progress-title">Confirm manual upgrade progress</h2><p id="upgrade-progress-target"></p><p id="upgrade-progress-reminder">Status-only correction: no stock deduction, refund or spending record. If stock already reflects the purchase, this avoids recording it twice.</p><p>Inventory, cash, reserves, focus goals and watch pins stay unchanged. A correction or undo changes progress only; it never refunds items or erases recorded spending.</p><p id="upgrade-progress-result" role="alert"></p><div class="draft-actions"><button type="button" id="upgrade-progress-apply">Confirm progress change</button><button type="button" id="upgrade-progress-cancel" class="secondary" autofocus>Cancel</button><button type="button" id="upgrade-progress-export" class="secondary" hidden>Export unsaved progress candidate</button></div></dialog>
<section class="panel"><h2>Progress-only reset</h2><button id="progress-reset">Reset manual progress…</button><div id="progress-reset-confirm" role="group" aria-labelledby="progress-reset-target" hidden><p id="progress-reset-target"></p><button id="progress-reset-yes">Confirm progress reset</button><button id="progress-reset-no">Cancel</button></div><p><a href="/settings/">Restore a previous profile snapshot</a></p></section>`,
      scripts: ["/assets/src/client/progression.mjs"],
    },
  ];
}
