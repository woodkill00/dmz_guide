import { itemSection } from "../domain/inventory-items.mjs";
// Pure, shared native/private item presentation. No profile or catalog writes.
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function itemIcon(record) {
  if (record.spoiler)
    return '<span class="item-art"><span aria-hidden="true">◇</span><small>Protected</small></span>';
  return `<span class="item-art" data-inventory-icon="${e(record.id)}" data-icon-pack="${e(record.pack.id)}" data-icon-status="missing" title="Item image not added"><span aria-hidden="true">◇</span><small>Image needed</small></span>`;
}
export function renderItemWorkspace({
  record,
  title,
  overview,
  rarity,
  status,
  fixture,
  detail,
  picture,
  evidence,
  actions,
  target,
  catalogURL = "/items/",
}) {
  const pack = encodeURIComponent(record.pack.id),
    id = encodeURIComponent(record.id);
  const category = itemSection(record);
  return `<article class="item-workspace" data-item-workspace data-item-id="${e(record.id)}">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${e(catalogURL)}">All items</a><span aria-hidden="true">/</span><span>${e(category)}</span></nav>
    ${fixture ? '<aside class="notice fixture-notice"><strong>FICTIONAL FIXTURE · NOT GAME DATA</strong></aside>' : ""}
    <header class="item-workspace-heading">${itemIcon(record)}<div><p class="eyebrow">ITEM REFERENCE</p><h1>${e(title)}</h1><div class="item-tags"><span>${e(category)}</span><span data-item-rarity="${e(rarity)}">${e(rarity)}</span></div><p class="item-summary">${e(overview.summary)}</p><p class="item-trust">${e(status)} · Current-build verification varies.</p></div></header>
    <nav class="item-section-nav" aria-label="Item sections">${[
      ["overview", "Overview"],
      ["find", "Where to find"],
      ["crafting", "Crafting"],
      ["uses", "Uses"],
      ["sources", "Sources"],
    ]
      .map(([key, label]) => `<a href="#item-${key}">${label}</a>`)
      .join("")}</nav>
    <div class="item-workspace-grid"><aside class="item-action-card panel" aria-label="Your item tracking"><h2>Your collection</h2><div data-item-collection><p>Keep quantities and blueprint ownership in your saved inventory.</p></div><a class="button primary" href="/inventory/?pack=${pack}&amp;item=${id}">Inventory &amp; blueprint</a>${target}<a class="button" href="/quick-collect/?pack=${pack}">Quick collect</a><a class="button" href="/field-desk/?pack=${pack}&amp;item=${id}">Field desk &amp; discoveries</a>${actions ? `<details class="item-edit-actions"><summary>Edit &amp; photos</summary>${actions}</details>` : ""}</aside>
    <div class="item-workspace-content">${detail}${picture ? `<details class="panel item-pictures"><summary>Item photos</summary>${picture}</details>` : ""}<div id="item-private-picture-slot"></div><section id="item-sources" class="item-evidence" tabindex="-1">${evidence}</section></div></div></article>`;
}
