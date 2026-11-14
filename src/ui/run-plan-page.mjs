import { e } from "./render.mjs";

export function featurePages(packs) {
  return [
    {
      path: "/run-plan/",
      page: "run-plan",
      title: "Next run plan",
      scripts: ["/assets/src/client/run-plan.mjs"],
      body: `<header class="page-heading"><p class="eyebrow">PREPARE / ON THIS DEVICE</p><h1>Next run plan</h1><p>Group your next objectives and reserve supplies. This plan never changes game or saved inventory.</p></header>
      <section class="profile-toolbar"><label>Content pack<select id="pack-select" disabled data-startup-disabled>${packs.map((p) => `<option value="${e(p.id)}">${e(p.title)}</option>`).join("")}</select></label><button id="export-current-profile" type="button" disabled data-startup-disabled>Export private profile</button></section>
      <p id="pack-note" class="notice"></p><p id="save-status" role="status" aria-live="polite"></p><p id="error" class="notice" role="alert" tabindex="-1" hidden></p>
      <section class="panel"><h2>Create a plan</h2><form id="run-plan-create" class="filter-bar"><label>Plan name<input id="run-plan-name" maxlength="80" required placeholder="Next Hajin run"></label><button type="submit" disabled data-startup-disabled>Create plan</button></form><p>Plans are private to this browser and selected catalog. Earlier plans in the list reserve available stock first; Move up or down changes that priority. Keep a backup before clearing site data.</p></section>
      <div id="run-plan-list" aria-live="polite"></div>
      <section class="panel"><h2>Run-plan backup</h2><p>Exports include your named private plans. Import previews the replacement before a guarded local save; no inventory is changed.</p><button id="run-plan-export" type="button">Download run plans</button><label>Run-plan backup JSON<input id="run-plan-import" type="file" accept="application/json,.json"></label><p id="run-plan-import-status" role="status"></p><button id="run-plan-restore" type="button" hidden>Restore previewed plans</button><button id="run-plan-cancel" type="button">Cancel import</button></section>
      <p class="actions"><a href="/inventory/">Inventory</a><a href="/field-desk/">After-run review</a><a href="/missions/">Missions</a><a href="/keys/">Keys</a></p>`,
    },
  ];
}
