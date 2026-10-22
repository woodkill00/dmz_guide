const e = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function featurePages(packs) {
  const picker = `<label>Content pack <select disabled data-startup-disabled id="pack-select">${packs.map((p) => `<option value="${e(p.id)}">${e(p.title)}</option>`).join("")}</select></label><button disabled data-startup-disabled id="export-current-profile" type="button">Export current private profile</button><p id="pack-note" class="notice"></p><p id="save-status" role="status" aria-live="polite">Loading local profile…</p><p id="error" class="notice" role="alert" tabindex="-1" hidden></p>`;
  return [
    {
      path: "planner",
      title: "Collection planner",
      page: "planner",
      body: `<section class="page-heading"><p class="eyebrow">YOUR NEXT MOVE</p><h1>Make every item count.</h1><p>Manual local planning, not live game inventory. Requirements and executable-now readiness are different.</p></section>${picker}<form id="goal-form" class="panel"><label>Goal <select disabled data-startup-disabled id="goal-select"></select></label><label>Target output quantity <input disabled data-startup-disabled id="goal-quantity" type="number" min="1" max="1000000" value="1" required></label><button disabled data-startup-disabled type="submit">Add goal</button></form><section class="panel"><h2>Goals in priority order</h2><ol id="goals-list"></ol></section><details class="panel"><summary>Choose intermediate crafting routes</summary><p>No recipe is automatically selected. Collect raw leaves material as an acquisition target.</p><div id="route-fields"></div></details><label>Execution policy<select disabled data-startup-disabled id="planning-mode"><option value="strict">Strict priority reservations (default)</option><option value="work-conserving">Work-conserving: may use higher goal reservations</option></select></label><section id="plan-output" aria-live="polite"></section><p><a href="/inventory/">Update inventory and reserves</a> · <a href="/settings/">Backup and recovery</a></p>`,
      scripts: ["/assets/src/client/planner.mjs"],
    },
    {
      path: "inventory",
      title: "Inventory & reserves",
      page: "inventory",
      body: `<section class="page-heading"><p class="eyebrow">PRIVATE / ON THIS DEVICE</p><h1>Your stock. Your priorities.</h1><p>Only enter quantities you want available to this manual plan. Protected reserves are never allocated. Nothing here changes the game.</p></section>${picker}<div class="filter-bar"><label>Find inventory item<input disabled data-startup-disabled id="inventory-query" type="search"></label><label>Show items<select disabled data-startup-disabled id="inventory-view"><option value="all">All items</option><option value="owned">Owned or reserved</option><option value="needed">Needed by active goals</option></select></label><p id="inventory-count" role="status"></p></div><form id="inventory-form"><div id="inventory-fields"></div><button disabled data-startup-disabled type="submit">Save inventory</button></form><section class="panel"><h2>Known prerequisite state</h2><p>Record only access you have checked. Unknown stays unknown. Completion does not consume inventory.</p><div id="completion-fields"></div></section><a href="/planner/">Return to your plan</a>`,
      scripts: ["/assets/src/client/profile.mjs"],
    },
    {
      path: "settings",
      title: "Backups & local settings",
      page: "settings",
      body: `<section class="page-heading"><p class="eyebrow">CONTROL CENTER</p><h1>Keep a way back.</h1><p>Browser storage is local, not encrypted or guaranteed permanent. Export a backup before clearing browser data.</p></section>${picker}<section class="panel"><h2>Private profile backup</h2><button disabled data-startup-disabled id="export-profile">Export private backup</button><label>Restore backup (JSON, maximum 1 MiB)<input disabled data-startup-disabled id="import-profile" type="file" accept="application/json,.json"></label><div id="restore-preview" hidden><h3>Review restore</h3><pre id="restore-summary"></pre><button disabled data-startup-disabled id="apply-restore">Apply replacement</button><button disabled data-startup-disabled id="cancel-restore" class="secondary">Cancel</button></div></section><section class="panel"><h2>Content version and recovery</h2><div id="version-status"></div><button disabled data-startup-disabled id="rebind-profile">Preview current content binding</button><button disabled data-startup-disabled id="recover-profile">Restore previous saved snapshot</button><button disabled data-startup-disabled id="reset-profile" class="secondary">Reset this profile…</button><div id="reset-confirm" hidden><p>Clear inventory, reserves, goals and progress for this pack only? A previous snapshot is retained.</p><button disabled data-startup-disabled id="confirm-reset">Confirm reset</button><button disabled data-startup-disabled id="cancel-reset">Keep my profile</button></div></section>`,
      scripts: ["/assets/src/client/profile.mjs"],
    },
  ];
}
