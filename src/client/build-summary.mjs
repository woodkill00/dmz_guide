const installed = new WeakSet();
export function mountBuildSummary(root) {
  const show = (id) => {
    for (const panel of root.querySelectorAll("[data-build-info]"))
      panel.hidden = panel.dataset.buildInfo !== id;
    for (const button of root.querySelectorAll("[data-build-peek]"))
      button.setAttribute(
        "aria-expanded",
        String(button.dataset.buildPeek === id),
      );
  };
  show(root.dataset.buildPinned || null);
  if (installed.has(root)) return;
  installed.add(root);
  root.addEventListener("pointerover", (event) => {
    const button = event.target.closest("[data-build-peek]");
    if (button && !root.dataset.buildPinned && event.pointerType !== "touch")
      show(button.dataset.buildPeek);
  });
  root.addEventListener("pointerleave", () => {
    if (!root.dataset.buildPinned) show(null);
  });
  root.addEventListener("focusin", (event) => {
    const button = event.target.closest("[data-build-peek]");
    if (button && !root.dataset.buildPinned) show(button.dataset.buildPeek);
  });
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget) && !root.dataset.buildPinned)
      show(null);
  });
  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-build-peek]");
    if (button) {
      const id = button.dataset.buildPeek;
      root.dataset.buildPinned = root.dataset.buildPinned === id ? "" : id;
      show(root.dataset.buildPinned || null);
    }
    if (event.target.closest("[data-build-peek-close]")) {
      const id =
        root.dataset.buildPinned ||
        event.target.closest("[data-build-info]")?.dataset.buildInfo;
      delete root.dataset.buildPinned;
      const button = [...root.querySelectorAll("[data-build-peek]")].find(
        (b) => b.dataset.buildPeek === id,
      );
      button?.focus({ preventScroll: true });
      show(null);
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      delete root.dataset.buildPinned;
      show(null);
    }
  });
}
