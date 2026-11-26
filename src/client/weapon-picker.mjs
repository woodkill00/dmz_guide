import { pickerCamo, parsePickerChoices } from "../domain/weapon-picker.mjs";
import {
  extractionCount,
  MANUAL_EXTRACTION_LIMIT,
} from "../domain/weapon-acquisition.mjs";
import { camoGroups, camoImagePath } from "../domain/weapon-camos.mjs";
import { weaponCamoURL, weaponURL } from "../domain/weapon-routes.mjs";

// View and session preferences only. The host owns every progress write,
// pending revision, retained candidate and recovery transaction.
export function weaponPicker(
  root,
  catalog,
  weapons,
  {
    manual,
    complete,
    extraction,
    intent = () => 0,
    focusFallback = () => null,
    canRestoreFocus = () => true,
  },
) {
  if (!root) return { paint() {}, setEditable() {} };
  const key = "dmz-weapon-picker-choices-v1";
  let choices = new Map(),
    editable = false,
    snapshot = null,
    readable = false;
  try {
    choices = parsePickerChoices(sessionStorage.getItem(key), weapons);
  } catch {}
  const cards = [...root.querySelectorAll("[data-weapon-card]")];
  const storeChoices = () => {
    try {
      sessionStorage.setItem(key, JSON.stringify([...choices]));
    } catch {}
  };
  const weaponFor = (card) =>
    weapons.find((w) => w.id === card.dataset.weaponCard);
  const viewFor = (card) =>
    pickerCamo(
      catalog,
      weaponFor(card),
      snapshot,
      choices.get(card.dataset.weaponCard),
    );
  function lock() {
    for (const card of cards) {
      const current = readable && snapshot ? viewFor(card).current : null;
      card.querySelector("[data-picker-manual]").disabled = !editable;
      card.querySelector("[data-picker-prestiged]").disabled = !editable;
      const count = extractionCount(
        snapshot?.acquisition[card.dataset.weaponCard],
      );
      for (const button of card.querySelectorAll(
        "[data-picker-extraction-step]",
      ))
        button.disabled =
          !editable ||
          (Number(button.dataset.pickerExtractionStep) < 0
            ? !(count > 0)
            : count >= MANUAL_EXTRACTION_LIMIT);
      card.querySelector("[data-picker-camo-select]").disabled =
        !editable || !current;
      card.querySelector("[data-picker-complete]").disabled =
        !editable || !current;
      card.querySelector("[data-picker-camo-open]").disabled = !readable;
      const prestige =
        readable && snapshot
          ? pickerCamo(catalog, weaponFor(card), snapshot, "", true).current
          : null;
      card.querySelector("[data-prestige-complete]").disabled =
        !editable || !prestige;
      card.querySelector("[data-prestige-open]").disabled = !readable;
    }
  }
  function paintCard(card) {
    const weapon = weaponFor(card),
      id = weapon.id,
      record = snapshot?.acquisition[id],
      count = extractionCount(record);
    const prestige = readable
      ? pickerCamo(catalog, weapon, snapshot, "", true)
      : null;
    const prestigeRow = prestige?.current;
    const firstPrestige = weapon.rows.find((row) => row.group === "prestige");
    const prestigeCheck = card.querySelector("[data-picker-prestiged]");
    prestigeCheck.checked =
      !!prestige && prestige.states[firstPrestige.id] === "completed";
    prestigeCheck.indeterminate = !readable;

    const prestigeSource = card.querySelector("[data-prestige-source]");
    prestigeSource.hidden = !prestigeRow;
    if (prestigeRow) prestigeSource.href = prestigeRow.sourceURL;
    card.querySelector("[data-prestige-name]").textContent = !readable
      ? "Progress unavailable"
      : prestigeRow?.name || "Prestige completed";
    card.querySelector("[data-prestige-count]").textContent = prestige
      ? `${prestige.completed}/${prestige.total}`
      : "—";
    card.querySelector("[data-prestige-status]").textContent = !readable
      ? "Progress unavailable"
      : prestigeRow
        ? "Current prestige"
        : "All prestige completed";
    card.querySelector("[data-prestige-complete]").checked = false;
    card
      .querySelector("[data-prestige-complete]")
      .setAttribute(
        "aria-label",
        `Done · Prestige ${prestigeRow?.name || "completed"} · ${weapon.name}`,
      );
    card.querySelector("[data-prestige-requirement]").textContent = !readable
      ? "Prestige progress unavailable. Reload saved progress to review this challenge."
      : prestigeRow?.requirement ||
        "All recorded Prestige challenges are complete. Use the full tracker to review or undo.";
    card.querySelector("[data-prestige-link]").href = prestigeRow
      ? weaponCamoURL(id, prestigeRow.id)
      : weaponURL(id, "camos");
    const prestigeImage = card.querySelector("[data-prestige-image]");
    if (prestigeRow) {
      const src = camoImagePath(id, prestigeRow.id);
      if (prestigeImage.getAttribute("src") !== src) {
        prestigeImage.hidden = false;
        prestigeImage.src = src;
      }
    } else prestigeImage.hidden = true;
    const link = card.querySelector("[data-weapon-context]");
    link.dataset.progress = !readable
      ? "unknown"
      : count >= 3
        ? "completed"
        : record?.manual || count > 0
          ? "next"
          : "remaining";
    card.querySelector("[data-picker-manual]").checked =
      readable && !!record?.manual;
    card.querySelector("[data-picker-manual]").indeterminate = !readable;
    card.querySelector("[data-weapon-context-progress]").textContent = readable
      ? `Manual extractions ${count ?? "—"}/3`
      : "Progress unavailable";
    const selector = card.querySelector("[data-picker-camo-select]"),
      image = card.querySelector("[data-picker-camo-image]");
    if (!readable) {
      selector.replaceChildren(new Option("Progress unavailable", ""));
      delete selector.dataset.options;
      card.querySelector("[data-picker-camo-count]").textContent =
        "Camo progress unavailable";
      card.querySelector("[data-picker-camo-status]").textContent =
        "Progress unavailable";
      card.querySelector("[data-picker-camo-name]").textContent =
        "Progress unavailable";

      card.querySelector("[data-picker-camo-requirement]").textContent =
        "Camo progress unavailable. Reload saved progress to review this challenge.";
      card.querySelector("[data-picker-complete]").checked = false;
      image.hidden = true;
      return;
    }
    const view = viewFor(card),
      row = view.current;
    card.querySelector("[data-picker-camo-name]").textContent =
      row?.name || "Camos completed";

    if (
      choices.has(id) &&
      !view.remaining.some((r) => r.id === choices.get(id))
    ) {
      choices.delete(id);
      storeChoices();
    }
    const signature = view.remaining.map((r) => r.id).join("|");
    if (selector.dataset.options !== signature) {
      selector.replaceChildren();
      for (const camo of view.remaining) {
        const option = new Option(
          `${camoGroups[camo.group]} · ${camo.name}`,
          camo.id,
        );
        selector.add(option);
      }
      if (!row) selector.add(new Option("All recorded camos completed", ""));
      selector.dataset.options = signature;
    }
    selector.value = row?.id || "";
    card.querySelector("[data-picker-camo-count]").textContent =
      `${view.completed}/${view.total}`;
    card.querySelector("[data-picker-complete]").checked = false;
    card
      .querySelector("[data-picker-complete]")
      .setAttribute(
        "aria-label",
        row
          ? `Done · ${row.name} · ${weapon.name}`
          : `Done · All recorded camos completed · ${weapon.name}`,
      );
    card.querySelector("[data-picker-camo-status]").textContent = !row
      ? "All recorded camos completed"
      : view.states[row.id] === "next"
        ? "Suggested next"
        : "Remaining · check prerequisites";
    card.querySelector("[data-picker-camo-requirement]").textContent =
      row?.requirement ||
      "Every captured challenge is marked complete. Full tracker lets you review or undo progress.";
    card.dataset.camoState = row ? view.states[row.id] : "completed";
    const source = card.querySelector("[data-picker-camo-source]"),
      tracker = card.querySelector("[data-picker-camo-link]");
    if (row) {
      source.href = row.sourceURL;
      source.hidden = false;
      tracker.href = weaponCamoURL(id, row.id);
      const src = camoImagePath(id, row.id);
      if (image.getAttribute("src") !== src) {
        image.hidden = false;
        image.src = src;
      }
    } else {
      source.hidden = true;
      image.hidden = true;
    }
  }
  function paint(workspace, ready) {
    snapshot = workspace;
    readable = !!ready;
    for (const card of cards) paintCard(card);
    lock();
  }
  async function save(control, action) {
    if (!editable) return;
    const card = control.closest("[data-weapon-card]"),
      captured = intent();
    const error = card.querySelector("[data-picker-error]");
    error.hidden = true;
    try {
      await action();
    } catch (failure) {
      if (snapshot) paint(snapshot, readable);
      error.textContent =
        failure.message ||
        "Save failed. Use Backups to recover the retained change.";
      error.hidden = false;
      card.querySelector(".picker-save-recovery").hidden = false;
    } finally {
      if (
        captured === intent() &&
        canRestoreFocus() &&
        document.visibilityState !== "hidden" &&
        (document.activeElement === document.body ||
          document.activeElement === control) &&
        control.isConnected
      ) {
        const available = (node) =>
          node &&
          !node.matches(":disabled") &&
          !node.closest("[hidden]") &&
          node.getClientRects().length > 0;
        const target = [
          focusFallback(card),
          control,
          card.querySelector(".picker-save-recovery"),
          control.matches("[data-prestige-complete]") &&
            card.querySelector("[data-prestige-open]"),
          card.querySelector("[data-picker-camo-open]"),
          card.querySelector("[data-weapon-context]"),
          root.querySelector("#weapon-context-filter"),
          root.querySelector("#weapon-context-search"),
          root.querySelector(":scope > summary"),
        ].find(available);
        target?.focus({ preventScroll: target === control });
      }
    }
  }
  root.addEventListener("change", (event) => {
    const card = event.target.closest("[data-weapon-card]");
    if (!card || !editable) return;
    const id = card.dataset.weaponCard;
    if (event.target.matches("[data-picker-prestiged]")) {
      const first = weaponFor(card).rows.find(
        (row) => row.group === "prestige",
      );
      save(event.target, () => complete(id, first.id, event.target.checked));
    } else if (event.target.matches("[data-picker-manual]"))
      save(event.target, () => manual(id, event.target.checked));
    else if (event.target.matches("[data-picker-camo-select]")) {
      const selected = event.target.value;
      if (!viewFor(card).remaining.some((row) => row.id === selected)) return;
      choices.set(id, selected);
      storeChoices();
      paintCard(card);
      lock();
    } else if (event.target.matches("[data-picker-complete]")) {
      const row = viewFor(card).current;
      if (event.target.checked && row)
        save(event.target, () => complete(id, row.id));
    } else if (event.target.matches("[data-prestige-complete]")) {
      const row = pickerCamo(
        catalog,
        weaponFor(card),
        snapshot,
        "",
        true,
      ).current;
      if (event.target.checked && row)
        save(event.target, () => complete(id, row.id));
    }
  });
  root.addEventListener("click", (event) => {
    const step = event.target.closest("[data-picker-extraction-step]");
    if (step) {
      if (editable && !step.disabled)
        save(step, () =>
          extraction(
            step.closest("[data-weapon-card]").dataset.weaponCard,
            Number(step.dataset.pickerExtractionStep),
          ),
        );
      return;
    }
    const button = event.target.closest(
      "[data-picker-camo-open],[data-prestige-open]",
    );
    if (!button || button.disabled) return;
    const panel = button
      .closest("[data-weapon-card]")
      .querySelector(
        button.matches("[data-prestige-open]")
          ? "[data-prestige-detail]"
          : "[data-picker-camo-detail]",
      );
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
  });
  root.addEventListener(
    "error",
    (event) => {
      if (
        event.target.matches?.("[data-picker-camo-image],[data-prestige-image]")
      )
        event.target.hidden = true;
    },
    true,
  );
  return {
    paint,
    setEditable(value) {
      editable = !!value;
      if (editable)
        root
          .querySelectorAll("[data-picker-error],.picker-save-recovery")
          .forEach((node) => {
            node.hidden = true;
          });
      lock();
    },
  };
}
