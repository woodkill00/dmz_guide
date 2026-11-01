import {
  weaponClasses,
  className,
  launchValue,
  weaponFigure,
  weaponPreview,
  qualityStrip,
  launchStrip,
} from "./gunsmith-presentation.mjs";
import { e } from "./render.mjs";
import figures from "./weapon-figures.json" with { type: "json" };
function rail() {
  return `<nav class="gs-rail" aria-label="Weapon tools"><a href="/armory/" aria-label="Weapon roster" title="Weapon roster">≡</a><a href="/armory/workbench/#builder" aria-label="Loadout builder" title="Loadout builder">⌘</a><a href="/armory/workbench/#compare" aria-label="Compare weapons" title="Compare weapons">⇄</a><a href="/armory/workbench/#acquisition" aria-label="Acquisition tracker" title="Acquisition tracker">✓</a><a href="/armory/updates/" aria-label="Weapon updates" title="Weapon updates">↻</a></nav>`;
}
export function gunsmithHeader(weapon) {
  return `<header class="gs-heading"><div><p class="eyebrow">GUNSMITH / ${weapon ? '<a href="/armory/">WEAPON ARMORY</a>' : "FIELD GUIDE"}</p><h1>${e(weapon?.name || "Weapon armory")}</h1><p class="gs-subtitle">${weapon ? e(className(weapon.category)) : "Browse weapons. Inspect attachments. Build your loadout."}</p></div><a class="gs-workspace-link" href="/armory/workbench/">Open my workbench <span aria-hidden="true">↗</span></a></header>`;
}
export function renderWeaponRoster(db) {
  // Only the visible sequence established by reference127; retain source order afterward.
  const referenceOrder = [
    "han-86",
    "m4",
    "hyeon-burst",
    "kastov-762",
    "patriot-xmr",
  ];
  const weapons = [...db.weapons].sort((a, b) => {
    const rank = (w) =>
      referenceOrder.includes(w.id)
        ? referenceOrder.indexOf(w.id)
        : referenceOrder.length + db.weapons.indexOf(w);
    return rank(a) - rank(b);
  });
  const w = weapons[0];
  return `<section class="gs-surface" aria-label="Weapon armory">${rail()}<div class="gs-content"><div class="gs-class-menu" role="group" aria-label="Weapon classes"><button type="button" data-gs-class="" aria-pressed="true">All weapons</button>${weaponClasses.map(([id, label]) => `<button type="button" data-gs-class="${e(id)}" aria-pressed="false">${e(label)}</button>`).join("")}</div><div class="gs-directory"><section class="gs-roster" aria-label="Weapon selection"><form class="gs-roster-filter" data-weapon-filter><label>Find weapon<input type="search" data-weapon-search placeholder="Search weapons…"></label><label class="gs-class-select">Class<select data-weapon-class><option value="">All classes</option>${weaponClasses.map(([id, label]) => `<option value="${e(id)}">${e(label)}</option>`).join("")}</select></label><output data-weapon-count aria-live="polite">${db.weapons.length} weapons</output></form><ul class="gs-weapon-list">${weapons.map((gun, i) => `<li data-weapon-row data-search="${e(gun.name.toLowerCase())}" data-class="${e(gun.category)}" class="gs-weapon-row${i === 0 ? " is-selected" : ""}"><button type="button" data-preview-weapon="${e(gun.id)}" aria-pressed="${i === 0}" aria-label="Preview ${e(gun.name)}"><span class="gs-thumbnail">${weaponFigure(gun, { small: true, figures })}</span><span class="gs-row-title">${e(gun.name)}</span><span class="gs-row-meta">${e(launchValue(gun.official.rpm))}</span></button><a class="gs-row-link" href="/armory/${e(gun.id)}/" aria-label="Open ${e(gun.name)} Gunsmith">Open details <span aria-hidden="true">↗</span></a></li>`).join("")}</ul><p data-gs-empty hidden>No weapons match. Clear search or select All weapons.</p></section><section class="gs-preview" id="weapon-preview" aria-label="Selected weapon preview" aria-live="polite" data-selected-weapon="${e(w.id)}">${weaponPreview(db, w, figures)}</section></div><p class="gs-figure-credit">Official base weapon figures · local artwork only · <a href="${e(db.sources["official-launch"].url)}" target="_blank" rel="noopener noreferrer">Publisher source ↗</a></p></div></section><script type="application/json" id="gunsmith-roster-data">${JSON.stringify({ db: { weapons: db.weapons, attachments: db.attachments.map((a) => ({ weapons: a.weapons })), sources: { "official-launch": db.sources["official-launch"] } }, figures }).replaceAll("<", "\\u003c")}</script>`;
}
export function renderGunsmith(db, w) {
  const actualSlots = [
    ...new Set(
      db.attachments.filter((a) => a.weapons.includes(w.id)).map((a) => a.slot),
    ),
  ];
  const supported = w.slots.map((s) => s.toLowerCase().replace(/\s+/g, "-"));
  const slots = [...new Set(supported)];
  const apex = actualSlots.includes("apex");
  return `<section class="gs-surface gs-detail" aria-label="${e(w.name)} Gunsmith">${rail()}<div class="gs-content"><nav class="gs-detail-tabs" aria-label="Weapon information"><a href="#gunsmith" aria-current="location">Gunsmith</a><a href="#weapon-intel">Weapon intel</a><a href="#attachments">Attachments</a><a href="#patch-history">Patch notes</a></nav><div id="gunsmith" class="gs-gun-stage"><div class="gs-detail-art" role="group" aria-label="${e(w.name)} base weapon artwork, if available locally">${weaponFigure(w, { figures })}</div><nav class="gs-slot-map" aria-label="Supported attachment slots">${slots.map((s) => `<a href="#attachments" class="gs-slot gs-slot-${e(s)}" data-focus-slot="${e(s)}"><span aria-hidden="true" class="gs-plus">+</span><span>${e(s.replaceAll("-", " "))}<small>${db.attachments.filter((a) => a.weapons.includes(w.id) && a.slot === s).length} reported options</small></span></a>`).join("")}${apex ? `<a href="#attachments" class="gs-slot gs-slot-apex" data-focus-slot="apex"><span aria-hidden="true" class="gs-plus">◇</span><span>Apex<small>${e(w.apex)}</small></span></a>` : ""}</nav></div><div class="gs-detail-footer"><div><p class="eyebrow">BASE WEAPON / NO ATTACHMENTS SELECTED</p><p class="gs-slot-capacity">${slots.length ? "Planning template: five standard + one Apex maximum; verify supported slots." : "No standard attachment slots reported for this weapon."}</p>${qualityStrip()}</div><div>${launchStrip(w)}<p class="gs-caption">Official shared launch · ${e(db.sources["official-launch"].date)}<br>Unknown bars are not performance scores.</p></div><div class="gs-detail-actions"><a class="gs-primary" href="/armory/workbench/?weapon=${e(w.id)}#builder">Build this weapon <span aria-hidden="true">→</span></a><a href="/armory/">← Back to weapon list</a><p class="gs-caption">Base illustration only. Attachment selection happens in your private workbench.</p></div></div><p class="gs-figure-credit"><a href="${e(figures[w.id]?.sourceURL || db.sources["official-launch"].url)}" target="_blank" rel="noopener noreferrer">Official weapon figure ↗</a> · local-use artwork · 2D view</p></div></section>`;
}
