const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
import { camoGroups, camoImagePath } from "../domain/weapon-camos.mjs";
import { weaponURL } from "../domain/weapon-routes.mjs";

export function acquisitionCamoIcons(weapon) {
  if (!weapon) return "";
  return `<span class="acquisition-camos" data-acquisition-camos="${e(weapon.id)}">${Object.entries(
    camoGroups,
  )
    .map(
      ([group, label]) =>
        `<span class="acquisition-camo-tier"><span class="acquisition-camo-tier-label">${e(label)}</span><span class="acquisition-camo-buttons">${weapon.rows
          .filter((r) => r.group === group)
          .map(
            (r) =>
              `<button type="button" class="acquisition-camo" data-acq-camo="${e(r.id)}" data-state="unknown" data-camo-name="${e(r.name)}" data-camo-requirement="${e(r.requirement)}" aria-label="${e(r.name)}: Progress unavailable" title="${e(r.name)}: Progress unavailable" aria-expanded="false" aria-controls="acq-camo-panel-${e(weapon.id)}"><span aria-hidden="true">?</span><span class="acquisition-camo-fallback" aria-hidden="true" hidden>No art</span><img src="${camoImagePath(weapon.id, r.id)}" alt="" width="32" height="32" loading="lazy" decoding="async"></button>`,
          )
          .join("")}</span></span>`,
    )
    .join("")}</span>`;
}

export function acquisitionCamoPanel(weapon) {
  if (!weapon) return "";
  return `<section class="acquisition-camo-panel" id="acq-camo-panel-${e(weapon.id)}" aria-label="Selected camo challenge" hidden><strong data-acq-camo-heading></strong><p data-acq-camo-requirement></p><p data-acq-camo-status></p><label class="acquisition-camo-completion"><input type="checkbox" data-acq-camo-complete disabled> Completed</label><a data-acq-camo-link href="${weaponURL(weapon.id, "camos")}">Open camo tracker</a> <button type="button" data-acq-camo-close>Close details</button></section>`;
}
