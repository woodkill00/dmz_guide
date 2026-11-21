import { camoStates } from "../domain/camo-progress.mjs";

const labels = {
  completed: "Completed",
  next: "Next to track",
  remaining: "Remaining",
  unknown: "Progress unavailable",
};
const marks = { completed: "✓", next: "●", remaining: "○", unknown: "?" };

export function acquisitionCamoController(root, catalog) {
  const panelFor = (strip) =>
    root.querySelector(
      `#acq-camo-panel-${CSS.escape(strip.dataset.acquisitionCamos)}`,
    );
  function show(button, strip) {
    const panel = panelFor(strip);
    panel.querySelector("[data-acq-camo-heading]").textContent =
      button.dataset.camoName;
    panel.querySelector("[data-acq-camo-requirement]").textContent =
      button.dataset.camoRequirement;
    panel.querySelector("[data-acq-camo-status]").textContent =
      labels[button.dataset.state];
    panel.querySelector("[data-acq-camo-link]").hash = button.dataset.acqCamo;
  }
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-acq-camo]");
    if (button) {
      event.preventDefault();
      const strip = button.closest("[data-acquisition-camos]"),
        panel = panelFor(strip),
        open = button.getAttribute("aria-expanded") !== "true";
      strip
        .querySelectorAll("[data-acq-camo]")
        .forEach((b) =>
          b.setAttribute("aria-expanded", String(open && b === button)),
        );
      if (open) {
        const disclosure = strip.closest("details");
        if (disclosure) disclosure.open = true;
        show(button, strip);
      }
      panel.hidden = !open;
    }
    const close = event.target.closest("[data-acq-camo-close]");
    if (close) {
      const panel = close.closest(".acquisition-camo-panel"),
        button = root.querySelector(
          `[aria-controls="${panel.id}"][aria-expanded="true"]`,
        );
      panel.hidden = true;
      button?.setAttribute("aria-expanded", "false");
      button?.focus({ preventScroll: true });
    }
  });
  return {
    paint(workspace, ready) {
      for (const strip of root.querySelectorAll("[data-acquisition-camos]")) {
        const states = ready
          ? camoStates(catalog, workspace, strip.dataset.acquisitionCamos)
          : {};
        for (const button of strip.querySelectorAll("[data-acq-camo]")) {
          const image = button.querySelector("img");
          if (!image.dataset.fallbackBound) {
            image.dataset.fallbackBound = "true";
            const fallback = () => {
              image.hidden = true;
              button.querySelector(".acquisition-camo-fallback").hidden = false;
            };
            image.addEventListener("error", fallback, { once: true });
            if (image.complete && !image.naturalWidth) fallback();
          }
          const state = states[button.dataset.acqCamo] || "unknown";
          button.dataset.state = state;
          button.title = `${button.dataset.camoName}: ${labels[state]}`;
          button.setAttribute("aria-label", button.title);
          button.querySelector("span").textContent = marks[state];
          if (button.getAttribute("aria-expanded") === "true")
            show(button, strip);
        }
      }
    },
  };
}
