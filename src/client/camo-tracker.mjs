import { emptyArmory, validateArmory } from "../domain/armory-workspace.mjs";
import {
  parseProgressCatalog,
  camoStates,
  editCamoCompletion,
} from "../domain/camo-progress.mjs";
import { readExistingRecord } from "../storage/summary-read.mjs";
import { saveArmory } from "../storage/armory-store.mjs";
const root = document.querySelector("#camo-tracker"),
  $ = (selector) => root.querySelector(selector);
const catalog = parseProgressCatalog(
    document.querySelector("#camo-progress-data").textContent,
  ),
  weapon = root.dataset.weapon;
if (!catalog.weapons.some((w) => w.id === weapon))
  throw Error("Unknown camo tracker weapon");
let workspace = emptyArmory(),
  ready = false,
  pending = false,
  loading = false,
  failed = null,
  generation = 0,
  inputIntent = 0,
  owner = new AbortController(),
  leaveApproved = false,
  refreshAfterPending = false;
const labels = {
  completed: "✓ Completed",
  next: "● Next to track",
  remaining: "○ Remaining",
  unknown: "Progress unavailable",
};
const status = (text) => {
  $("#camo-save-status").textContent = text;
};
function error(text) {
  $("#camo-save-error").textContent = text;
  $("#camo-save-error").hidden = !text;
}
function locks() {
  root.dataset.revision = String(workspace.revision);
  root.dataset.busy = String(pending || loading);
  root
    .querySelectorAll("[data-camo-complete]")
    .forEach((n) => (n.disabled = !ready || pending || loading || !!failed));
  $("#camo-refresh").disabled = pending || loading || !!failed;
  $("#camo-recovery").hidden = !failed;
  for (const button of root.querySelectorAll(".camo-recovery button"))
    button.disabled = pending || loading;
}
function paint() {
  const states = ready ? camoStates(catalog, workspace, weapon) : {};
  for (const tile of root.querySelectorAll("[data-camo-tile]")) {
    const id = tile.dataset.camoTile,
      state = states[id] || "unknown";
    tile.dataset.state = state;
    tile.querySelector("[data-camo-tile-status]").textContent = labels[state];
    $(`[data-camo-complete="${id}"]`).checked = state === "completed";
  }
  const w = catalog.weapons.find((w) => w.id === weapon);
  for (const output of root.querySelectorAll("[data-camo-group-count]")) {
    const rows = w.rows.filter(
      (r) => r.group === output.dataset.camoGroupCount,
    );
    output.textContent = `${ready ? rows.filter((r) => states[r.id] === "completed").length : "—"} / ${rows.length}`;
  }
  locks();
}
async function load(discard = false) {
  if (pending || (!discard && failed)) return;
  refreshAfterPending = false;
  owner.abort();
  owner = new AbortController();
  const signal = owner.signal,
    token = ++generation;
  loading = true;
  locks();
  try {
    const record = await readExistingRecord(
      "dmz-armory-local",
      "workspace",
      "main",
      { signal },
    );
    if (signal.aborted || token !== generation) return;
    if (record !== undefined && (!record || !Object.hasOwn(record, "value")))
      throw Error("Invalid private armory envelope");
    workspace = validateArmory(
      record === undefined ? emptyArmory() : record.value,
    );
    ready = true;
    if (discard) failed = null;
    error("");
    paint();
    status(
      record
        ? `Saved locally · revision ${workspace.revision}`
        : "No camo records yet · your first tick saves locally",
    );
  } catch (reason) {
    if (signal.aborted || token !== generation) return;
    ready = false;
    error(
      "Cannot read armory. Saved data has not been reset. " + reason.message,
    );
    paint();
    status("Progress unavailable · saved data retained");
  } finally {
    if (token === generation) {
      loading = false;
      locks();
    }
  }
}
async function commit(candidate, revision, focusOrigin) {
  if (!ready || pending || loading) return;
  const active = document.activeElement,
    focus = focusOrigin || active,
    intent = inputIntent,
    epoch = generation;
  const restoreFocus = () => {
    if (
      epoch === generation &&
      intent === inputIntent &&
      document.visibilityState !== "hidden" &&
      focus?.isConnected &&
      (document.activeElement === document.body ||
        document.activeElement === active ||
        document.activeElement === focus) &&
      !focus.closest("[hidden]")
    )
      focus.focus({ preventScroll: true });
  };
  pending = true;
  locks();
  let saved;
  try {
    saved = await saveArmory(candidate, revision, {
      requireValidCurrent: true,
    });
  } catch (reason) {
    failed = { candidate, revision };
    error(
      reason.message +
        " Unsaved ticks retained; export, retry or reload saved.",
    );
    paint();
  } finally {
    pending = false;
    locks();
    if (!saved) restoreFocus();
  }
  if (!saved) return;
  workspace = saved;
  failed = null;
  error("");
  if (refreshAfterPending) {
    if (document.visibilityState !== "hidden") await load();
    else locks();
    return;
  }
  try {
    paint();
    status(`Saved locally · revision ${workspace.revision}`);
  } catch (reason) {
    locks();
    error(
      "Saved, but display could not refresh. Reload saved. " + reason.message,
    );
  }
  restoreFocus();
}
root.addEventListener("pointerdown", () => inputIntent++, true);
root.addEventListener("keydown", () => inputIntent++, true);
root.addEventListener("click", (event) => {
  const tile = event.target.closest("[data-camo-tile]");
  if (tile) {
    const tier = tile.closest("[data-camo-tier]"),
      open = tile.getAttribute("aria-expanded") !== "true";
    tier
      .querySelectorAll("[data-camo-tile]")
      .forEach((n) =>
        n.setAttribute("aria-expanded", String(n === tile && open)),
      );
    const panel = tier.querySelector(".camo-detail-panel");
    panel.hidden = !open;
    panel
      .querySelectorAll("[data-camo-detail]")
      .forEach(
        (n) =>
          (n.hidden = !open || n.dataset.camoDetail !== tile.dataset.camoTile),
      );
  }
  const close = event.target.closest("[data-camo-close]");
  if (close) {
    const tier = close.closest("[data-camo-tier]"),
      selected = tier.querySelector('[data-camo-tile][aria-expanded="true"]');
    if (selected) {
      selected.setAttribute("aria-expanded", "false");
      tier.querySelector(".camo-detail-panel").hidden = true;
      selected.focus({ preventScroll: true });
    }
  }
  const view = event.target.closest("[data-camo-view]");
  if (view) {
    root
      .querySelectorAll("[data-camo-view]")
      .forEach((n) => n.setAttribute("aria-pressed", String(n === view)));
    root
      .querySelectorAll("[data-camo-view-panel]")
      .forEach(
        (n) => (n.hidden = n.dataset.camoViewPanel !== view.dataset.camoView),
      );
  }
});
root.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-camo-complete]");
  if (!checkbox) return;
  if (!ready || pending || loading || failed) {
    paint();
    return;
  }
  try {
    void commit(
      editCamoCompletion(
        workspace,
        catalog,
        weapon,
        checkbox.dataset.camoComplete,
        checkbox.checked,
      ),
      workspace.revision,
      checkbox,
    );
  } catch (reason) {
    error(reason.message);
    paint();
  }
});
$("#camo-refresh").addEventListener("click", () => void load());
$("#camo-reload").addEventListener("click", () => void load(true));
$("#camo-retry").addEventListener("click", () => {
  if (failed) void commit(failed.candidate, failed.revision);
});
$("#camo-export-failed").addEventListener("click", () => {
  if (!failed) return;
  const blob = new Blob(
      [
        JSON.stringify(
          {
            format: "dmz-armory-backup",
            version: 1,
            workspace: failed.candidate,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "private-armory-unsaved-camos.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (
    !link ||
    link.target === "_blank" ||
    link.getAttribute("href").startsWith("#") ||
    (!pending && !failed)
  )
    return;
  if (
    pending ||
    !confirm("Leave unsaved camo ticks? Export/save them first to keep them.")
  )
    event.preventDefault();
  else leaveApproved = true;
});
window.addEventListener("beforeunload", (event) => {
  if ((pending || failed) && !leaveApproved) {
    event.preventDefault();
    event.returnValue = "";
  }
});
window.addEventListener("pagehide", () => {
  if (pending) refreshAfterPending = true;
  owner.abort();
  generation++;
  loading = false;
});
const resume = () => {
  leaveApproved = false;
  if (pending) {
    refreshAfterPending = true;
    return;
  }
  if (document.visibilityState !== "hidden") void load();
};
window.addEventListener("focus", resume);
document.addEventListener("visibilitychange", resume);
window.addEventListener("pageshow", (event) => {
  if (event.persisted) resume();
});
root
  .querySelectorAll("[data-camo-tile], [data-camo-view]")
  .forEach((button) => (button.disabled = false));
await load();
