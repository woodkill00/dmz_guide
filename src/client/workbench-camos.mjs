import { camoStates } from "../domain/camo-progress.mjs";

// View adapter only: the host owns the revision, candidate, save and recovery.
export function workbenchCamos(root, catalog, complete) {
  if (!root) return { paint() {}, setEditable() {} };
  const weapon = root.dataset.weapon;
  let editable = false;
  const labels = {
    completed: "✓ Completed",
    next: "● Next to track",
    remaining: "○ Remaining",
    unknown: "Progress unavailable",
  };
  root.addEventListener("click", (event) => {
    const tile = event.target.closest("[data-camo-tile]");
    if (tile) {
      const tier = tile.closest("[data-camo-tier]"),
        open = tile.getAttribute("aria-expanded") !== "true";
      for (const node of tier.querySelectorAll("[data-camo-tile]"))
        node.setAttribute("aria-expanded", String(node === tile && open));
      tier.querySelector(".camo-detail-panel").hidden = !open;
      for (const node of tier.querySelectorAll("[data-camo-detail]"))
        node.hidden =
          !open || node.dataset.camoDetail !== tile.dataset.camoTile;
    }
    const close = event.target.closest("[data-camo-close]");
    if (close) {
      const tier = close.closest("[data-camo-tier]"),
        selected = tier.querySelector('[aria-expanded="true"]');
      tier.querySelector(".camo-detail-panel").hidden = true;
      selected?.setAttribute("aria-expanded", "false");
      selected?.focus({ preventScroll: true });
    }
    const view = event.target.closest("[data-camo-view]");
    if (view) {
      for (const node of root.querySelectorAll("[data-camo-view]"))
        node.setAttribute("aria-pressed", String(node === view));
      for (const node of root.querySelectorAll("[data-camo-view-panel]"))
        node.hidden = node.dataset.camoViewPanel !== view.dataset.camoView;
    }
  });
  root.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-camo-complete]");
    if (checkbox && editable)
      complete(
        weapon,
        checkbox.dataset.camoComplete,
        checkbox.checked,
        checkbox,
      );
  });
  root
    .querySelectorAll("[data-camo-tile],[data-camo-view]")
    .forEach((button) => {
      button.disabled = false;
    });
  root.addEventListener(
    "error",
    (event) => {
      if (event.target.matches?.("[data-camo-image]"))
        event.target.hidden = true;
    },
    true,
  );
  // Cached failures may finish before this controller attaches its listener.
  for (const image of root.querySelectorAll("[data-camo-image]"))
    if (image.complete && !image.naturalWidth) image.hidden = true;
  return {
    setEditable(value) {
      editable = !!value;
      root.querySelectorAll("[data-camo-complete]").forEach((node) => {
        node.disabled = !editable;
      });
    },
    paint(workspace, ready) {
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
        tile.querySelector("[data-camo-tile-status]").textContent =
          labels[state];
        root.querySelector(`[data-camo-complete="${id}"]`).checked =
          state === "completed";
      }
      const rows = catalog.weapons.find((w) => w.id === weapon).rows;
      for (const node of root.querySelectorAll("[data-camo-group-count]")) {
        const group = rows.filter(
          (row) => row.group === node.dataset.camoGroupCount,
        );
        node.textContent = `${ready ? group.filter((r) => states[r.id] === "completed").length : "—"} / ${group.length}`;
      }
    },
  };
}
