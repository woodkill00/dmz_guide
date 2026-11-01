import { e } from "./render.mjs";
import {
  COD_LEGEND,
  COD_URLS,
  codCoverage,
  REGIONS,
} from "../domain/codmunity.mjs";
import definitions from "../domain/codmunity-metrics.json" with { type: "json" };
const cell = (value, mode) =>
  value === null || value === undefined
    ? "Unknown"
    : `${e(Number(value.toFixed(3)))}${mode === "mw4" ? ' <abbr class="cod-badge" title="CODMunity MW4 Multiplayer; not tested in DMZ">*WZ</abbr>' : " · DMZ report"}`;
export function renderCodmunity(db, data, weapon = null) {
  const snapshots = data?.modes || {};
  return `<section id="codmunity-data" class="section"><h2>CODMunity baseline <span class="cod-badge">*WZ</span></h2><p class="notice">${e(COD_LEGEND)} Official launch and older community reports remain separately labelled below.</p><p><a href="${COD_URLS.mw4}" target="_blank" rel="noopener noreferrer">Preferred MW4 comparator ↗</a> · <a href="${COD_URLS.dmz}" target="_blank" rel="noopener noreferrer">DMZ comparator ↗</a> · <a href="http://127.0.0.1:4176/" target="_blank" rel="noopener noreferrer">Check / review updates ↗</a></p>${[
    "mw4",
    "dmz",
  ]
    .map((mode) => {
      const s = snapshots[mode],
        coverage = codCoverage(s, db),
        row = weapon && s?.weapons[weapon.id];
      const summary = `<p>${mode === "mw4" ? "MW4 Multiplayer baseline *WZ" : "Separate DMZ source reports — not independently verified"}: ${coverage.weapons}/${coverage.total} weapons with stats; ${coverage.damage}/${coverage.total} with damage profiles. ${e(coverage.status)}.${s?.unknownCount ? " Unmapped source records: " + e(s.unknownCount) + "." : ""}${s ? ` Source date ${e(s.sourceDate || "not provided")} · imported ${e(s.fetchedAt)}. ${e(s.warning)}` : " Not imported yet."}</p>`;
      if (!weapon) return summary;
      if (!row)
        return (
          summary +
          `<p>No ${mode === "mw4" ? "*WZ baseline" : "DMZ source"} report for ${e(weapon.name)} yet. Missing data is unknown, not zero.</p>`
        );
      const table = (title, heads, rows) =>
        `<h3>${title}</h3><div class="armory-table-wrap" role="region" aria-label="${e(title)}" tabindex="0"><table class="armory-table"><thead><tr>${heads.map((h) => `<th scope="col">${e(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v, i) => (i ? `<td>${v}</td>` : `<th scope="row">${v}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
      const title =
        mode === "mw4"
          ? "Damage profile *WZ"
          : "DMZ damage reports (unverified)";
      const damage = row.damage.length
        ? table(
            title,
            [
              "Source distance band",
              ...REGIONS.map((r) =>
                r.replace("arm", " arm").replace("leg", " leg"),
              ),
              "Provider TTK (ms)",
              "Provider shots",
            ],
            row.damage.map((b) => [
              `${e(b.from)}–${b.to === null ? "onward" : e(b.to)} <small>(unit unspecified)</small>`,
              ...REGIONS.map((r) => cell(b.values[r], mode)),
              cell(b.providerTTK, mode),
              cell(b.shotsToKill, mode),
            ]),
          )
        : `<p>No damage profile reported for this ${mode === "mw4" ? "*WZ" : "DMZ"} weapon.</p>`;
      const stats = table(
        mode === "mw4"
          ? "Base measurements *WZ"
          : "Separate DMZ measurements (unverified)",
        ["Metric", "Value", "Raw unit"],
        definitions
          .filter((m) => Object.hasOwn(row.stats, m.id))
          .map((m) => [
            e(m.name),
            cell(row.stats[m.id], mode),
            e(m.unit || "Unspecified"),
          ]),
      );
      return `<details ${mode === "mw4" ? "open" : ""}><summary>${mode === "mw4" ? "Preferred base stats and damage *WZ" : "Separate DMZ source status and reports — " + coverage.status + " · " + coverage.damage + "/" + coverage.total + " damage profiles"}</summary>${summary}<p>Base weapon, not an attachment simulation. Damage-range units are retained as unspecified; provider TTK/shot counts have unestablished target/armor assumptions. These are not verified DMZ player or AI results.</p>${damage}${stats}</details>`;
    })
    .join("")}</section>`;
}
