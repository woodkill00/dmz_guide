import { readWeaponIntel } from "../content/weapon-intel.mjs";
import { e, pageHeading, recordUrl } from "./render.mjs";

const link = (url, label) =>
  `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}<span class="sr-only"> (opens in a new tab)</span></a>`;
const value = (v) =>
  v.applicability === "reported"
    ? `${e(v.value)} ${e(v.unit)}`
    : v.applicability === "not-applicable"
      ? "Not applicable"
      : "Unknown";
const table = (head, rows) =>
  `<div class="armory-table-wrap" tabindex="0" role="region" aria-label="${e(head.join(", "))}"><table class="armory-table"><thead><tr>${head.map((h) => `<th scope="col">${e(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
const row = (cells, attrs = "") =>
  `<tr ${attrs}>${cells.map((c, i) => (i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join("")}</tr>`;
const disclosure = `<aside class="notice"><strong>Dated source reports, not a verified current DMZ simulation.</strong> Official launch values are from 19 October. Community base stats describe Multiplayer; attachment effect mode is uncertain. Missing effects mean not reported. Patch reports retain their own mode/date and do not overwrite the original baseline. Damage/TTK are not established here.</aside>`;

export function renderArmory(db, weaponId = null, nativeIds = null) {
  const weapon = weaponId ? db.weapons.find((w) => w.id === weaponId) : null;
  const count = db.attachments.filter((a) => a.kind === "standard").length;
  const header = pageHeading(
    "WEAPON DATABASE",
    weapon?.name || "Weapons & attachments",
    `${db.weapons.length} launch weapons · ${count} reported standard attachments · ${db.attachments.length - count} Apex attachments`,
  );
  const intro = `<div class="armory-links"><a href="/armory/">All weapons</a><a href="/armory/#attachments">Attachment directory</a><a href="/armory/#patch-history">Official patch history</a><a href="/weapons/">Catalog records</a><a href="/armory/updates/">Check for updates</a></div>${disclosure}`;
  const metrics = new Map(db.metrics.map((m) => [m.id, m]));
  const patches = db.patches
    .filter((p) => !weapon || p.weapon === weapon.id)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.variant.localeCompare(b.variant) ||
        a.metric.localeCompare(b.metric),
    );
  const patchView = `<section id="patch-history" class="section"><h2>Official patch history</h2><p>${patches.length} retained change reports. Raw source units are unspecified unless established; do not read a range value as meters. Baseline tables above retain their original dates. Checks run explicitly with the local update commands in the ${link("https://www.callofduty.com/patchnotes", "official patch index")} workflow.</p>${
    patches.length
      ? table(
          [
            "Date / mode",
            "Weapon / variant",
            "Metric",
            "Before → after",
            "Source",
          ],
          patches.map((p) =>
            row([
              `${e(p.date)}<br>${e(p.mode)}`,
              e(p.variant),
              e(p.metric),
              `${e(p.before)} → ${e(p.after)}<br><small>${e(p.unit)}</small>`,
              link(p.sourceURL, "Official notes"),
            ]),
          ),
        )
      : "<p>No patch reports applied yet.</p>"
  }</section>`;
  const attRows = (list) =>
    list.map((a) => {
      const effects = weapon
        ? Object.entries(a.effects[weapon.id] || {})
            .map(([id, multiplier]) => {
              const m = metrics.get(id),
                pct = (multiplier - 1) * 100;
              const direction =
                pct === 0
                  ? "unchanged"
                  : pct > 0 === (m.better === "higher")
                    ? "better"
                    : "worse";
              return `${e(m.name)}: ${pct >= 0 ? "+" : ""}${e(Number(pct.toFixed(2)))}% (${direction})`;
            })
            .join("; ")
        : "Select a weapon to see its reported effects";
      const compatible = a.weapons
        .map(
          (id) =>
            `<a href="/armory/${e(id)}/">${e(db.weapons.find((w) => w.id === id).name)}</a>`,
        )
        .join(", ");
      return row(
        [
          `<span id="attachment-${e(a.id)}">${e(a.name)}</span><br><small>${e(a.kind)}${a.about ? " · " + e(a.about) : ""}</small>`,
          e(a.slot),
          weapon ? effects || "No effect reported; not zero" : compatible,
          `${e(a.unlock)}<br><small>${a.sources.map((id) => link(db.sources[id].url, id)).join(" · ")}</small>`,
        ],
        `data-armory-row data-search="${e((a.name + " " + a.slot + " " + a.kind).toLowerCase())}" data-slot="${e(a.slot)}"`,
      );
    });
  const attachments = db.attachments.filter(
    (a) => !weapon || a.weapons.includes(weapon.id),
  );
  const attachmentView = `<section id="attachments" class="section"><h2>${weapon ? "Reported compatible attachments" : "Attachment directory"}</h2><p>Provider-reported fit; verify in the current Gunsmith. Percentages are per-weapon multipliers on that provider's baseline, not a validated stacking model. Positive duration changes can be worse. Unknown-mode effects are not confirmed DMZ performance.</p><form class="filter-bar armory-filters" data-armory-filter><label>Find attachment<input type="search" data-armory-search placeholder="Name, slot or Apex"></label><label>Slot<select data-armory-slot><option value="">All slots</option>${[
    ...new Set(attachments.map((a) => a.slot)),
  ]
    .sort()
    .map((s) => `<option>${e(s)}</option>`)
    .join(
      "",
    )}</select></label><output data-armory-count aria-live="polite">${attachments.length} attachments</output></form>${table(["Attachment", "Slot", weapon ? "Reported effects · uncertain mode" : "Reported compatible weapons", "Unlock / evidence"], attRows(attachments))}<p data-armory-empty hidden>No attachments match. Clear the search or choose All slots.</p></section>`;
  if (!weapon)
    return (
      header +
      intro +
      `<section class="section"><h2>Launch weapons</h2><form class="filter-bar armory-filters" data-weapon-filter><label>Find weapon<input type="search" data-weapon-search></label><label>Class<select data-weapon-class><option value="">All classes</option>${[
        ...new Set(db.weapons.map((w) => w.category)),
      ]
        .sort()
        .map((c) => `<option>${e(c)}</option>`)
        .join(
          "",
        )}</select></label><output data-weapon-count aria-live="polite">${db.weapons.length} weapons</output></form>${table(
        ["Weapon", "Class", "Fire rate", "Magazine / reserve", "Attachments"],
        db.weapons.map((w) =>
          row(
            [
              `<a href="/armory/${e(w.id)}/">${e(w.name)}</a>`,
              e(w.category),
              value(w.official.rpm),
              `${value(w.official.magazine)} / ${value(w.official.reserve)}`,
              String(
                db.attachments.filter((a) => a.weapons.includes(w.id)).length,
              ),
            ],
            `data-weapon-row data-search="${e(w.name.toLowerCase())}" data-class="${e(w.category)}"`,
          ),
        ),
      )}</section>` +
      attachmentView +
      patchView +
      sources(db)
    );
  const native = recordUrl("weapon", "mw4:" + weapon.id);
  const detail = `<section class="section"><h2>Official launch sheet</h2><p>${link(db.sources["official-launch"].url, "Publisher source")} · ${e(db.sources["official-launch"].date)} · shared launch baseline. ${nativeIds && !nativeIds.has("mw4:" + weapon.id) ? "Native catalog record is not in this checkout." : `<a href="${e(native)}">Open catalog record</a>`}</p>${table(
    ["Metric", "Launch observation"],
    Object.entries(weapon.official).map(([k, v]) =>
      row([
        e(
          {
            rpm: "Fire rate",
            magazine: "Magazine",
            reserve: "Reserve ammunition",
            levels: "Weapon levels",
          }[k],
        ),
        value(v),
      ]),
    ),
  )}<p>Supported slot types: ${e(weapon.slots.join(", ") || "None reported")}</p><p>Apex: ${e(weapon.apex || "Not applicable")}. Blocked slots: ${e(weapon.blockedSlots.join(", ") || "None reported; verify compatibility")}. ${link(db.sources["official-launch"].url, "Read official Apex behavior")}</p><details><summary>MP unlock reports (not DMZ purchase unlocks)</summary><ul>${weapon.unlockReports.map((r) => `<li>${e(r)}</li>`).join("")}</ul><p>Conflicting source reports remain visible; DMZ acquisition and shared progression are separate rules.</p></details></section><section class="section"><h2>Community base measurements</h2><p>${link(db.sources["community-stats"].url, "Reported dataset")} · ${e(db.sources["community-stats"].date)} · Multiplayer · unverified · derived from ${link(db.sources["community-stats"].upstream[0], "CODMunity")}. These are raw provider values; they may differ from the official launch sheet.</p>${table(
    ["Group", "Metric", "Reported value / raw unit"],
    db.metrics.map((m) =>
      row([
        e(m.group),
        e(m.name),
        Object.hasOwn(db.communityStats[weapon.id] || {}, m.id)
          ? `${e(db.communityStats[weapon.id][m.id])} ${e(m.unit || "unit unspecified")}`
          : "Unknown",
      ]),
    ),
  )}<p>The provider's reserve_ammo key is retained as reported; it may represent total ammunition rather than reserve-only. Damage-range units and generic recoil scales are not converted.</p></section>`;
  return header + intro + detail + attachmentView + patchView;
}
function sources(db) {
  return `<section class="section"><h2>Sources & coverage</h2><p>Imported ${e(db.importedAt)}. Provider reports may be incomplete, stale or conflicting. No image assets were imported.</p><ul>${Object.entries(
    db.sources,
  )
    .map(
      ([id, s]) =>
        `<li>${link(s.url, id)} · ${e(s.date)} · ${e(s.mode)} · ${e(s.status)}</li>`,
    )
    .join("")}</ul></section>`;
}
export async function featurePages(packs = []) {
  const nativeIds = new Set(
    packs.flatMap((pack) => pack.items.map((item) => item.id)),
  );
  const db = await readWeaponIntel();
  const pages = [null, ...db.weapons.map((w) => w.id)].map((id) => ({
    path: id ? `/armory/${id}/` : "/armory/",
    title: id
      ? db.weapons.find((w) => w.id === id).name + " · Weapon database"
      : "Weapon database",
    page: "armory",
    body: renderArmory(db, id, nativeIds),
    scripts: ["/assets/src/client/armory.mjs"],
  }));
  pages.push({
    path: "/armory/updates/",
    title: "Weapon database updates",
    page: "weapon-updates",
    body: `${pageHeading("LOCAL DATABASE", "Check official weapon updates", "Run a check when needed. Review source changes before applying them.")}<p><a href="/armory/">Open weapon database</a> · ${link("https://www.callofduty.com/patchnotes", "Official patch notes")}</p><section class="panel"><h2>1. Check</h2><p>In the project folder, run:</p><pre><code>npm run weapons:check</code></pre><p>This reads the official patch index and supported MW4 notes, then stages a local proposal at <code>.local/weapon-patch-proposal.json</code>. The database is unchanged. Review its source links, mode, date, raw values, counts and warnings.</p><h2>2. Apply the reviewed proposal</h2><pre><code>npm run weapons:apply
npm run build</code></pre><p>Apply retains original base measurements and adds or corrects the patch history. Repeat updates do not duplicate records. Build refreshes these static pages; reload after it finishes. If the database changed after checking, run a fresh check and review again.</p><h2>Check automation</h2><pre><code>npm run weapons:check -- --fail-on-new
npm run weapons:validate
npm run test:weapons</code></pre><p>Check-only exit codes: 0 means no new or corrected reports, 2 means reports need review, and 1 means an error. Warnings still require review. Routine builds/tests do not contact providers, and nothing runs on a schedule.</p><h2>Recovery</h2><p>The previous database is retained at <code>.local/weapon-updates/backup.json</code>. A leftover writer lock blocks new applies. Confirm no update process is running before inspecting the lock or restoring a backup; do not overwrite a newer database without reviewing it.</p></section>${disclosure}`,
  });
  return pages;
}
