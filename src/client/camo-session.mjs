import { emptyArmory, validateArmory } from "../domain/armory-workspace.mjs";
import { editCamoCompletion } from "../domain/camo-progress.mjs";
import { readExistingRecord } from "../storage/summary-read.mjs";
import { saveArmory } from "../storage/armory-store.mjs";
export function createCamoSession(root, catalog, render) {
  const $ = (selector) => root.querySelector(selector);
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
    render(workspace, ready);
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
        !focus.closest("[hidden]") &&
        focus.getClientRects().length > 0
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
  return {
    start: () => load(),
    refresh: () => load(),
    repaint: () => paint(),
    edit(weapon, camo, checked, focus) {
      if (!ready || pending || loading || failed) {
        paint();
        return;
      }
      try {
        void commit(
          editCamoCompletion(workspace, catalog, weapon, camo, checked),
          workspace.revision,
          focus,
        );
      } catch (reason) {
        error(reason.message);
        paint();
      }
    },
  };
}
