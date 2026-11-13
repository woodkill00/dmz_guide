export function featurePages() {
  return [
    {
      path: "/missions/audit/",
      title: "Mission and story audit",
      page: "mission-audit",
      body: `<header class="page-heading"><p class="eyebrow">CONTENT WORKSPACE</p><h1>Mission and story audit</h1><p>Track what has been checked, what needs correction and what you will fill later. This editorial checklist does not change your game progress.</p></header>
<p class="actions"><a href="/missions/">Missions</a><a href="/guides/">Field manual</a><a href="/data-review/">Content review</a></p>
<label>Catalog <select id="pack-select"><option>Loading…</option></select></label><p id="pack-note" class="notice"></p><p id="save-status" role="status" aria-live="polite"></p><p id="error" role="alert" tabindex="-1" hidden></p>
<section class="panel"><h2>Coverage</h2><p id="mission-audit-summary" role="status"></p><p>The 24 Orders pages are the current scoped Hajin page set. An unrecorded page is a content gap, not a completed mission. Later X01 or seasonal Orders require their own reviewed scope.</p></section>
<div class="filter-bar"><label>Find page or mission<input id="mission-audit-search" type="search" maxlength="120"></label><label>Show status<select id="mission-audit-filter"><option value="">All</option><option value="not-checked">Not checked</option><option value="needs-correction">Needs correction</option><option value="fill-later">Fill later</option><option value="ready-for-review">Ready for review</option><option value="checked">Checked</option></select></label></div>
<section class="panel"><h2>Orders pages</h2><div id="mission-audit-pages"></div></section><section class="panel"><h2>Recorded missions and stories</h2><div id="mission-audit-missions"></div></section>
<section class="panel" id="mission-audit-editor" hidden><h2 id="mission-audit-target"></h2><p id="mission-audit-evidence"></p><label>Section status<select id="mission-audit-state"><option value="not-checked">Not checked</option><option value="needs-correction">Needs correction</option><option value="fill-later">Fill later</option><option value="ready-for-review">Ready for review</option><option value="checked">Checked</option></select></label><label>Review note<textarea id="mission-audit-note" maxlength="2000" rows="4"></textarea></label><label>Reviewer<input id="mission-audit-reviewer" maxlength="120"></label><div class="actions"><button id="mission-audit-save" type="button">Save section</button><button id="mission-audit-undo" type="button">Undo last change</button></div><p id="mission-audit-links"></p></section>
<section class="panel"><h2>Keep a copy</h2><p>Exports include your notes, which may contain spoilers. Review the file before sharing it.</p><button id="mission-audit-export" type="button">Export audit JSON</button><label>Preview audit import<input id="mission-audit-import" type="file" accept="application/json,.json"></label><div id="mission-audit-import-preview" role="status"></div><button id="mission-audit-restore" type="button" hidden>Restore previewed audit</button></section>`,
      scripts: ["/assets/src/client/mission-audit.mjs"],
      styles: ["/assets/src/ui/mission-audit.css"],
    },
  ];
}
