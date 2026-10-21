import { planShared } from "../domain/shared-plan.mjs";
import {
  init,
  state,
  $,
  esc,
  error,
  persist,
  download,
  status,
} from "./common.mjs";
import {
  newProfile,
  parseProfile,
  previewProfile,
} from "../domain/profile.mjs";
import { loadProfile } from "../storage/store.mjs";
let staged = null,
  stagedPack = null,
  stagedRevision = null,
  resetPack = null,
  resetRevision = null;
document.addEventListener("pack-changing", () => {
  staged = null;
  stagedPack = null;
  stagedRevision = null;
  resetPack = null;
  resetRevision = null;
  if ($("#reset-confirm")) $("#reset-confirm").hidden = true;
  if ($("#restore-preview")) $("#restore-preview").hidden = true;
});
function render() {
  if ($("#inventory-fields")) {
    $("#inventory-fields").innerHTML = state.pack.items
      .map(
        (r) =>
          `<fieldset class="panel" data-inventory-item="${esc(r.id)}"><legend>${esc(r.name)} <small>(${esc(r.unit)})</small></legend><label>Owned quantity<input name="owned:${esc(r.id)}" data-id="${esc(r.id)}" data-field="inventory" type="number" min="0" max="1000000" value="${state.profile.inventory[r.id] || 0}" required></label><label>Protected reserve<input name="reserve:${esc(r.id)}" data-id="${esc(r.id)}" data-field="reserves" type="number" min="0" max="1000000" value="${state.profile.reserves[r.id] || 0}" required></label></fieldset>`,
      )
      .join("");
    $("#completion-fields").innerHTML = state.pack.objectives
      .filter((r) => !r.spoiler)
      .map(
        (r) =>
          `<label>${esc(r.name)}<select data-completion="${esc(r.id)}">${["unknown", "locked", "unlocked", "completed"].map((v) => `<option ${state.profile.completion[r.id] === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>`,
      )
      .join("");
    filterInventory();
  }
  if ($("#version-status")) {
    const p = previewProfile(state.profile, state.pack);
    $("#version-status").textContent =
      `Profile content: ${state.profile.contentVersion}; active content: ${state.pack.contentVersion}. ${p.versionMismatch ? "Planning blocked until explicit rebind." : "Versions match."} Unresolved references: ${p.unresolved.join(", ") || "none"}.`;
  }
}
$("#inventory-form")?.addEventListener("input", (e) => {
  const input = e.target;
  if (input.dataset.field) {
    state.profile[input.dataset.field][input.dataset.id] =
      input.value === "" ? NaN : Number(input.value);
    status(
      "Unsaved inventory edits · save locally or export a validated backup.",
    );
  }
});
$("#inventory-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  for (const input of document.querySelectorAll("[data-field]"))
    state.profile[input.dataset.field][input.dataset.id] = Number(input.value);
  await persist();
});
$("#completion-fields")?.addEventListener("change", async (e) => {
  if (e.target.dataset.completion) {
    state.profile.completion[e.target.dataset.completion] = e.target.value;
    await persist();
  }
});
$("#export-profile")?.addEventListener("click", () =>
  download("dmz-private-profile.json", state.profile),
);
function preview(p) {
  const summary = previewProfile(p, state.pack);
  const changes = {};
  for (const field of [
    "inventory",
    "reserves",
    "completion",
    "goals",
    "contentVersion",
    "routes",
  ])
    if (JSON.stringify(p[field]) !== JSON.stringify(state.profile[field]))
      changes[field] = { before: state.profile[field], after: p[field] };
  staged = p;
  stagedPack = state.pack.id;
  stagedRevision = state.revision;
  $("#restore-summary").textContent = JSON.stringify(
    {
      action: "Replace selected profile, not add quantities",
      ...summary,
      changes,
    },
    null,
    2,
  );
  $("#restore-preview").hidden = false;
}
$("#import-profile")?.addEventListener("change", async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 1048576) throw new Error("Backup exceeds 1 MiB");
    preview(parseProfile(await f.text()));
  } catch (e) {
    staged = null;
    $("#restore-preview").hidden = true;
    error(e);
  }
});
$("#cancel-restore")?.addEventListener("click", () => {
  staged = null;
  $("#restore-preview").hidden = true;
});
$("#apply-restore")?.addEventListener("click", async () => {
  if (!staged) return;
  if (stagedPack !== state.pack.id || stagedRevision !== state.revision) {
    error(new Error("Preview is stale. Review the backup again."));
    return;
  }
  try {
    previewProfile(staged, state.pack);
  } catch (e) {
    error(e);
    return;
  }
  const candidate = { ...staged, revision: state.revision };
  if (await persist(candidate)) {
    staged = null;
    $("#restore-preview").hidden = true;
    render();
  }
});
$("#rebind-profile")?.addEventListener("click", () =>
  preview({ ...state.profile, contentVersion: state.pack.contentVersion }),
);
$("#recover-profile")?.addEventListener("click", async () => {
  try {
    const saved = await loadProfile(state.pack.id);
    if (!saved?.previous) throw new Error("No previous snapshot is available.");
    preview(saved.previous);
  } catch (e) {
    error(e);
  }
});
$("#reset-profile")?.addEventListener("click", () => {
  resetPack = state.pack.id;
  resetRevision = state.revision;
  $("#reset-confirm").hidden = false;
  $("#reset-confirm p").textContent =
    `Clear inventory, reserves, goals and progress for ${state.pack.title}? A previous snapshot is retained.`;
});
$("#cancel-reset")?.addEventListener(
  "click",
  () => ($("#reset-confirm").hidden = true),
);
$("#confirm-reset")?.addEventListener("click", async () => {
  if (resetPack !== state.pack.id || resetRevision !== state.revision) {
    $("#reset-confirm").hidden = true;
    error(new Error("Reset confirmation is stale. Review the target again."));
    return;
  }
  const candidate = { ...newProfile(state.pack), revision: state.revision };
  if (await persist(candidate)) {
    $("#reset-confirm").hidden = true;
    render();
  }
});
init(render).catch(error);

function filterInventory() {
  if (!$("#inventory-query")) return;
  const q = $("#inventory-query").value.trim().toLowerCase(),
    mode = $("#inventory-view").value;
  let needed = new Set(),
    warning = "";
  if (mode === "needed") {
    try {
      needed = new Set(
        planShared(state.pack, state.profile)
          .ledger.filter((r) => r.missing || r.retainedMissing)
          .map((r) => r.id),
      );
    } catch {
      warning =
        " Planning unavailable; clear the filter or resolve profile/content mismatch.";
    }
  }
  let count = 0;
  for (const node of document.querySelectorAll("[data-inventory-item]")) {
    const id = node.dataset.inventoryItem,
      item = state.pack.items.find((r) => r.id === id);
    node.hidden =
      ![item.name, item.category, id].join(" ").toLowerCase().includes(q) ||
      (mode === "owned" &&
        !state.profile.inventory[id] &&
        !state.profile.reserves[id]) ||
      (mode === "needed" && !needed.has(id));
    if (!node.hidden) count++;
  }
  $("#inventory-count").textContent =
    `${count} of ${state.pack.items.length} items shown.` + warning;
}
$("#inventory-query")?.addEventListener("input", filterInventory);
$("#inventory-view")?.addEventListener("change", filterInventory);
