import { readCodmunity } from "../content/codmunity.mjs";
import codMetrics from "../domain/codmunity-metrics.json" with { type: "json" };
import { readWeaponIntel } from "../content/weapon-intel.mjs";
import { spoilerGuard } from "../domain/progression.mjs";
import { e, pageHeading, allRecords, recordUrl, isFixture } from "./render.mjs";
const field = (label, input) => `<label>${label}${input}</label>`;
const input = (name, attrs = "") => `<input name="${name}" ${attrs}>`;
const textarea = (name, max) =>
  `<textarea name="${name}" maxlength="${max}" rows="2"></textarea>`;
export function armoryPublicReferences(packs) {
  return packs
    .filter((p) => !isFixture(p))
    .flatMap((pack) => {
      const guard = spoilerGuard(pack);
      return allRecords([pack])
        .filter(
          (r) =>
            !r.spoiler &&
            ["guide", "objective", "location"].includes(r.recordType),
        )
        .flatMap((r) => {
          const scope = r.scope || pack.game;
          if ((scope?.gameId || scope?.id) !== "mw4" || scope.mode !== "dmz")
            return [];
          const row = {
            id: r.id,
            name: r.name || r.title,
            type: r.recordType,
            scope: "MW4 / DMZ",
            url: recordUrl(r),
            text: [
              r.id,
              r.name,
              r.title,
              r.description,
              r.body,
              JSON.stringify(r.requirements || []),
            ]
              .join(" ")
              .slice(0, 20000),
          };
          return guard.contains(JSON.stringify(row)) ? [] : [row];
        });
    });
}
export async function featurePages(packs) {
  const db = await readWeaponIntel();
  const codmunity = (await readCodmunity()).value;
  const refs = armoryPublicReferences(packs);
  const options = db.weapons
    .map((w) => `<option value="${e(w.id)}">${e(w.name)}</option>`)
    .join("");
  const metrics = [
    ...db.metrics,
    { id: "official:rpm", name: "Fire rate (launch field)", unit: "RPM" },
    { id: "official:magazine", name: "Magazine capacity", unit: "rounds" },
  ];
  const metricOptions = metrics
    .map(
      (m) =>
        `<option value="${e(m.id)}">${e(m.name)} · ${e(m.unit || "unspecified unit")}</option>`,
    )
    .join("");
  const nav = `<nav class="armory-tabs ui-weapon-context" aria-label="Armory workspace"><a href="#compare">Compare weapons</a><a href="#builder">Loadout builder</a><a href="#evidence">DMZ evidence</a><a href="#acquisition">Acquisition tracker</a><a href="#backups">Backups & recovery</a><a href="http://127.0.0.1:4176/" target="_blank" rel="noopener noreferrer">Update dashboard</a></nav>`;
  const compare = `<section id="compare" data-workbench-panel><h2>Compare weapons</h2><p>Choose two to four weapons. Source/mode views stay separate; unknown values are not zero.</p><div class="armory-control-grid">${field("Source / mode", `<select id="compare-mode"><option value="codmunity">CODMunity MW4 base *WZ — not tested in DMZ</option><option value="launch">Official shared launch sheet</option><option value="multiplayer">Community Multiplayer measurements</option><option value="dmz">My DMZ observations</option></select>`)}${field("Private measurement metric", `<select id="compare-metric">${metricOptions}</select>`)}</div><fieldset id="comparison-weapons"><legend>Weapons (2–4)</legend><div class="armory-choices">${db.weapons.map((w, i) => `<label><input type="checkbox" value="${e(w.id)}" ${i < 2 ? "checked" : ""}>${e(w.name)}</label>`).join("")}</div></fieldset><div id="comparison-observations"></div><div id="comparison-result" aria-live="polite"></div></section>`;
  const builder = `<section id="builder" data-workbench-panel><h2>Loadout builder</h2><p>Planning template: up to five standard attachments plus one Apex. Reported compatibility and blocked slots are enforced; looted eight-slot weapons are outside this template. No exact combined-stat or TTK prediction is claimed.</p><form id="build-form"><fieldset data-private-controls disabled><legend>Build configuration</legend><div class="armory-control-grid">${field("Weapon", `<select name="weapon" id="build-weapon">${options}</select>`)}${field("Build name", input("name", 'maxlength="100" required'))}${field("Private notes", textarea("notes", 1000))}</div><div id="build-pickers" class="armory-control-grid"></div><div id="build-validation" aria-live="polite"></div><div class="armory-actions"><button type="submit">Save build</button><button type="button" id="build-new">New build</button><button type="button" id="build-export">Export this build</button></div></fieldset></form><form id="build-import-form"><label>Import shared build (JSON, 16 KiB)<input id="build-import" type="file" accept="application/json,.json"></label></form><div id="build-import-preview" hidden></div><button type="button" id="build-import-use" hidden>Use imported build as draft</button><button type="button" id="build-import-cancel" hidden>Cancel build import</button><h3>Selected attachment explanations</h3><div id="build-advice"></div><h3>Saved builds</h3><div id="saved-builds"></div></section>`;
  const evidence = `<section id="evidence" data-workbench-panel><h2>Private DMZ evidence</h2><p>Record your own measurements and screenshots. Recorded/repeated labels describe your evidence; they do not make it official or verified. Use the same build, target, armor, range, method, fire mode and loadout context for comparison.</p><form id="evidence-form"><fieldset data-private-controls disabled><legend>New observation</legend><div class="armory-control-grid">${field("Weapon", `<select name="weapon">${options}</select>`)}${field("Metric", `<select name="metric">${metricOptions}</select>`)}${field("Value", input("value", 'type="number" min="0" max="1000000000" step="any" required'))}${field("Mode", '<select name="mode"><option value="dmz">DMZ</option><option value="multiplayer">Multiplayer</option></select>')}${field("Game build / patch", input("build", 'maxlength="120" required placeholder="Exact game build or patch date"'))}${field("Date", input("date", 'type="date" required'))}${field("Target", input("target", 'maxlength="100" required placeholder="AI type, operator or range target"'))}${field("Armor / health context", input("armor", 'maxlength="100" placeholder="Describe plates/health; unknown if unknown"'))}${field("Distance (meters, optional)", input("rangeMeters", 'type="number" min="0" max="10000" step="any"'))}${field("Fire mode", input("firingMode", 'maxlength="100" required placeholder="Full-auto, burst, semi-auto…"'))}${field("Loadout context", input("loadoutContext", 'maxlength="1000" required placeholder="Base/no attachments, or exact tested configuration"'))}${field("Measurement method", `<textarea name="method" maxlength="1000" rows="2" required></textarea>`)}${field("Evidence status", '<select name="status"><option value="recorded">Recorded observation</option><option value="repeated">Repeated test (user reported)</option></select>')}${field("Optional screenshot (PNG/JPEG/WebP, 2 MiB)", input("picture", 'type="file" accept="image/png,image/jpeg,image/webp"'))}</div><button type="submit">Save observation privately</button></fieldset></form><button type="button" id="cancel-evidence" hidden>Cancel picture preparation</button><h3>Recorded observations</h3><div id="observation-list"></div></section>`;
  const acquisition = `<section id="acquisition" data-workbench-panel><h2>Acquisition tracker</h2><div class="armory-control-grid">${field("Weapon", `<select id="tracker-weapon">${options}</select>`)}${field("Find attachment", input("trackerSearch", 'id="tracker-search" type="search"'))}</div><fieldset data-private-controls disabled><legend>What you have acquired</legend><label class="check-label"><input id="tracker-manual" type="checkbox">Weapon manual acquired (your record)</label><div id="tracker-attachments" class="armory-choices"></div><p id="tracker-count" aria-live="polite"></p><form id="blueprint-form"><label>Owned blueprint name<input name="blueprint" maxlength="100" required></label><button>Add blueprint</button></form><div id="blueprint-list"></div></fieldset><h3>Acquisition references</h3><div id="acquisition-links"></div><div id="archived-references"></div></section>`;
  const backups = `<section id="backups" data-workbench-panel><h2>Backups & recovery</h2><p>Private armory data belongs to this browser and origin. Backups include saved builds, acquisition records and screenshots; treat them as private. A single-build share excludes evidence and acquisition. No data is uploaded.</p><div class="armory-actions"><button id="workspace-export" type="button">Export private workspace</button><button id="workspace-unsaved" type="button">Export unsaved candidate</button><button id="workspace-retry" type="button">Retry retained unsaved save</button><button id="workspace-reload" type="button">Reload saved workspace</button><button id="workspace-previous" type="button">Preview previous snapshot</button></div><label>Restore private workspace (JSON, 12 MiB)<input type="file" id="workspace-import" accept="application/json,.json"></label><button id="workspace-import-cancel" type="button" hidden>Cancel restore preparation / preview</button><div id="workspace-preview" hidden></div><button id="workspace-import-apply" type="button" hidden>Apply reviewed workspace</button></section>`;
  const payload = JSON.stringify({
    db,
    refs,
    metrics,
    codmunity,
    codMetrics,
  }).replaceAll("<", "\\u003c");
  return [
    {
      path: "/armory/workbench/",
      title: "Armory workbench",
      page: "armory-workbench",
      body: `${pageHeading("PRIVATE ARMORY", "Compare. Build. Verify.", "Saved builds, evidence and acquisition stay on this device.")}<p><a href="/armory/">Weapon database</a> · <a href="/armory/updates/">Update dashboard startup</a></p>${nav}<p id="armory-status" class="notice" role="status">Opening private storage…</p><p id="armory-error" role="alert" hidden></p><noscript><p>Comparison, private storage and evidence tools require JavaScript. <a href="/armory/">The weapon database remains readable.</a></p></noscript>${compare}${builder}${evidence}${acquisition}${backups}<script type="application/json" id="armory-public-data">${payload}</script>`,
      scripts: ["/assets/src/client/armory-workbench.mjs"],
      styles: ["/assets/src/ui/gunsmith.css"],
    },
  ];
}
