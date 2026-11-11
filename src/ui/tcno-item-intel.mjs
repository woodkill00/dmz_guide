import { lootTypeId, LOOT_TYPES_INDEX } from "../domain/loot-types.mjs";
import intel from "../content/tcno-item-intel.json" with { type: "json" };
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function renderTcnoItemIntel(
  record,
  pack,
  ref,
  { omitDescription = false, mapAreas = "" } = {},
) {
  if (pack.id !== intel.packId || !record.sourceIds?.includes(intel.sourceId))
    return "";
  const ids = Object.keys(intel.mapping).filter(
    (id) => intel.mapping[id] === record.id,
  );
  if (!ids.length) return "";
  const itemLink = (id) =>
    intel.mapping[id] && pack.items.some((i) => i.id === intel.mapping[id])
      ? ref(intel.mapping[id])
      : esc(intel.items[id]?.name || "Item not listed by the source");
  const facts = ids
    .map((id) => {
      const item = intel.items[id];
      return `${omitDescription ? "" : `<p>${esc(item.description || "Description not listed by this source.")}</p>`}${omitDescription ? (item.rarity && record.rarity && item.rarity.toLowerCase() !== record.rarity.toLowerCase() ? `<p>Source reports rarity ${esc(item.rarity)}; catalog rarity differs.</p>` : "") : `<dl><dt>Reported rarity</dt><dd>${esc(item.rarity || "Not listed")}${item.rarity && record.rarity && item.rarity.toLowerCase() !== record.rarity.toLowerCase() ? " · differs from existing catalog evidence" : ""}</dd><dt>Source category</dt><dd>${esc(item.category)}</dd></dl>`}<h3>Where it can be looted</h3>${item.lootSources?.length ? `<div class="loot-type-buttons" aria-label="Loot source types">${item.lootSources.map((s) => (pack.guides.some((g) => g.id === lootTypeId(s)) ? ref(lootTypeId(s)) : `<span>${esc(s)}</span>`)).join("")}</div><small>Reported container or loot types; these do not guarantee an item or a spawn location.</small>` : "<p>Loot sources are not listed for this item. No location has been inferred.</p>"}`;
    })
    .join("");
  const unlocks = intel.unlocks.filter(
    (u) => ids.includes(u.outputItemId) || ids.includes(u.id),
  );
  const references = unlocks
    .map(
      (u) =>
        `<details><summary>${esc(u.name)} · ${esc(u.kind)}</summary><p>${u.dmzLevel ? `Reported DMZ level: ${esc(u.dmzLevel)}. ` : ""}${u.outputCount ? `Reported output: ${esc(u.outputCount)}. ` : ""}Source reference; ownership and crafting access are tracked separately.</p><h4>Listed requirements</h4><ul>${u.requirements?.map((r) => `<li>${itemLink(r.itemId)} × ${esc(r.amount)}</li>`).join("") || "<li>No requirements listed.</li>"}</ul><h4>FOB prerequisites</h4><ul>${u.requiredFobIds?.map((id) => `<li>${intel.upgradeMap[id] ? ref(intel.upgradeMap[id]) : esc(id) + " (not mapped)"}</li>`).join("") || "<li>No FOB prerequisite listed.</li>"}</ul></details>`,
    )
    .join("");
  return `<section id="item-find" tabindex="-1" class="panel tcno-item-intel" data-item-source-intel><h2>Where to find</h2>${pack.guides.some((g) => g.id === LOOT_TYPES_INDEX) ? `<p class="loot-type-buttons">${ref(LOOT_TYPES_INDEX)}</p>` : ""}<p><a href="https://tools.tcno.co/dmz/fob">TroubleChute source</a> · checked ${esc(intel.reviewed)} · source-reported, current game build not independently verified.</p>${facts}${mapAreas}<details class="item-unlock-references"><summary>Source crafting &amp; unlock references (${unlocks.length})</summary>${references || "<p>No unlock reference listed for this item in the captured source.</p>"}</details></section>`;
}
