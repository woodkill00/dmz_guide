import { readWeaponCamos } from "../content/weapon-camos.mjs";
import { weaponAlias } from "./weapon-alias.mjs";
export async function unifiedFeaturePages() {
  return [
    weaponAlias(
      "/armory/acquisition/",
      (await readWeaponAcquisition()).weapons.map((w) => w.id),
    ),
  ];
}
import { progressCatalog } from "../domain/camo-progress.mjs";
import {
  acquisitionCamoIcons,
  acquisitionCamoPanel,
} from "./acquisition-camos.mjs";
import { readWeaponAcquisition } from "../content/weapon-acquisition.mjs";
import { readWeaponIntel } from "../content/weapon-intel.mjs";
import {
  blueprintOwnedName,
  acquisitionCategories,
} from "../domain/weapon-acquisition.mjs";
import { weaponFigure, className } from "./gunsmith-presentation.mjs";
import figures from "./weapon-figures.json" with { type: "json" };
import { e } from "./render.mjs";
export async function featurePages() {
  const catalog = await readWeaponAcquisition(),
    combat = new Set((await readWeaponIntel()).weapons.map((w) => w.id));
  const camos = await readWeaponCamos();
  const refs = (ids) =>
    ids
      .map((id) => {
        const s = catalog.sources.find((s) => s.id === id);
        return `<a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${s.status === "official" ? "Publisher" : "Reported"} reference</a>`;
      })
      .join(" · ");
  const weaponRow = (w) => {
    const camoWeapon = camos.weapons.find((c) => c.id === w.id);
    const known = catalog.blueprints.filter((b) => b.weapon === w.id);
    return `<details class="acq-weapon" id="weapon-${w.id}" data-acquisition-weapon="${w.id}"><summary><span class="acq-art">${weaponFigure(w, { small: true, figures })}</span><strong>${e(w.name)}</strong><span data-acq-summary>Manual not marked · Extractions not recorded</span><small data-acq-blueprint-summary>${known.length} known blueprint entries</small>${acquisitionCamoIcons(camoWeapon)}</summary><div class="acq-weapon-body">${acquisitionCamoPanel(camoWeapon)}<p>${refs(w.sourceIds)} · ${combat.has(w.id) ? `<a href="/armory/${w.id}/">Weapon information</a>` : "Combat data not yet catalogued"} · <a href="/armory/camos/${w.id}/">Camo challenges</a>${w.category === "melee" ? " · Knife manual/camo applicability is unverified; this remains an editable player record." : ""}</p><fieldset data-private-controls disabled><legend>Your record · ${e(w.name)}</legend><div class="acq-record"><label><input type="checkbox" data-manual="${w.id}">Manual owned</label><div class="acq-counter"><button type="button" data-count-step="-1" aria-label="Remove one manual extraction: ${e(w.name)}">−</button><output data-acq-counter>Not recorded / 3</output><button type="button" data-count-step="1" aria-label="Add one manual extraction: ${e(w.name)}">+</button></div><span data-acq-goal>No extracted-manual count entered</span></div><form data-count-form="${w.id}" class="acq-count-form"><label>Correct manual extractions<input type="number" name="count" min="0" max="9999" step="1" inputmode="numeric" placeholder="Not recorded" aria-label="Manual extractions: ${e(w.name)}"></label><button>Save count</button><button type="button" data-cancel-count>Cancel entry</button></form><h3>Known blueprints <small data-known-owned></small></h3><p class="acq-hint">Ownership checklist for this snapshot. Variant labels distinguish ownership; source links explain acquisition.</p><div class="acq-blueprints">${known.length ? known.map((b) => `<div class="acq-blueprint"><label><input type="checkbox" data-known-blueprint="${b.id}"><strong>${e(blueprintOwnedName(b))}</strong></label><span>${e(b.method)} · ${refs(b.sourceIds)}</span></div>`).join("") : "<p>No named blueprints researched for this weapon yet. You can record an unlisted one below.</p>"}</div><details class="acq-custom"><summary>Unlisted owned blueprints</summary><ul data-custom-blueprints></ul><form data-custom-form="${w.id}"><label>Blueprint name<input name="blueprint" maxlength="100" required></label><button>Add owned blueprint</button></form></details></fieldset></div></details>`;
  };
  return [
    {
      path: "/armory/acquisition/",
      title: "Weapon blueprints & acquisition",
      page: "weapon-acquisition",
      styles: [
        "/assets/src/ui/weapon-acquisition.css",
        "/assets/src/ui/acquisition-camos.css",
      ],
      scripts: ["/assets/src/client/weapon-acquisition.mjs"],
      body: `<header class="page-heading"><p class="eyebrow">PRIVATE WEAPON CHECKLIST</p><h1>Weapon blueprints & acquisition</h1><p>Manual ownership, extracted manuals and blueprint ownership in one list.</p><p><a href="/">Dashboard</a> · <a href="/dmz-weapons/">DMZ Weapons</a> · <a href="/armory/workbench/#backups">Armory backups & recovery</a></p></header><section id="weapon-acquisition" aria-label="Weapon acquisition checklist"><p id="acq-status" role="status">Reading existing private armory…</p><p id="acq-error" role="alert" hidden></p><details class="acq-help"><summary>Three extractions · how this tracker works</summary><p>Count successful extractions of the same weapon's <strong>Weapon Manual</strong>, not copies of the gun. War Spoils is reported as a three-manual extraction goal: <a href="https://dmzhub.gg/weapons/manuals" target="_blank" rel="noopener noreferrer">DMZHub reference</a>. A secondary source says “three more”; this tracker uses a reported goal of three and does not verify or grant the in-game camo. A purchased/manual-owned unlock does not add extractions. Unrecorded is different from zero.</p><p>Knife manual/camo applicability and complete blueprint coverage remain unverified. No game-account detection or guaranteed manual drop is implied. Source methods can describe historical rewards or announced bundles.</p></details><div class="acq-toolbar"><label>Find weapon or blueprint<input id="acq-query" type="search" maxlength="200"></label><label>Class<select id="acq-class"><option value="">All classes</option>${acquisitionCategories.map((c) => `<option value="${c}">${e(className(c))}</option>`).join("")}</select></label><label>Show<select id="acq-filter"><option value="all">All weapons</option><option value="manual-missing">Manual not marked</option><option value="camo-needed">Below 3 / not recorded</option><option value="camo-done">3+ recorded extractions</option><option value="blueprints-needed">Known blueprint not marked</option></select></label><button id="acq-reset" type="button">Reset filters</button><button id="acq-refresh" type="button">Refresh saved</button></div><p id="acq-totals" role="status">${catalog.weapons.length} released weapon identities · ${catalog.blueprints.length} researched blueprint entries</p><div class="acq-recovery"><button id="acq-export" type="button">Export saved armory</button><button id="acq-export-draft" type="button" disabled>Export unsaved candidate</button><button id="acq-retry" type="button" disabled>Retry retained save</button><button id="acq-reload" type="button">Reload saved</button></div><p id="acq-empty" hidden>No weapons match these filters.</p><div id="acquisition-roster">${acquisitionCategories
        .map(
          (c) =>
            `<section data-acq-class="${c}" class="acq-group"><h2>${e(className(c))}</h2>${catalog.weapons
              .filter((w) => w.category === c)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(weaponRow)
              .join("")}</section>`,
        )
        .join(
          "",
        )}</div><p id="acq-archived"></p><details class="acq-help"><summary>Sources & coverage · checked ${catalog.updatedAt}</summary><p>${e(catalog.coverage)}</p><ul>${catalog.sources.map((s) => `<li><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)}</a> · ${e(s.status)} · checked ${s.date}</li>`).join("")}</ul><p>Maintain source facts in the repository acquisition catalog. Export private progress before changing browser/origin; the workbench backup restores it. Source updates never mark ownership for you.</p></details><noscript><p>Saving private progress requires JavaScript. The weapon and blueprint references remain readable.</p></noscript></section><script type="application/json" id="acquisition-public-data">${JSON.stringify(catalog).replaceAll("<", "\\u003c")}</script><script type="application/json" id="acquisition-camo-data">${JSON.stringify(progressCatalog(camos)).replaceAll("<", "\\u003c")}</script>`,
    },
  ];
}
