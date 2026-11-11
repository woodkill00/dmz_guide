import { escapeHTML as e } from "./render.mjs";
export function featurePages(packs) {
  return [
    {
      path: "/quick-collect/",
      page: "quick-collect",
      title: "Quick collect",
      scripts: ["/assets/src/client/quick-collect.mjs"],
      body: `<header class="page-heading"><h1>Quick collect</h1><p>What is still needed. Add finds straight to your inventory.</p></header><section class="profile-toolbar"><label>Content pack<select id="pack-select" disabled data-startup-disabled>${packs.map((p) => `<option value="${e(p.id)}">${e(p.title)}</option>`).join("")}</select></label><button type="button" id="export-current-profile" disabled data-startup-disabled>Export current private profile</button></section><p id="pack-note" class="notice"></p><p id="save-status" role="status"></p><p id="error" role="alert" hidden tabindex="-1"></p><div id="upgrade-budget-summary"></div><button type="button" id="budget-setup" hidden disabled data-startup-disabled>Review tracking update</button><div class="filter-bar"><label>Find item<input id="collect-query" type="search" maxlength="200" disabled data-startup-disabled></label><label><input id="collect-crafting" type="checkbox" disabled data-startup-disabled> Include crafting alternatives</label><button id="collect-hide" type="button" disabled data-startup-disabled>Hide collected</button><button id="collect-refresh" type="button" disabled data-startup-disabled>Refresh inventory</button><button id="collect-undo" type="button" hidden disabled data-startup-disabled>Undo last add</button></div><p class="collect-help">Amounts use unfinished upgrades and missions, after saved stock and reserves. Blank stock assumes 0; your first addition records only what you add. Completed rows stay put until you hide them.</p><p id="collect-count" role="status" aria-live="polite"></p><ul id="collect-list" class="quick-collect-list" aria-label="Items still needed"></ul><p id="collect-empty" hidden>No outstanding listed items. Unlisted requirements remain unknown.</p>`,
    },
  ];
}
