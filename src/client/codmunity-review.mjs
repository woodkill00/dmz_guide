const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const label = (value) =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const display = (value) =>
  value === undefined
    ? "Not reported"
    : value === null
      ? "Unknown"
      : String(value);
const table = (heads, rows, name) =>
  `<div class="armory-table-wrap" role="region" aria-label="${escape(name)}" tabindex="0"><table class="armory-table"><thead><tr>${heads.map((h) => `<th scope="col">${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v, i) => `<${i ? "td" : 'th scope="row"'}>${escape(display(v))}</${i ? "td" : "th"}>`).join("")}</tr>`).join("")}</tbody></table></div>`;
function fields(row, definitions) {
  if (!row) return {};
  const result = {
    "Weapon name": row.name,
    "Source updated": row.sourceUpdated,
  };
  for (const [key, value] of Object.entries(row.stats)) {
    const metric = definitions.find((d) => d.id === key);
    result[
      `${metric?.name || label(key)}${metric?.unit ? ` (${metric.unit})` : ""}`
    ] = value;
  }
  result["Damage bands reported"] = row.damage.length;
  row.damage.forEach((band, index) => {
    const prefix = `Damage band ${index + 1}`;
    result[`${prefix} · starts at`] = band.from;
    result[`${prefix} · ends at`] = band.to === null ? "Open ended" : band.to;
    result[`${prefix} · distance unit`] = band.unit;
    for (const [region, value] of Object.entries(band.values))
      result[`${prefix} · ${label(region)}`] = value;
    result[`${prefix} · provider TTK (ms; target assumptions unspecified)`] =
      band.providerTTK;
    result[
      `${prefix} · provider shots to kill (target assumptions unspecified)`
    ] = band.shotsToKill;
  });
  return result;
}
export function renderSourceReview(cod, definitions = []) {
  const proposal = cod?.proposal;
  if (!proposal) return "<p>No CODMunity proposal staged.</p>";
  const message = proposal.stale
    ? "Stale proposal: check again before applying."
    : proposal.unchanged
      ? "No normalized fact changes; no apply needed."
      : "Changes require review.";
  const sections = ["mw4", "dmz"]
    .map((mode) => {
      const before = cod.sources?.[mode],
        after = proposal.content?.modes?.[mode],
        diff = proposal.diff[mode];
      const title =
        mode === "mw4"
          ? "MW4 Multiplayer baseline *WZ"
          : "DMZ source reports · unverified";
      const changed = new Set([
        ...diff.added,
        ...diff.changed,
        ...diff.removed,
      ]);
      const ids = [
        ...new Set([
          ...Object.keys(before?.weapons || {}),
          ...Object.keys(after?.weapons || {}),
        ]),
      ].sort(
        (a, b) =>
          Number(changed.has(b)) - Number(changed.has(a)) || a.localeCompare(b),
      );
      const summary = table(
        ["Coverage", "Current", "Proposed"],
        [
          [
            "Weapons with reports",
            diff.coverageBefore.weapons,
            diff.coverageAfter.weapons,
          ],
          [
            "Weapons with damage profiles",
            diff.coverageBefore.damage,
            diff.coverageAfter.damage,
          ],
          ["Roster size", diff.coverageBefore.total, diff.coverageAfter.total],
        ],
        `${title} coverage`,
      );
      const metadata = table(
        ["Source information", "Current", "Proposed"],
        [
          ...[
            "sourceDate",
            "warning",
            "unknownCount",
            "fetchedAt",
            "sourceURL",
            "mode",
            "sourceHash",
          ].map((key) => [
            {
              sourceDate: "Source date",
              sourceURL: "Source URL",
              mode: "Source mode",
              sourceHash: "Source fingerprint",
              warning: "Source warning",
              unknownCount: "Unmapped records",
              fetchedAt: "Imported at",
            }[key],
            before?.[key],
            after?.[key],
          ]),
        ],
        `${title} source information`,
      );
      const weapon = (id) => {
        const old = before?.weapons?.[id],
          next = after?.weapons?.[id],
          a = fields(old, definitions),
          b = fields(next, definitions);
        const kind = diff.added.includes(id)
          ? "Added"
          : diff.removed.includes(id)
            ? "Removed"
            : diff.changed.includes(id)
              ? "Changed"
              : "Unchanged";
        const rows = [...new Set([...Object.keys(a), ...Object.keys(b)])].map(
          (key) => [key, a[key], b[key]],
        );
        return `<details class="cod-weapon-review"><summary>${escape(next?.name || old?.name || label(id))} · ${kind}</summary>${table(["Reported value", "Current", "Proposed"], rows, `${next?.name || old?.name || id} source values`)}</details>`;
      };
      return `<section class="cod-source-review"><h3>${title}</h3><p>${diff.added.length} added · ${diff.changed.length} changed · ${diff.removed.length} removed</p>${summary}<details><summary>Source dates and warnings</summary>${metadata}</details>${ids
        .filter((id) => changed.has(id))
        .map(weapon)
        .join("")}${
        ids.some((id) => !changed.has(id))
          ? `<details><summary>Unchanged weapons (${ids.filter((id) => !changed.has(id)).length})</summary>${ids
              .filter((id) => !changed.has(id))
              .map(weapon)
              .join("")}</details>`
          : ""
      }</section>`;
    })
    .join("");
  return `<p>${message}</p>${sections}<details><summary>Update reference</summary><p class="cod-reference">Reviewed proposal: ${escape(proposal.hash)}</p></details>`;
}
