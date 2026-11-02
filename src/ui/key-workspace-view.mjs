import { allKeys, keyAccess } from "../content/key-access.mjs";
import { keyRoomDetails } from "../content/key-room-details.mjs";
import { e } from "./render.mjs";
export function gridReferences(value) {
  const plain = /^[A-J][1-9]$/.exec(value);
  if (plain) return [value];
  const range = /^([A-J])[-–]([A-J])([1-9])$/.exec(value);
  if (!range || range[1] > range[2]) return [];
  return Array.from(
    { length: range[2].charCodeAt(0) - range[1].charCodeAt(0) + 1 },
    (_, i) => String.fromCharCode(range[1].charCodeAt(0) + i) + range[3],
  );
}
export function keyMapLinks(use, key) {
  const refs = gridReferences(use.grid);
  return refs.length
    ? refs
        .map(
          (ref) =>
            `<a class="key-map-link" href="http://127.0.0.1:5175/?key-grid=${ref}&amp;key-name=${e(encodeURIComponent(key.name))}" target="_blank" rel="noopener noreferrer" title="Open the reported ${ref} grid area in the local map; door position is not verified">Map ${ref} ↗</a>`,
        )
        .join(" ")
    : "<small>Map grid not established</small>";
}
export function privateKeyControls(key) {
  return `<div class="key-private-controls" data-private-key="${key.id}" hidden><div class="key-stock-line"><button type="button" data-key-action="favorite" data-key-id="${key.id}" aria-label="Favorite ${e(key.name)}" aria-pressed="false">☆</button><button type="button" data-key-action="subtract" data-key-id="${key.id}" aria-label="Remove one owned ${e(key.name)}">−</button><label class="key-quantity-label">Owned<input type="number" inputmode="numeric" min="0" max="999" value="0" data-private-field="quantity" data-key-id="${key.id}" aria-label="Owned quantity of ${e(key.name)}"></label><button type="button" data-key-action="add" data-key-id="${key.id}" aria-label="Add one owned ${e(key.name)}">+</button></div><details class="key-stock-extra"><summary>Uses and private notes</summary><label>Total remaining uses recorded<input type="number" inputmode="numeric" min="0" max="999" data-private-field="remainingUses" data-key-id="${key.id}" aria-label="Total remaining uses of ${e(key.name)}" placeholder="Unknown"></label><small>Optional total across owned copies; blank means unknown. Changing quantity resets this total.</small><label>Private notes<textarea maxlength="1000" rows="2" data-private-field="notes" data-key-id="${key.id}" aria-label="Private notes for ${e(key.name)}"></textarea></label></details></div>`;
}
export function privateUseControls(use) {
  return `<div class="key-use-actions" data-private-use="${use.id}" hidden><label><input type="checkbox" data-target-use="${use.id}" aria-label="Add ${e(allKeys.find((k) => k.id === use.keyId).name)} at ${e(use.locationName)} ${e(use.grid)} to trip"> Add to trip</label><label><input type="checkbox" data-opened-use="${use.id}" aria-label="Mark ${e(allKeys.find((k) => k.id === use.keyId).name)} at ${e(use.locationName)} ${e(use.grid)} opened before"> Opened before</label><span data-ready-use="${use.id}" class="key-readiness"></span></div>`;
}
export function keyRoomFacts(key) {
  const r = keyRoomDetails.records[key.id];
  return `<dl class="key-room-facts"><dt>Entrance</dt><dd>${e(r.entrance || "Not established")}</dd><dt>Floor</dt><dd>${e(r.floor || "Not established")}</dd><dt>Reported loot</dt><dd>${r.loot.length ? r.loot.map(e).join(" · ") : "Not established"}</dd></dl><p class="small-note">Possible source-reported contents; loot is not guaranteed.</p>${r.accessRequirements.length ? `<h4>Other access reports</h4><ul>${r.accessRequirements.map((n) => `<li>${e(n)}</li>`).join("")}</ul>` : ""}${r.notes.length ? `<ul>${r.notes.map((n) => `<li>${e(n)}</li>`).join("")}</ul>` : ""}<p class="small-note">${r.sources.map((s) => `<a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.label)}</a> · ${e(s.date)}`).join("<br>")}</p>`;
}
export function keyWorkspacePanel() {
  return `<section id="key-workspace" class="panel key-workspace" hidden aria-labelledby="key-workspace-title"><div class="key-workspace-heading"><h2 id="key-workspace-title">My key stash</h2><button id="key-toggle-trip" type="button" aria-expanded="false" aria-controls="key-trip-panel">Trip checklist <span id="key-trip-count">(0)</span></button></div><p class="small-note">Private in this browser, separate from your game, inventory and map. Marking a lock opened never consumes a key automatically.</p><p id="key-save-status" role="status" aria-live="polite">Opening private storage…</p><p id="key-workspace-error" role="alert" hidden></p><details id="key-backup-tools" class="key-backup-tools"><summary>Backups and recovery</summary><div class="key-backup-buttons"><button id="key-export" type="button">Export key backup</button><label>Preview key backup<input id="key-import" type="file" accept=".json,application/json"></label><button id="key-reload" type="button">Reload saved keys</button><button id="key-previous" type="button">Preview previous snapshot</button><button id="key-raw-export" type="button">Export recovery record</button></div><section id="key-restore-preview" hidden><h3>Review backup replacement</h3><p id="key-restore-summary"></p><label><input id="key-restore-review" type="checkbox">I reviewed this replacement and exported any current data I need.</label><button id="key-restore-apply" type="button" disabled>Apply reviewed key backup</button><button id="key-restore-cancel" type="button">Cancel preview</button></section></details><section id="key-trip-panel" class="key-trip-panel" hidden aria-labelledby="key-trip-title"><h3 id="key-trip-title" tabindex="-1">Trip checklist</h3><div id="key-trip-content"></div><div class="key-backup-buttons"><button id="key-copy-trip" type="button">Copy packing list</button><button id="key-download-trip" type="button">Download packing list</button><button id="key-clear-trip" type="button">Clear trip</button></div><textarea id="key-copy-fallback" rows="5" readonly aria-label="Packing list to copy" hidden></textarea></section><details id="key-archive" hidden><summary>Unavailable catalog records retained in your backup</summary><p id="key-archive-summary"></p></details></section>`;
}
export function keyWorkspaceData() {
  const catalog = {
    keys: allKeys.map((k) => ({
      id: k.id,
      name: k.name,
      requirements: [
        ...k.requirements,
        ...keyRoomDetails.records[k.id].accessRequirements,
      ],
    })),
    uses: keyAccess.uses.map((u) => ({
      id: u.id,
      keyId: u.keyId,
      locationName: u.locationName,
      grid: u.grid,
      groupId: u.groupId,
      requiredUses: u.requiredUses,
      possibleUses: u.possibleUses,
      status: u.status,
      lockState: keyRoomDetails.records[u.keyId].lockState,
    })),
    groups: keyAccess.groups,
  };
  return `<script id="key-planner-data" type="application/json">${JSON.stringify(catalog).replace(/</g, () => String.fromCharCode(92) + "u003c")}</script>`;
}
export function keySourceReview() {
  const issues = keyRoomDetails.comparisons.filter((c) =>
    ["grid-conflict", "unresolved-identity"].includes(c.status),
  );
  const rows = (list) =>
    `<div class="armory-table-wrap" role="region" aria-label="Key source comparisons" tabindex="0"><table class="armory-table"><thead><tr><th scope="col">Source key</th><th scope="col">Provider grid</th><th scope="col">Status</th><th scope="col">Review note</th></tr></thead><tbody>${list.map((c) => `<tr><th scope="row">${c.keyId ? `<a href="/keys/${c.keyId}/">${e(c.keyName)}</a>` : e(c.keyName)}</th><td>${e(c.grid)}</td><td>${e(c.status.replace(/-/g, " "))}</td><td>${e(c.note)} <a href="${e(c.sourceURL)}" target="_blank" rel="noopener noreferrer">${e(c.sourceName)} · ${e(c.sourceDate)}</a></td></tr>`).join("")}</tbody></table></div>`;
  return `<details id="key-source-review" class="panel"><summary>Catalog coverage and source differences (${issues.length} to review)</summary><p>${keyRoomDetails.comparisons.length} records compared from the DMZTracker index; checked ${e(keyRoomDetails.checkedAt)}. New reports remain unverified. Matched names do not prove matching doors. Existing grids and the player-reported hospital chain were retained.</p>${rows(issues)}<details><summary>All provider comparisons (${keyRoomDetails.comparisons.length})</summary>${rows(keyRoomDetails.comparisons)}</details></details>`;
}
