import { e } from "./render.mjs";

export function featurePages(packs) {
  return [
    {
      path: "/data-review/",
      page: "data-review",
      title: "Data review",
      scripts: ["/assets/src/client/data-review.mjs"],
      body: `<header class="page-heading"><p class="eyebrow">REFERENCE / REVIEW</p><h1>What still needs checking</h1><p>Review source changes against saved plans, then inspect unknown or disputed catalog records.</p></header>
<section class="profile-toolbar"><label>Content pack<select id="pack-select" disabled data-startup-disabled>${packs.map((pack) => `<option value="${e(pack.id)}">${e(pack.title)}</option>`).join("")}</select></label><button id="export-current-profile" disabled data-startup-disabled>Export private profile</button></section>
<p id="pack-note" class="notice"></p><p id="save-status" role="status"></p><p id="error" class="notice" role="alert" hidden tabindex="-1"></p>
<section class="panel" aria-labelledby="mission-audit-health-title"><h2 id="mission-audit-health-title">Mission and story directory</h2><p id="mission-audit-health" role="status"></p><a href="/missions/audit/">Open the section checklist</a></section>
<section class="panel" aria-labelledby="content-health-title"><h2 id="content-health-title">Listed content coverage</h2><p>Counts cover records in the selected catalog, not everything in the game. An image reference does not prove the image loaded; a numeric weapon stat does not prove DMZ testing.</p><div id="content-health-rows"></div></section>
<section class="panel" aria-labelledby="source-impact-heading"><h2 id="source-impact-heading">Check a catalog update against saved plans</h2><p>Choose a candidate JSON catalog for this pack. Preview changes before importing anything.</p><label>Candidate catalog JSON<input id="source-impact-file" type="file" accept="application/json,.json"></label><button id="source-impact-check" type="button">Preview plan impact</button><p id="source-impact-status" role="status"></p><div id="source-impact-results"></div></section>
<details class="panel"><summary>Browse records needing review</summary><label>Filter issues<input id="review-query" type="search" maxlength="120"></label><p id="review-count" role="status" aria-live="polite"></p><div id="review-list"></div></details>`,
    },
  ];
}
