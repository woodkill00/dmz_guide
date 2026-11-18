import { e } from "./render.mjs";
import { progressCatalog } from "../domain/camo-progress.mjs";
import { camoGroups, camoImagePath } from "../domain/weapon-camos.mjs";
import { weaponClasses } from "./gunsmith-presentation.mjs";

export const camoMedals = ["gold", "platinum", "harmonic-break", "divergence"];
const names = ["Gold", "Platinum", "Harmonic Break", "Divergence"];
function medals(weapon, scope, total) {
  return camoMedals
    .map(
      (id, i) =>
        `<span class="camo-medal"><span class="camo-medal-art"><img src="${camoImagePath(weapon.id, id)}" width="128" height="128" alt="" loading="lazy"><span aria-hidden="true">${i + 1}</span></span><strong>${names[i]}</strong><span data-camo-metric="${id}" data-scope="${scope}">— / ${id === "divergence" ? 1 : total}</span>${id === "divergence" ? "<small>Shared unlock</small>" : ""}</span>`,
    )
    .join("");
}
function weaponRow(w) {
  const group = (g) =>
    `<div class="camo-overview-group" data-overview-group="${g}"><span class="camo-overview-group-label">${e(camoGroups[g])}</span><div class="camo-dots">${w.rows
      .filter((r) => r.group === g)
      .map(
        (r) =>
          `<button type="button" class="camo-dot" data-overview-camo="${r.id}" data-state="unknown" aria-expanded="false" title="${e(r.name)}" disabled><span class="camo-tile-image"><span class="camo-image-fallback">?</span><img src="${camoImagePath(w.id, r.id)}" width="128" height="128" alt="" loading="lazy" decoding="async" data-camo-image></span><span class="sr-only">${e(w.name)} · ${e(r.name)} · <span data-camo-dot-status>Progress unavailable</span></span><span class="camo-dot-mark" aria-hidden="true"></span></button>`,
      )
      .join("")}</div></div>`;
  return `<article class="camo-overview-weapon" data-overview-weapon="${w.id}" data-search="${e(w.name.toLowerCase())}" data-class="${w.category}"><header><a data-camo-weapon="${w.id}" data-search="${e(w.name.toLowerCase())}" data-class="${w.category}" href="/armory/camos/${w.id}/"><h2>${e(w.name)} <span aria-hidden="true">↗</span></h2></a><span data-overview-weapon-count>— / 18 weapon-specific</span></header><div class="camo-overview-dots">${Object.keys(camoGroups).map(group).join("")}</div></article>`;
}
export function renderCamoOverview(catalog) {
  const roster = catalog.weapons.map(({ id, name, category }) => ({
    id,
    name,
    category,
  }));
  return `<section id="camo-overview" aria-label="Your camo tracker"><div class="camo-summary-medals" aria-label="Completionist progress">${medals(catalog.weapons[0], "all", catalog.weapons.length)}</div><p class="camo-tracking-note">35 known weapons · published mastery gates still require 33 unlocks. Divergence and mode mastery are shared. Red: remaining · Yellow: next to track · Green: completed.</p><div class="camo-tracker-toolbar"><p id="camo-save-status" role="status">Reading existing armory…</p><button id="camo-refresh" type="button">Refresh saved</button><a href="/armory/workbench/#backups">Backups</a></div><p id="camo-save-error" role="alert" hidden></p><div id="camo-recovery" class="camo-recovery" hidden><button id="camo-export-failed" type="button">Export unsaved</button><button id="camo-retry" type="button">Retry save</button><button id="camo-reload" type="button">Reload saved</button></div><form class="camo-search" role="search"><label>Find weapon<input type="search" maxlength="100" data-camo-query></label><label>Weapon class<select data-camo-class><option value="">All classes</option>${weaponClasses.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></label><button type="reset">Reset</button><output data-camo-count aria-live="polite">35 weapons</output></form><p data-camo-empty hidden>No weapons match. Clear the search or choose All classes.</p><div class="camo-class-list">${weaponClasses
    .map(([category, label]) => {
      const weapons = catalog.weapons.filter((w) => w.category === category);
      return `<details class="camo-class" data-overview-class="${category}"><summary><span class="camo-class-title"><strong>${label}</strong><small>${weapons.length} weapons</small></span><span class="camo-class-medals">${medals(weapons[0], category, weapons.length)}</span></summary><div class="camo-class-weapons">${weapons.map(weaponRow).join("")}</div></details>`;
    })
    .join(
      "",
    )}</div><noscript><p>Expand a class and open a weapon for all sourced requirements. JavaScript enables private completion controls.</p></noscript></section><script type="application/json" id="camo-progress-data">${JSON.stringify(progressCatalog(catalog)).replaceAll("<", "\\u003c")}</script><script type="application/json" id="camo-overview-roster">${JSON.stringify(roster).replaceAll("<", "\\u003c")}</script>`;
}
