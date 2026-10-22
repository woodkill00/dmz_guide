import { imageDescription } from "../content/image-description.mjs";
import { bundledAssetURL } from "../content/bundled-assets.mjs";
import { spoilerGuard, projectSpoilerValue } from "../domain/progression.mjs";
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
    ["maps", "progression", "editor", "community"].includes(p.page),
  );
}
export function renderLayout({ title, body, page = "", scripts = [] }) {
  if (page === "home") scripts = [...scripts, "/assets/src/client/catalog.mjs"];
  const primary = [
    ["/catalog/", "Catalog", "catalog"],
    ["/planner/", "Planner", "planner"],
    ["/inventory/", "Inventory", "inventory"],
  ];
  const secondary = [
    ["/recipes/", "Recipes", "recipes"],
    ["/guides/", "Guides", "guides"],
    ...extraNavigation.map((p) => [
      p.path,
      {
        editor: "Editor",
        maps: "Maps",
        local: "Private reader",
        progression: "Progress",
        community: "Community",
      }[p.page] || p.title,
      p.page,
    ]),
    ["/settings/", "Settings", "settings"],
  ];
  const navLink = ([url, label, key]) =>
    `<a href="${url}"${page === key ? ' aria-current="page"' : ""}>${e(label)}</a>`;
  const navigation =
    primary.map(navLink).join("") +
    `<details class="nav-more"><summary>More${secondary.find(([, , key]) => key === page) ? ` · ${e(secondary.find(([, , key]) => key === page)[1])}` : ""}</summary><div>${secondary.map(navLink).join("")}</div></details>`;
  return `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="/assets/src/favicon.svg" type="image/svg+xml"><meta name="color-scheme" content="dark light"><meta name="description" content="An independent DMZ field guide with source-backed records and private, explainable planning."><title>${e(title)} · DMZ Guide</title><link rel="stylesheet" href="/assets/src/styles.css"><script type="module" src="/assets/src/client/theme.mjs"></script>${scripts.map((s) => `<script type="module" src="${e(s)}"></script>`).join("")}</head><body data-page="${e(page)}"><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/" aria-label="DMZ Guide home"><span class="brand-mark" aria-hidden="true">D<span>↗</span></span><span>DMZ<span class="brand-sub">FIELD GUIDE</span></span></a><span class="header-note">INDEPENDENT INTELLIGENCE<br><span>READ. PREPARE. EXTRACT.</span></span><button type="button" class="theme-toggle" id="theme-toggle" aria-label="Switch to light theme">Light mode</button></header><nav class="site-nav" aria-label="Main navigation">${navigation}</nav><main id="main" tabindex="-1">${body}</main><footer class="site-footer"><a class="footer-brand" href="/">DMZ / FIELD GUIDE</a><p>Independent community project. Not affiliated with or endorsed by the game publisher.</p><p>Private progress stays in this browser. No accounts, analytics or cloud sync. Local operation needs the static server running. Browser storage is not a backup.</p><a href="/settings/">Backup &amp; privacy</a></footer></body></html>`;
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
export function renderCard(record) {
  record = displayRecord(record);
  const kind = record.recordType === "item" ? record.kind : record.recordType;
  return `<article class="record-card" data-record-card data-search="${e(recordSearchText(record))}" data-type="${e(kind)}" data-pack="${e(record.pack.id)}"><div class="card-meta"><span>${e(kind)}</span><span class="badge ${record.status === "fictional" ? "fixture" : ""}">${e(statusLabel(record))}</span></div><h3><a href="${recordUrl(record)}">${e(publicTitle(record))}<span aria-hidden="true"> ↗</span></a></h3><p>${e(record.spoiler ? "Spoiler content. Open this record and choose Reveal spoiler content to read it." : record.description || record.body || record.category || record.station || "Open the record for evidence and scope.")}</p><div class="card-foot">${isFixture(record.pack) ? '<strong class="fixture-text">FICTIONAL FIXTURE · NOT GAME DATA</strong>' : `<span>${e(record.category || record.recordType)} · ${e(record.pack.contentVersion)}</span>`}</div></article>`;
}
export function renderHome(packs) {
  const records = allRecords(packs);
  const official = records.filter((r) => !isFixture(r.pack));
  return `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="signal-dot"></span> THE INDEPENDENT DMZ FIELD GUIDE</p><h1>Go in with<br>a <em>clear plan.</em></h1><p class="lede">Know what you’re carrying. Find what you’re missing. Make your next run count.</p><p class="hero-support">Source-backed reference. Explainable planning.<br>Your progress, kept on your device.</p><form action="/catalog/" method="get" class="home-search"><label for="home-search">Search the field guide</label><div class="actions"><input id="home-search" maxlength="200" type="search" placeholder="Items, weapons, recipes, guides…"><button type="submit">Search</button></div><p id="home-search-status" role="status"></p></form><div class="actions"><a class="button primary" href="/catalog/">Explore the catalog <span aria-hidden="true">↗</span></a><a class="button secondary" href="/planner/">Build a plan</a></div></div><figure class="radar-figure"><div class="radar-art" role="img" aria-label="Original decorative radar grid illustration, not a game map"><div class="radar-ring ring-one"></div><div class="radar-ring ring-two"></div><div class="radar-ring ring-three"></div><span class="radar-axis">N</span><span class="radar-blip blip-one"></span><span class="radar-blip blip-two"></span><span class="radar-blip blip-three"></span><div class="radar-center">+</div></div><figcaption class="art-caption">ORIGINAL ILLUSTRATION / NOT A GAME MAP</figcaption></figure></section><section class="trust-strip" aria-label="Guide principles"><div><span class="eyebrow">01 / EVIDENCE FIRST</span><strong>Sources, not assumptions.</strong></div><div><span class="eyebrow">02 / LOCAL BY DEFAULT</span><strong>No account required.</strong></div><div><span class="eyebrow">03 / HONEST BY DESIGN</span><strong>Unknown means unknown.</strong></div></section><section class="section"><div class="section-heading"><div><p class="eyebrow">THE FIELD DESK</p><h2>Prepare for the next run.</h2></div><a class="text-link" href="/catalog/">View all records ↗</a></div><div class="feature-grid"><a class="feature-card" href="/catalog/"><span class="feature-number">01 / REFERENCE</span><h3>Know your gear.</h3><p>Browse items, resources and weapon records with visible evidence.</p><span class="feature-arrow" aria-hidden="true">↗</span></a><a class="feature-card" href="/recipes/"><span class="feature-number">02 / CRAFTING</span><h3>See every ingredient.</h3><p>Separate consumed materials from retained tools and access gates.</p><span class="feature-arrow" aria-hidden="true">↗</span></a><a class="feature-card" href="/planner/"><span class="feature-number">03 / PLANNING</span><h3>Close the gap.</h3><p>Compare your local inventory with your goals. Keep reserves protected.</p><span class="feature-arrow" aria-hidden="true">↗</span></a></div></section><section class="section"><div class="section-heading"><div><p class="eyebrow">OPEN THE REFERENCE</p><h2>A few useful starting points.</h2></div></div><div class="card-grid">${official
    .filter((r) => ["recipe", "guide"].includes(r.recordType))
    .slice(0, 6)
    .map(renderCard)
    .join(
      "",
    )}</div></section><aside class="notice"><strong>A growing reference, not a complete catalog.</strong><p>${e(packs.find((p) => !isFixture(p))?.coverage.note || "Coverage has not been established.")} Numeric unknowns and conflicting sources are kept visible. Fictional demonstration records are labeled separately.</p></aside>`;
}
export function renderCatalog(
  packs,
  { title = "The catalog", type = "" } = {},
) {
  packs = [...packs].sort(
    (a, b) => Number(isFixture(a)) - Number(isFixture(b)),
  );
  const defaultPack =
    packs.find((p) => !isFixture(p))?.id || packs[0]?.id || "";
  const records = allRecords(packs);
  const filtered = type
    ? records.filter((r) => r.recordType === type || r.kind === type)
    : records;
  const types = [
    ...new Set(
      filtered.map((r) => (r.recordType === "item" ? r.kind : r.recordType)),
    ),
  ];
  return `${pageHeading("FIELD REFERENCE", title, "Find a record. Check its evidence. Keep the unknowns in view.")}<form class="filter-bar" id="catalog-filters" data-default-pack="${e(defaultPack)}" action="" method="get"><label class="search-field">Search records<input type="search" maxlength="200" id="catalog-search" placeholder="Try Medkit, resources, or M4…" autocomplete="off"></label><label>Record type<select name="type" id="catalog-type"><option value="">All types</option>${types.map((t) => `<option value="${e(t)}">${e(t)}</option>`).join("")}</select></label><label>Content pack<select name="pack" id="catalog-pack"><option value="">All packs</option>${packs.map((p) => `<option value="${e(p.id)}" ${p.id === defaultPack ? "selected" : ""}>${e(p.title)}${isFixture(p) ? " (fictional)" : ""}</option>`).join("")}</select></label><button type="submit" class="button primary">Search</button><a class="text-link" href="?" id="clear-filters">Clear filters</a></form><p class="result-count" id="catalog-count" role="status">${filtered.length} records. Coverage not established.</p><noscript><p class="notice">Search filters require JavaScript. All records are listed below and can be read without it.</p></noscript><div class="empty-state" id="catalog-empty" hidden><h2>No matching records.</h2><p>Try another word or clear the filters.</p><a class="button secondary" href="?">Clear filters</a></div>${packs
    .map(
      (pack) =>
        `<section class="catalog-section" data-catalog-section><div class="section-heading"><div><p class="eyebrow">${isFixture(pack) ? "FICTIONAL FIXTURES · NOT GAME DATA" : "SOURCE-BACKED STARTER REFERENCE"}</p><h2>${e(pack.title)}</h2><p>${e(pack.coverage.note)}</p></div></div><div class="card-grid">${filtered
          .filter((r) => r.pack.id === pack.id)
          .map(renderCard)
          .join("")}</div></section>`,
    )
    .join("")}`;
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
  } = {},
) {
  record = displayRecord(record);
  const pack = record.pack;
  const records = allRecords(packs);
  const find = (id) => records.find((r) => r.id === id);
  const ref = (id) => {
    const r = find(id);
    return r
      ? `<a href="${e(referenceURL(r))}">${e(publicTitle(r))}</a>`
      : e(id) + " (unresolved reference)";
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
        return `<figure class="panel"><img data-public-image class="local-raster" loading="lazy" decoding="async" src="${e(url)}" width="${asset.width}" height="${asset.height}" alt="${e(imageDescription(record, assetId, publicTitle(record)))}"><figcaption>${e(caption)} · ${e(asset.license)}. Image availability does not verify game facts.</figcaption></figure>`;
      })
      .join("");
  }
  let detail = "";
  if (record.recordType === "item") {
    const uses = records.filter((r) =>
      (r.inputs || r.requirements || []).some((x) => x.itemId === record.id),
    );
    const produces = records.filter((r) => r.output?.itemId === record.id);
    const locations = records.filter((r) => r.itemIds?.includes(record.id));
    detail += `<section class="panel"><h2>Uses & acquisition</h2><h3>Used by recipes and objectives</h3><ul>${uses.map((r) => `<li>${ref(r.id)}</li>`).join("") || "<li>No recorded uses in this starter pack.</li>"}</ul><h3>Recipes producing this item</h3><ul>${produces.map((r) => `<li>${ref(r.id)}</li>`).join("") || "<li>No producing recipe recorded.</li>"}</ul><h3>Related locations</h3><ul>${locations.map((r) => `<li>${ref(r.id)} · ${e(r.spawnKind)} occurrence, not guaranteed</li>`).join("") || "<li>No verified item-location relation recorded.</li>"}</ul></section>`;
  }

  if (record.stats)
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
    detail += `<section class="panel"><h2>${record.inputs ? "Ingredients & retained tools" : "Requirements"}</h2>${record.station ? `<p>Station: ${e(record.station)}. Eligible game inventory: ${e(record.eligibility)}.</p>` : ""}${record.output ? `<p>Output: ${e(record.output.quantity)} × ${ref(record.output.itemId)}</p>` : ""}<ul class="requirements">${(record.inputs || record.requirements).map((input) => `<li><span>${ref(input.itemId)}<small>${input.consumed ? "Consumed material" : "Retained tool"} · ${e(find(input.itemId)?.unit || "unknown unit")}</small></span><strong>${e(input.quantity)}</strong></li>`).join("") || ((record.ingredientsKnown ?? record.requirementsKnown) ? "<li>No listed material requirements.</li>" : "<li>Unknown cost. Requirements have not been verified.</li>")}</ul><p>Requirement completeness: ${(record.ingredientsKnown ?? record.requirementsKnown) ? "Known for this scoped record" : "Unknown; do not assume complete"}.</p><h3>Prerequisites</h3><ul>${(record.prerequisites || []).map((id) => `<li>${ref(id)}</li>`).join("") || "<li>No listed prerequisites.</li>"}</ul>${showPlanner ? `<a class="button primary" href="/planner/?pack=${encodeURIComponent(pack.id)}&amp;goal=${encodeURIComponent(record.id)}">Open planner ↗</a>` : ""}</section>`;
  if (record.recordType === "location" || record.recordType === "map")
    detail += `<section class="panel"><h2>Location evidence</h2><p>Grid: ${e(record.grid ?? "Unknown")}. Coordinates: ${e(record.coordinates ? JSON.stringify(record.coordinates) : "Unknown")}. Spawn evidence: ${e(record.spawnKind || "Unknown")}.</p><p>No calibrated game map image is provided. A named location does not imply guaranteed loot.</p>${record.mapId ? `<p>Map: ${ref(record.mapId)}</p>` : ""}</section>`;
  if (record.effects?.length)
    detail += `<section class="panel"><h2>Recorded effects</h2><ul>${record.effects.map((effect) => `<li>${e(effect.type)} · ${e(effect.target)}: ${e(effect.value)}</li>`).join("")}</ul><p>Recorded effects are reference data, not proof of current player access.</p></section>`;
  if (record.relatedIds?.length)
    detail += `<section class="panel"><h2>Related records</h2><ul>${record.relatedIds.map((id) => `<li>${ref(id)}</li>`).join("")}</ul></section>`;
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${e(catalogURL)}">Catalog</a><span aria-hidden="true">/</span><span>${e(record.recordType)}</span></nav>${isFixture(pack) ? '<aside class="notice fixture-notice"><strong>FICTIONAL FIXTURE · NOT GAME DATA</strong><p>This synthetic record demonstrates the guide’s behavior. Do not use it as gameplay advice.</p></aside>' : ""}${pageHeading(`${record.kind || record.recordType} / ${record.category || record.track || "REFERENCE"}`, publicTitle(record), record.spoiler ? "" : record.description || "")}<aside class="notice evidence-caveat"><strong>${e(statusLabel(record))}</strong><p>Source support is not current-build verification. Unknown mechanics and conflicting claims remain uncertain.</p></aside>${authorActions}${record.spoiler ? '<details class="spoiler-content"><summary>Reveal spoiler content</summary><h2>' + e(record.name || record.title) + "</h2>" + (record.description ? '<p class="lede">' + e(record.description) + "</p>" : "") : ""}${
    record.body
      ? `<div class="prose panel">${record.body
          .split("\n")
          .map((line) => `<p>${e(line)}</p>`)
          .join("")}</div>`
      : ""
  }${picture}<div class="detail-grid"><div>${detail}${
    claims.length
      ? `<section class="panel"><h2>Claims &amp; conflicts</h2><p>Conflicting claims are preserved, not silently resolved.</p>${claims
          .map(
            (c) =>
              `<article class="claim"><h3>${e(c.field)}: ${e(c.value ?? "Unknown")}</h3><p>Status: ${e(c.status)}. Locator: ${e(c.locator)}</p><p>Scope: ${e(JSON.stringify(c.scope || scope))}</p><ul class="source-list">${pack.sources
                .filter((s) => s.id === c.sourceId)
                .map((source) =>
                  sourceMarkup(
                    record.spoiler
                      ? source
                      : maskedValue(source, guardFor(pack)),
                  ),
                )
                .join("")}</ul></article>`,
          )
          .join("")}</section>`
      : ""
  }</div><aside class="panel provenance"><p class="eyebrow">RECORD INTELLIGENCE</p><h2>Evidence &amp; scope</h2><dl><dt>Verification</dt><dd>${e(statusLabel(record))}</dd><dt>Content version</dt><dd>${e(pack.contentVersion)}</dd><dt>Game / mode</dt><dd>${e(scope.gameId || scope.id)} / ${e(scope.mode)}</dd><dt>Build</dt><dd>${e(scope.build)}</dd><dt>Reviewed</dt><dd>${e(
    sources
      .map((s) => s.reviewedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || "Unknown",
  )}</dd><dt>Record ID</dt><dd>${e(record.id)}</dd><dt>Pack</dt><dd>${e(pack.title)}</dd></dl><h3>Sources</h3><ul class="source-list">${sources.map((source) => sourceMarkup(record.spoiler ? source : maskedValue(source, guardFor(pack)))).join("") || "<li>No sources recorded. Treat this as unverified.</li>"}</ul><p class="muted">Verification applies only to the stated claim and scope, not every mechanic or the current live build.</p></aside></div>${record.spoiler ? "</details>" : ""}`;
}
