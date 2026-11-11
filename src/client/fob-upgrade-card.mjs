import { escapeHTML as esc } from "../ui/render.mjs";
export { parseUpgradeStock } from "../domain/inventory-stock.mjs";
const number = (n) =>
  n == null ? "Not entered" : Number(n).toLocaleString("en-US");
export function fobUpgradeMaterials(
  pack,
  profile,
  row,
  budgetRow,
  drafts = new Map(),
) {
  if (!budgetRow || row.hidden) return "";
  const items = new Map(pack.items.map((i) => [i.id, i]));
  const readonly =
    profile.contentVersion !== pack.contentVersion || profile.schemaVersion < 2;
  const disabled = readonly ? " disabled data-upgrade-readonly" : "";
  const order = new Map(
    (pack.objectives.find((o) => o.id === row.id)?.requirements || []).map(
      (r, index) => [r.itemId, index],
    ),
  );
  const materials = budgetRow.materials
    .slice(0, 50)
    .sort((a, b) => (order.get(a.id) ?? 1e6) - (order.get(b.id) ?? 1e6));
  const covered = materials.filter(
    (m) => m.required != null && m.missing === 0,
  ).length;
  const prerequisites = row.prerequisites.filter((p) => !p.depth).slice(0, 12);
  return `<div class="fob-card-body"><p class="fob-effect">${esc(row.description.split(" TroubleChute-listed")[0].slice(0, 240))}</p>${prerequisites.length ? `<p class="fob-prerequisites">Complete first: ${prerequisites.map((p) => (p.hidden ? "Protected prerequisite" : p.url ? `<a href="${esc(p.url)}">${esc(p.name)}</a>` : esc(p.name))).join(", ")}</p>` : ""}<div class="fob-materials" data-upgrade-column="materials">${
    materials
      .map((m) => {
        const item = items.get(m.id);
        if (!item) return "";
        const unit = item.kind === "currency" ? "" : m.unit;
        const raw = drafts.has(m.id)
          ? drafts.get(m.id)
          : m.held == null
            ? ""
            : number(m.held);
        const gap = m.missing,
          status = gap == null ? "review" : gap > 0 ? "short" : "covered";
        return `<div class="fob-material" data-fob-material="${esc(m.id)}" data-stock-state="${status}"><div class="fob-material-icon" data-inventory-icon="${esc(m.id)}" data-icon-status="missing"><span aria-hidden="true">◇</span><small>Icon needed</small></div><div class="fob-material-name"><a href="/local/?pack=${encodeURIComponent(pack.id)}&amp;id=${encodeURIComponent(m.id)}">${esc(m.name)}</a><small>${esc(item.rarity || "Rarity not recorded")}</small><span class="fob-material-count">${number(m.held)} / ${m.required == null ? "Unknown" : number(m.required)} <small>${esc(unit)}</small></span><small class="fob-material-missing">${gap == null ? "Enter owned to calculate missing" : gap > 0 ? `${number(gap)} missing` : "Listed stock covered"}${m.reserve ? ` · Reserve ${number(m.reserve)}` : ""}</small></div><div class="fob-stock-controls"><button type="button" data-fob-step="-1" data-item="${esc(m.id)}" aria-label="Decrease owned ${esc(m.name)}"${disabled}>−</button><input type="text" inputmode="numeric" data-fob-owned="${esc(m.id)}" data-upgrade="${esc(row.id)}" value="${esc(raw)}" placeholder="Owned" aria-label="Owned ${esc(m.name)} for ${esc(row.name)}"${disabled}><button type="button" data-fob-step="1" data-item="${esc(m.id)}" aria-label="Increase owned ${esc(m.name)}"${disabled}>+</button><button type="button" data-fob-save="${esc(m.id)}" aria-label="Save owned ${esc(m.name)}"${disabled}>Save</button><small data-fob-dirty="${esc(m.id)}"${drafts.has(m.id) ? "" : " hidden"}>Unsaved</small></div></div>`;
      })
      .join("") || "<p>No visible listed materials. Check Details.</p>"
  }</div><div class="fob-material-progress"><span>${covered} / ${materials.length} listed amounts covered</span><progress max="${Math.max(1, materials.length)}" value="${covered}" aria-label="Material stock coverage for ${esc(row.name)}"></progress></div><small class="fob-stock-note">Shared global stock · completion is separate${budgetRow.unknown ? " · Source / stock needs review" : ""}</small></div>`;
}
