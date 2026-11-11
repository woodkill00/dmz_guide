import { escapeHTML as esc } from "../ui/render.mjs";
const n = (v) => (v == null ? "Review" : Number(v).toLocaleString("en-US"));
export function buildRow(row) {
  return `<li class="collect-row build-ingredient" data-collect-row="${esc(row.id)}" data-covered="${row.remaining === 0}"><div class="collect-icon" data-inventory-icon="${esc(row.id)}" data-icon-status="missing">◇</div><a class="build-ingredient-name" href="/local/?pack=${encodeURIComponent(row.packId)}&amp;id=${encodeURIComponent(row.id)}" title="Owned ${row.held == null ? "not entered (assumed 0)" : n(row.held)}; required ${n(row.required)}">${esc(row.name)}</a><strong data-collect-remaining aria-label="${esc(n(row.remaining))} still needed" title="Still needed${row.minimum ? "; minimum only" : ""}">${row.minimum && row.remaining != null ? "≥" : ""}${n(row.remaining)}</strong></li>`;
}
export function itemSummaryMarkup(
  rows,
  pack,
  { key, title, describe, recipeTotals = false },
) {
  const tiles = rows
    .map((r, index) => {
      const item = pack.items.find((i) => i.id === r.id),
        raw = String(item?.rarity || "").toLowerCase();
      const rarity = [
        "common",
        "uncommon",
        "rare",
        "epic",
        "legendary",
        "ultra",
      ].includes(raw)
        ? raw
        : "unknown";
      const count = recipeTotals ? r.required : r.remaining;
      const text = `${r.name}: ${n(r.required)} required; ${n(r.remaining)} missing; owned ${r.held == null ? "not entered" : n(r.held)}; ${item?.rarity || "rarity unknown"}`;
      const panel = `${key}-peek-${index}`;
      return `<div class="build-summary-entry"><button type="button" class="build-summary-tile" data-build-peek="${esc(r.id)}" data-rarity="${rarity}" data-covered="${r.remaining === 0}" aria-expanded="false" aria-controls="${panel}" aria-label="${esc(text)}" title="${esc(text)}"><span data-inventory-icon="${esc(r.id)}" data-icon-status="missing" aria-hidden="true">◇</span><span class="build-summary-name">${esc(r.name)}</span><strong>${r.minimum && count != null ? "≥" : ""}${n(count)}</strong>${recipeTotals ? `<small class="build-summary-missing">${n(r.remaining)} missing</small>` : ""}</button><div id="${panel}" class="build-summary-info" data-build-info="${esc(r.id)}" hidden><strong>${esc(r.name)}</strong><button type="button" data-build-peek-close aria-label="Close ingredient details">×</button><p>Required <b>${n(r.required)}</b> · Missing <b>${n(r.remaining)}</b> · Owned ${r.held == null ? "not entered (assumed 0)" : n(r.held)} · ${esc(item?.rarity || "Rarity unknown")}</p><small>${esc(describe(r))}</small><a href="/local/?pack=${encodeURIComponent(pack.id)}&amp;id=${encodeURIComponent(r.id)}">Item details</a></div></div>`;
    })
    .join("");
  return `<section class="build-summary" aria-label="${esc(title)}"><h2>${esc(title)} <small>${rows.length} types</small></h2><div class="build-summary-grid">${tiles}</div>${rows.length ? "" : "<small>No outstanding items in this section.</small>"}</section>`;
}
export function buildGroupsMarkup(model, pack, amounts, busy, open) {
  if (model.status !== "ok")
    return "<p>Update tracking to see ingredients.</p>";
  if (!model.groups.length)
    return "<small>Select items in Inventory to see their ingredients here.</small>";
  const rows = (list, key) =>
    `<ul class="quick-collect-list">${list.map((r) => buildRow({ ...r, packId: pack.id }, key, amounts, busy)).join("")}</ul>`;
  const alternatives = (list, key, id) =>
    list.length
      ? `<details class="build-secondary" data-build-alternatives="${esc(id)}"${open.get("alt:" + id) ? " open" : ""}><summary>Craft these ingredients instead</summary>${rows(list, key)}</details>`
      : "";
  const directIds = new Set(
    model.groups.flatMap((g) =>
      g.noRecipe ? [g.id] : g.direct.map((r) => r.id),
    ),
  );
  let html = "";
  if (model.groups.length > 1)
    html += `<details data-build-group="all"${open.get("all") ? " open" : ""}><summary>Shared ingredient totals</summary>${rows(
      model.combined.filter((r) => directIds.has(r.id)),
      "build-all",
    )}${alternatives(
      model.combined.filter((r) => !directIds.has(r.id)),
      "build-all-alt",
      "all",
    )}</details>`;
  for (const g of model.groups) {
    const expanded = open.has(g.id) ? open.get(g.id) : true;
    html += `<details data-build-group="${esc(g.id)}"${expanded ? " open" : ""}><summary>${esc(g.name)} <span class="build-quantity">×${n(g.quantity)}</span></summary>${g.noRecipe ? "<small>No crafting recipe recorded for this item.</small>" : g.ambiguous ? `<small><a href="/collection/?pack=${encodeURIComponent(pack.id)}#crafting">Choose a recipe</a> to see ingredients.</small>` : rows(g.direct, "build-" + g.id)}${alternatives(g.alternatives, "build-alt-" + g.id, g.id)}<details class="build-secondary" data-build-options="${esc(g.id)}"${open.get("opt:" + g.id) ? " open" : ""}><summary>Options</summary><div class="build-target-actions"><label>How many more<input type="number" min="1" max="1000000" value="${g.quantity}" data-build-count="${esc(g.id)}" aria-label="Additional quantity for ${esc(g.name)}"></label><button type="button" data-build-remove="${esc(g.id)}">Remove</button></div></details></details>`;
  }
  return (
    html +
    '<details class="build-secondary"><summary>About ingredient counts</summary><small>Numbers show ingredients still needed after inventory and reserves. Blank stock assumes 0. Targets mean additional items to make or get; owned finished items do not reduce them. Shared totals count stock once across builds; individual lists are separate estimates. Crafting inputs are alternatives, and recipe access is separate.</small></details>'
  );
}

