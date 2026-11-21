import { rarityItems } from "../domain/rarity-items.mjs";
import { craftingItemLink } from "./crafting-uses.mjs";
import { renderCraftPreview } from "./crafting-preview.mjs";
import { features, featureURL } from "./feature-registry.mjs";
import { e, isFixture } from "./render.mjs";
const feature = (id) => features.find((row) => row.id === id);
export function renderTrackItems(packs) {
  const defaultPack =
    packs.find((pack) => pack.id === "official:mw4-dmz-starter") ||
    packs.find((pack) => !isFixture(pack)) ||
    packs[0];
  const defaultCount = rarityItems(defaultPack).reduce(
    (sum, group) => sum + group.items.length,
    0,
  );
  const itemURL = (pack, item) => {
    const url = new URL(
      featureURL(feature("local")),
      "https://navigation.invalid",
    );
    url.searchParams.set("pack", pack.id);
    url.searchParams.set("id", item.id);
    return url.pathname + url.search;
  };
  return `<header class="page-heading"><h1>Items</h1><p>Browse by rarity. Names are alphabetical within each section.</p></header><section class="track-items-directory" data-default-pack="${e(defaultPack.id)}"><form id="track-items-filters" class="filter-bar"><label>Find item<input id="track-items-query" type="search" maxlength="200" placeholder="Item name or category"></label><label>Catalog<select id="track-items-pack">${packs.map((pack) => `<option value="${e(pack.id)}"${pack.id === defaultPack.id ? " selected" : ""}>${e(pack.title)}${isFixture(pack) ? " · FICTIONAL" : ""}</option>`).join("")}</select></label></form><p id="track-items-count" role="status">${defaultCount} catalog items</p><noscript>Showing the default catalog. Enable JavaScript for search and catalog switching.</noscript><div class="actions"><button type="button" data-track-items-expand>Expand sections</button><button type="button" data-track-items-collapse>Collapse sections</button></div>${packs
    .map(
      (pack, packIndex) =>
        `<section data-track-items-pack="${e(pack.id)}"${pack.id === defaultPack.id ? "" : " hidden"}>${isFixture(pack) ? '<p class="notice">FICTIONAL TRAINING DATA · NOT GAME FACTS</p>' : ""}${rarityItems(
          pack,
        )
          .map(
            (group, groupIndex) =>
              `<details open class="track-rarity-group" data-track-rarity="${e(group.label)}" id="track-rarity-${packIndex}-${groupIndex}"><summary>${e(group.label)} <span data-track-rarity-count>${group.items.length} items</span></summary><ul>${group.items.map(({ item, category }) => `<li class="track-item-row" data-track-item="${e(item.id)}" data-track-search="${e((item.name + " " + category).toLowerCase())}"><div>${craftingItemLink({ ...item, recordType: "item" }, pack, (record) => itemURL(pack, record))}${category ? `<small>${e(category)}</small>` : ""}${renderCraftPreview(pack, item.id)}</div></li>`).join("")}</ul></details>`,
          )
          .join(
            "",
          )}<details class="track-items-evidence"><summary>Catalog coverage</summary><p>${e(pack.coverage?.note || "Coverage not recorded.")}</p></details></section>`,
    )
    .join(
      "",
    )}<p id="track-items-empty" hidden>No matching items.</p><p class="muted">Recorded catalog rarities; unrecorded rarities are listed separately. <a data-track-inventory-link href="${featureURL(feature("inventory"))}">Open Inventory to record quantities</a>.</p></section>`;
}
export function featurePages(packs) {
  return [
    {
      path: featureURL(feature("track-items")),
      title: "Items by rarity",
      page: "track-items",
      body: renderTrackItems(packs),
      styles: ["/assets/src/ui/track-items.css"],
      scripts: ["/assets/src/client/track-items.mjs"],
    },
  ];
}
