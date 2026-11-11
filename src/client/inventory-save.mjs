import { cashFormatSave } from "../domain/inventory-items.mjs";
import { readRecord } from "../storage/store.mjs";
import { closeDialog } from "./dialog-focus.mjs";
export function inventorySaveAction({
  state,
  getDraft,
  persist,
  render,
  error,
  revealInvalid,
}) {
  let pending = null;
  const dismiss = () => {
    if (pending?.running) return;
    const p = pending;
    pending = null;
    if (p?.dialog.open)
      closeDialog(p.dialog, () =>
        document.querySelector("#inventory-form button[type=submit]")?.focus(),
      );
    p?.dialog.remove();
  };
  document.addEventListener("pack-changing", dismiss);
  return async () => {
    try {
      if (state.loading || state.saving || pending) return;
      if (getDraft()?.firstInvalid()) {
        error(
          new Error(
            "Enter whole nonnegative quantities within each displayed limit.",
          ),
        );
        revealInvalid();
        return;
      }
      const snapshot = {
        pack: state.pack,
        revision: state.revision,
        draft: getDraft(),
        fingerprint: JSON.stringify(state.profile),
      };
      const cached = await readRecord("content", snapshot.pack.id);
      if (
        state.loading ||
        state.saving ||
        state.pack !== snapshot.pack ||
        state.revision !== snapshot.revision ||
        getDraft() !== snapshot.draft ||
        JSON.stringify(state.profile) !== snapshot.fingerprint ||
        pending
      )
        return;
      const result = cashFormatSave(
        state.profile,
        state.pack,
        cached?.previous?.pack,
      );
      if (!result.needsUpgrade) {
        await persist();
        return;
      }
      const dialog = document.createElement("dialog");
      dialog.id = "currency-format-confirm";
      dialog.setAttribute("aria-labelledby", "currency-format-title");
      const heading = document.createElement("h2");
      heading.id = "currency-format-title";
      heading.textContent = "Save higher cash amounts";
      const text = document.createElement("p");
      text.textContent =
        (result.rebound
          ? "Also bind this profile to the updated catalog; changed or unconfirmed upgrade requirements will require review. "
          : "") +
        "Update this local profile to support currency up to 2,000,000, then save all entered quantities. Materials remain limited to 1,000,000. Existing progress is retained; legacy unlocked upgrades may require review. No past spending is invented. The previous saved profile remains recoverable.";
      const message = document.createElement("p");
      message.setAttribute("role", "alert");
      const confirm = document.createElement("button"),
        cancel = document.createElement("button");
      confirm.type = cancel.type = "button";
      confirm.id = "confirm-currency-format";
      cancel.id = "cancel-currency-format";
      confirm.textContent = "Save inventory and update profile";
      cancel.textContent = "Keep editing";
      const target = {
        dialog,
        pack: state.pack,
        revision: state.revision,
        draft: getDraft(),
        fingerprint: JSON.stringify(state.profile),
        candidate: structuredClone(result.candidate),
        running: false,
      };
      pending = target;
      cancel.onclick = dismiss;
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        dismiss();
      });
      confirm.onclick = async () => {
        if (pending !== target || target.running) return;
        if (
          state.pack !== target.pack ||
          state.revision !== target.revision ||
          getDraft() !== target.draft ||
          JSON.stringify(state.profile) !== target.fingerprint
        ) {
          dismiss();
          error(new Error("Inventory changed. Review and save again."));
          return;
        }
        target.running = true;
        confirm.disabled = cancel.disabled = true;
        const ok = await persist(target.candidate);
        target.running = false;
        if (ok) {
          dismiss();
          render();
        } else {
          confirm.disabled = cancel.disabled = false;
          message.textContent =
            "Save was not confirmed. Your entered quantities remain available; review the page error before retrying.";
        }
      };
      dialog.append(heading, text, message, confirm, cancel);
      document.body.append(dialog);
      dialog.showModal();
      cancel.focus();
    } catch (cause) {
      error(cause);
    }
  };
}
