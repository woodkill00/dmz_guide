import { ID } from "../content/limits.mjs";

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
