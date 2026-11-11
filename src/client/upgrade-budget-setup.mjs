import { previewContentRebind } from "../domain/profile-preview.mjs";
import { previewUpgradeMigration } from "../domain/profile.mjs";
import { readRecord } from "../storage/store.mjs";
import { closeDialog } from "./dialog-focus.mjs";
export function installBudgetSetup({ state, persist, render, error }) {
  let pending = null;
  const dismiss = () => {
    if (pending?.running) return;
    const old = pending;
    pending = null;
    if (old?.dialog.open)
      closeDialog(old.dialog, () =>
        document.querySelector("#budget-setup")?.focus(),
      );
    old?.dialog.remove();
  };
  document.addEventListener("pack-changing", dismiss);
  document
    .querySelector("#budget-setup")
    ?.addEventListener("click", async () => {
      if (state.loading || state.saving || pending) return;
      try {
        const target = {
          pack: state.pack,
          profile: state.profile,
          revision: state.revision,
          fingerprint: JSON.stringify(state.profile),
        };
        const cache = await readRecord("content", state.pack.id);
        if (
          state.pack !== target.pack ||
          state.profile !== target.profile ||
          state.revision !== target.revision ||
          JSON.stringify(state.profile) !== target.fingerprint
        )
          return;
        let candidate = structuredClone(state.profile);
        if (candidate.contentVersion !== state.pack.contentVersion)
          candidate = previewContentRebind(
            candidate,
            state.pack,
            cache?.previous?.pack,
          ).candidate;
        if (candidate.schemaVersion < 2)
          candidate = previewUpgradeMigration(candidate, state.pack).candidate;
        const dialog = document.createElement("dialog");
        dialog.id = "budget-setup-dialog";
        dialog.setAttribute("aria-labelledby", "budget-setup-title");
        dialog.innerHTML =
          '<h2 id="budget-setup-title">Update this profile for upgrade tracking</h2><p>Keep your inventory, reserves, goals and recorded progress. Bind this profile to the updated catalog and, if necessary, enable upgrade completion tracking. Changed or unresolved upgrade evidence may need review. No items are spent, no past purchases are invented, and your previous saved profile remains recoverable.</p><p role="alert"></p><button type="button" id="budget-setup-confirm">Save tracking update</button> <button type="button" id="budget-setup-cancel">Keep current profile</button>';
        Object.assign(target, { dialog, candidate, running: false });
        pending = target;
        dialog.querySelector("#budget-setup-cancel").onclick = dismiss;
        dialog.addEventListener("cancel", (e) => {
          e.preventDefault();
          dismiss();
        });
        dialog.querySelector("#budget-setup-confirm").onclick = async () => {
          if (pending !== target || target.running) return;
          if (
            state.pack !== target.pack ||
            state.profile !== target.profile ||
            state.revision !== target.revision ||
            JSON.stringify(state.profile) !== target.fingerprint
          ) {
            dismiss();
            error(
              new Error(
                "Tracking preview expired. Review the current profile again.",
              ),
            );
            return;
          }
          target.running = true;
          for (const button of dialog.querySelectorAll("button"))
            button.disabled = true;
          const saved = await persist(target.candidate);
          target.running = false;
          if (saved) {
            dismiss();
            render();
          } else {
            for (const button of dialog.querySelectorAll("button"))
              button.disabled = false;
            dialog.querySelector("[role=alert]").textContent =
              "Save was not confirmed. Your current profile and this preview are retained; review the page error.";
          }
        };
        document.body.append(dialog);
        dialog.showModal();
        dialog.querySelector("#budget-setup-cancel").focus();
      } catch (cause) {
        error(cause);
      }
    });
}
export function renderBudgetSummary(state, model) {
  const root = document.querySelector("#upgrade-budget-summary");
  if (!root) return;
  root.replaceChildren();
  const p = document.createElement("p");
  p.textContent =
    model.status === "ok"
      ? `${model.completed} of ${model.total} listed upgrades completed. Remaining amounts use saved inventory after protected reserves.`
      : model.message;
  root.append(p);
  if (model.status === "ok" && model.partial) {
    const note = document.createElement("p");
    note.className = "notice";
    note.textContent = model.message;
    root.append(note);
  }
  const setup = document.querySelector("#budget-setup");
  if (setup)
    setup.hidden =
      state.profile.schemaVersion >= 2 &&
      state.profile.contentVersion === state.pack.contentVersion;
  for (const [id, path] of [
    ["budget-needed-link", "needed"],
    ["needed-upgrades-link", "upgrades"],
    ["needed-inventory-link", "inventory"],
    ["needed-recipes-link", "collection"],
  ]) {
    const a = document.querySelector("#" + id);
    if (a)
      a.href = `/${path}/?pack=${encodeURIComponent(state.pack.id)}${id === "needed-recipes-link" ? "#crafting" : ""}`;
  }
}
