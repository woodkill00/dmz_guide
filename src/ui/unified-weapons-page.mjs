import { featurePages as workbenchPages } from "./armory-workbench-page.mjs";
import { renderArmory } from "./armory-page.mjs";
import { renderCamoGrid } from "./camo-grid-view.mjs";
import { renderWeaponCamos } from "./weapon-camos-page.mjs";
import { weaponFigure, className } from "./gunsmith-presentation.mjs";
import figures from "./weapon-figures.json" with { type: "json" };
import { readWeaponAcquisition } from "../content/weapon-acquisition.mjs";
import { readWeaponCamos } from "../content/weapon-camos.mjs";
import { blueprintOwnedName } from "../domain/weapon-acquisition.mjs";
import { weaponURL, weaponSections } from "../domain/weapon-routes.mjs";
import { e } from "./render.mjs";
import { renderWeaponPicker } from "./weapon-picker-view.mjs";

export async function unifiedWeaponsPages(packs) {
  const [base] = await workbenchPages(packs),
    data = JSON.parse(
      base.body.match(/id="armory-public-data">([\s\S]*?)<\/script>/)[1],
    ),
    catalog = await readWeaponAcquisition(),
    camos = await readWeaponCamos();
  const tools = base.body.slice(base.body.indexOf('<section id="compare"'));
  return [null, ...catalog.weapons].map((requested) => {
    const weapon = requested || catalog.weapons[0],
      combat = data.db.weapons.some((w) => w.id === weapon.id),
      camoWeapon = camos.weapons.find((w) => w.id === weapon.id),
      known = catalog.blueprints.filter((b) => b.weapon === weapon.id),
      sourceLinks = (ids) =>
        ids
          .map((id) => {
            const source = catalog.sources.find((s) => s.id === id);
            return `<a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">${source.status === "official" ? "Publisher" : "Reported"} source</a>`;
          })
          .join(" · ");
    let body = tools.replaceAll(
      `<option value="${weapon.id}">`,
      `<option value="${weapon.id}" selected>`,
    );
    const acquisitionStart = body.indexOf('<section id="acquisition"'),
      editorStart = body.indexOf('<details id="acquisition-editor">');
    body =
      body.slice(0, acquisitionStart) +
      `<section id="acquisition" data-workbench-panel><h2>Your acquisition</h2><p class="weapon-small-note">Manual ownership and successful manual extractions are separate records. Changes save automatically.</p>` +
      body.slice(editorStart);
    body = body
      .replace(
        '<details id="acquisition-editor">',
        '<details id="acquisition-editor" open>',
      )
      .replace(
        "Attachments and blueprints for selected weapon",
        "Manuals, attachments & blueprints",
      )
      .replace(
        '<select id="tracker-weapon">',
        '<select id="tracker-weapon" aria-label="Acquisition weapon">',
      );
    const manual =
      '<label class="check-label"><input id="tracker-manual" type="checkbox">Weapon manual acquired (your record)</label>';
    body = body.replace(
      manual,
      `${manual}<form id="weapon-extractions" class="weapon-extractions"><label>Manuals extracted <input name="count" type="number" min="0" max="9999" step="1" inputmode="numeric" placeholder="Not recorded"></label><button type="button" data-extraction-step="-1" aria-label="Remove one manual extraction">−</button><output id="weapon-extraction-count">Not recorded / 3</output><button type="button" data-extraction-step="1" aria-label="Add one manual extraction">+</button><button type="submit">Save count</button></form><small>Reported goal: 3 extracted manuals. Ownership alone does not complete this goal or a camo. <a href="https://dmzhub.gg/weapons/manuals" target="_blank" rel="noopener noreferrer">Reference</a></small><h3>Known blueprints</h3><div id="weapon-known-blueprints">${known.length ? known.map((b) => `<label class="weapon-blueprint"><span><input type="checkbox" data-unified-blueprint="${b.id}"> ${e(blueprintOwnedName(b))}</span><small>${e(b.method)} · ${sourceLinks(b.sourceIds)}</small></label>`).join("") : "<p>No named blueprints catalogued for this weapon. Record an unlisted one below.</p>"}</div><h3>Owned attachments</h3>`,
    );
    // The selected context replaces the legacy editor's independent weapon picker.
    body = body.replace(
      '<select id="tracker-weapon" aria-label="Acquisition weapon">',
      '<select id="tracker-weapon" aria-label="Acquisition weapon" data-context-picker>',
    );
    body = body
      .replace(/<label>Find attachment[\s\S]*?<\/label>/, "")
      .replace("<h3>Owned attachments</h3>", "")
      .replace("Owned blueprint name", "Unlisted blueprint name")
      .replace(
        '<div id="tracker-attachments" class="armory-choices"></div>',
        "",
      )
      .replace('<p id="tracker-count" aria-live="polite"></p>', "")
      .replace(
        '<h3>Acquisition references</h3><div id="acquisition-links"></div>',
        '<details class="weapon-source-notes"><summary>Acquisition references</summary><div id="acquisition-links"></div></details>',
      );
    const ownedAttachments = `<section id="owned-attachments" data-workbench-panel><h2>Owned attachments · ${e(weapon.name)}</h2><p class="weapon-small-note">Track ownership here. Use Builds to configure a loadout, or <a href="#attachments">read compatibility and effects</a>.</p><label class="weapon-attachment-search">Find attachment<input name="trackerSearch" id="tracker-search" type="search" maxlength="200"></label><fieldset data-private-controls disabled><legend>Attachment ownership</legend><div id="tracker-attachments" class="armory-choices"></div></fieldset><p id="tracker-count" aria-live="polite"></p></section>`;
    const reference = combat
      ? renderArmory(
          data.db,
          weapon.id,
          new Set(packs.flatMap((p) => p.items.map((i) => i.id))),
          data.codmunity,
          { embedded: true },
        )
      : `<h2>${e(weapon.name)} reference</h2><p id="attachments">Combat statistics and attachment compatibility have not been catalogued for this weapon. Acquisition and all captured camo challenges remain available; no substitute weapon statistics are shown.</p>${sourceLinks(weapon.sourceIds)}`;
    // Retain source/seasonal notes from the existing camo reference without a second tracker.
    const camoReference = renderWeaponCamos(
      camos,
      camoWeapon,
      new Set(data.db.weapons.map((w) => w.id)),
    );
    const guidance = camoReference.slice(
      camoReference.indexOf("</script>") + "</script>".length,
    );
    const camoGrid = renderCamoGrid(camos, camoWeapon).replace(
      /<div class="camo-tracker-toolbar">[\s\S]*?<div class="camo-view-buttons"/,
      '<div class="camo-view-buttons"',
    );
    const panels = `<section id="camos" data-workbench-panel><h2>Camo challenges · ${e(weapon.name)}</h2><p class="weapon-small-note">${e(camos.provider.date)} source snapshot · <a href="#backups">Save recovery & backups</a></p>${camoGrid}${guidance}</section><section id="reference" data-workbench-panel>${reference}</section>`;
    const context = {
      weapon: weapon.id,
      combat,
      known,
      sources: catalog.sources,
    };
    const picker = renderWeaponPicker(catalog, weapon.id, !requested);
    const header = `<header class="weapon-workspace-heading"><div><p class="eyebrow"><a href="/armory/">WEAPONS</a> / ${e(className(weapon.category))}</p><h1>${requested ? e(weapon.name) : "Weapons"}</h1><p>${requested ? "Acquisition, camos, attachments and builds." : `Selected: ${e(weapon.name)} · All your weapon tools in one place.`}</p></div><div class="weapon-context-art">${weaponFigure(weapon, { small: true, figures })}</div></header>`;
    return {
      path: requested ? `/armory/${weapon.id}/` : "/armory/",
      title: requested ? `${weapon.name} · Weapons` : "Weapons",
      page: "armory-workbench",
      body: `<div class="weapon-workspace" data-selected-weapon="${weapon.id}">${header}${picker}<nav class="armory-tabs weapon-workspace-tabs" aria-label="Weapon workspace">${Object.entries(
        weaponSections,
      )
        .map(([id, label]) => `<a href="#${id}">${label}</a>`)
        .join(
          "",
        )}</nav><div class="weapon-save-line"><p id="armory-status" role="status">Opening private storage…</p><a href="/armory/updates/">Source updates</a></div><p id="armory-error" role="alert" hidden></p><noscript><p>Tracking requires JavaScript. The weapon's sourced reference and camo requirements remain readable below.</p></noscript>${body}${ownedAttachments}${panels}<script type="application/json" id="unified-weapon-context">${JSON.stringify(context).replaceAll("<", "\\u003c")}</script></div>`,
      scripts: [
        "/assets/src/client/armory-workbench.mjs",
        "/assets/src/client/armory.mjs",
      ],
      styles: [
        ...base.styles,
        "/assets/src/ui/weapon-camos.css",
        "/assets/src/ui/unified-weapons.css",
      ],
    };
  });
}
