// Native disclosures remain navigation, not application menus. No private state.
export function setupNavigationMenu(root = document) {
  for (const menu of root.querySelectorAll(".site-nav .nav-more")) {
    if (menu.dataset.enhanced) continue;
    menu.dataset.enhanced = "true";
    const summary = menu.querySelector(":scope > summary");
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
