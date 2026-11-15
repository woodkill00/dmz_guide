// Native disclosures remain navigation, not application menus. No private state.
export function setupNavigationMenu(root = document) {
  for (const menu of root.querySelectorAll(".site-nav .nav-more")) {
    if (menu.dataset.enhanced) continue;
    menu.dataset.enhanced = "true";
    menu.addEventListener("toggle", () => {
      if (!menu.open || menu.querySelector(".nav-orders-group")) return;
      const nav = menu.closest(".site-nav");
      const entry = nav?.querySelector('[data-feature-id="missions"]');
      const group = menu.querySelector(
        nav?.dataset.uiNavigation === "modern"
          ? '[aria-label="DMZ Guide"]'
          : '[aria-label="Track"]',
      );
      if (!entry || !group) return;
      const currentBase = () => {
        const destination = new URL(entry.getAttribute("href"), location.href);
        const selectedPack = root.querySelector("#pack-select")?.value;
        if (nav.dataset.navigationSurface === "guide" && selectedPack)
          destination.searchParams.set("pack", selectedPack);
        return destination.origin === location.origin
          ? destination.pathname + destination.search
          : destination.href;
      };
      const external = nav.classList.contains("companion-nav");
      const addLink = (parent, label, hash = "") => {
        const link = root.createElement("a");
        link.href = `${currentBase()}${hash}`;
        link.dataset.ordersHash = hash;
        link.textContent = label;
        if (external) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.title = "Opens in a new tab";
        }
        parent.append(link);
      };
      const section = root.createElement("section");
      section.className = "nav-menu-group nav-orders-group";
      section.setAttribute("aria-label", "Orders pages");
      const refreshLinks = () => {
        for (const link of section.querySelectorAll("a[data-orders-hash]"))
          link.href = `${currentBase()}${link.dataset.ordersHash}`;
      };
      root
        .querySelector("#pack-select")
        ?.addEventListener("change", refreshLinks);
      section.addEventListener(
        "click",
        (event) => {
          if (event.target.closest("a[data-orders-hash]")) refreshLinks();
        },
        true,
      );
      const label = root.createElement("p");
      label.className = "nav-group-label";
      label.textContent = "Orders";
      section.append(label);
      addLink(section, "All Orders");
      for (const [area, count, title] of [
        ["hajin", 24, "Hajin pages 1–24"],
        ["x01", 5, "X01 pages 1–5"],
      ]) {
        const subsection = root.createElement("details");
        subsection.className = "nav-orders-pages";
        const summary = root.createElement("summary");
        summary.textContent = title;
        const list = root.createElement("div");
        addLink(
          list,
          `Open ${area === "x01" ? "X01" : "Hajin"} page list`,
          `#mission-directory-${area}`,
        );
        for (let page = 1; page <= count; page++)
          addLink(
            list,
            `${area === "x01" ? "X01" : "Hajin"} page ${page}`,
            `#${area}-page-${page}`,
          );
        subsection.append(summary, list);
        section.append(subsection);
      }
      group.append(section);
    });
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
