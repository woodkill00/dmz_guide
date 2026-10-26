import { state, persist, download, status, error, esc } from "./common.mjs";
import { setWatchPin } from "../domain/upgrade-progress.mjs";
let pending = null;
/** Keep a failed, progress-only pin candidate separate from the committed profile. */
export async function saveWatchPin(id, pinned) {
  if (state.saving) return false;
  if (pending) {
    error(
      new Error(
        "An unsaved watch-pin change is waiting. Export or discard it before another pin change.",
      ),
    );
    document.querySelector("#watch-pin-recovery")?.focus();
    return false;
  }
  const candidate = setWatchPin(state.pack, state.profile, id, pinned);
  if (await persist(candidate)) return true;
  pending = candidate;
  const section = document.createElement("section");
  section.id = "watch-pin-recovery";
  section.className = "panel notice";
  section.tabIndex = -1;
  section.setAttribute("aria-label", "Unsaved watch-pin recovery");
  section.innerHTML = `<h2>Watch-pin change was not saved</h2><p>The committed profile is unchanged. This separate candidate belongs to ${esc(candidate.packId)} at revision ${candidate.revision}. Export it before leaving or reloading, or explicitly discard it. To reconcile a stale revision, reload the current profile and review the change again; it will not be retried automatically.</p><button type="button" id="watch-pin-export">Export unsaved watch-pin candidate</button><button type="button" id="watch-pin-discard">Discard unsaved watch-pin change</button>`;
  section.querySelector("#watch-pin-export").addEventListener("click", () => {
    if (!state.saving && pending)
      download("dmz-unsaved-watch-pin.json", pending);
  });
  section.querySelector("#watch-pin-discard").addEventListener("click", () => {
    if (state.saving) return;
    pending = null;
    section.remove();
    status(
      "Unsaved watch-pin candidate discarded. The committed profile was not changed.",
    );
  });
  document.querySelector("main").append(section);
  status(
    "Watch-pin save failed. Export the retained candidate or discard it; the active profile is unchanged.",
  );
  section.focus();
  return false;
}