export function buildSummaryMarkup(model, pack) {
  if (model.status !== "ok")
    return "<h2>Build ingredients</h2><small>Update tracking to see counts.</small>";
  if (!model.groups.length)
    return "<h2>Build ingredients</h2><small>Select items in Inventory to see their ingredients here.</small>";
  return (
    "<h2>Build ingredients</h2><small>Buttons show recipe totals; missing amounts account for inventory. Groups are calculated separately.</small>" +
    model.groups
      .map((g, index) => {
        const content = g.noRecipe
          ? "<small>No crafting recipe recorded for this item.</small>"
          : g.ambiguous
            ? `<small><a href="/collection/?pack=${encodeURIComponent(pack.id)}#crafting">Choose a recipe</a> to see ingredients.</small>`
            : itemSummaryMarkup(g.direct, pack, {
                key: `build-group-${index}`,
                recipeTotals: true,
                title: `${g.name} (+${n(g.quantity)})`,
                describe: () =>
                  `For ${g.name}. Counts use this build only; shared totals are available below.`,
              });
        return `<section class="build-tile-group" data-build-summary-group="${esc(g.id)}" aria-label="Ingredients for ${esc(g.name)}">${g.noRecipe || g.ambiguous ? `<h3>${esc(g.name)} (+${n(g.quantity)})</h3>` : ""}${content}</section>`;
      })
      .join("")
  );
}
export function outstandingSummaryMarkup(model, pack) {
  if (model.status !== "ok")
    return "<h2>Other outstanding items</h2><small>Update tracking to see counts.</small>";
  return itemSummaryMarkup(
    model.items.filter((r) => r.remaining !== 0),
    pack,
    {
      key: "outstanding",
      title: "Other outstanding items",
      describe: (r) =>
        `Unfinished missions and upgrades. ${(r.contributors || []).join(", ")}${r.alternative ? ". Crafting alternative" : ""}${r.minimum ? ". Partial or unknown requirement" : ""}`,
    },
  );
}
