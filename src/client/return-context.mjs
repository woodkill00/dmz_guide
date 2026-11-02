import { parseListContext } from "../domain/home-progress.mjs";
// Display context only. No inventory, progress, private notes or numeric editors.
const directories = new Set([
  "/keys/",
  "/items/",
  "/catalog/",
  "/weapons/",
  "/armory/",
  "/upgrades/",
  "/missions/",
  "/progression/",
  "/search/",
  "/features/",
  "/recipes/",
  "/guides/",
  "/maps/",
  "/collection/",
]);
const ids = [
  "key-search",
  "key-type",
  "key-location",
  "key-view",
  "catalog-search",
  "catalog-type",
  "catalog-sort",
  "catalog-pack",
  "progress-query",
  "progress-track",
  "progress-source",
  "progress-status",
  "progress-state",
  "unified-query",
  "unified-type",
  "feature-query",
];
const context = new URL(location.href).searchParams.get("pack") || "default",
  key = "dmz-list-context:" + location.pathname,
  detailKey = "dmz-return-directory";
let edited = false,
  disposed = false,
  restored = false;
const identity = (n) =>
  n.id || n.dataset.keyGroup || n.dataset.upgradeFamily || "";
function save() {
  if (!directories.has(location.pathname)) return;
  const fields = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && !el.disabled) fields[id] = el.value.slice(0, 200);
  }
  const value = {
    version: 1,
    contentVersion: document.body.dataset.catalogVersion || "",
    context: new URL(location.href).searchParams.get("pack") || "default",
    pack: document.querySelector("#pack-select")?.value || "",
    fields,
    groups: [
      ...document.querySelectorAll(
        "details[data-key-group],details[data-upgrade-family]",
      ),
    ]
      .slice(0, 128)
      .map((n) => [identity(n), n.open]),
    scroll: Math.max(0, Math.min(1e7, scrollY)),
  };
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function restore() {
  if (disposed || restored || edited || !directories.has(location.pathname))
    return;
  const pack = document.querySelector("#pack-select");
  if (pack && (pack.disabled || !document.body.dataset.catalogVersion)) return;
  if (
    document.querySelector("#key-workspace") &&
    !document.querySelector('main[data-key-workspace-ready="true"]')
  )
    return;
  if (
    document.querySelector("#unified-search") &&
    !document.querySelector("#unified-results")?.children.length
  )
    return;
  let v;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw || raw.length > 32768) return;
    v = parseListContext(raw, ids);
    if (
      !v ||
      v.context !== context ||
      v.pack !== (pack?.value || "") ||
      v.contentVersion !== (document.body.dataset.catalogVersion || "") ||
      !v.fields ||
      typeof v.fields !== "object" ||
      !Array.isArray(v.groups) ||
      v.groups.length > 128
    )
      return;
  } catch {
    return;
  }
  restored = true;
  for (const [id, val] of Object.entries(v.fields)) {
    if (!ids.includes(id) || typeof val !== "string" || val.length > 200)
      continue;
    const el = document.getElementById(id);
    if (
      !el ||
      el.disabled ||
      (el.tagName === "SELECT" && ![...el.options].some((o) => o.value === val))
    )
      continue;
    el.value = val;
  }
  const form = document.querySelector(
    "#key-filters,#catalog-filters,#progress-filters,#unified-search",
  );
  form?.dispatchEvent(new Event("input", { bubbles: true }));
  if (!form)
    document
      .getElementById("feature-query")
      ?.dispatchEvent(new Event("input", { bubbles: true }));
  for (const pair of v.groups) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const [id, open] = pair;
    if (typeof id !== "string" || id.length > 200 || typeof open !== "boolean")
      continue;
    for (const n of document.querySelectorAll(
      "details[data-key-group],details[data-upgrade-family]",
    ))
      if (identity(n) === id) n.open = open;
  }
  requestAnimationFrame(() => {
    if (!disposed && !edited && Number.isFinite(v.scroll))
      scrollTo({
        top: Math.max(0, Math.min(1e7, v.scroll)),
        behavior: "instant",
      });
  });
}
if (directories.has(location.pathname)) {
  document.addEventListener("input", (e) => {
    if (e.isTrusted) {
      edited = true;
      if (ids.includes(e.target.id)) save();
    }
  });
  for (const type of ["pointerdown", "keydown"])
    document.addEventListener(
      type,
      (event) => {
        if (event.isTrusted) edited = true;
      },
      true,
    );
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      disposed = false;
      restored = true;
    }
  });
  const timer = setInterval(restore, 100);
  setTimeout(() => clearInterval(timer), 3000);
  window.addEventListener("pagehide", () => {
    disposed = true;
    clearInterval(timer);
    save();
  });
  document.addEventListener("click", (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
      return;
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const u = new URL(a.href, location.href);
    if (
      u.origin !== location.origin ||
      directories.has(u.pathname) ||
      u.pathname === location.pathname
    )
      return;
    save();
    try {
      sessionStorage.setItem(
        detailKey,
        JSON.stringify({
          from: location.pathname,
          to: u.pathname,
          context:
            document.querySelector("#pack-select")?.value ||
            new URL(location.href).searchParams.get("pack") ||
            "default",
        }),
      );
    } catch {}
  });
  restore();
} else {
  try {
    const raw = sessionStorage.getItem(detailKey),
      v = raw && raw.length < 1024 ? JSON.parse(raw) : null;
    if (
      v &&
      v.to === location.pathname &&
      directories.has(v.from) &&
      typeof v.context === "string" &&
      v.context.length <= 100
    ) {
      const a = document.createElement("a");
      a.className = "return-results";
      a.textContent = "← Back to results";
      a.href =
        v.from +
        (v.context !== "default"
          ? "?pack=" + encodeURIComponent(v.context)
          : "");
      document.querySelector("main")?.prepend(a);
    }
  } catch {}
}
