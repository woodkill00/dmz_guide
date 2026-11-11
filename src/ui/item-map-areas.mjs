import { itemOverview } from "./item-summary.mjs";
import { itemMapAreas } from "../domain/item-map-areas.mjs";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function renderItemMapAreas(record, pack) {
  const areas = itemMapAreas(record, pack, itemOverview(record, pack));
  return `<section class="item-map-areas" aria-label="Possible map areas"><h3>Possible map areas</h3>${areas.length ? `<div class="loot-type-buttons">${areas.map((area) => `<a data-item-map-area="${e(area.id)}" class="button" href="${e(area.mapURL)}" title="${e(area.basis)} · possible area, not a guaranteed spawn"${area.mapURL.startsWith("http:") ? ' target="_blank" rel="noopener noreferrer"' : ""}>${e(area.name)} ↗</a>`).join("")}</div><p><small>Source-mentioned areas or recorded associations, not guaranteed spawns. Hajin buttons highlight matching named locations on the separate local map when coordinates are available.</small></p><details><summary>Area references &amp; map help</summary><ul>${areas.map((area) => `<li><a href="${e(area.referenceURL)}">${e(area.name)}</a> · ${e(area.basis)}</li>`).join("")}</ul><p>The Hajin map must be running at 127.0.0.1:5175. Area references remain readable without it. Exact positions are shown only when the map has a registered location.</p></details>` : "<p>No named map area recorded for this item. Loot types above remain useful search guidance.</p>"}</section>`;
}
