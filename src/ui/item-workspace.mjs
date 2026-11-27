import { renderItemIcon } from "./item-card.mjs";
import { itemSection } from "../domain/inventory-items.mjs";
import { keyItemReference } from "../domain/key-item-links.mjs";
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
  return renderItemIcon(record, { className: "item-art", size: "inherit" });
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
  readerBase = "",
}) {
  const readerHref = (path) =>
    typeof readerBase === "function" ? readerBase(path) : readerBase + path;
  const pack = encodeURIComponent(record.pack.id),
    id = encodeURIComponent(record.id);
  const category = itemSection(record);
  const primaryEdit =
    actions?.match(/<a\b[^>]*data-compose-record\b[^>]*>[\s\S]*?<\/a>/)?.[0] ||
    "";
  const secondaryActions = primaryEdit
    ? actions.replace(primaryEdit, "")
    : actions;
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
      .filter(
        ([key]) => key === "sources" || detail.includes(`id="item-${key}"`),
      )
      .map(([key, label]) => `<a href="#item-${key}">${label}</a>`)
      .join("")}</nav>
    <div class="item-workspace-grid"><aside class="item-action-card panel" aria-label="Your item tracking"><h2>Your collection</h2><div data-item-collection><p>Keep quantities and blueprint ownership in your saved inventory.</p></div><a class="button primary" href="${e(readerHref(`/inventory/?pack=${pack}&item=${id}`))}">Inventory &amp; blueprint</a>${target}${keyItemReference(record.id) ? `<a class="button" data-key-reference="${e(keyItemReference(record.id).keyId)}" href="${e(readerHref(`/keys/${keyItemReference(record.id).keyId}/`))}">Key guide · ${keyItemReference(record.id).mapId === "x01" ? "X01" : "Hajin"}</a>` : ""}<a class="button" href="${e(readerHref(`/quick-collect/?pack=${pack}`))}">Quick collect</a><a class="button" href="${e(readerHref(`/field-desk/?pack=${pack}&item=${id}`))}">Field desk &amp; discoveries</a>${primaryEdit ? `<p class="item-primary-edit">${primaryEdit}</p>` : ""}${secondaryActions ? `<details class="item-edit-actions"><summary>Edit &amp; photos</summary>${secondaryActions}</details>` : ""}</aside>
    <div class="item-workspace-content">${detail}${picture ? `<details class="panel item-pictures"><summary>Item photos</summary>${picture}</details>` : ""}<div id="item-private-picture-slot"></div><section id="item-sources" class="item-evidence" tabindex="-1">${evidence}</section></div></div></article>`;
}
