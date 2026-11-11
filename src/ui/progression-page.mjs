import { escapeHTML as esc } from "./render.mjs";
const option = (value, label = value) =>
  `<option value="${esc(value)}">${esc(label)}</option>`;
export function featurePages(packs) {
  const pages = [
    {
      path: "/progression/",
      title: "Progression & field guides",
      page: "progression",
      body: `
<header class="page-heading"><p class="eyebrow">SEPARATE TRACKS / CLEAR CHOICES</p><h1>Progress without the spoilers.</h1><p>DMZ Orders, upgrades and campaign are separate. Status-only corrections never consume stock. A separately confirmed purchase record deducts saved pre-purchase stock and tracks recorded usage; nothing triggers a game action.</p></header>
<noscript><p class="notice">Private progress and filters require JavaScript. <a href="/guides/">Read public field guides</a> instead. Spoiler records there use a separate, manual disclosure.</p></noscript>
<section class="profile-toolbar" aria-label="Catalog and private profile"><label>Content pack<select id="pack-select">${packs.map((p) => option(p.id, p.title)).join("")}</select></label>
<button disabled data-startup-disabled id="export-current-profile">Export current private profile</button></section><p id="pack-note" class="notice"></p><p id="save-status" role="status" aria-live="polite"></p><p id="error" role="alert" tabindex="-1" hidden></p>
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
<p id="progress-count" role="status" aria-live="polite" tabindex="-1"></p><p id="progress-limit-note" class="notice" hidden></p><div class="toolbar"><button id="progress-previous">Previous 50 records</button><button id="progress-next">Next 50 records</button></div><div id="progress-rows"></div>
<section id="upgrade-spending-summary" class="panel" aria-labelledby="upgrade-spending-title"></section>
<dialog id="upgrade-progress-confirm" class="panel" aria-labelledby="upgrade-progress-title" aria-describedby="upgrade-progress-target upgrade-progress-reminder"><h2 id="upgrade-progress-title">Confirm manual upgrade progress</h2><p id="upgrade-progress-target"></p><p id="upgrade-progress-reminder">Status-only correction: no stock deduction, refund or spending record. If stock already reflects the purchase, this avoids recording it twice.</p><p>Inventory, cash, reserves, focus goals and watch pins stay unchanged. A correction or undo changes progress only; it never refunds items or erases recorded spending.</p><p id="upgrade-progress-result" role="alert"></p><div class="draft-actions"><button type="button" id="upgrade-progress-apply">Confirm progress change</button><button type="button" id="upgrade-progress-cancel" class="secondary" autofocus>Cancel</button><button type="button" id="upgrade-progress-export" class="secondary" hidden>Export unsaved progress candidate</button></div></dialog>
<section class="panel"><h2>Progress-only reset</h2><button id="progress-reset">Reset manual progress…</button><div id="progress-reset-confirm" role="group" aria-labelledby="progress-reset-target" hidden><p id="progress-reset-target"></p><button id="progress-reset-yes">Confirm progress reset</button><button id="progress-reset-no">Cancel</button></div><p><a href="/settings/">Restore a previous profile snapshot</a></p></section>`,
      scripts: ["/assets/src/client/progression.mjs"],
    },
  ];
  const focused = {
    ...pages[0],
    path: "/upgrades/",
    title: "Upgrades",
    page: "upgrades",
    body: pages[0].body
      .replace("Previous 50 records", "Previous 50 groups")
      .replace("Next 50 records", "Next 50 groups")
      .replace(
        '<div id="progress-rows"></div>',
        '<div id="progress-rows"></div>',
      )
      .replace("Progress without the spoilers.", "Your upgrades, at a glance.")
      .replace(
        "</header>",
        '</header><section class="panel"><div id="upgrade-budget-summary" aria-live="polite"></div><p class="actions"><a id="budget-needed-link" href="/needed/">Needed / remaining items</a><a href="/inventory/">Edit saved inventory</a></p><button id="budget-setup" type="button" disabled data-startup-disabled hidden>Review tracking update</button><details><summary>Completion and remaining items</summary><p>Check off completed upgrades below. Completion changes status only; it never spends inventory. Remaining item amounts use saved stock after reserves. Listed partial costs stay provisional. Use Needed / remaining items for shared totals and ingredient-printing forecasts.</p></details></section>',
      )
      .replace(
        '<div id="progress-rows"></div>',
        `<p id="upgrade-group-explanation" class="notice">Groups match filters when any listed tier matches. Each header keeps the lowest visible listed incomplete tier for context; this is not verified unlock order. Expand Other tiers to inspect earlier/later versions.</p><section class="upgrade-list-shell" aria-label="Upgrade checklist"><div class="upgrade-list-heading"><span>Upgrade</span><span>Completion</span><span>Missing materials</span><span>Readiness</span><span>Track</span><span class="upgrade-details-heading">Details</span></div><div id="progress-rows"></div></section>`,
      )

      .replace(
        '<section class="upgrade-list-shell"',
        `<section class="upgrade-overview-bar" aria-label="Upgrade overview"><p id="upgrade-catalog-summary" role="status"></p><p id="upgrade-feedback" role="status"></p><button type="button" id="upgrade-undo" hidden>Undo last progress change</button></section><div class="upgrade-view-controls"><label>List layout<select id="upgrade-layout"><option value="grouped">Upgrade groups</option><option value="flat">All tiers (flat list)</option></select></label><label>Upgrade view<select id="upgrade-quick"><option value="all">All upgrades</option><option value="incomplete">Not completed</option><option value="tracked">Tracked</option><option value="missing">Missing materials (known shortfalls)</option><option value="review">Needs review / unknown</option></select></label><label>Row spacing<select id="upgrade-density"><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select></label><details><summary>Visible columns</summary><label><input type="checkbox" id="upgrade-show-materials" checked> Materials / missing</label><label><input type="checkbox" id="upgrade-show-readiness" checked> Readiness</label><label><input type="checkbox" id="upgrade-show-evidence" checked> Evidence</label><p>Hidden columns remain available in upgrade Details.</p></details><p id="upgrade-view-note" role="status"></p></div><section class="upgrade-list-shell"`,
      )
      .replace(
        '<form id="progress-filters"',
        '<form data-focused-upgrades="true" id="progress-filters"',
      )
      .replace(
        '<option value="dmz-upgrade">',
        '<option value="dmz-upgrade" selected>',
      ),
  };
  const missions = {
    ...pages[0],
    path: "/missions/",
    title: "Missions",
    page: "missions",
    body: pages[0].body
      .replace("Progress without the spoilers.", "Your missions, in one place.")
      .replace(
        "</header>",
        '</header><section class="panel" aria-labelledby="orders-coverage-title"><h2 id="orders-coverage-title">DMZ Orders pages 1–24</h2><p>Page numbers without a recorded mission remain unrecorded. They do not count as completed. Chapter page numbers may differ by the order you choose chapters; match missions by chapter and name.</p><div id="orders-coverage" class="orders-coverage"></div></section><section class="panel" aria-labelledby="story-workspace-title"><h2 id="story-workspace-title">Story mission workspace</h2><p>Open a recorded story mission below to inspect its sourced steps, requirements, linked records, evidence and your manual completion state. Missing steps remain unrecorded.</p><button type="button" id="show-story-missions">Show story missions</button></section>',
      )
      .replace(
        "<noscript>",
        `<p class="actions"><a href="http://127.0.0.1:5175/?tool=missions" target="_blank" rel="noopener noreferrer">Open map mission tracker ↗</a><a href="/collection/">Review collection needs</a></p><noscript>`,
      )
      .replace(
        '<form id="progress-filters"',
        '<form data-focused-missions="true" id="progress-filters"',
      )
      .replace(
        "DMZ Orders, upgrades and campaign are separate.",
        "DMZ Orders and story missions are shown here. Upgrades and campaign remain separate.",
      ),
  };
  return [...pages, focused, missions].map((page) => ({
    ...page,
    body: page.body.replace(
      '<div id="progress-rows"></div>',
      '<div id="progress-rows" data-ui-directory data-ui-directory-layout="live" data-ui-directory-pagination="false"></div>',
    ),
  }));
}
