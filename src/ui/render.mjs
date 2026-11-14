import { renderItemMapAreas } from "./item-map-areas.mjs";
import { itemIcon, renderItemWorkspace } from "./item-workspace.mjs";
import { itemOverview } from "./item-summary.mjs";
import { isLootType, LOOT_TYPES_INDEX } from "../domain/loot-types.mjs";
import { renderTcnoItemIntel } from "./tcno-item-intel.mjs";
import { x01Printer, x01Uses } from "../content/x01-printer.mjs";
import { buildTargetControl } from "./build-target-control.mjs";
import {
  itemSection,
  itemRarity,
  rarityKey,
} from "../domain/inventory-items.mjs";
import {
  resolvePresentation,
  presentationAttributes,
} from "./presentation-config.mjs";
import { renderDashboard } from "./hub-page.mjs";
import { renderBreadcrumbs } from "./site-navigation.mjs";
import { renderMainNavigation } from "./site-navigation.mjs";
import { imageDescription } from "../content/image-description.mjs";
import { bundledAssetURL } from "../content/bundled-assets.mjs";
import { spoilerGuard, projectSpoilerValue } from "../domain/progression.mjs";
import { recordRelations } from "../domain/record-relations.mjs";
/** Pure HTML rendering. Content text is always escaped; only authored UI is markup. */
export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const e = escapeHTML;
let bundledManifest = null;
export function setBundledAssets(manifest) {
  bundledManifest = manifest;
}
const spoilerGuards = new WeakMap();
function guardFor(pack) {
  if (!pack) return { text: (value) => value, contains: () => false };
  if (!spoilerGuards.has(pack)) spoilerGuards.set(pack, spoilerGuard(pack));
  return spoilerGuards.get(pack);
}
const maskedValue = projectSpoilerValue;
export function displayRecord(record) {
  return record.spoiler ? record : maskedValue(record, guardFor(record.pack));
}

