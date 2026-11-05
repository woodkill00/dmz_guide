import { renderTopologyReview } from "./topology-view.mjs";
import mapDestinations from "./map-destinations.json" with { type: "json" };
import {
  allRecords,
  e,
  isFixture,
  pageHeading,
  publicTitle,
  recordUrl,
} from "./render.mjs";

export function renderSiteMap(pages, packs) {
  const mapLinks = [...mapDestinations.tools, ...mapDestinations.planner]
    .map(
      ([id, label]) =>
        `<li><a href="http://127.0.0.1:5175/?tool=${e(encodeURIComponent(id))}" target="_blank" rel="noopener noreferrer">${e(label)}</a></li>`,
    )
    .join("");
  const workspaces = pages.filter(
    (page) => /^\/[a-z-]*\/$/.test(page.path) || page.path === "/",
  );
  return `${pageHeading("FIND YOUR WAY", "Site map", "Every guide workspace and bundled content record, organized by catalog. Private records are only available in your private reader.")}${renderTopologyReview()}<section id="site-page-directory" class="panel" data-ui-directory data-ui-directory-pagination="true" aria-label="Guide pages"><h2>Guide pages</h2><ul class="sitemap-links" data-ui-directory-rows>${workspaces.map((page) => `<li data-ui-directory-row><a data-workspace-link href="${e(page.path)}">${e(page.title)}</a></li>`).join("")}</ul></section><section class="panel"><h2>Map tools and trackers</h2><p>These open the separate local map in a new tab. Start its local server first; no service is started or checked automatically.</p><ul class="sitemap-links">${mapLinks}</ul><p><a href="http://127.0.0.1:4174/" target="_blank" rel="noopener noreferrer">Content Studio · separate local app ↗</a></p></section><section><h2>Content records</h2><p>Catalogs remain separate. Fixture records are fictional; source reports do not establish current-build accuracy.</p>${packs
    .map(
      (pack) =>
        `<details class="panel sitemap-pack" data-ui-directory data-ui-directory-pagination="true" aria-label="${e(pack.title)} records"><summary>${e(pack.title)}${isFixture(pack) ? " · FICTIONAL FIXTURES" : ""}</summary><p>${e(pack.coverage.note)}</p><ul class="sitemap-links" data-ui-directory-rows>${allRecords(
          [pack],
        )
          .map(
            (record) =>
              `<li data-ui-directory-row><a href="${e(recordUrl(record))}">${e(publicTitle(record))}</a> <span class="muted">${e(record.recordType)}</span></li>`,
          )
          .join("")}</ul></details>`,
    )
    .join("")}</section>`;
}
export function renderMapWorkspace() {
  return `${pageHeading("LOCAL COMPANION", "Local map workspace", "The optional Hajin map is a separate local application. Start it from your source checkout before opening it.")}<section class="panel"><h2>Open your map</h2><ol><li>In your source checkout, run <code>npm run map:install</code>.</li><li>Run <code>npm run map:dev</code> and keep that terminal running.</li><li>Use the address printed by the server. The default address is linked below; it is not checked automatically.</li></ol><a class="button primary" href="http://127.0.0.1:5175/" target="_blank" rel="noopener noreferrer">Open local map workspace ↗</a><p>If you use a different port, open the printed address instead. A static download does not include this source-only tool or private map assets.</p></section><section class="notice"><h2>Separate workspace, separate data</h2><p>Inventory and progress from this guide do not automatically synchronize with the map. Export backups in each application. Private terrain, captured sources and evidence images are not bundled.</p><p>Waypoints are manually tracked, not live game GPS. Source roads may be incomplete or unverified. Pixel distances are not verified meters, travel times or passable routes.</p><a href="/maps/">Open the guide’s native map and location list</a></section>`;
}
