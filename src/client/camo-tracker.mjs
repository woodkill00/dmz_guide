import { parseProgressCatalog, camoStates } from "../domain/camo-progress.mjs";
import { createCamoSession } from "./camo-session.mjs";
const root = document.querySelector("#camo-tracker"),
  $ = (selector) => root.querySelector(selector);
const catalog = parseProgressCatalog(
    document.querySelector("#camo-progress-data").textContent,
  ),
  weapon = root.dataset.weapon;
if (!catalog.weapons.some((w) => w.id === weapon))
  throw Error("Unknown camo tracker weapon");
const labels = {
  completed: "✓ Completed",
  next: "● Next to track",
  remaining: "○ Remaining",
  unknown: "Progress unavailable",
};
function paint(workspace, ready) {
  const states = ready ? camoStates(catalog, workspace, weapon) : {};
  for (const tile of root.querySelectorAll("[data-camo-tile]")) {
    const id = tile.dataset.camoTile,
      state = states[id] || "unknown";
    tile.dataset.state = state;
    tile.querySelector("[data-camo-mark]").textContent = {
      completed: "✓",
      next: "●",
      remaining: "○",
      unknown: "?",
    }[state];
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
}
const session = createCamoSession(root, catalog, paint);
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
  if (checkbox)
    session.edit(
      weapon,
      checkbox.dataset.camoComplete,
      checkbox.checked,
      checkbox,
    );
});
root
  .querySelectorAll("[data-camo-tile], [data-camo-view]")
  .forEach((button) => (button.disabled = false));
await session.start();
