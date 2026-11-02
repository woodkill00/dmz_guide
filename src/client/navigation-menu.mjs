// Native disclosures remain navigation, not application menus. No private state.
export function setupNavigationMenu(root = document) {
  for (const menu of root.querySelectorAll(".site-nav .nav-more")) {
    if (menu.dataset.enhanced) continue;
    menu.dataset.enhanced = "true";
    const summary = menu.querySelector(":scope > summary");
    const filter = menu.querySelector("[data-navigation-filter]");
    if (filter) {
      filter.hidden = false;
      filter.addEventListener("input", () => {
        const words = filter.value
          .toLowerCase()
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        for (const group of menu.querySelectorAll(".nav-menu-group")) {
          for (const a of group.querySelectorAll("a"))
            a.hidden = !words.every((w) =>
              (group.getAttribute("aria-label") + " " + a.textContent)
                .toLowerCase()
                .includes(w),
            );
          group.hidden = ![...group.querySelectorAll("a")].some(
            (a) => !a.hidden,
          );
        }
      });
    }

    menu.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !menu.open) return;
      event.preventDefault();
      event.stopPropagation();
      menu.open = false;
      summary.focus();
    });
    root.addEventListener("pointerdown", (event) => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    root.addEventListener("focusin", (event) => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a[href]")) menu.open = false;
    });
  }
}
