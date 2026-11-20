import { parseBounded } from "../content/limits.mjs";
import {
  validateAcquisitionCatalog,
  acquisitionRows,
  editAcquisition,
  blueprintOwnedName,
  ownsBlueprint,
} from "../domain/weapon-acquisition.mjs";
import { emptyArmory, validateArmory } from "../domain/armory-workspace.mjs";
import { readExistingRecord } from "../storage/summary-read.mjs";
import { saveArmory } from "../storage/armory-store.mjs";

const root = document.querySelector("#weapon-acquisition"),
  $ = (s) => root.querySelector(s);
const catalog = validateAcquisitionCatalog(
  parseBounded(
    document.querySelector("#acquisition-public-data").textContent,
    512 * 1024,
    { depth: 8, nodes: 25000, string: 1000 },
  ),
);
let inputIntent = 0;
let workspace = emptyArmory(),
  ready = false,
  pending = false,
  loading = false,
  failed = null,
  generation = 0,
  owner = new AbortController(),
  leaveApproved = false;
const drafts = new Set(),
  status = (t) => {
    $("#acq-status").textContent = t;
  },
  error = (t) => {
    $("#acq-error").textContent = t;
    $("#acq-error").hidden = !t;
  };
const rowFor = (id) => $(`[data-acquisition-weapon="${id}"]`);
function locks() {
  root.dataset.revision = String(workspace.revision);
  root.dataset.busy = String(pending || loading);
  root
    .querySelectorAll("[data-private-controls]")
    .forEach((n) => (n.disabled = !ready || pending || loading || !!failed));
  $("#acq-retry").disabled = !failed || pending || loading;
  $("#acq-export-draft").disabled = !failed;
  $("#acq-export").disabled = !ready;
  $("#acq-reload").disabled = pending;
  $("#acq-refresh").disabled = pending || loading;
}
function download(value, label) {
  const blob = new Blob(
      [
        JSON.stringify(
          { format: "dmz-armory-backup", version: 1, workspace: value },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = label + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function sync() {
  const rows = acquisitionRows(catalog, workspace),
    query = $("#acq-query").value.trim().toLowerCase(),
    category = $("#acq-class").value,
    filter = $("#acq-filter").value;
  let matching = 0;
  for (const data of rows) {
    const row = rowFor(data.id),
      countText =
        data.count === null
          ? "Not recorded / 3"
          : `${data.count.toLocaleString()} / 3`,
      goal = data.reached
        ? "3-extraction goal recorded"
        : data.count === null
          ? "No extracted-manual count entered"
          : `${3 - data.count} more recorded extractions to goal`;
    row.dataset.reached = String(data.reached);
    row.dataset.manualProgress =
      data.count === null
        ? "unrecorded"
        : data.reached
          ? "complete"
          : data.count > 0 || data.entry.manual
            ? "progress"
            : "missing";
    row.querySelector("[data-acq-summary]").textContent =
      `${data.entry.manual ? "Manual owned" : "Manual not marked"} · ${data.count === null ? "Extractions not recorded" : data.count + " / 3 extractions"}`;
    row.querySelector("[data-acq-blueprint-summary]").textContent =
      `${data.ownedKnown} / ${data.known.length} known blueprints owned`;
    row.querySelector("[data-manual]").checked = data.entry.manual;
    row.querySelector("[data-acq-counter]").textContent = countText;
    row.querySelector("[data-acq-goal]").textContent = goal;
    const input = row.querySelector("[name=count]");
    if (!drafts.has(data.id + ":count"))
      input.value = data.count === null ? "" : String(data.count);
    row.querySelector('[data-count-step="-1"]').disabled =
      data.count === null || data.count === 0;
    row.querySelector('[data-count-step="1"]').disabled = data.count === 9999;
    row.querySelector("[data-known-owned]").textContent =
      `${data.ownedKnown}/${data.known.length} in snapshot`;
    for (const b of data.known)
      row.querySelector(`[data-known-blueprint="${b.id}"]`).checked =
        ownsBlueprint(data.entry, blueprintOwnedName(b));
    const custom = row.querySelector("[data-custom-blueprints]");
    custom.replaceChildren();
    for (const n of data.custom) {
      const li = document.createElement("li"),
        b = document.createElement("button");
      li.append(document.createTextNode(n + " "));
      b.type = "button";
      b.dataset.removeBlueprint = n;
      b.textContent = "Remove";
      b.setAttribute("aria-label", `Remove owned blueprint ${n}: ${data.name}`);
      li.append(b);
      custom.append(li);
    }
    row.hidden =
      !!(category && data.category !== category) ||
      !`${data.name} ${data.category} ${data.known.map((b) => blueprintOwnedName(b)).join(" ")} ${data.entry.blueprints.join(" ")}`
        .toLowerCase()
        .includes(query) ||
      (filter === "manual-missing" && data.entry.manual) ||
      (filter === "camo-needed" && data.reached) ||
      (filter === "camo-done" && !data.reached) ||
      (filter === "blueprints-needed" && data.ownedKnown === data.known.length);
    if (!row.hidden) matching++;
  }
  for (const group of root.querySelectorAll("[data-acq-class]"))
    group.hidden = ![
      ...group.querySelectorAll("[data-acquisition-weapon]"),
    ].some((r) => !r.hidden);
  $("#acq-empty").hidden = matching !== 0;
  $("#acq-totals").textContent =
    `${matching} / ${rows.length} listed weapons · ${rows.filter((r) => r.entry.manual).length} manuals owned · ${rows.filter((r) => r.reached).length} recorded 3-extraction goals · ${rows.reduce((n, r) => n + r.ownedKnown, 0)} / ${catalog.blueprints.length} researched blueprint entries owned`;
  const archived = Object.keys(workspace.acquisition).filter(
    (id) => !catalog.weapons.some((w) => w.id === id),
  );
  $("#acq-archived").textContent = archived.length
    ? `${archived.length} archived weapon record(s) retained in your armory backup.`
    : "";
  locks();
}
async function load({ discard = false } = {}) {
  if (pending || (!discard && (failed || drafts.size))) return;
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
    if (discard) {
      failed = null;
      drafts.clear();
      root
        .querySelectorAll("[data-custom-form] input")
        .forEach((n) => (n.value = ""));
    }
    error("");
    sync();
    status(
      record
        ? "Saved on this browser · revision " + workspace.revision
        : "No saved armory yet. Your first explicit edit starts tracking.",
    );
  } catch (e) {
    if (signal.aborted || token !== generation) return;
    ready = false;
    error(
      "Cannot read private armory: " +
        e.message +
        ". Saved data has not been reset. Use armory backups/recovery.",
    );
  } finally {
    if (token === generation) {
      loading = false;
      locks();
    }
  }
}
async function commit(candidate, revision, draftKey, focusOrigin) {
  if (!ready || pending || loading) return;
  const activeAtDispatch = document.activeElement;
  const focused = focusOrigin || activeAtDispatch;
  const inputAtDispatch = inputIntent;
  const focusGeneration = generation;
  const focusedRow = focused?.closest("[data-acquisition-weapon]");
  const restoreFocus = () => {
    if (
      focusGeneration !== generation ||
      document.visibilityState === "hidden" ||
      inputIntent !== inputAtDispatch ||
      (document.activeElement !== document.body &&
        document.activeElement !== focused &&
        document.activeElement !== activeAtDispatch)
    )
      return;
    if (focusedRow?.hidden) {
      ($("#acq-query").value.trim() ? $("#acq-query") : $("#acq-filter")).focus(
        { preventScroll: true },
      );
      return;
    }
    if (!focused?.isConnected) {
      focusedRow?.querySelector("summary")?.focus({ preventScroll: true });
      return;
    }
    if (!root.contains(focused)) return;
    const row = focusedRow;
    const target = row?.hidden
      ? $("#acq-filter")
      : focused.matches(":disabled")
        ? row?.querySelector("summary")
        : focused;
    target?.focus({ preventScroll: true });
  };
  pending = true;
  locks();
  let saved;
  try {
    saved = await saveArmory(candidate, revision);
  } catch (e) {
    failed = { candidate, revision, draftKey };
    error(
      e.message +
        " Unsaved candidate retained. Export it, then retry or reload saved.",
    );
    sync();
    return;
  } finally {
    pending = false;
    locks();
    if (!saved) restoreFocus();
  }
  // The transaction has committed. A later paint failure must never enable replay.
  workspace = saved;
  failed = null;
  if (draftKey) {
    drafts.delete(draftKey);
    if (draftKey.endsWith(":custom"))
      rowFor(draftKey.slice(0, -7)).querySelector("[name=blueprint]").value =
        "";
  }
  error("");
  status("Saved privately · revision " + workspace.revision);
  try {
    sync();
  } catch (e) {
    locks();
    error(
      "Saved, but display could not refresh. Reload saved; do not repeat the increment. " +
        e.message,
    );
  } finally {
    restoreFocus();
  }
}
async function edit(id, change, key, focusOrigin) {
  if (!ready || pending || loading || failed) return;
  try {
    await commit(
      editAcquisition(workspace, id, change),
      workspace.revision,
      key,
      focusOrigin,
    );
  } catch (e) {
    error(e.message);
    sync();
  }
}
root.addEventListener("input", (event) => {
  inputIntent++;
  const form = event.target.closest("[data-count-form],[data-custom-form]");
  if (form)
    drafts.add(
      (form.dataset.countForm || form.dataset.customForm) +
        (form.dataset.countForm ? ":count" : ":custom"),
    );
});
root.addEventListener("change", (event) => {
  const manual = event.target.closest("[data-manual]"),
    bp = event.target.closest("[data-known-blueprint]");
  if (manual)
    void edit(manual.dataset.manual, { kind: "manual", value: manual.checked });
  if (bp) {
    const row = catalog.blueprints.find(
      (b) => b.id === bp.dataset.knownBlueprint,
    );
    void edit(row.weapon, {
      kind: "blueprint",
      name: blueprintOwnedName(row),
      owned: bp.checked,
    });
  }
});
root.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-count-form],[data-custom-form]");
  if (!form) return;
  event.preventDefault();
  if (form.dataset.countForm) {
    const raw = form.elements.count.value;
    if (!/^\d+$/.test(raw)) {
      error("Enter a whole-number extraction count from 0 to 9,999.");
      return;
    }
    void edit(
      form.dataset.countForm,
      { kind: "count", value: Number(raw) },
      form.dataset.countForm + ":count",
    );
  } else {
    const name = form.elements.blueprint.value.trim();
    void edit(
      form.dataset.customForm,
      { kind: "blueprint", name, owned: true },
      form.dataset.customForm + ":custom",
    );
  }
});
root.addEventListener("click", (event) => {
  const row = event.target.closest("[data-acquisition-weapon]"),
    step = event.target.closest("[data-count-step]"),
    remove = event.target.closest("[data-remove-blueprint]");
  if (step) {
    const id = row.dataset.acquisitionWeapon,
      entry = workspace.acquisition[id];
    if (drafts.has(id + ":count")) {
      error("Save or cancel the typed extraction count before using + or −.");
      return;
    }
    void edit(
      id,
      {
        kind: "count",
        value: (entry?.manualExtractions ?? 0) + Number(step.dataset.countStep),
      },
      undefined,
      step,
    );
  }
  if (remove)
    void edit(
      row.dataset.acquisitionWeapon,
      {
        kind: "blueprint",
        name: remove.dataset.removeBlueprint,
        owned: false,
      },
      undefined,
      remove,
    );
  if (event.target.closest("[data-cancel-count]")) {
    drafts.delete(row.dataset.acquisitionWeapon + ":count");
    sync();
  }
});
for (const id of ["acq-query", "acq-class", "acq-filter"])
  $("#" + id).addEventListener(id === "acq-query" ? "input" : "change", sync);
