import {
  renderItemCardBody,
  renderItemCard,
  renderItemIcon,
} from "./item-card.mjs";
import { taskWorkflows, workflowLink } from "../domain/site-workflows.mjs";
import { weaponURL } from "../domain/weapon-routes.mjs";
import { renderCraftPreview } from "./crafting-preview.mjs";
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
const dashboardHeading = (id) =>
  id === "weapons"
    ? `<a href="${weaponURL()}">Weapons</a>`
    : e(dashboardTitles[id]);
export const dashboardNumber = (value) =>
  value == null ? "Review" : Number(value).toLocaleString("en-US");
export const dashboardDestinations = {
  builds: "/quick-collect/",
  needed: "/quick-collect/",
  upgrades: "/upgrades/",
  orders: "/missions/",
  weapons: weaponURL(),
  recipes: "/inventory/",
};
export function dashboardFacts(row) {
  return `Owned <b>${row.held == null ? "Not entered (assumed 0 for estimate)" : dashboardNumber(row.held)}</b> · Required <b>${dashboardNumber(row.required)}</b> · Missing <b data-dash-panel-missing>${row.minimum && row.remaining != null ? "At least " : ""}${dashboardNumber(row.remaining)}</b>`;
}
export function dashboardQualifiers(row) {
  return `${row.alternative ? "Crafting alternative. " : ""}${row.minimum ? "Incomplete scope; this is a minimum estimate. " : ""}${row.assumedZero ? "Missing quantity estimates assume 0 owned. " : ""}`;
}
export function dashboardShell() {
  return `<nav class="site-task-launchpad" aria-label="Start a task">${taskWorkflows.map(([id, label]) => `<a href="${workflowLink(id)}">${e(label)}</a>`).join("")}</nav><section id="dashboard" aria-label="Your progress dashboard"><div class="dash-toolbar"><label>Catalog<select id="hub-pack" aria-label="Dashboard catalog"><option>Loading catalogs…</option></select></label><button id="hub-refresh" type="button">Refresh</button><button id="dashboard-reset" type="button">Reset layout</button><a href="/settings/">Backups & recovery</a></div><p id="hub-progress" role="status">Reading existing local records…</p><p id="dashboard-action-status" role="status" aria-live="polite"></p><div id="dashboard-summary" class="dash-summary" aria-label="At a glance"></div><nav class="dash-section-links" aria-label="Dashboard sections">${dashboardSections.map((id) => `<a href="#dashboard-${id}">${e(dashboardTitles[id])}</a>`).join("")}</nav><div id="dashboard-grid" class="dash-grid">${dashboardSections.map((id) => `<section id="dashboard-${id}" class="dash-section" data-dashboard-section="${id}"><header><h2>${dashboardHeading(id)}</h2><button type="button" data-dash-collapse="${id}" aria-expanded="true" aria-controls="dash-body-${id}">Collapse</button></header><div id="dash-body-${id}">${id === "recipes" ? '<div id="dashboard-blueprint-feedback" class="dash-upgrade-feedback" role="status" tabindex="-1" hidden></div>' : ""}${id === "orders" ? '<div id="dashboard-order-feedback" class="dash-upgrade-feedback" role="status" tabindex="-1" hidden></div>' : ""}${id === "upgrades" ? '<div id="dashboard-upgrade-feedback" class="dash-upgrade-feedback" role="status" tabindex="-1" hidden></div>' : ""}<div data-dash-content="${id}"><p>Loading…</p></div><div id="dash-detail-${id}" data-dash-detail="${id}" class="dash-detail" hidden></div><div class="dash-section-footer"><a data-dash-view-all="${id}" href="${dashboardDestinations[id]}">View all</a><details><summary>Section options</summary><button type="button" data-dash-move="${id}" data-direction="-1" aria-label="Move up: ${e(dashboardTitles[id])}">Move up</button><button type="button" data-dash-move="${id}" data-direction="1" aria-label="Move down: ${e(dashboardTitles[id])}">Move down</button></details></div></div></section>`).join("")}</div><noscript><p>Dashboard summaries need JavaScript. <a href="/features/">Browse all features</a>.</p></noscript></section>`;
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
  const notes = [
    row.assumedZero ? "Stock not entered" : "",
    row.minimum ? "Partial total" : "",
    row.alternative ? "Crafting option" : "",
  ].filter(Boolean);
  const quantity =
    missing == null
      ? "Not confirmed"
      : `${row.minimum ? "≥ " : ""}${dashboardNumber(missing)}`;
  const body = renderItemCardBody(item || { id: row.id, name: row.name }, {
    packId: pack.id,
    name: row.name,
    size: "regular",
    reveal: true,
    quantityLabel: row.assumedZero ? "Estimated need" : "Still needed",
    quantityValue: quantity,
    notes,
    classes: {
      heading: "dash-tile-heading",
      name: "dash-tile-name",
      quantity: "dash-tile-quantity",
      meta: "dash-tile-meta",
      rarity: "dash-tile-rarity",
      note: "dash-tile-note",
    },
  });
  return `<div class="dash-item-entry"><button type="button" class="dash-tile item-card" data-item-size="regular" data-dash-item="${e(row.id)}" data-dash-key="${e(key)}" data-dash-owner="${section}" data-state="${state}" data-rarity="${e(item?.rarity || "unknown")}" aria-expanded="false" aria-controls="dash-detail-${section}">${body}</button>${renderCraftPreview(pack, row.id)}</div>`;
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
        `<li><div class="dash-row-main">${kind === "recipes" ? `${renderItemIcon({ id: r.id }, { packId, size: "compact" })}` : ""}<div><a href="${e(kind === "upgrades" ? dashboardLink("/upgrades/", packId) + "&upgrade=" + encodeURIComponent(r.id) : dashboardItemLink(packId, r.id))}">${e(r.name)}${r.tier ? " · " + e(r.tier) : ""}</a>${
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

export function dashboardUpgradeCards(
  rows,
  pack,
  profile,
  { limit = 5, undo = null } = {},
) {
  return `<div class="dash-upgrade-list">${rows
    .slice(0, limit)
    .map((row) => {
      const inferred = row.complete && !row.ownComplete;
      const disabled =
        profile.schemaVersion < 2 ||
        profile.contentVersion !== pack.contentVersion ||
        inferred;
      const requirements = row.complete
        ? ""
        : `<div class="dash-upgrade-materials">${
            row.requirements
              .map((material) => {
                const item = pack.items.find((i) => i.id === material.id);
                if (!item) return "";
                const state =
                  material.missing == null
                    ? "review"
                    : material.missing > 0
                      ? "short"
                      : "covered";
                return renderItemCard(item, {
                  packId: pack.id,
                  size: "compact",
                  state,
                  reveal: profile.spoilers,
                  quantityLabel:
                    material.partial || material.unknown
                      ? "Listed need"
                      : "Still needed",
                  quantityValue:
                    material.missing == null
                      ? "Not confirmed"
                      : dashboardNumber(material.missing),
                  facts: [
                    {
                      label: "Owned",
                      value:
                        material.held == null
                          ? "Not entered"
                          : dashboardNumber(material.held),
                    },
                    {
                      label: "Required",
                      value:
                        material.required == null
                          ? "Not confirmed"
                          : dashboardNumber(material.required),
                    },
                    ...(material.reserve
                      ? [
                          {
                            label: "Reserved",
                            value: dashboardNumber(material.reserve),
                          },
                        ]
                      : []),
                  ],
                  notes: [
                    material.held == null ? "Stock not entered" : "",
                    material.partial || material.unknown ? "Partial total" : "",
                  ].filter(Boolean),
                });
              })
              .join("") ||
            "<p>Requirements not recorded. Open the upgrade for details.</p>"
          }</div>`;
      return `<article class="dash-upgrade" data-dash-upgrade-family="${e(row.familyId)}"><header><div><h3><a href="${e(dashboardLink("/upgrades/", pack.id) + "&upgrade=" + encodeURIComponent(row.id))}">${e(row.name)}${row.tier ? ` · ${e(row.tier)}` : ""}</a></h3><small>${row.done}/${row.total} tiers completed</small></div><label class="dash-upgrade-completion"><input type="checkbox" data-dash-upgrade-complete="${e(row.id)}" aria-label="Completed: ${e(row.currentName)}"${row.ownComplete || inferred ? " checked" : ""}${disabled ? " disabled data-dash-upgrade-readonly" : ""}>Completed</label></header>${undo?.familyId === row.familyId ? `<button type="button" class="dash-upgrade-undo" data-dash-upgrade-action="undo">Undo ${e(undo.displayName)}</button>` : ""}${inferred ? "<p>Completed through a linked upgrade record. Open Upgrades to review.</p>" : requirements}</article>`;
    })
    .join("")}</div>`;
}
