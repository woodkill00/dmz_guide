import { readWeaponCamos } from "../content/weapon-camos.mjs";
import { readWeaponIntel } from "../content/weapon-intel.mjs";
import { camoGroups, camoImagePath } from "../domain/weapon-camos.mjs";
import { e, pageHeading } from "./render.mjs";
const official =
  "https://www.callofduty.com/en/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige";
const external = (url, label) =>
  `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}<span class="sr-only"> (opens in new tab)</span></a>`;
const className = (v) => v.replaceAll("-", " ").toUpperCase();
export function progressionGuide() {
  return `<p class="camo-reference-note"><strong>Core order:</strong> Military + Special → Gold → Platinum → Harmonic Break → Divergence. Weapon Prestige is a separate path.</p><details class="camo-guidance"><summary>Unlock order &amp; shared progress</summary><ol><li><strong>Military:</strong> unlock the eight camos by levelling this weapon.</li><li><strong>Special:</strong> each of the three challenges opens at its own weapon level. They can overlap Military progression; completing every Military camo first is not required.</li><li><strong>Gold → Platinum → Harmonic Break → Divergence:</strong> Gold requires all eight Military and three Specials; Platinum requires class Gold unlocks. Harmonic Break requires 33 Platinum unlocks; Divergence requires 33 Harmonic Break unlocks. Those published thresholds do not change to match this directory's 35 guns. Platinum and Harmonic challenge progress may combine Multiplayer and DMZ.</li><li><strong>Weapon Prestige:</strong> Pyroclast at Prestige 1; Terminus at Prestige 1 maximum weapon level (automatic Prestige Master transition); Scatter at Prestige Master 150; Cascade at 250. Previously earned camos persist. Provider Terminus level labels below are retained observations, not an additional universal gate.</li><li><strong>Mode mastery:</strong> after Divergence, follow the MP or DMZ chain in order. These are shared unlock challenges displayed here as weapon associations, not 35 separate goals. Special camo designs also join the shared application pool.</li></ol><p>${external(official, "Official progression rules")} · Core objectives below are COD Central's dated DMZ reports; MP mastery rows are explicitly labelled. They are not a live-game verification.</p><p><strong>Reading source labels:</strong> “Earn … more weapon unlocks” is a captured source label, not a verified absolute level. Do not add or subtract one to invent a level. Source class-Gold counts and Terminus numbers remain visible; use official conditions above when wording differs.</p></details>`;
}
const supplements = () =>
  `<details class="camo-guidance"><summary>Warzone, seasonal &amp; War Spoils coverage</summary><h2>Additional camo paths</h2><p>The 25 core rows per gun do not cover every event, storefront or future reward. Additional per-camo pictures are not yet collected for the paths below.</p><h3>Warzone mastery · shared chain after Divergence</h3><ol><li><strong>Parallax:</strong> get 5 kills in a match 300 times.</li><li><strong>Damascus Reforged:</strong> get 2 kills without plating 200 times.</li><li><strong>Empyros:</strong> finish top 5 with at least 6 kills 75 times.</li></ol><p>Any MW4 weapon or combination can contribute; these are Warzone objectives. ${external("https://www.callofduty.com/uk/en/blog/2026/11/call-of-duty-modern-warfare-4-warzone-season-1", "Official Warzone briefing")}</p><h3>Season 1 BlackCell · entitlement required</h3><p>Five class challenges unlock Infiltrator (AR), Cell Ops (SMG), Gold Tiger (sniper), Whirlpool (LMG) and Intercept (melee), then Spinal Verge. DMZ objectives respectively: 20 triple kills; 200 kills; 100 headshots; 5 kills without reloading 10 times; 50 undetected kills. After all five, Spinal Verge asks for exfil with over 150 kills 5 times. ${external("https://www.callofduty.com/blog/2026/11/call-of-duty-modern-warfare-4-season-1-battle-pass-blackcell-store-bundles", "Official Battle Pass / BlackCell details")}</p><h3>Other rewards</h3><p>War Spoils manual-extraction tracking is separate: <a href="/armory/acquisition/">open weapon acquisition</a>. Manual ownership does not prove a camo was earned. Event camos Renaissance, Violet Striker and Neutral Ground, plus Royalty Gold Excellence and Gold Mosaic, have separate conditions/availability; complete numeric rules and pictures are not captured here. Use the official Warzone briefing above to review those paths.</p></details>`;