export function recordSearchText(record) {
  record = displayRecord(record);
  if (record.spoiler) return "spoiler-protected record";
  return [
    record.name,
    record.title,
    record.description,
    record.body,
    record.category,
    record.station,
    ...(record.aliases || []),
    ...(record.stats || []).flatMap((stat) => [
      stat.label,
      stat.metric,
      stat.value ?? "unknown",
      stat.unit,
      stat.status,
      JSON.stringify(stat.context || {}),
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

const groups = {
  item: "items",
  resource: "items",
  currency: "items",
  weapon: "items",
  recipe: "recipes",
  guide: "guides",
  objective: "objectives",
  map: "maps",
  location: "locations",
};
export function recordUrl(kind, id) {
  if (typeof kind === "object") {
    id = kind.id;
    kind = kind.recordType || kind.kind;
  }
  return `/${groups[kind] || kind}/${encodeURIComponent(id).replace(/%3A/gi, "--")}/`;
}
export function allRecords(packs) {
  return packs.flatMap((pack) =>
    ["items", "recipes", "guides", "objectives", "maps", "locations"].flatMap(
      (group) =>
        (pack[group] || []).map((record) => ({
          ...record,
          recordType: {
            items: "item",
            recipes: "recipe",
            guides: "guide",
            objectives: "objective",
            maps: "map",
            locations: "location",
          }[group],
          pack,
        })),
    ),
  );
}
export const isFixture = (pack) =>
  pack.sources.some((s) => s.type === "original-fixture") ||
  pack.id.startsWith("fixture:");
let extraNavigation = [];
export function setNavigation(pages) {
  extraNavigation = pages.filter((p) =>
    [
      "maps",
      "progression",
      "editor",
      "community",
      "run-plan",
      "data-review",
    ].includes(p.page),
  );
}
export function renderLayout({
  title,
  body,
  page = "",
  scripts = [],
  styles = [],
  packId = "",
}) {
  const ui = resolvePresentation("guide");
  if (ui.variant === "modern") {
    styles = [
      ...styles,
      "/assets/src/ui/workspace-shell.css",
      "/assets/src/ui/directory-view.css",
    ];
    scripts = [...scripts, "/assets/src/client/workspace-shell.mjs"];
  }
  if (page === "home") scripts = [...scripts, "/assets/src/client/catalog.mjs"];
  if (
    body.includes("data-item-workspace") ||
    page === "local" ||
    page === "items"
  ) {
    styles = [...styles, "/assets/src/ui/item-workspace.css"];
    scripts = [...scripts, "/assets/src/client/item-workspace.mjs"];
  }
  if (body.includes("data-build-auto"))
    scripts = [...scripts, "/assets/src/client/build-target-controls.mjs"];
  const navigation = renderMainNavigation({
    page,
    packId,
    extra: extraNavigation,
  });
  return `<!doctype html><html lang="en" data-theme="dark" ${presentationAttributes("guide")}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/assets/src/favicon.svg" type="image/svg+xml"><meta name="color-scheme" content="dark light"><meta name="description" content="An independent DMZ field guide with source-backed records and private, explainable planning."><title>${e(title)} · DMZ Guide</title><link rel="stylesheet" href="/assets/src/styles.css"><link rel="stylesheet" href="/assets/src/ui/compact-navigation.css">${styles.map((s) => `<link rel="stylesheet" href="${e(s)}">`).join("")}<script type="module" src="/assets/src/client/navigation.mjs"></script><script type="module" src="/assets/src/client/return-context.mjs"></script><script type="module" src="/assets/src/client/theme.mjs"></script>${scripts.map((s) => `<script type="module" src="${e(s)}"></script>`).join("")}</head><body data-page="${e(page)}" data-ui-feature-id="${e(page)}"${packId ? ` data-nav-pack="${e(packId)}"` : ""}><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true">D<span>↗</span></span><span>DMZ <span class="brand-sub">FIELD GUIDE</span></span></a><span class="header-note">INDEPENDENT INTELLIGENCE<br><span>READ. PREPARE. EXTRACT.</span></span><button type="button" class="theme-toggle" id="theme-toggle" aria-label="Light mode — switch theme">Light mode</button></header>${navigation}<main id="main" tabindex="-1">${page === "local" || body.includes('class="breadcrumbs"') ? "" : renderBreadcrumbs(page, title)}${body}</main><footer class="site-footer"><a class="footer-brand" href="/">DMZ / FIELD GUIDE</a><p>Independent community project. Not affiliated with or endorsed by the game publisher.</p><p>Private progress stays in this browser. No accounts, analytics or cloud sync. Local operation needs the static server running. Browser storage is not a backup.</p><a href="/settings/">Backup &amp; privacy</a><a href="/sitemap/">Site map</a></footer></body></html>`;
}
export function pageHeading(eyebrow, title, description = "") {
  return `<header class="page-heading"><p class="eyebrow">${e(eyebrow)}</p><h1>${e(title)}</h1>${description ? `<p class="lede">${e(description)}</p>` : ""}</header>`;
}
export const publicTitle = (record) =>
  record.spoiler
    ? "Spoiler-protected record"
    : guardFor(record.pack).text(record.name || record.title);
export const statusLabel = (record) =>
  record.status === "verified" && !isFixture(record.pack)
    ? "Source-backed · live build unverified"
    : record.status;
function referenceFacts(record) {
  if (record.spoiler)
    return "<p data-reference-facts>Protected content · open the record to choose whether to reveal it.</p>";
  const pack = record.pack;
  const related = (id) => {
    const target = allRecords([pack]).find((entry) => entry.id === id);
    return target
      ? `<a href="${e(recordUrl(target))}">${e(publicTitle(target))}</a>`
      : `${e(id)} (unresolved reference)`;
  };
  const scope = record.scope || pack.game || {};
  let facts = `<dt>Applicability</dt><dd>${e(scope.mode || "Unknown mode")} · ${e(scope.build || "Unknown build")}</dd>`;
  if (record.recordType === "recipe") {
    facts += `<dt>Output</dt><dd>${record.output ? `${e(record.output.quantity ?? "Unknown")} × ${related(record.output.itemId)}` : "Unknown output"}</dd><dt>Inputs and tools</dt><dd><ul>${(record.inputs || []).map((input) => `<li>${e(input.quantity ?? "Unknown")} × ${related(input.itemId)} · ${input.consumption === "unknown" || (input.consumption == null && input.consumed == null) ? "Consumption unknown" : input.consumption === "consumed" || input.consumed === true ? "Consumed material" : "Retained tool"}</li>`).join("") || "<li>No listed inputs; this does not establish a free craft.</li>"}</ul></dd><dt>Requirement completeness</dt><dd>${record.ingredientsKnown === true ? "Known for this scoped record" : "Unknown; do not assume complete"}</dd><dt>Station / eligibility</dt><dd>${e(record.station || "Unknown station")} · ${e(record.eligibility || "Unknown eligibility")}</dd>`;
  }
  if (["map", "location"].includes(record.recordType)) {
    facts += `<dt>Map</dt><dd>${record.mapId ? related(record.mapId) : record.recordType === "map" ? e(publicTitle(record)) : "Unknown map"}</dd><dt>Grid / floor</dt><dd>${e(record.grid ?? "Unknown grid")} · ${e(record.coordinates?.floor ?? "Unknown floor")}</dd><dt>Coordinates</dt><dd>${record.coordinates ? `x ${e(record.coordinates.x)}, y ${e(record.coordinates.y)} · source coordinate frame; not verified meters` : "Unknown position; use recorded directions"}</dd><dt>Spawn evidence</dt><dd>${e(record.spawnKind || "Unknown")} · a named location does not guarantee loot</dd>`;
  }
  if (record.recordType === "item")
    facts += `<dt>Unit</dt><dd>${e(record.unit || "Unknown")}</dd><dt>Private stock / remaining need</dt><dd><a href="/inventory/?pack=${encodeURIComponent(pack.id)}">Review inventory and unfinished needs</a>; not inferred from this reference.</dd>`;
  const sources = pack.sources
    .filter((source) => (record.sourceIds || []).includes(source.id))
    .map((source) => maskedValue(source, guardFor(pack)));
  facts += `<dt>Sources</dt><dd>${sources.length ? sources.map((source) => `${e(source.title)} · reviewed ${e(source.reviewedAt || "Unknown")}`).join("<br>") : "No source recorded"}</dd><dt>Catalog / coverage</dt><dd>${e(pack.title)} · ${e(pack.contentVersion)} · ${e(pack.coverage.note)}</dd>`;
  return `<details data-reference-facts><summary>Reference details</summary><dl>${facts}</dl></details>`;
}
export function renderCard(record, { directory = false } = {}) {
  record = displayRecord(record);
  const kind = record.recordType === "item" ? record.kind : record.recordType;
  return `<article class="record-card${directory ? " item-row" : ""}" data-record-card data-search="${e(recordSearchText(record))}" data-type="${e(kind)}" data-pack="${e(record.pack.id)}">${directory ? '<div class="item-identity">' : ""}<div class="card-meta"><span>${e(kind)}</span><span class="badge ${record.status === "fictional" ? "fixture" : ""}">${e(statusLabel(record))}</span></div><h3><a href="${recordUrl(record)}">${e(publicTitle(record))}<span aria-hidden="true"> ↗</span></a></h3><p>${e(record.spoiler ? "Spoiler content. Open this record and choose Reveal spoiler content to read it." : record.description || record.body || record.category || record.station || "Open the record for evidence and scope.")}</p>${directory ? referenceFacts(record) : ""}<div class="card-foot">${isFixture(record.pack) ? '<strong class="fixture-text">FICTIONAL FIXTURE · NOT GAME DATA</strong>' : `<span>${e(record.category || record.recordType)} · ${e(record.pack.contentVersion)}</span>`}</div>${directory ? `</div>${!record.spoiler ? buildTargetControl(record.pack, record.id, null, { auto: true }) : ""}<div class="item-row-actions"><a href="${e(recordUrl(record))}">Details<span class="sr-only"> ${e(publicTitle(record))}</span></a></div>` : ""}</article>`;
}
export function renderHome() {
  return renderDashboard();
}
export function renderCatalog(
  packs,
  {
    title = "The catalog",
    type = "",
    compact = false,
    authorTargets = {},
  } = {},
) {
  const modern = resolvePresentation("guide").variant === "modern";
  packs = [...packs].sort(
    (a, b) => Number(isFixture(a)) - Number(isFixture(b)),
  );
  const defaultPack = compact
    ? ""
    : packs.find((p) => !isFixture(p))?.id || packs[0]?.id || "";
  const records = allRecords(packs);
  const filtered = type
    ? records.filter((r) => r.recordType === type || r.kind === type)
    : records;
  const types = [
    ...new Set(
      filtered.map((r) => (r.recordType === "item" ? r.kind : r.recordType)),
    ),
  ];
  return `${pageHeading("FIELD REFERENCE", title, "Find a record. Check its evidence. Keep the unknowns in view.")}${type === "recipe" ? '<p><a class="button" href="/recipes/x01/">X01 in-raid printer · separate recipes</a></p>' : ""}${type === "weapon" ? '<p><a class="button" href="/armory/">Open weapon database, attachments &amp; patch history</a></p>' : ""}<form class="filter-bar" id="catalog-filters" data-default-pack="${e(defaultPack)}" data-game-only-default="${compact}" action="" method="get"><label class="search-field">Search records<input type="search" maxlength="200" id="catalog-search" placeholder="Try Medkit, resources, or M4…" autocomplete="off"></label><label>Record type<select name="type" id="catalog-type"><option value="">All types</option>${types.map((t) => `<option value="${e(t)}">${e(t)}</option>`).join("")}${
    compact
      ? `<optgroup label="Item categories">${[
          ...new Set(
            filtered
              .filter((r) => !r.spoiler)
              .map((r) => itemSection(r))
              .filter(Boolean),
          ),
        ]
          .sort()
          .map(
            (category) =>
              `<option value="${e("category:" + category)}">${e(category)}</option>`,
          )
          .join("")}</optgroup>`
      : ""
  }</select></label><label>Content pack<select name="pack" id="catalog-pack"><option value="">All game catalogs</option>${packs.map((p) => `<option value="${e(p.id)}" ${p.id === defaultPack ? "selected" : ""}>${e(p.title)}${isFixture(p) ? " (fictional)" : ""}</option>`).join("")}</select></label>${compact ? '<label>Sort items<select id="catalog-sort" name="sort"><option value="name">Name</option><option value="category">Category</option><option value="rarity">Rarity</option><option value="type">Type</option><option value="status">Evidence status</option></select></label>' : ""}<button type="submit" class="button primary">Search</button><a class="text-link" href="?" id="clear-filters">Clear filters</a></form>${compact ? '<details class="directory-help"><summary>Manage items &amp; private records</summary><p><a href="/items/manage/">Add or edit items</a> · Edit and Remove open exact-record instructions for your local Content Studio. Removal is previewed and blocked when referenced; nothing changes until you explicitly confirm and save. Private player inventory is untouched. <a href="/local/">Browse private records</a> or <a href="/editor/">open the private editor</a>.</p></details>' : ""}<p class="result-count" id="catalog-count" role="status">${filtered.length} records. Coverage not established.</p><noscript><p class="notice">Search filters require JavaScript. All records are listed below and can be read without it.</p></noscript><div class="empty-state" id="catalog-empty" hidden><h2>No matching records.</h2><p>Try another word or clear the filters.</p><a class="button secondary" href="?">Clear filters</a></div>${packs
    .map(
      (pack) =>
        `<section class="catalog-section" data-catalog-section${modern ? ' data-ui-directory data-ui-directory-layout="live" data-ui-directory-pagination="false"' : ""}><div class="section-heading"><div><p class="eyebrow">${isFixture(pack) ? "FICTIONAL FIXTURES · NOT GAME DATA" : "SOURCE-BACKED STARTER REFERENCE"}</p><h2>${e(pack.title)}</h2><details class="directory-coverage"><summary>Catalog coverage</summary><p>${e(pack.coverage.note)}</p></details></div></div><div class="${compact || modern ? "item-directory" : "card-grid"}">${filtered
          .filter((r) => r.pack.id === pack.id)
          .sort((a, b) =>
            compact ? publicTitle(a).localeCompare(publicTitle(b)) : 0,
          )
          .map((record) =>
            compact
              ? renderItemRow(
                  record,
                  authorTargets[record.pack.id]?.[record.id],
                )
              : renderCard(record, { directory: modern }),
          )
          .join("")}</div></section>`,
    )
    .join("")}`;
}

export function renderItemRow(record, target) {
  record = displayRecord(record);
  const title = publicTitle(record);
  return `<article class="item-row" data-record-card data-search="${e(recordSearchText(record))}" data-name="${e(title.toLowerCase())}" data-fixture="${isFixture(record.pack)}" data-category="${e(record.spoiler ? "Spoiler-protected" : itemSection(record))}" data-rarity="${e(record.spoiler ? "99:protected" : rarityKey(record))}" data-type="${e(record.kind)}" data-status="${e(statusLabel(record))}" data-pack="${e(record.pack.id)}">${itemIcon(record)}<div class="item-identity"><h3><a href="${e(recordUrl(record))}" tabindex="0">${e(title)}</a></h3><p>${e(record.kind)} · ${e(record.spoiler ? "Spoiler-protected" : itemSection(record))} · ${e(record.spoiler ? "Spoiler-protected" : itemRarity(record))}</p></div>${!record.spoiler ? `<details class="item-row-build"><summary>Build / get</summary>${buildTargetControl(record.pack, record.id, null, { auto: true })}</details>` : ""}<div class="item-row-actions" aria-label="Actions for ${e(title)}"><a href="${e(recordUrl(record))}" tabindex="0">Details</a>${target ? `<a data-directory-edit href="${e(target + "#edit")}" tabindex="0">Edit<span class="sr-only"> ${e(title)}</span></a><a data-directory-remove href="${e(target + "#remove")}" tabindex="0">Remove<span class="sr-only"> ${e(title)}</span></a>` : ""}</div></article>`;
}

function sourceMarkup(source) {
  let url;
  try {
    const u = new URL(source.url);
    if (
      ["https:", "http:"].includes(u.protocol) &&
      !u.hostname.endsWith(".invalid") &&
      u.hostname !== "example.invalid"
    )
      url = u.href;
  } catch {}
  return `<li>${url ? `<a href="${e(url)}" rel="noreferrer noopener">${e(source.title)} ↗</a>` : e(source.title)}<p>${e(source.supports)}</p><span class="muted">${e(source.type)} · Published ${e(source.publishedAt || "unknown")} · Reviewed ${e(source.reviewedAt || "unknown")}</span></li>`;
}
export function renderDetail(
  record,
  packs,
  {
    imageURL = null,
    referenceURL = recordUrl,
    catalogURL = "/catalog/",
    showPlanner = true,
    authorActions = "",
    imageLoading = "lazy",
  } = {},
) {
  record = displayRecord(record);
  const pack = record.pack;
  const overview =
    record.recordType === "item" ? itemOverview(record, pack) : null;
  if (!record.spoiler && pack.id === x01Printer.packId && x01Uses(record.id))
    authorActions +=
      '<aside class="notice"><a href="/recipes/x01/">X01 printer recipes and uses</a> · Requires materials carried in X01; separate from FOB printing.</aside>';
  const records = allRecords([pack]);
  const find = (id) => records.find((r) => r.id === id);
  const ref = (id) => {
    const r = find(id);
    if (r?.spoiler && !record.spoiler) return "Spoiler-protected record";
    return r
      ? `<a href="${e(referenceURL(r))}">${e(publicTitle(r))}</a>`
      : "Unresolved reference";
  };
  const sources = pack.sources
    .filter((s) => (record.sourceIds || []).includes(s.id))
    .map((source) =>
      record.spoiler ? source : maskedValue(source, guardFor(pack)),
    );
  const claims = pack.claims
    .filter((c) => c.entityId === record.id)
    .map((c) => (record.spoiler ? c : maskedValue(c, guardFor(pack))));
  const scope = record.scope || pack.game;
  let picture = "";
  const pictureIds = [
    ...new Set([record.assetId, ...(record.assetIds || [])].filter(Boolean)),
  ];
  if (imageURL || bundledManifest) {
    picture = pictureIds
      .map((assetId, index) => {
        const asset = pack.assets.find((a) => a.id === assetId);
        if (!asset) return "";
        const url = imageURL
          ? imageURL(pack, assetId)
          : bundledAssetURL(pack, assetId, bundledManifest);
        if (!url) return "";
        const caption = record.spoiler
          ? asset.attribution
          : guardFor(pack).text(asset.attribution);
        return `<figure class="panel"><img data-public-image class="local-raster" loading="${e(imageLoading)}" decoding="async" src="${e(url)}" width="${asset.width}" height="${asset.height}" alt="${e(imageDescription(record, assetId, publicTitle(record)))}"><figcaption>${e(caption)} · ${e(asset.license)}. Image availability does not verify game facts.</figcaption></figure>`;
      })
      .join("");
  }
  let detail = "";
  let itemTarget = "";
  if (
    isLootType(record.id) &&
    pack.guides.some((g) => g.id === LOOT_TYPES_INDEX)
  )
    detail += `<p class="loot-type-buttons">${ref(LOOT_TYPES_INDEX)}</p>`;
  if (record.recordType === "item") {
    itemTarget = buildTargetControl(pack, record.id, null, { auto: true });
    detail += `<section id="item-overview" tabindex="-1" class="panel item-overview"><h2>Overview</h2><dl class="item-core-facts"><dt>Category</dt><dd>${e(record.category || "Not recorded")}</dd><dt>Rarity</dt><dd>${e(itemRarity(record))}</dd><dt>Unit</dt><dd>${e(record.unit || "Not recorded")}</dd></dl>${overview.notes.length ? `<details class="item-source-notes"><summary>Additional notes</summary>${overview.notes.map((note) => `<p>${e(note)}</p>`).join("")}</details>` : ""}</section>`;
    const mapAreas = renderItemMapAreas(record, pack);
    detail +=
      renderTcnoItemIntel(record, pack, ref, {
        omitDescription: true,
        mapAreas,
      }) ||
      `<section id="item-find" tabindex="-1" class="panel"><h2>Where to find</h2><p>No loot source recorded. No location has been inferred.</p>${mapAreas}</section>`;
    const uses = records.filter(
      (r) =>
        !r.spoiler &&
        (r.inputs || r.requirements || []).some((x) => x.itemId === record.id),
    );
    const produces = records.filter((r) => r.output?.itemId === record.id);
    const locations = records.filter((r) => r.itemIds?.includes(record.id));
    const list = (title, rows) =>
      rows.length
        ? `<details class="item-use-group"><summary>${e(title)} (${rows.length})</summary><ul class="item-use-list">${[...new Map(rows.map((r) => [r.id, r])).values()].map((r) => `<li>${ref(r.id)}</li>`).join("")}</ul></details>`
        : "";
    const crafting = uses.filter((r) => r.recordType === "recipe");
    const upgrades = uses.filter(
      (r) => r.recordType === "objective" && r.track === "dmz-upgrade",
    );
    const missions = uses.filter(
      (r) => r.recordType === "objective" && r.track !== "dmz-upgrade",
    );
    const actualLocations = locations.filter((r) => !r.spoiler);
    detail += `<section id="item-crafting" tabindex="-1" class="panel item-crafting"><h2>Crafting</h2>${
      list(
        "Recipes making this item",
        produces.filter((r) => !r.spoiler),
      ) || "<p>No crafting recipe recorded.</p>"
    }${list("Used to craft", crafting)}</section><section id="item-uses" tabindex="-1" class="panel item-uses"><h2>Item uses</h2>${list("Missions", missions)}${list("Upgrades", upgrades)}${list("Mapped locations", actualLocations)}${!uses.length && !produces.length ? "<p>No crafting or mission uses recorded.</p>" : ""}<p><a href="/local/?pack=${encodeURIComponent(pack.id)}&amp;id=${encodeURIComponent(record.id)}">Track inventory and upgrade progress</a></p></section>`;
  }

  if (record.stats && (record.recordType !== "item" || record.stats.length))
    detail += `<section class="panel"><h2>Statistics &amp; measurement context</h2>${
      record.stats.length
        ? record.stats
            .map(
              (s) =>
                `<div class="stat-row"><h3>${e(s.label)}</h3><p><strong>${s.value === null ? "Unknown" : e(s.value)}</strong> ${e(s.customUnit || s.unit)} · ${e(s.status)}</p><p>${e(s.context.method)} Target: ${e(s.context.target)}. Attachments: ${e(s.context.attachments)}. Stance: ${e(s.context.stance)}. Range: ${s.context.rangeMeters ? `${e(s.context.rangeMeters.min)}–${e(s.context.rangeMeters.max)} m` : "unknown"}.</p><p>Reviewed: ${e(s.reviewedAt || "unknown")}. Scope: ${e(JSON.stringify(s.scope || scope))}</p><ul class="source-list">${
                  pack.sources
                    .filter((src) => s.sourceIds.includes(src.id))
                    .map((source) =>
                      sourceMarkup(
                        record.spoiler
                          ? source
                          : maskedValue(source, guardFor(pack)),
                      ),
                    )
                    .join("") || "<li>No verified numeric source.</li>"
                }</ul></div>`,
            )
            .join("")
        : "<p>No numeric statistics verified for this record. Missing values are unknown, not zero.</p>"
    }</section>`;
  if (record.inputs || record.requirements)
    detail += `<section class="panel"><h2>${record.inputs ? "Ingredients & retained tools" : "Requirements"}</h2>${record.station ? `<p>Station: ${e(record.station)}. Eligible game inventory: ${e(record.eligibility)}.</p>` : ""}${record.output ? `<p>Output: ${e(record.output.quantity)} × ${ref(record.output.itemId)}</p>` : ""}<ul class="requirements">${(record.inputs || record.requirements).map((input) => `<li><span>${ref(input.itemId)}<small>${input.consumption === "unknown" ? "Consumption unknown" : input.consumption === "consumed" || input.consumed === true ? "Consumed material" : "Retained tool"} · ${e(find(input.itemId)?.unit || "unknown unit")}</small></span><strong>${e(input.quantity ?? "Unknown")}</strong></li>`).join("") || ((record.ingredientsKnown ?? record.requirementsKnown) ? "<li>No listed material requirements.</li>" : "<li>Unknown cost. Requirements have not been verified.</li>")}</ul><p>Requirement completeness: ${(record.ingredientsKnown ?? record.requirementsKnown) ? "Known for this scoped record" : "Unknown; do not assume complete"}.</p><h3>Prerequisites</h3><ul>${(record.prerequisites || []).map((id) => `<li>${ref(id)}</li>`).join("") || "<li>No listed prerequisites; completeness is not established unless explicitly sourced.</li>"}</ul>${showPlanner ? `<a class="button primary" href="/planner/?pack=${encodeURIComponent(pack.id)}&amp;goal=${encodeURIComponent(record.id)}">Open planner ↗</a>` : ""}</section>`;
  if (record.recordType === "location" || record.recordType === "map")
    detail += `<section class="panel"><h2>Location evidence</h2><p>Grid: ${e(record.grid ?? "Unknown")}. Coordinates: ${e(record.coordinates ? JSON.stringify(record.coordinates) : "Unknown")}. Spawn evidence: ${e(record.spawnKind || "Unknown")}.</p><p>No calibrated game map image is provided. A named location does not imply guaranteed loot.</p>${record.mapId ? `<p>Map: ${ref(record.mapId)}</p>` : ""}</section>`;
  if (record.effects?.length)
    detail += `<section class="panel"><h2>Recorded effects</h2><ul>${record.effects.map((effect) => `<li>${e(effect.type)} · ${e(effect.target)}: ${e(effect.value)}</li>`).join("")}</ul><p>Recorded effects are reference data, not proof of current player access.</p></section>`;
  if (record.relatedIds?.length)
    detail += `<section class="panel"><h2>${isLootType(record.id) ? "Items reported in this loot type" : record.id === LOOT_TYPES_INDEX ? "Browse loot source types" : "Related records"}</h2><ul class="${record.id === LOOT_TYPES_INDEX ? "loot-type-buttons" : ""}">${record.relatedIds.map((id) => `<li>${ref(id)}</li>`).join("")}</ul></section>`;
  if (!record.spoiler && record.recordType !== "item") {
    const incoming = recordRelations(pack, record.id).incoming.filter(
      (row) => !row.spoiler,
    );
    if (incoming.length)
      detail += `<section class="panel"><h2>Records linking here</h2><ul>${incoming.map((row) => `<li>${ref(row.id)}</li>`).join("")}</ul><p>Only declared links in this catalog are shown.</p></section>`;
  }
  const claimMarkup = claims.length
    ? `<section class="panel"><h2>Claims &amp; conflicts</h2><p>Conflicting claims are preserved, not silently resolved.</p>${claims
        .map(
          (c) =>
            `<article class="claim"><h3>${e(c.field)}: ${e(c.value ?? "Unknown")}</h3><p>Status: ${e(c.status)}. Locator: ${e(c.locator)}</p><p>Scope: ${e(JSON.stringify(c.scope || scope))}</p><ul class="source-list">${pack.sources
              .filter((s) => s.id === c.sourceId)
              .map((source) =>
                sourceMarkup(
                  record.spoiler ? source : maskedValue(source, guardFor(pack)),
                ),
              )
              .join("")}</ul></article>`,
        )
        .join("")}</section>`
    : "";
  const evidence = `<aside class="panel provenance">${overview ? "<details><summary>Sources &amp; verification</summary>" : ""}<p class="eyebrow">RECORD INTELLIGENCE</p><h2>Evidence &amp; scope</h2><dl><dt>Verification</dt><dd>${e(statusLabel(record))}</dd><dt>Content version</dt><dd>${e(pack.contentVersion)}</dd><dt>Game / mode</dt><dd>${e(scope.gameId || scope.id)} / ${e(scope.mode)}</dd><dt>Build</dt><dd>${e(scope.build)}</dd><dt>Reviewed</dt><dd>${e(
    sources
      .map((s) => s.reviewedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || "Unknown",
  )}</dd><dt>Record ID</dt><dd>${e(record.id)}</dd><dt>Pack</dt><dd>${e(pack.title)}</dd></dl><h3>Sources</h3><ul class="source-list">${sources.map((source) => sourceMarkup(record.spoiler ? source : maskedValue(source, guardFor(pack)))).join("") || "<li>No sources recorded. Treat this as unverified.</li>"}</ul><p class="muted">Verification applies only to the stated claim and scope, not every mechanic or the current live build.</p>${overview ? "</details>" : ""}</aside>`;

  if (overview && !record.spoiler) {
    return renderItemWorkspace({
      record,
      title: publicTitle(record),
      overview,
      rarity: itemRarity(record),
      status: statusLabel(record),
      fixture: isFixture(pack),
      detail: detail + claimMarkup,
      picture,
      evidence,
      actions: authorActions,
      target: itemTarget,
      catalogURL: catalogURL === "/catalog/" ? "/items/" : catalogURL,
    });
  }
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${e(catalogURL)}">Catalog</a><span aria-hidden="true">/</span><span>${e(record.recordType)}</span></nav>${isFixture(pack) ? '<aside class="notice fixture-notice"><strong>FICTIONAL FIXTURE · NOT GAME DATA</strong><p>This synthetic record demonstrates the guide’s behavior. Do not use it as gameplay advice.</p></aside>' : ""}${pageHeading(overview ? `${record.kind || "item"} reference` : `${record.kind || record.recordType} / ${record.category || record.track || "REFERENCE"}`, publicTitle(record), record.spoiler ? "" : overview?.summary || record.description || "")}<aside class="notice evidence-caveat"><strong>${e(statusLabel(record))}</strong>${overview ? " · Current-build verification varies." : "<p>Source support is not current-build verification. Unknown mechanics and conflicting claims remain uncertain.</p>"}</aside>${authorActions}${record.spoiler ? '<details class="spoiler-content"><summary>Reveal spoiler content</summary><h2>' + e(record.name || record.title) + "</h2>" + (record.description ? '<p class="lede">' + e(record.description) + "</p>" : "") : ""}${
    record.body
      ? `<div class="prose panel">${record.body
          .split("\n")
          .map((line) => `<p>${e(line)}</p>`)
          .join("")}</div>`
      : ""
  }${picture}<div class="detail-grid${overview ? " item-detail-layout" : ""}"><div>${detail}${claimMarkup}</div>${evidence}</div>${record.spoiler ? "</details>" : ""}`;
}
