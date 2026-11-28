import { weaponClasses, className } from "./gunsmith-presentation.mjs";
import { blueprintOwnedName } from "../domain/weapon-acquisition.mjs";
import { weaponURL } from "../domain/weapon-routes.mjs";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export function renderWeaponCard(weapon, catalog, selected = null) {
  const search = [
    weapon.name,
    className(weapon.category),
    ...catalog.blueprints
      .filter((b) => b.weapon === weapon.id)
      .map(blueprintOwnedName),
  ]
    .join(" ")
    .toLowerCase();
  const track = (prestige) => {
    const prefix = prestige ? "prestige" : "picker-camo";
    const panel = (prestige ? "prestige-" : "picker-camo-") + weapon.id;
    const title = prestige ? "Prestige" : "Camo";
    const completion = prestige
      ? "data-prestige-complete"
      : "data-picker-complete";
    return `<div class="picker-track" data-picker-track="${prestige ? "prestige" : "camo"}"><div class="picker-track-heading"><strong>${title}</strong><small data-${prefix}-count>—/${prestige ? 4 : 21}</small></div><div class="picker-track-row"><button class="picker-challenge" type="button" data-${prefix}-open aria-controls="${panel}" aria-expanded="false" disabled><span class="picker-swatch"><img data-${prefix}-image width="32" height="32" alt="" loading="lazy" decoding="async" hidden><span aria-hidden="true">ⓘ</span></span><span class="picker-challenge-copy"><strong data-${prestige ? "prestige-name" : "picker-camo-name"}>Reading progress…</strong><small data-${prefix}-status>Reading progress…</small><span class="picker-unlock-hint">How to unlock ▾</span></span><span class="sr-only"> · ${e(weapon.name)}</span></button><fieldset data-private-controls disabled><legend class="sr-only">${title}: ${e(weapon.name)}</legend><label class="picker-done"><input type="checkbox" ${completion} aria-label="Done · ${title.toLowerCase()}: ${e(weapon.name)}"><span>Done</span></label></fieldset></div><div id="${panel}" class="picker-requirement" data-${prefix}-detail hidden><strong>How to complete</strong><p data-${prefix}-requirement></p>${prestige ? "" : `<fieldset data-private-controls disabled><legend class="sr-only">Choose tracked camo</legend><label class="picker-another">Track another camo<select data-picker-camo-select aria-label="Track another camo: ${e(weapon.name)}"><option>Reading camo progress…</option></select></label></fieldset>`}<div class="picker-detail-links"><a data-${prefix}-link href="${weaponURL(weapon.id, "camos")}">Full tracker / undo</a><a data-${prefix}-source target="_blank" rel="noopener noreferrer" hidden>Source</a></div></div></div>`;
  };
  return `<article class="weapon-context-card" data-weapon-card="${weapon.id}" data-selected="${weapon.id === selected}"><div class="picker-card-heading"><a data-weapon-context="${weapon.id}" data-search="${e(search)}" href="${weaponURL(weapon.id)}" ${weapon.id === selected ? 'aria-current="page"' : ""}><strong>${e(weapon.name)}</strong></a></div><div class="picker-controls"><fieldset class="picker-ownership" data-private-controls disabled><legend class="sr-only">Ownership: ${e(weapon.name)}</legend><label class="picker-prestiged"><input type="checkbox" data-picker-prestiged aria-label="Prestiged: ${e(weapon.name)}">Prestiged</label><label class="picker-manual"><input type="checkbox" data-picker-manual aria-label="Manual owned: ${e(weapon.name)}">Manual</label></fieldset><div class="picker-extractions"><details class="picker-count-help"><summary data-picker-extraction-help aria-label="—/3 · ${e(weapon.name)}: manual extraction count not recorded. Show count help." title="Successful weapon manual extractions toward the goal of 3. Manual ownership is tracked separately."><span data-weapon-context-progress aria-live="polite">—/3</span></summary><span class="picker-count-description">Successful weapon manual extractions toward the goal of 3. Manual ownership is tracked separately; an unrecorded count is shown as —.</span></details><fieldset data-private-controls disabled><legend class="sr-only">Manual extractions: ${e(weapon.name)}</legend><div class="picker-extraction-actions"><button type="button" data-picker-extraction-step="-1" aria-label="− Remove one extracted manual: ${e(weapon.name)}" title="Remove one extracted manual">−</button><button type="button" data-picker-extraction-step="1" aria-label="+ Add one extracted manual: ${e(weapon.name)}" title="Add one extracted manual">+</button></div></fieldset></div></div>${track(false)}${track(true)}<div data-picker-error hidden role="alert"></div><a class="picker-save-recovery" href="#backups" hidden>Save recovery</a></article>`;
}
export function renderWeaponPicker(catalog, selected, expanded = false) {
  const card = (weapon) => renderWeaponCard(weapon, catalog, selected);
  const groups = weaponClasses
    .map(([category, label]) => {
      const weapons = catalog.weapons
        .filter((w) => w.category === category)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (!weapons.length) return "";
      return `<details class="weapon-picker-group" data-picker-category="${category}" open><summary><h3>${e(label)} <small data-picker-group-count>${weapons.length}</small></h3></summary><div class="weapon-context-list">${weapons.map(card).join("")}</div></details>`;
    })
    .join("");
  return `<details id="weapon-picker" class="weapon-picker" ${expanded ? "open" : ""}><summary><h2 class="picker-head">Choose weapon <small>${catalog.weapons.length} weapons</small></h2></summary><div class="weapon-picker-filters"><label>Find weapon or blueprint<input id="weapon-context-search" type="search" maxlength="200" placeholder="Weapon, class or blueprint…"></label><label>Show<select id="weapon-context-filter"><option value="all">All weapons</option><option value="missing">Manual needed</option><option value="owned">Manual owned</option><option value="remaining">Below 3 / unrecorded extractions</option><option value="completed">3+ extracted manuals</option></select></label></div><div aria-label="Choose a weapon">${groups}</div><p id="weapon-context-empty" hidden>No matching weapons.</p></details>`;
}