function rowView(w, r) {
  const local = camoImagePath(w.id, r.id),
    mode =
      r.group === "modeMastery"
        ? r.order <= 22
          ? "Multiplayer · shared"
          : "DMZ · shared"
        : r.id === "divergence"
          ? "Shared completionist"
          : r.group === "prestige"
            ? "Weapon Prestige"
            : "DMZ reference";
  return `<li class="camo-row" id="${e(r.id)}" data-camo-row="${e(r.id)}"><a class="camo-swatch" href="${e(local)}" target="_blank" rel="noopener noreferrer" ><span class="sr-only">${e(r.name)} camo: </span><span class="camo-image-fallback">View swatch</span><img src="${e(local)}" width="128" height="128" alt="" loading="lazy" decoding="async" data-camo-image></a><div class="camo-objective"><small>${e(mode)} · ${r.order}/25</small><h3>${e(r.name)}</h3><p>${e(r.requirement)}</p><small>${external(r.sourceURL, "Challenge source")} · ${external(r.image.sourceURL, "Source picture")}</small></div></li>`;
}
export function renderWeaponCamos(
  catalog,
  weapon = null,
  combatIds = new Set(),
) {
  const head = pageHeading(
    "WEAPON CAMOS",
    weapon ? weapon.name + " · Camo challenges" : "Camo challenges",
    weapon
      ? "Requirements, unlock order and source swatches."
      : "Find a weapon and browse its camo requirements.",
  );
  const nav = `<nav class="camo-links" aria-label="Camo reference"><a href="/dmz-weapons/">Weapons</a><a href="/armory/camos/">All weapon camos</a>${weapon ? `<a href="/armory/acquisition/?weapon=${weapon.id}#weapon-${weapon.id}">Manuals &amp; blueprints</a>${combatIds.has(weapon.id) ? `<a href="/armory/${weapon.id}/">${e(weapon.name)} information</a>` : ""}` : ""}</nav>`;
  const coverage = `<p class="camo-coverage">COD Central · reported ${e(catalog.provider.date)} · checked ${e(catalog.checkedAt)}. ${weapon ? "25 captured core entries" : "35 weapons · 875 source rows"}. <a href="#camo-sources">Coverage &amp; sources</a></p>`;
  const main = weapon
    ? `<p class="camo-reference-note">Reference only; these rows do not record or grant camo ownership. Swatches are provider renders, not verified in-game captures. Click a picture to view its full swatch.</p>${progressionGuide()}<div class="camo-groups">${Object.entries(
        camoGroups,
      )
        .map(
          ([key, label]) =>
            `<details class="camo-group" open><summary><h2>${e(label)} <span>${weapon.rows.filter((r) => r.group === key).length}</span></h2></summary><ol class="camo-rows">${weapon.rows
              .filter((r) => r.group === key)
              .map((r) => rowView(weapon, r))
              .join("")}</ol></details>`,
        )
        .join("")}</div>`
    : `<form class="camo-search" role="search"><label>Find weapon<input type="search" maxlength="100" data-camo-query></label><label>Weapon class<select data-camo-class><option value="">All classes</option>${[...new Set(catalog.weapons.map((w) => w.category))].map((c) => `<option value="${e(c)}">${e(className(c))}</option>`).join("")}</select></label><button type="reset">Reset</button><output data-camo-count aria-live="polite">35 weapons</output></form><div class="camo-directory">${catalog.weapons.map((w) => `<a class="camo-weapon-link" data-camo-weapon="${e(w.id)}" data-search="${e(w.name.toLowerCase())}" data-class="${e(w.category)}" href="/armory/camos/${w.id}/"><strong>${e(w.name)}</strong><small>${e(className(w.category))} ·25 entries</small><span aria-hidden="true">→</span></a>`).join("")}</div><p data-camo-empty hidden>No weapons match. Clear the search or choose All classes.</p>`;
  return (
    head +
    nav +
    coverage +
    main +
    supplements() +
    `<details class="camo-guidance" id="camo-sources"><summary>Coverage, artwork &amp; sources</summary><p>${e(catalog.coverage)}</p><p>${external(catalog.provider.url, "COD Central camo catalog")} · ${external(official, "Official progression")} · ${external("https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes", "Season 1 challenge corrections")}</p><p>Artwork stays in the authorized local cache and is not bundled with public releases. Missing or changed artwork leaves a labelled placeholder and original source link. To refresh references, review the dated capture and registry; routine builds and reading never download provider data.</p></details>`
  );
}
export async function featurePages() {
  const catalog = await readWeaponCamos(),
    combat = new Set((await readWeaponIntel()).weapons.map((w) => w.id));
  return [null, ...catalog.weapons].map((w) => ({
    path: w ? `/armory/camos/${w.id}/` : "/armory/camos/",
    title: w ? w.name + " camo challenges" : "Weapon camo challenges",
    page: "weapon-camos",
    body: renderWeaponCamos(catalog, w, combat),
    styles: ["/assets/src/ui/weapon-camos.css"],
    scripts: ["/assets/src/client/weapon-camos.mjs"],
  }));
}
