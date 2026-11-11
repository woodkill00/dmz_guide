import { escapeHTML as e, isFixture, displayRecord } from "./render.mjs";
import { guidancePath } from "./author-actions.mjs";
import { itemCreatePath } from "../content/author-target.mjs";
import {
  compareItems,
  itemSection,
  itemRarity,
} from "../domain/inventory-items.mjs";
export function renderItemMaintenance(entries) {
  const catalogs = entries.filter(({ pack }) => !isFixture(pack));
  return `<h1>Add or edit items</h1><p>Choose a catalog, then add a missing definition or edit an existing item. Quantities are recorded separately in <a href="/inventory/">Inventory</a>.</p><p><a href="/items/">All items</a> · <a href="/editor/">Private local editor</a></p><details class="panel"><summary>How saving works</summary><p>Repository changes use local Content Studio (default port 4174). Start it with <code>npm run author</code>. Add an item name, enter its category, rarity, source and other fields, change the catalog content version, validate, preview and explicitly save. Rebuild the site to display those changes. Existing player quantities remain tied to stable item IDs; review the content-rebind preview in Settings after catalog updates.</p><p>Use the private editor for your own local pack. Unrecorded rarity means unknown; no list here claims complete coverage of every game item. Links below select an exact catalog and never create or save an item automatically.</p></details>${catalogs
    .map(({ key, pack }) => {
      const groups = new Map();
      for (const item of [...pack.items]
        .filter((i) => !i.spoiler)
        .map((i) => displayRecord({ ...i, pack }))
        .sort(compareItems)) {
        const category = itemSection(item);
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category).push(item);
      }
      return `<section class="panel"><h2>${e(pack.title)}</h2><p>${e(pack.coverage.note)}</p><p>${pack.items.length} item definitions · ${pack.items.filter((i) => !i.rarity).length} without recorded rarity</p><p><a class="button" data-add-item href="${e("http://127.0.0.1:4174" + itemCreatePath({ packKey: key, packId: pack.id }))}" rel="noreferrer">Add item to this catalog ↗</a> <a href="/inventory/?pack=${encodeURIComponent(pack.id)}">Open its inventory</a></p>${[...groups].map(([category, items]) => `<details><summary>${e(category)} (${items.length})</summary><div class="table-scroll"><table><thead><tr><th scope="col">Item</th><th scope="col">Rarity</th><th scope="col">Edit</th></tr></thead><tbody>${items.map((i) => `<tr><th scope="row">${e(i.name)}</th><td>${e(itemRarity(i))}</td><td><a data-edit-item href="${e(guidancePath(key, i.id))}#edit">Edit<span class="sr-only"> ${e(i.name)}</span></a></td></tr>`).join("")}</tbody></table></div></details>`).join("")}</section>`;
    })
    .join("")}`;
}
