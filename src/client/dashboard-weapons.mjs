import { renderWeaponCard } from "../ui/weapon-picker-view.mjs";
import { weaponClasses } from "../ui/gunsmith-presentation.mjs";
import { weaponPicker } from "./weapon-picker.mjs";
import { emptyArmory, validateArmory } from "../domain/armory-workspace.mjs";
import {
  editAcquisition,
  extractionCount,
} from "../domain/weapon-acquisition.mjs";
import {
  editCamoCompletion,
  progressCatalog,
} from "../domain/camo-progress.mjs";
import { saveArmory } from "../storage/armory-store.mjs";
import { readDashboardArmory } from "../storage/dashboard-context.mjs";

// One armory writer on Home. The profile collection writer remains independent.
export function mountDashboardWeapons(
  root,
  metadata,
  { onSaved = () => {} } = {},
) {
  const catalog = progressCatalog(metadata);
  let snapshot = emptyArmory(),
    readable = false,
    pending = false,
    candidate = null,
    intent = 0,
    active = document.visibilityState !== "hidden",
    epoch = 0,
    readEpoch = 0,
    reading = false,
    needsRead = false;
  const e = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  root.classList.add("weapon-workspace", "dash-weapon-workspace");
  root.innerHTML = `<p data-dashboard-weapon-status role="status">Reading existing armory…</p><div id="dash-weapon-recovery" hidden><p data-dashboard-weapon-error role="alert"></p><button type="button" data-weapon-recovery="export">Export unsaved</button><button type="button" data-weapon-recovery="retry">Retry save</button><button type="button" data-weapon-recovery="reload">Reload saved</button></div><div data-dashboard-weapon-groups>${weaponClasses
    .map(([id, label]) => {
      const weapons = metadata.weapons
        .filter((w) => w.category === id)
        .sort((a, b) => a.name.localeCompare(b.name));
      return `<details class="weapon-picker-group" data-dashboard-weapon-type="${id}" open><summary><h3>${e(label)} <small data-weapon-pending-count></small></h3></summary><p data-weapon-none hidden>No outstanding manual extractions.</p><div class="weapon-context-list" data-weapon-pending>${weapons.map((w) => renderWeaponCard(w, { blueprints: [] })).join("")}</div><details data-dashboard-completed hidden><summary>Completed · <span data-weapon-completed-count>0</span> weapons with 3+ extractions</summary><div class="weapon-context-list" data-weapon-completed></div></details></details>`;
    })
    .join("")}</div>`;
  for (const link of root.querySelectorAll(".picker-save-recovery"))
    link.href = "#dash-weapon-recovery";
  for (const type of ["pointerdown", "keydown", "input"])
    document.addEventListener(type, () => intent++);
  const cards = [...root.querySelectorAll("[data-weapon-card]")];
  const status = root.querySelector("[data-dashboard-weapon-status]");
  status.tabIndex = -1;
  const recovery = root.querySelector("#dash-weapon-recovery");
  const picker = weaponPicker(root, catalog, metadata.weapons, {
    intent: () => intent,
    canRestoreFocus: () => active && !reading,
    focusFallback: (card) => {
      if (!card.hasAttribute("data-focus-moved")) return null;
      card.removeAttribute("data-focus-moved");
      const group = card.closest("[data-dashboard-weapon-type]");
      return (
        card
          .closest("[data-dashboard-completed]")
          ?.querySelector(":scope > summary") ||
        group?.querySelector(":scope > summary")
      );
    },
    manual: (id, value) =>
      mutate((valueBefore) =>
        editAcquisition(valueBefore, id, { kind: "manual", value }),
      ),
    extraction: (id, delta) =>
      mutate((value) =>
        editAcquisition(value, id, {
          kind: "count",
          value: (extractionCount(value.acquisition[id]) ?? 0) + delta,
        }),
      ),
    complete: (id, camo, completed = true) =>
      mutate((value) =>
        editCamoCompletion(value, catalog, id, camo, completed),
      ),
  });
  function organize() {
    let outstanding = 0;
    for (const group of root.querySelectorAll("[data-dashboard-weapon-type]")) {
      const sorted = cards
        .filter(
          (card) =>
            metadata.weapons.find((w) => w.id === card.dataset.weaponCard)
              .category === group.dataset.dashboardWeaponType,
        )
        .sort((a, b) =>
          metadata.weapons
            .find((w) => w.id === a.dataset.weaponCard)
            .name.localeCompare(
              metadata.weapons.find((w) => w.id === b.dataset.weaponCard).name,
            ),
        );
      const lists = [
        group.querySelector("[data-weapon-pending]"),
        group.querySelector("[data-weapon-completed]"),
      ];
      const counts = [0, 0];
      for (const card of sorted) {
        const completed =
          extractionCount(snapshot.acquisition[card.dataset.weaponCard]) >= 3;
        const index = Number(completed),
          list = lists[index];
        const expected = list.children[counts[index]++];
        if (expected !== card) {
          list.insertBefore(card, expected || null);
          card.setAttribute("data-focus-moved", "");
        }
        card.toggleAttribute("data-dashboard-manual", !completed);
        if (!completed) card.dataset.dashboardManual = card.dataset.weaponCard;
        card.toggleAttribute("data-dashboard-completed-weapon", completed);
      }
      outstanding += counts[0];
      group.querySelector("[data-weapon-pending-count]").textContent =
        `${counts[0]} to track`;
      group.querySelector("[data-weapon-completed-count]").textContent =
        counts[1];
      group.querySelector("[data-weapon-none]").hidden = counts[0] > 0;
      group.querySelector("[data-dashboard-completed]").hidden =
        counts[1] === 0;
    }
    status.textContent = outstanding
      ? `${outstanding} weapons below 3 extracted manuals or not recorded.`
      : "All listed weapons have 3+ extracted manuals recorded.";
  }
  function paint() {
    if (!active) return;
    picker.paint(snapshot, readable);
    if (readable) organize();
    root.querySelector("[data-dashboard-weapon-groups]").hidden = !readable;
    const editable = readable && !pending && !reading && !candidate;
    for (const fieldset of root.querySelectorAll("[data-private-controls]"))
      fieldset.disabled = !editable;
    picker.setEditable(editable);
    root.dataset.weaponSaveState =
      pending || reading
        ? "pending"
        : candidate
          ? "retained"
          : readable
            ? "ready"
            : "unavailable";
    root.dataset.weaponRevision = snapshot.revision;
    recovery.hidden = !candidate;
    for (const button of recovery.querySelectorAll("button"))
      button.disabled = pending || reading;
  }
  async function reconcile(discard = false) {
    if (!active || pending || (candidate && !discard)) {
      needsRead = true;
      return;
    }
    const life = epoch,
      token = ++readEpoch;
    reading = true;
    paint();
    try {
      const next = await readDashboardArmory();
      if (!active || life !== epoch || token !== readEpoch) return;
      snapshot = next || emptyArmory();
      if (discard) candidate = null;
      readable = true;
      needsRead = false;
      onSaved(next);
    } catch (error) {
      if (active && life === epoch && token === readEpoch) {
        readable = false;
        status.textContent =
          "Armory unavailable. Open Weapons to review your saved records.";
        root.querySelector("[data-dashboard-weapon-error]").textContent =
          error.message;
      }
    } finally {
      if (token === readEpoch) reading = false;
      if (active && life === epoch) paint();
    }
  }
  async function commit() {
    const life = epoch;
    pending = true;
    paint();
    try {
      const saved = await saveArmory(candidate, snapshot.revision, {
        requireValidCurrent: true,
      });
      snapshot = saved;
      candidate = null;
      readable = true;
      if (active && life === epoch) onSaved(saved);
      else needsRead = true;
      root.querySelector("[data-dashboard-weapon-error]").textContent = "";
    } catch (error) {
      root.querySelector("[data-dashboard-weapon-error]").textContent =
        error.message || "Save failed; your change is retained.";
      throw error;
    } finally {
      if (active && !needsRead) paint();
      pending = false;
      if (active && needsRead && !candidate) await reconcile();
      else if (active) paint();
    }
  }
  async function mutate(change) {
    if (!active || !readable || pending || reading || candidate)
      throw Error("Resolve the current Weapons save before editing.");
    for (const card of cards) card.removeAttribute("data-focus-moved");
    candidate = validateArmory(change(structuredClone(snapshot)));
    await commit();
  }
  recovery.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-weapon-recovery]")?.dataset
      .weaponRecovery;
    if (!action || !active || pending || reading) return;
    const captured = intent;
    if (action === "export" && candidate) {
      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify({
              format: "dmz-armory-backup",
              version: 1,
              workspace: candidate,
            }),
          ],
          { type: "application/json" },
        ),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "private-armory-unsaved.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (action === "retry" && candidate) {
      try {
        await commit();
      } catch {}
      if (
        active &&
        captured === intent &&
        !candidate &&
        document.activeElement === document.body
      )
        status.focus();
    } else if (action === "reload") {
      if (
        candidate &&
        !window.confirm(
          "Discard the unsaved Weapons change and reload saved progress? Export it first if needed.",
        )
      )
        return;
      await reconcile(true);
      if (
        active &&
        captured === intent &&
        !candidate &&
        document.activeElement === document.body
      )
        status.focus();
    }
  });
  const hide = () => {
    active = false;
    epoch++;
    needsRead = true;
  };
  const resume = () => {
    if (document.visibilityState === "hidden") return;
    active = true;
    epoch++;
    needsRead = true;
    if (!pending && !candidate) void reconcile();
  };
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", resume);
  document.addEventListener("visibilitychange", () =>
    document.visibilityState === "hidden" ? hide() : resume(),
  );
  return {
    dirty: () => pending || reading || !!candidate,
    paint(value, state) {
      if (!active || pending || reading || candidate) return;
      readable = ["ready", "absent"].includes(state);
      if (readable) {
        const next = value || emptyArmory();
        if (next.revision < snapshot.revision) return;
        snapshot = next;
      } else
        status.textContent =
          state === "loading"
            ? "Reading existing armory…"
            : "Armory unavailable. Open Weapons to review your saved records.";
      paint();
    },
  };
}
