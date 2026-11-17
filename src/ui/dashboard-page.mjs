import {
  dashboardSections,
  dashboardTitles,
  dashboardItemLink,
  dashboardLink,
} from "../domain/dashboard.mjs";
export const dashboardEscape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const e = dashboardEscape;
export const dashboardNumber = (value) =>
  value == null ? "Review" : Number(value).toLocaleString("en-US");
export const dashboardDestinations = {
  builds: "/quick-collect/",
  needed: "/quick-collect/",
  upgrades: "/upgrades/",
  orders: "/missions/",
  weapons: "/armory/acquisition/",
  recipes: "/inventory/",
};
export function dashboardFacts(row) {
  return `Owned <b>${row.held == null ? "Not entered (assumed 0 for estimate)" : dashboardNumber(row.held)}</b> · Required <b>${dashboardNumber(row.required)}</b> · Missing <b data-dash-panel-missing>${row.minimum && row.remaining != null ? "At least " : ""}${dashboardNumber(row.remaining)}</b>`;
}
export function dashboardQualifiers(row) {
  return `${row.alternative ? "Crafting alternative. " : ""}${row.minimum ? "Incomplete scope; this is a minimum estimate. " : ""}${row.assumedZero ? "Missing quantity estimates assume 0 owned. " : ""}`;
}
export function dashboardShell() {
  return `<section id="dashboard" aria-label="Your progress dashboard"><div class="dash-toolbar"><label>Catalog<select id="hub-pack" aria-label="Dashboard catalog"><option>Loading catalogs…</option></select></label><button id="hub-refresh" type="button">Refresh</button><button id="dashboard-reset" type="button">Reset layout</button><a href="/settings/">Backups & recovery</a></div><p id="hub-progress" role="status">Reading existing local records…</p><p id="dashboard-action-status" role="status" aria-live="polite"></p><div id="dashboard-summary" class="dash-summary" aria-label="At a glance"></div><nav class="dash-section-links" aria-label="Dashboard sections">${dashboardSections.map((id) => `<a href="#dashboard-${id}">${e(dashboardTitles[id])}</a>`).join("")}</nav><div id="dashboard-grid" class="dash-grid">${dashboardSections.map((id) => `<section id="dashboard-${id}" class="dash-section" data-dashboard-section="${id}"><header><h2>${e(dashboardTitles[id])}</h2><button type="button" data-dash-collapse="${id}" aria-expanded="true" aria-controls="dash-body-${id}">Collapse</button></header><div id="dash-body-${id}"><div data-dash-content="${id}"><p>Loading…</p></div><div id="dash-detail-${id}" data-dash-detail="${id}" class="dash-detail" hidden></div><div class="dash-section-footer"><a data-dash-view-all="${id}" href="${dashboardDestinations[id]}">View all</a><details><summary>Section options</summary><button type="button" data-dash-move="${id}" data-direction="-1" aria-label="Move ${e(dashboardTitles[id])} up">Move up</button><button type="button" data-dash-move="${id}" data-direction="1" aria-label="Move ${e(dashboardTitles[id])} down">Move down</button></details></div></div></section>`).join("")}</div><noscript><p>Dashboard summaries need JavaScript. <a href="/features/">Browse all features</a>.</p></noscript></section>`;
}
export function dashboardTile(row, pack, section, key) {
  const item = pack.items.find((i) => i.id === row.id),
    missing = row.remaining;
  const state =
    missing === 0 && !row.minimum
      ? "covered"
      : row.minimum || missing == null
        ? "review"
        : row.alternative
          ? "alternative"
          : "short";
  const label =
    state === "covered"
      ? "Covered"
      : state === "review"
        ? "Review"
        : state === "alternative"
          ? "Crafting alternative"
          : "Missing";
  return `<button type="button" class="dash-tile" data-dash-item="${e(row.id)}" data-dash-key="${e(key)}" data-dash-owner="${section}" data-state="${state}" data-rarity="${e(item?.rarity || "unknown")}" aria-expanded="false" aria-controls="dash-detail-${section}"><span data-inventory-icon="${e(row.id)}" data-icon-status="missing" aria-hidden="true">◇</span><span class="dash-tile-name">${e(row.name)}</span><strong>${row.minimum && missing != null ? "≥ " : ""}${dashboardNumber(missing)}</strong><small>${label}${row.assumedZero ? " · estimate" : ""} · ${e(item?.rarity || "rarity unknown")}</small></button>`;
}
export function dashboardItemPanel(
  row,
  pack,
  { draft = "", disabled = false } = {},
) {
  return `<div class="dash-detail-heading"><h3>${e(row.name)}</h3><button type="button" data-dash-close aria-label="Close item details">Close</button></div><p data-dash-facts>${dashboardFacts(row)}</p><p data-dash-qualifiers>${dashboardQualifiers(row)}</p><form data-dashboard-found="${e(row.id)}"><label>Found amount<input name="amount" type="text" inputmode="numeric" maxlength="16" value="${e(draft)}" required aria-label="Found amount for ${e(row.name)}"></label><button type="submit"${disabled ? " disabled" : ""}>Add found</button></form><p data-dash-error role="alert"></p><a href="${e(dashboardItemLink(pack.id, row.id))}">Item details & sources</a>`;
}
export function dashboardProgressRows(
  rows,
  packId,
  { kind = "upgrades", limit = 5 } = {},
) {
  return `<ul class="dash-progress-list">${rows
    .slice(0, limit)
    .map(
      (r) =>
        `<li><div class="dash-row-main">${kind === "recipes" ? `<span data-inventory-icon="${e(r.id)}" data-icon-status="missing" aria-hidden="true">◇</span>` : ""}<div><a href="${e(kind === "upgrades" ? dashboardLink("/upgrades/", packId) + "&upgrade=" + encodeURIComponent(r.id) : dashboardItemLink(packId, r.id))}">${e(r.name)}${r.tier ? " · " + e(r.tier) : ""}</a>${
          kind === "upgrades" && !r.complete
            ? `<p>${
                r.requirements?.length
                  ? r.requirements
                      .slice(0, 3)
                      .map(
                        (m) =>
                          `${e(m.name)}: ${m.missing == null ? dashboardNumber(m.required) + " required" : dashboardNumber(m.missing) + " missing"}${m.held == null ? " (stock not entered)" : ""}`,
                      )
                      .join(" · ")
                  : "Requirements need review"
              }</p>`
            : ""
        }</div></div><span>${r.complete ? "Complete" : kind === "recipes" ? (r.owned ? (r.automatic ? "Owned · printing upgrade" : "Owned") : "Not marked owned") : `${r.done}/${r.total} complete`}</span></li>`,
    )
    .join("")}</ul>`;
}
