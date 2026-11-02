import { summarizeHomeProgress } from "../domain/home-progress.mjs";
import { features, featureURL } from "../ui/feature-registry.mjs";
import { getNavigation, toggleFeaturePin } from "./navigation-state.mjs";
import { readPublicJSON } from "./public-data.mjs";
import { readExistingRecord } from "../storage/summary-read.mjs";
import { validateProfile } from "../domain/profile.mjs";
import { validateKeyWorkspace } from "../domain/key-workspace.mjs";
const $ = (id) => document.getElementById(id);
let controller = new AbortController();
window.addEventListener("pagehide", () => controller.abort());
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    controller = new AbortController();
    paint();
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
            ? "Pin tools from the cards below or All features."
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
  let catalogs = [],
    generation = 0;
  async function summary() {
    const token = ++generation,
      selected = $("hub-pack").value;
    const c = catalogs.find((c) => c.id === selected);
    if (!c) return;
    $("hub-progress").textContent = "Reading saved progress…";
    $("hub-key-summary").textContent = "Reading key stash…";
    const active = () =>
      !controller.signal.aborted &&
      token === generation &&
      $("hub-pack").value === selected;
    readExistingRecord("dmz-guide-local", "profiles", selected, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!active()) return;
        if (r === undefined) {
          $("hub-progress").textContent =
            "No saved profile for this catalog. Open Upgrades or Missions to begin.";
          return;
        }
        const p = validateProfile(r.value);
        if (p.packId !== selected) throw Error("Mismatched profile");
        const pack = await readPublicJSON(c.path, 8388608, controller.signal);
        if (!active()) return;
        if (p.contentVersion !== pack.contentVersion) {
          $("hub-progress").textContent =
            "Saved profile uses an older catalog version. Review it in Settings before interpreting progress.";
          return;
        }
        const summary = summarizeHomeProgress(pack, p);
        $("hub-progress").textContent = summary.limited
          ? "Progress scope is protected or exceeds the safe spoiler projection. Open Upgrades or Missions to review it."
          : `Saved revision ${p.revision}: ${summary.upgrades ? `${summary.upgradesDone}/${summary.upgrades} safely visible listed upgrades recorded complete` : "No safely visible upgrade definitions in this catalog (coverage unknown)"}; ${summary.missions ? `${summary.missionsDone}/${summary.missions} safely visible listed missions recorded complete` : "No safely visible mission definitions in this catalog (coverage unknown)"}. Missing records and unknown states are not completed.`;
      })
      .catch(() => {
        if (active())
          $("hub-progress").textContent =
            "Saved progress unavailable, blocked, timed out or invalid. Open Settings to inspect; nothing was changed.";
      });
    readExistingRecord("dmz-keys-local", "workspace", "main", {
      signal: controller.signal,
    })
      .then((r) => {
        if (!active()) return;
        if (r === undefined) {
          $("hub-key-summary").textContent = "No saved key stash yet.";
          return;
        }
        const s = validateKeyWorkspace(r.value);
        $("hub-key-summary").textContent =
          `Key stash revision ${s.revision}: ${Object.values(s.stock).reduce((n, s) => n + s.quantity, 0)} owned copies recorded · ${s.targetUseIds.length} trip targets.`;
      })
      .catch(() => {
        if (active())
          $("hub-key-summary").textContent =
            "Key stash unavailable or needs recovery. Open Keys; nothing was changed.";
      });
  }
  let manifestGeneration = 0;
  function loadCatalogs() {
    const signal = controller.signal,
      token = ++manifestGeneration;
    return readPublicJSON("/assets/content/manifest.json", 65536, signal)
      .then((v) => {
        if (signal.aborted || token !== manifestGeneration) return;
        catalogs = v.catalogs.filter((c) =>
          /^\/assets\/content\/packs\/[a-zA-Z0-9_-]+\.json$/.test(c.path),
        );
        $("hub-pack").replaceChildren(
          ...catalogs.map((c) => {
            const o = document.createElement("option");
            o.value = c.id;
            o.textContent = c.title;
            return o;
          }),
        );
        const chosen =
          new URL(location.href).searchParams.get("pack") ||
          "official:mw4-dmz-starter";
        if (catalogs.some((c) => c.id === chosen)) $("hub-pack").value = chosen;
        void summary();
      })
      .catch(() => {
        if (signal.aborted || token !== manifestGeneration) return;
        $("hub-progress").textContent =
          "Catalog list unavailable. Public feature links remain available.";
      });
  }
  void loadCatalogs();
  document.addEventListener("hub-resume", () => {
    if (catalogs.length) void summary();
    else void loadCatalogs();
  });
  $("hub-pack").addEventListener("change", summary);
  $("hub-refresh").addEventListener("click", summary);
  $("hub-service-check").addEventListener("click", async () => {
    const b = $("hub-service-check");
    b.disabled = true;
    const box = $("hub-services");
    box.replaceChildren();
    await Promise.all(
      [
        [4173, "Guide"],
        [5175, "Map"],
        [4174, "Content Studio"],
        [4176, "Update manager"],
      ].map(async ([port, name]) => {
        const li = document.createElement("li");
        li.textContent = name + ": checking…";
        box.append(li);
        const abort = new AbortController(),
          timer = setTimeout(() => abort.abort(), 1500),
          cancel = () => abort.abort();
        controller.signal.addEventListener("abort", cancel, { once: true });
        try {
          await fetch("http://127.0.0.1:" + port + "/", {
            mode: "no-cors",
            redirect: "error",
            signal: abort.signal,
          });
          if (!controller.signal.aborted)
            li.textContent = name + ": reachable (transport only)";
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
