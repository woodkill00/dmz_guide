import { serviceOrigin } from "../domain/local-services.mjs";
import { features, featureURL } from "../ui/feature-registry.mjs";
import { getNavigation, toggleFeaturePin } from "./navigation-state.mjs";
const $ = (id) => document.getElementById(id);
let controller = new AbortController();
let dashboardMounted = false;
let dashboardLoading = false;
async function startDashboard() {
  if (!$("hub-pack") || dashboardMounted || dashboardLoading) return;
  dashboardLoading = true;
  try {
    const { mountDashboard } = await import("./dashboard.mjs");
    if (controller.signal.aborted) return;
    dashboardMounted = true;
    await mountDashboard();
  } catch {
    if (!controller.signal.aborted) {
      const status = $("dashboard-action-status");
      if (status)
        status.textContent =
          "Dashboard unavailable. Reload to retry; feature links remain available.";
    }
  } finally {
    dashboardLoading = false;
  }
}
window.addEventListener("pagehide", () => controller.abort());
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller = new AbortController();
    paint();
    void startDashboard();
    document.dispatchEvent(new Event("hub-resume"));
  }
});
const link = (f) => {
  const a = document.createElement("a");
  a.href = featureURL(f);
  a.textContent = f.label;
  if (f.kind !== "guide") {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.append(" ↗");
  }
  return a;
};
function paint() {
  const v = getNavigation();
  for (const b of document.querySelectorAll("[data-pin-feature]")) {
    b.hidden = false;
    const on = v.pins.includes(b.dataset.pinFeature);
    b.textContent = on ? "★" : "☆";
    b.setAttribute("aria-pressed", String(on));
  }
  if ($("hub-pins")) {
    for (const [field, id] of [
      ["pins", "hub-pins"],
      ["recent", "hub-recent"],
    ]) {
      const box = $(id);
      box.replaceChildren();
      const list = v[field]
        .map((id) => features.find((f) => f.id === id))
        .filter(Boolean);
      if (!list.length)
        box.textContent =
          field === "pins"
            ? "Choose tools to pin from All features."
            : "Your recently visited workspaces will appear here.";
      else list.forEach((f) => box.append(link(f)));
    }
    $("hub-preference-status").textContent = v.persistent
      ? "Shortcuts saved on this device."
      : "Shortcuts work for this session; browser storage is unavailable.";
    const last = features.find((f) => f.id === v.recent[0]);
    if (last) {
      $("hub-continue").href = featureURL(last);
      $("hub-continue").textContent = "Continue: " + last.label;
      if (last.kind !== "guide") {
        $("hub-continue").target = "_blank";
        $("hub-continue").rel = "noopener noreferrer";
      }
    }
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-pin-feature]");
  if (b) toggleFeaturePin(b.dataset.pinFeature);
});
document.addEventListener("navigation-preferences", paint);
paint();
$("feature-query")?.addEventListener("input", () => {
  const q = $("feature-query").value.toLowerCase().trim();
  let count = 0;
  for (const c of document.querySelectorAll("[data-feature-card]")) {
    c.hidden = !c.dataset.search.includes(q);
    if (!c.hidden) count++;
  }
  for (const g of document.querySelectorAll("[data-feature-group]"))
    g.hidden = ![...g.querySelectorAll("[data-feature-card]")].some(
      (c) => !c.hidden,
    );
  $("feature-count").textContent = count + " matching features";
});
if ($("hub-pack")) {
  void startDashboard();
  $("hub-service-check").addEventListener("click", async () => {
    const b = $("hub-service-check");
    b.disabled = true;
    const box = $("hub-services");
    box.replaceChildren();
    await Promise.all(
      [
        ["guide", "Guide"],
        ["map", "Map"],
        ["author", "Content Studio"],
        ["manager", "Update manager"],
      ].map(async ([service, name]) => {
        const li = document.createElement("li");
        li.textContent = name + ": checking…";
        box.append(li);
        const abort = new AbortController(),
          timer = setTimeout(() => abort.abort(), 1500),
          cancel = () => abort.abort();
        controller.signal.addEventListener("abort", cancel, { once: true });
        try {
          const response = await fetch(
            service === "map"
              ? "/local-site/status.json"
              : service === "guide"
                ? "/"
                : serviceOrigin(service, location.origin) + "/",
            {
              mode: ["guide", "map"].includes(service)
                ? "same-origin"
                : "no-cors",
              redirect: "error",
              signal: abort.signal,
            },
          );
          if (service === "map" && !(await response.json()).maps)
            throw Error("Map service not ready");
          if (["map", "guide"].includes(service) && !response.ok)
            throw Error("Service not ready");
          if (!controller.signal.aborted)
            li.textContent =
              name +
              (["map", "guide"].includes(service)
                ? ": ready"
                : ": reachable (transport only)");
        } catch {
          if (!controller.signal.aborted)
            li.textContent = name + ": unavailable or blocked by this browser";
        } finally {
          clearTimeout(timer);
          controller.signal.removeEventListener("abort", cancel);
        }
      }),
    );
    if (!controller.signal.aborted) b.disabled = false;
  });
}

const searchForm = document.querySelector(".hub-search");
searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    sessionStorage.setItem(
      "dmz-unified-search-transfer",
      JSON.stringify({
        query: document.querySelector("#hub-query").value.slice(0, 200),
      }),
    );
    location.assign("/search/");
  } catch {
    const p = document.createElement("p");
    p.setAttribute("role", "status");
    p.textContent =
      "Search transfer unavailable. Open Search and enter your query there.";
    searchForm.append(p);
  }
});
