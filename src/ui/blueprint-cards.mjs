import { renderItemCard } from "./item-card.mjs";
import { compareInventorySections } from "../domain/inventory-items.mjs";
import { dashboardEscape as e } from "./dashboard-page.mjs";
export function dashboardBlueprintCards(rows, pack, { readonly = false } = {}) {
  const groups = [...new Set(rows.map((r) => r.section))].sort(
    compareInventorySections,
  );
  const first = groups.find((section) =>
    rows.some((r) => r.section === section && !r.owned),
  );
  const card = (r) =>
    '<article class="dash-blueprint" data-blueprint-id="' +
    e(r.id) +
    '">' +
    renderItemCard(r, {
      packId: pack.id,
      size: "compact",
      reveal: true,
      notes: r.automatic ? ["Granted by printing upgrade"] : [],
    }) +
    '<label class="blueprint-check"><input type="checkbox" data-dash-blueprint-owned="' +
    e(r.id) +
    '" aria-label="Blueprint owned: ' +
    e(r.name) +
    '"' +
    (r.owned ? " checked" : "") +
    (readonly || r.automatic ? " disabled data-blueprint-readonly" : "") +
    "> Blueprint owned</label></article>";
  return (
    "<p>" +
    rows.filter((r) => !r.owned).length +
    " blueprints still needed</p>" +
    groups
      .map((section) => {
        const list = rows
          .filter((r) => r.section === section)
          .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {
              numeric: true,
              sensitivity: "base",
            }),
          );
        const needed = list.filter((r) => !r.owned),
          owned = list.filter((r) => r.owned);
        return (
          '<details class="blueprint-category" data-blueprint-group="' +
          e(section) +
          '"' +
          (section === first ? " open" : "") +
          "><summary>" +
          e(section) +
          " · " +
          needed.length +
          ' needed</summary><div class="blueprint-card-grid">' +
          needed.map(card).join("") +
          "</div>" +
          (owned.length
            ? '<details class="blueprint-owned"><summary>Owned (' +
              owned.length +
              ')</summary><div class="blueprint-card-grid">' +
              owned.map(card).join("") +
              "</div></details>"
            : "") +
          "</details>"
        );
      })
      .join("")
  );
}
