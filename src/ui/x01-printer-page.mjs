import { escapeHTML as e, recordUrl } from "./render.mjs";
import { x01Printer, validateX01Printer } from "../content/x01-printer.mjs";
export function renderX01Printer(packs, { embedded = false } = {}) {
  const pack = packs.find((p) => p.id === x01Printer.packId),
    heading = embedded ? "h2" : "h1",
    groupHeading = embedded ? "h3" : "h2";
  if (!pack)
    return `<section id="x01-printing" class="panel"><${heading}>X01 3D Printer</${heading}><p>The source-backed X01 catalog is not included in this build.</p></section>`;
  const ref = validateX01Printer(x01Printer, pack),
    items = new Map(pack.items.map((i) => [i.id, i]));
  const link = (id, label) =>
    `<a href="${e(recordUrl({ ...items.get(id), recordType: "item", pack }))}">${e(label)}</a>`;
  const groups = new Map();
  for (const r of ref.recipes) {
    if (!groups.has(r.category)) groups.set(r.category, []);
    groups.get(r.category).push(r);
  }
  return `<section id="x01-printing" class="panel x01-printer"><header class="page-heading"><p class="eyebrow">IN-RAID PRINTER · X01</p><${heading}>X01 3D Printer recipes</${heading}><p>${ref.recipes.length} source-reported recipes. Separate from the FOB printer.</p></header><p class="notice"><strong>Bring the materials in your backpack.</strong> Saved FOB inventory does not establish what you are carrying in X01. These are reference recipes; no craft or inventory change is recorded here. FOB upgrade completion is not used here as proof of X01 printer access.</p><details><summary>Printer location</summary><p>${e(ref.location)}. ${e(ref.locationHint)} <a href="http://127.0.0.1:5175/x01-workspace.html?floor=1&marker=x01-3d-printer">Open source-reported printer marker in local X01 workbench</a>. Exact in-game placement remains unverified.</p></details><p><a href="/recipes/">FOB recipe reference</a> · <a href="/collection/#crafting">FOB crafting workbench</a>${embedded ? ' · <a href="/recipes/x01/">Open dedicated X01 printer page</a>' : ""}</p>${[...groups].map(([category, rows]) => `<section class="x01-recipe-group"><${groupHeading}>${e(category === "Ingredients" ? "Legendary materials" : category)}</${groupHeading}><div class="x01-table-scroll"><table class="x01-recipe-table"><thead><tr><th scope="col">Printable item</th><th scope="col">Required carried materials</th></tr></thead><tbody>${rows.map((r) => `<tr data-x01-recipe="${e(r.itemId)}" id="x01-${e(r.itemId.replace(":", "--"))}"><th scope="row">${link(r.itemId, r.name)}</th><td><ul class="x01-costs">${r.materials.map((c) => `<li><strong>${c.quantity}</strong> × ${link(c.itemId, c.name)}</li>`).join("")}</ul></td></tr>`).join("")}</tbody></table></div></section>`).join("")}<p class="muted">Source: <a href="${e(ref.source.url)}" rel="noreferrer noopener" target="_blank">GameRant X01 printer guide ↗</a> · published ${e(ref.source.publishedAt)}, reviewed ${e(ref.source.reviewedAt)}. Reported costs are not independent live-build validation. Batch yields and unlisted item effects remain unverified.</p></section>`;
}
export function featurePages(packs) {
  return [
    {
      path: "/recipes/x01/",
      page: "x01-printer",
      title: "X01 3D Printer recipes",
      body: renderX01Printer(packs),
    },
  ];
}
