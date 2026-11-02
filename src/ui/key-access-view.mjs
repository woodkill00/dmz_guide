import {
  privateKeyControls,
  privateUseControls,
  keyMapLinks,
  keyRoomFacts,
  keyWorkspacePanel,
  keyWorkspaceData,
  keySourceReview,
} from "./key-workspace-view.mjs";
import { keyGuide, keyIcons, KEY_TYPES } from "../content/keys.mjs";
import {
  allKeys,
  keyAccess,
  requiredKeyChain,
  requiredBy,
  supplementalKeys,
} from "../content/key-access.mjs";
import { e, pageHeading } from "./render.mjs";
const byKey = (id) => allKeys.find((k) => k.id === id),
  byUse = (id) => keyAccess.uses.find((u) => u.id === id);
const external = (url, label) =>
  `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>`;
const sources = (rows) =>
  rows.map((s) => external(s.url, s.label) + ` · ${e(s.date)}`).join("<br>");
export const keyCoverageNotice = `<p class="notice">${allKeys.length} source-reported keys: ${keyGuide.keys.length} from ${external(keyGuide.sourceURL + "#hl_2", "Game8")} and ${supplementalKeys.length} supplemental source records. Checked ${e(keyGuide.checkedAt)}. Source reports, not a verified complete in-game catalog. Access links retain their source status. Key icons: Game8 / Activision; supplemental records use a generic icon.</p>`;
export const renderKeySources = (k) =>
  k.sources
    ? sources(k.sources)
    : external(
        keyGuide.sourceURL + "#" + k.sourceAnchor,
        "View this key on Game8",
      ) + ` · updated ${e(keyGuide.sourceDate)}`;
const keyLink = (k, small = false) =>
  `<a class="${small ? "key-access-link" : "key-item-link"}" href="/keys/${k.id}/">${small ? "" : `<img src="${Object.hasOwn(keyIcons, k.id) ? `/local-key-images/icon-${k.id}.webp` : "/assets/src/key-generic.svg"}" alt="" width="36" height="36" loading="lazy">`}<span>${e(k.name)}</span></a>`;