$("#acq-reset").addEventListener("click", () => {
  $("#acq-query").value = "";
  $("#acq-class").value = "";
  $("#acq-filter").value = "all";
  sync();
});
$("#acq-refresh").addEventListener("click", () => {
  if (failed || drafts.size) {
    error(
      "Save/cancel drafts or export the retained candidate before refreshing.",
    );
    return;
  }
  void load();
});
$("#acq-reload").addEventListener("click", () => {
  if (
    (failed || drafts.size) &&
    !confirm("Discard unsaved edits and reload saved armory?")
  )
    return;
  void load({ discard: true });
});
$("#acq-export").addEventListener("click", () => {
  if (ready) download(workspace, "private-armory");
});
$("#acq-export-draft").addEventListener("click", () => {
  if (failed) download(failed.candidate, "private-armory-unsaved");
});
$("#acq-retry").addEventListener("click", () => {
  if (failed) void commit(failed.candidate, failed.revision, failed.draftKey);
});
document.addEventListener(
  "error",
  (event) => {
    if (event.target?.matches?.("[data-local-weapon-art]")) {
      const svg = event.target.closest("svg");
      svg.hidden = true;
      if (svg.nextElementSibling) svg.nextElementSibling.hidden = false;
    }
  },
  true,
);
const dirty = () => pending || !!failed || drafts.size > 0;
document.addEventListener("click", (event) => {
  const a = event.target.closest("a[href]");
  if (
    !a ||
    a.target === "_blank" ||
    a.getAttribute("href").startsWith("#") ||
    !dirty()
  )
    return;
  if (
    pending ||
    !confirm(
      "Leave unsaved acquisition edits? Export/save them first to keep them.",
    )
  )
    event.preventDefault();
  else leaveApproved = true;
});
window.addEventListener("beforeunload", (event) => {
  if (dirty() && !leaveApproved) {
    event.preventDefault();
    event.returnValue = "";
  }
});
window.addEventListener("pagehide", () => {
  owner.abort();
  generation++;
  loading = false;
});
const resume = () => {
  leaveApproved = false;
  if (document.visibilityState !== "hidden") void load();
};
window.addEventListener("focus", resume);
document.addEventListener("visibilitychange", resume);
window.addEventListener("pageshow", (event) => {
  if (event.persisted) resume();
});
const selected = new URL(location.href).searchParams.get("weapon");
if (
  selected &&
  selected.length <= 100 &&
  catalog.weapons.some((w) => w.id === selected)
)
  rowFor(selected).open = true;
await load();
