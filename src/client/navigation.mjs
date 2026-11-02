import { rememberFeature } from "./navigation-state.mjs";
import { ID } from "../content/limits.mjs";
import { setupNavigationMenu } from "./navigation-menu.mjs";
setupNavigationMenu();

// Carry only a bounded catalog identity, never query text or private player data.
const pack =
  document.body.dataset.navPack ||
  new URL(location.href).searchParams.get("pack");
if (pack && pack.length <= 100 && ID.test(pack)) {
  for (const anchor of document.querySelectorAll(
    ".site-nav a[href], .site-header .brand, [data-workspace-link]",
  )) {
    const target = new URL(anchor.href, location.href);
    if (target.origin !== location.origin) continue;
    target.searchParams.set("pack", pack);
    anchor.href = target.href;
  }
}

if (document.body.dataset.page) rememberFeature(document.body.dataset.page);
document.addEventListener("keydown", (event) => {
  if (
    !event.isComposing &&
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "k"
  ) {
    const search = document.querySelector(".site-nav [data-feature-id=search]");
    if (search) {
      event.preventDefault();
      search.click();
    }
  }
});

document.addEventListener("click", (event) => {
  const a = event.target.closest("a[data-feature-id]");
  if (a) rememberFeature(a.dataset.featureId);
});