export function renderAccessCell(use, model = keyAccess) {
  if (use.requiredUses.length)
    return `<span class="key-access-state">Bring first · ${use.status === "player-reported" ? "player-reported" : "source-reported"}</span>${requiredKeyChain(
      use,
      model.uses,
    )
      .filter((u) => u.id !== use.id)
      .map(
        (u) => keyLink(byKey(u.keyId), true) + ` <small>${e(u.grid)}</small>`,
      )
      .join(" → ")}`;
  if (use.possibleUses.length)
    return `<span class="key-access-state">Possible access key · identity unconfirmed</span>${use.possibleUses.map((id) => keyLink(byKey(byUse(id).keyId), true)).join(", ")}<small>Open the key page for evidence and uncertainty.</small>`;
  return "<span>Not recorded</span>";
}
export function renderAccessDetails(k, model = keyAccess) {
  return `<section class="panel"><h2>Access keys needed first</h2>${model.uses
    .filter((u) => u.keyId === k.id)
    .map(
      (u) =>
        `<section class="key-access-use"><h3>${e(u.locationName)} · ${e(u.grid)}</h3><div class="key-map-actions">${keyMapLinks(u, byKey(u.keyId))}</div>${privateUseControls(u)}${renderAccessCell(u, model)}${
          u.requiredUses.length
            ? `<ol class="key-access-chain">${requiredKeyChain(u, model.uses)
                .map(
                  (s) =>
                    `<li>${keyLink(byKey(s.keyId), true)} · ${e(s.locationName)} ${e(s.grid)}</li>`,
                )
                .join("")}</ol>`
            : ""
        }${u.ownerReport ? `<p><strong>Player report · ${e(u.ownerReport.date)}</strong> ${e(u.ownerReport.statement)}</p>` : ""}<p>${e(u.note)}</p>${u.sources.length ? `<p>${u.ownerReport ? "Website context: " : ""}${sources(u.sources)}</p>` : ""}${
          requiredBy(u.id, model.uses).length
            ? `<h4>This key is needed to reach</h4><ul>${requiredBy(
                u.id,
                model.uses,
              )
                .map(
                  (s) =>
                    `<li>${keyLink(byKey(s.keyId), true)} · ${e(s.locationName)}</li>`,
                )
                .join("")}</ul>`
            : ""
        }</section>`,
    )
    .join("")}</section>`;
}
export function renderKeyDirectory() {
  const filters = `<form id="key-filters" class="key-filters" hidden role="search"><label>Search keys, places or grid<input id="key-search" type="search" maxlength="200" placeholder="Name, F4, casino, battery…"></label><label>How to get<select id="key-type"><option value="">All acquisition types</option>${Object.entries(
    KEY_TYPES,
  )
    .map(([id, name]) => `<option value="${id}">${name}</option>`)
    .join(
      "",
    )}</select></label><label>Map location<select id="key-location"><option value="">All locations</option>${keyAccess.groups.map((g) => `<option value="${g.id}">${e(g.name)}</option>`).join("")}</select></label><label>My view<select id="key-view" disabled><option value="all">All keys</option><option value="owned">Owned keys</option><option value="ready">What can I open? · recorded keys</option><option value="missing">Missing recorded keys</option><option value="favorites">Favorites</option><option value="unopened">Not opened before</option></select></label><label>Density<select id="key-density" disabled><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select></label><button type="reset">Clear filters</button></form>`;
  const groups = keyAccess.groups
    .map((g) => {
      const uses = keyAccess.uses
        .filter((u) => u.groupId === g.id)
        .sort((a, b) => byKey(a.keyId).name.localeCompare(byKey(b.keyId).name));
      return `<details class="key-location-group" data-key-group="${g.id}" open><summary>${e(g.name)} <span data-group-count>(${new Set(uses.map((u) => u.keyId)).size} ${new Set(uses.map((u) => u.keyId)).size === 1 ? "key" : "keys"})</span></summary><div class="armory-table-wrap" role="region" aria-label="${e(g.name)} keys" tabindex="0"><table class="armory-table key-directory"><thead><tr><th scope="col">Key</th><th scope="col">Where to use / grid</th><th scope="col">Access keys needed first</th><th scope="col">How to get</th></tr></thead><tbody>${uses
        .map((u) => {
          const k = byKey(u.keyId),
            search = [
              k.name,
              ...k.aliases,
              k.acquisition,
              u.locationName,
              u.grid,
              g.name,
              ...k.steps,
              ...k.requirements,
              ...[...u.requiredUses, ...u.possibleUses].map(
                (id) => byKey(byUse(id).keyId).name,
              ),
            ].join(" ");
          return `<tr data-key-row data-key-id="${k.id}" data-group="${g.id}" data-category="${k.category}" data-search="${e(search)}"><th scope="row">${keyLink(k)}<small>${KEY_TYPES[k.category]}</small>${privateKeyControls(k)}</th><td data-label="Where to use / grid">${e(u.locationName)} <strong class="key-grid">${e(u.grid)}</strong><div class="key-map-actions">${keyMapLinks(u, k)}</div><details class="key-room-more"><summary>Room details</summary>${keyRoomFacts(k)}</details></td><td data-label="Access keys needed first">${renderAccessCell(u)}${privateUseControls(u)}</td><td data-label="How to get">${e(k.acquisition)}</td></tr>`;
        })
        .join("")}</tbody></table></div></details>`;
    })
    .join("");
  return `${pageHeading("HAJIN FIELD GUIDE", "Keys", "Keys grouped by map location, with access keys to check before you travel.")}${keyCoverageNotice}${keyWorkspacePanel()}<details id="key-filter-menu" class="key-filter-menu" open><summary>Search and filters</summary>${filters}</details><p id="key-count" role="status" aria-live="polite">${allKeys.length} keys · ${keyAccess.uses.length} use locations · ${keyAccess.groups.length} map areas</p><p class="muted">Keys used in several places appear in each relevant group. “Not recorded” means the sources have not established whether another key is needed. Possible links need confirmation.</p><p id="key-empty" hidden>No keys match these filters. Try another name, place or grid, or clear the filters.</p>${groups}${keySourceReview()}<noscript><p>All grouped tables and key links work without JavaScript. Enable JavaScript to filter the list.</p></noscript>${keyWorkspaceData()}<script type="module" src="/assets/src/client/keys.mjs"></script>`;
}
