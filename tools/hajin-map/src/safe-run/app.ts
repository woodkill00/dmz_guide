import {mountSafeRunLayout} from './layout.ts';
import { mountSidebarSections } from "../map/sidebar-sections.ts";
import L from "leaflet";
import SafeRunWorker from "./worker.ts?worker&inline";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { createMapView } from "../map/map-view.ts";
import { gridReferenceAt } from "../map/tactical-grid.ts";
import { hajin } from "../map/hajin.ts";
import { el } from "../workspace/dom.ts";
import { pointValid, type XY, type RoadGraph } from "../workspace/roads.ts";
import { parseRoadGraph } from "../workspace/roads.ts";
import {
  limits,
  stateKey,
  parsePreference,
  reconcile,
  type Preference,
  type Dataset,
  type Stop,
  type SolveOutput,
} from "./domain.ts";
import { loadDataset, loadRoads } from "./data.ts";
import { accessLabel, unknownAccess } from "./access.ts";
import { defaultLootOptions, emptyLootJournal, lootObservationsKey, lootOptionsKey, parseLootJournal, parseLootOptions, type LootObservation, type LootOptions, type LootJournal, type ObservationResult } from "./loot-state.ts";

const isLootRun = document.body.classList.contains("loot-run-page");
const runTitle = isLootRun ? "Loot Run map" : "Safe Run map";
const candidateLabel = isLootRun ? "safes and clinics" : "safes";
const storageKey = isLootRun ? "hajin-loot-run-v1" : stateKey;
const roadNetworkKey = "hajin-loot-run-roads-v1";

document.querySelector("#app")!.innerHTML = `
<header class="safe-header"><div><p>HAJIN · ${isLootRun ? "LOOT ROUTING" : "SAFE ROUTING"}</p><h1>${runTitle}</h1></div><a href="/" class="safe-main-map-link" aria-label="Return to main map">← Main map</a><a href="${isLootRun ? "/safes.html" : "/loot.html"}" class="safe-main-map-link">${isLootRun ? "Safe Run" : "Loot Run"}</a></header>
<main class="safe-layout"><aside id="safe-controls" tabindex="-1" aria-label="Safe-run planner">
<div id="safe-intelligence" role="region" aria-label="Run status and source loading" tabindex="0"><p class="safe-intro">Choose a start and ${candidateLabel} to visit. These are source-reported candidates, not live or guaranteed spawns.</p>
<p id="data-status" role="status">Loading local source captures…</p><p id="saved-status" role="status"></p><button id="reload-data" type="button">Reload local captures</button>
</div><div id="safe-start-pane" data-section-name="start and routing" role="region" aria-label="Start and routing" tabindex="0"><fieldset disabled id="safe-settings"><legend>1 · Start and routing</legend>
<label for="spawn-select">Spawn location</label><select id="spawn-select"><option value="">Choose spawn or set a manual start</option></select>
<p id="start-label">No start selected.</p><div class="safe-actions"><button id="pick-start" type="button" aria-pressed="false">Pick start on map</button><button id="clear-start" type="button">Clear start</button></div>
<form id="manual-start"><div class="safe-xy"><label>X <input id="start-x" type="number" min="0" max="4096" step="any" required></label><label>Y <input id="start-y" type="number" min="0" max="4096" step="any" required></label></div><button type="submit">Set manual start</button></form>
<label for="route-mode">Route geometry</label><select id="route-mode"><option value="direct">Direct lines · not roads</option><option value="roads">Local roads · partial, unverified</option></select><p id="road-status">Checking local road coverage…</p>
<div class="safe-actions"><button id="optimize" type="button">${isLootRun ? "Recalculate route" : "Optimize order"}</button><button id="fit-route" type="button">Fit run</button></div><p class="safe-note">Efficient nearest-neighbor order, not a guaranteed shortest tour. Open route, no return to spawn. Distances are image pixels, not game meters or travel times.</p></fieldset>
${isLootRun ? '<fieldset id="loot-options"><legend>Route choices</legend><label><input id="avoid-restricted" type="checkbox"> Skip source-reported restricted safes</label><label><input id="clinics-first" type="checkbox"> Visit clinics first</label><label for="max-stops">Stops in this run</label><select id="max-stops"><option value="">All selected stops</option><option value="2">Nearest 2</option><option value="5">Nearest 5</option><option value="10">Nearest 10</option><option value="20">Nearest 20</option><option value="30">Nearest 30</option></select><p class="safe-note">These choices change the suggested route, not your selected candidates. Unknown safe access stays unknown. Clinic priority may lengthen the route.</p><p id="route-scope" role="status"></p><details><summary>Road network for this run</summary><p class="safe-note">Import a validated Hajin road-network JSON exported from the main map editor. Private and local to this browser; unavailable segments remain missing.</p><input id="loot-road-file" type="file" accept=".json,application/json" aria-label="Road-network JSON"><div class="safe-actions"><button id="import-loot-roads" type="button">Use road file</button><button id="clear-loot-roads" type="button">Use local starter roads</button></div></details></fieldset>' : ""}
</div><div id="safe-start-divider" role="separator" aria-label="Resize start and candidate sections" tabindex="0"></div><div id="safe-candidates-pane" data-section-name="route candidates" role="region" aria-label="Route candidates" tabindex="0"><fieldset disabled id="safe-choices"><legend>2 · ${isLootRun ? "Loot candidates" : "Safe candidates"}</legend><label for="safe-search">Search ${candidateLabel}, keys, access, source, notes or grid</label><input id="safe-search" type="search" maxlength="200"><div class="safe-actions"><button id="select-all" type="button">Select all ${candidateLabel}</button><button id="select-none" type="button">Deselect all</button>${isLootRun ? '<button id="select-safes" type="button">Select safes</button><button id="select-clinics" type="button">Select clinics</button>' : ""}</div><p id="selection-count"></p><p class="safe-note safe-access-legend"><strong>Red !</strong>: source-reported locked/key/puzzle safe access. ${isLootRun ? "Blue C: clinic. " : ""}Gold: safe access not recorded, not guaranteed unlocked. Gray fill: excluded; red border still flags access requirements.</p><p class="safe-note">Search changes the list only. Matching names within 24 image pixels and compatible floors share one marker within each type; differently named nearby entries stay separate for review. Key guides are linked only for a named access requirement in the same calibrated grid, never proximity alone.</p><div id="safe-list"></div></fieldset>
</div><div id="safe-route-divider" role="separator" aria-label="Resize safe candidates and visit order" tabindex="0"></div><div id="safe-route-pane" data-section-name="visit order" role="region" aria-label="Visit order and source notes" tabindex="0"><section aria-labelledby="route-heading"><h2 id="route-heading">3 · ${isLootRun ? "Selected stops" : "Visit order"}</h2><p id="route-status" role="status">Choose your start to plan a run.</p><p class="safe-note">${isLootRun ? "Drag the ↕ handle or use ↑ / ↓ to arrange your selected stops. The suggested route below can differ when route choices are active." : "Drag the ↕ handle or use ↑ / ↓. Manual order stays until you choose Optimize."}</p><ol id="visit-order"></ol>${isLootRun ? '<h3>Suggested route</h3><ol id="planned-order"></ol>' : ""}</section>
${isLootRun ? '<section id="loot-observations" aria-labelledby="observations-heading"><h2 id="observations-heading">Gameplay checks</h2><p class="safe-note">Select a stop to record what you actually saw. Reports stay in this browser until exported.</p><label for="observation-stop">Stop</label><select id="observation-stop"></select><label for="observation-result">Result</label><select id="observation-result"><option value="found">Found at location</option><option value="not-found">Not found this match</option><option value="blocked">Could not reach</option></select><label for="observation-date">Date played</label><input id="observation-date" type="date"><label for="observation-build">Game build (if known)</label><input id="observation-build" type="text" maxlength="80" placeholder="Unknown"><label for="observation-note">Notes</label><textarea id="observation-note" maxlength="500" rows="3"></textarea><div class="safe-actions"><button id="save-observation" type="button">Save check</button><button id="clear-observation" type="button">Clear check</button><button id="export-observations" type="button">Export checks</button></div><p id="observation-status" role="status"></p><div id="observation-list"></div></section><p class="safe-note"><a href="/?tool=planner" target="_blank" rel="noopener noreferrer">Open road editor in main map</a> · <a href="https://github.com/woodkill00/dmz_guide/blob/main/docs/gameplay-verification.md" target="_blank" rel="noopener noreferrer">Gameplay worksheet</a></p>' : ""}
<details><summary>Source captures and limitations</summary><ul id="source-list"></ul><p>${isLootRun ? "Safes and clinics" : "Safes"} may overlap across providers or be absent in a match. Safes can have access requirements. Nearby warnings are review hints, not confirmed duplicates. This page rereads reviewed local captures; update providers through the main map. It does not collect new remote data.</p><p>Road mode uses the separate local road file, not the main workspace’s private road edits. Missing road legs are left undrawn and listed below; dashed lines are off-road connectors.</p><a href="${hajin.source}" target="_blank" rel="noopener noreferrer">Official map background</a></details>
</div></aside><section class="safe-terrain" aria-label="${runTitle}"><div id="safe-map" tabindex="0" role="region" aria-label="Hajin ${runTitle}. Arrow keys pan; plus and minus zoom."></div><div class="safe-map-tools" role="group" aria-label="Map controls"><button id="safe-zoom-in" type="button" aria-label="Zoom in">+</button><button id="safe-zoom-out" type="button" aria-label="Zoom out">−</button><button id="safe-reset" type="button">${document.documentElement.dataset.uiVariant==='modern'?'Fit map':'Full map'}</button><label><input id="safe-grid" type="checkbox" checked> Grid</label></div><p id="terrain-status" role="status"></p><p class="safe-map-credit">Source-reported ${candidateLabel} · © Activision · manual planning</p></section></main>`;
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const disposeModernLayout=mountSafeRunLayout();
if(document.documentElement.dataset.uiVariant!=='modern' && !isLootRun)mountSidebarSections({
  root: $("safe-controls"),
  panes: [
    $("safe-start-pane"),
    $("safe-candidates-pane"),
    $("safe-route-pane"),
  ],
  dividers: [$("safe-start-divider"), $("safe-route-divider")],
  fixed: [$("safe-intelligence")],
  shares: [0.3, 0.35, 0.35],
  minimum: 80,
});
const status = $("route-status"),
  savedStatus = $("saved-status"),
  dataStatus = $("data-status");
export const viewer = createMapView(
  $("safe-map"),
  (state) => {
    const target = $("terrain-status");
    target.replaceChildren();
    target.hidden = state === "ready";
    if (state === "loading") target.textContent = "Loading terrain…";
    if (state === "failed") {
      target.append(
        el("span", "Terrain unavailable. "),
        button("Retry terrain", () => viewer.retry()),
      );
    }
  },
  () => {},
  () => {},
  { gridPreferenceKey: null },
);
if(document.documentElement.dataset.uiVariant==='modern')viewer.map.on('popupopen',()=>document.querySelector<HTMLButtonElement>('#safe-map-view')?.click());
const map = viewer.map,
  markers = L.layerGroup().addTo(map),
  lines = L.layerGroup().addTo(map);
const safeMarkers = new Map<string, L.Marker>();
let active = true,
  loadEpoch = 0;
let data: Dataset = { safes: [], spawns: [], referenceOnly: 0 },
  p: Preference | null = null,
  graph: RoadGraph | null = null,
  worker: Worker | null = null,
  workerReady = false,
  bootstrapTimer: ReturnType<typeof setTimeout> | null = null,
  timer: ReturnType<typeof setTimeout> | null = null,
  epoch = 0,
  loading = false,
  picking = false,
  dragKey = "",
  result: SolveOutput | null = null;
let stored: Preference | null = null,
  preferenceNotice = "";
let lootOptions: LootOptions = defaultLootOptions(),
  lootJournal: LootJournal = emptyLootJournal(),
  journalReadable = true;
if (isLootRun) {
  try {
    const value = localStorage.getItem(lootOptionsKey);
    if (value) lootOptions = parseLootOptions(value);
  } catch {
    savedStatus.textContent = "Route choices could not be read; defaults are shown. Your saved route is unchanged.";
  }
  try {
    const value = localStorage.getItem(lootObservationsKey);
    if (value) lootJournal = parseLootJournal(value);
  } catch {
    journalReadable = false;
    $("observation-status").textContent = "Gameplay checks could not be read. Existing saved data has not been changed.";
    for (const id of ["save-observation", "clear-observation", "export-observations"]) $<HTMLButtonElement>(id).disabled = true;
  }
}
try {
  const value = localStorage.getItem(storageKey);
  if (value) stored = parsePreference(value);
} catch {
  preferenceNotice =
    "Saved safe-run preferences could not be read. Using a fresh plan; other workspaces are unchanged. ";
  savedStatus.textContent = preferenceNotice;
}
function button(label: string, action: () => void) {
  const b = el("button", label);
  b.type = "button";
  b.addEventListener("click", action);
  return b;
}
const grid = (s: Stop) => gridReferenceAt(...s.point) ?? "—";
const display = (s: Stop) => {
  const name = isLootRun && !new RegExp(`^${s.kind === "clinic" ? "clinics?" : "safes?"}$`, "i").test(s.name.trim())
    ? `${s.kind === "clinic" ? "Clinic" : "Safe"} · ${s.name}`
    : s.name;
  return `${name} · ${grid(s)} · ${s.sourceName}`;
};
const access = (s: Stop) => s.access ?? unknownAccess();
const restricted = (s: Stop) => access(s).state !== "unknown";
function accessInfo(s: Stop, details = false) {
  const info = access(s),
    root = el("div", undefined, "safe-access-info");
  root.dataset.access = info.state;
  if (info.state !== "unknown" || details)
    root.append(
      el(
        "small",
        accessLabel(info),
        info.state === "unknown" ? "safe-access-unknown" : "safe-access-badge",
      ),
    );
  for (const k of info.keys) {
    const link = el("a", "Key guide: " + k.name);
    link.href = "http://127.0.0.1:4173/keys/" + encodeURIComponent(k.id) + "/";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.safeKey = k.id;
    link.title = "Source-reported named key and matching grid; confirm in game";
    root.append(link);
  }
  if (details) {
    if (info.state === "key-required" && !info.keys.length)
      root.append(
        el(
          "p",
          "Required key identity has not been established for this safe.",
        ),
      );
    if (info.state === "conflict")
      root.append(
        el(
          "p",
          "Sources disagree about access. Check the reports before relying on this route.",
        ),
      );
    if (info.reports.length) {
      const evidence = el("details"),
        summary = el(
          "summary",
          "Access evidence · " + info.reports.length + " source report(s)",
        );
      evidence.append(summary);
      for (const report of info.reports) {
        const paragraph = el("p", report.evidence + " "),
          link = el("a", report.sourceId + " · " + report.capturedAt);
        link.href = report.page;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        paragraph.append(link);
        evidence.append(paragraph);
      }
      root.append(evidence);
    }
  }
  return root;
}
const find = (key: string) => data.safes.find((s) => s.key === key)!;
function save() {
  if (!p) return;
  try {
    const text = JSON.stringify(p);
    parsePreference(text);
    localStorage.setItem(storageKey, text);
    savedStatus.textContent = preferenceNotice + "Run saved in this browser.";
  } catch {
    savedStatus.textContent =
      preferenceNotice +
      "Run is usable, but preferences could not be saved. Browser storage is unavailable or full.";
  }
}
function saveLootOptions() {
  if (!isLootRun) return;
  try {
    const text = JSON.stringify(lootOptions);
    parseLootOptions(text);
    localStorage.setItem(lootOptionsKey, text);
  } catch {
    $("route-scope").textContent = "Route choices work for this session but could not be saved.";
  }
}
function observationFor(key: string) {
  return lootJournal.observations.find((entry) => entry.key === key);
}
function renderObservations() {
  if (!isLootRun || !journalReadable) return;
  const select = $<HTMLSelectElement>("observation-stop");
  const current = select.value;
  select.replaceChildren(new Option("Choose a safe or clinic", ""));
  for (const stop of data.safes) select.append(new Option(display(stop), stop.key));
  select.value = data.safes.some((stop) => stop.key === current) ? current : "";
  const list = $("observation-list");
  list.replaceChildren();
  for (const entry of lootJournal.observations) {
    const row = el("p", `${entry.kind === "clinic" ? "Clinic" : "Safe"} · ${entry.name} · ${entry.observedAt} · ${entry.gameBuild || "build unknown"} · ${entry.result}${entry.note ? " · " + entry.note : ""}`);
    if (!data.safes.some((s) => s.key === entry.key && s.capturedAt === entry.capturedAt)) row.append(el("strong", " · Source changed or unavailable; recheck"));
    list.append(row);
  }
  if (!lootJournal.observations.length) list.append(el("p", "No gameplay checks recorded."));
}
function syncObservationForm() {
  if (!isLootRun || !journalReadable) return;
  const entry = observationFor($<HTMLSelectElement>("observation-stop").value);
  $<HTMLSelectElement>("observation-result").value = entry?.result ?? "found";
  $<HTMLInputElement>("observation-date").value = entry?.observedAt ?? new Date().toISOString().slice(0, 10);
  $<HTMLInputElement>("observation-build").value = entry?.gameBuild ?? "";
  $<HTMLTextAreaElement>("observation-note").value = entry?.note ?? "";
  $("observation-status").textContent = entry ? `Saved check from ${entry.observedAt}. Source report remains separate.` : "No check recorded for this stop.";
}
function persistJournal(next: LootJournal) {
  if (!journalReadable) return false;
  try {
    const text = JSON.stringify(next);
    parseLootJournal(text);
    localStorage.setItem(lootObservationsKey, text);
    lootJournal = next;
    return true;
  } catch {
    $("observation-status").textContent = "Check could not be saved. Existing observations were retained.";
    return false;
  }
}
function releaseWorker(owned: Worker | null = worker) {
  owned?.terminate();
  if (owned === worker) {
    worker = null;
    workerReady = false;
    if (bootstrapTimer) clearTimeout(bootstrapTimer);
    bootstrapTimer = null;
  }
}
function stopWork() {
  epoch++;
  // Coalesce edits while the dependency graph loads. Cancelling a module
  // import midway leaks an import error in WebKit's development worker path.
  // Once ready, a busy calculation can be terminated immediately as before.
  if (workerReady) releaseWorker();
  if (timer) clearTimeout(timer);
  timer = null;
  lines.clearLayers();
  result = null;
}
function syncStart() {
  if (!p) return;
  ($("spawn-select") as HTMLSelectElement).value = p.spawnKey ?? "";
  ($("start-x") as HTMLInputElement).value = p.start
    ? p.start[0].toFixed(1)
    : "";
  ($("start-y") as HTMLInputElement).value = p.start
    ? p.start[1].toFixed(1)
    : "";
  $("start-label").textContent = p.start
    ? `${p.spawnKey ? "Reported spawn" : "Manual start"} · ${gridReferenceAt(...p.start) ?? "—"} · X ${p.start[0].toFixed(1)}, Y ${p.start[1].toFixed(1)}`
    : "No start selected.";
}
function chooseStart(point: XY | null, spawnKey: string | null) {
  if (!p) return;
  p.start = point;
  p.spawnKey = spawnKey;
  picking = false;
  $("pick-start").setAttribute("aria-pressed", "false");
  syncStart();
  save();
  draw();
  calculate(!p.manual);
}
function safeIcon(s:Stop,index:number){return L.divIcon({
        className:
          "safe-number-marker" +
          (s.kind === "clinic" ? " clinic-number-marker" : "") +
          (restricted(s) ? " safe-locked" : "") +
          (index < 0 ? " safe-excluded" : ""),
        html:
          (index < 0 ? "−" : String(index + 1)) +
          (s.kind === "clinic" ? '<span class="clinic-kind-cue" aria-hidden="true">C</span>' : "") +
          (restricted(s)
            ? '<span class="safe-lock-cue" aria-hidden="true">!</span>'
            : ""),
        iconSize: [28, 28],
      });}
function draw() {
  markers.clearLayers();
  safeMarkers.clear();
  if (!p) return;
  if (p.start)
    L.marker([p.start[1], p.start[0]], {
      icon: L.divIcon({
        className: "safe-start-marker",
        html: "S",
        iconSize: [30, 30],
      }),
      title: "Run start",
      alt: "Run start",
    })
      .addTo(markers)
      .bindPopup(
        el("p", "Run start · " + ($("start-label").textContent ?? "")),
      );
  for (const s of data.safes) {
    const index = p.order.indexOf(s.key),
      content = el("div");
    content.append(
      el("strong", display(s)),
      el("p", s.notes || "No additional source notes."),
      el(
        "p",
        `${s.floor === null ? "Floor unknown" : "Floor " + s.floor}${s.nearby ? " · Nearby differently named source candidate: review before counting as a separate stop." : ""}`,
      ),
    );
    if (s.matches.length)
      content.append(el("p", "Also reported by " + s.matches.join(", ")));
    if (s.kind !== "clinic") content.append(accessInfo(s, true));
    if (isLootRun) {
      const check = observationFor(s.key);
      content.append(el("p", check ? `Gameplay check · ${check.result} · ${check.observedAt}${check.capturedAt !== s.capturedAt ? " · source changed; recheck" : ""}` : "No gameplay check recorded."));
      content.append(button("Record gameplay check", () => {
        $<HTMLSelectElement>("observation-stop").value = s.key;
        syncObservationForm();
        $("loot-observations").scrollIntoView({ block: "nearest" });
      }));
    }
    content.append(
      button(index < 0 ? `Include ${s.kind === "clinic" ? "clinic" : "safe"}` : `Exclude ${s.kind === "clinic" ? "clinic" : "safe"}`, () =>
        toggle(s.key, index < 0),
      ),
    );
    const marker = L.marker([s.point[1], s.point[0]], {
      icon: safeIcon(s,index),
      title: display(s) + (s.kind === "clinic" ? "" : " · " + accessLabel(access(s))),
      alt: display(s) + (s.kind === "clinic" ? "" : " · " + accessLabel(access(s))),
    })
      .addTo(markers)
      .bindPopup(content, {
        maxHeight: 200,
        maxWidth: 300,
        className: "readable-marker-popup",
      });
    safeMarkers.set(s.key, marker);
  }
}
function focusSafe(s: Stop) {
  map.setView([s.point[1], s.point[0]], Math.max(map.getZoom(), 2), {
    animate: false,
  });
  safeMarkers.get(s.key)?.openPopup();
}
function toggle(key: string, on: boolean) {
  if (!p) return;
  if (on && !p.order.includes(key)) {
    if (p.order.length >= limits.selected) {
      status.textContent = "At most 64 stops per run. Deselect a stop first.";
      renderChoices();
      return;
    }
    p.order.push(key);
  } else if (!on) p.order = p.order.filter((id) => id !== key);
  const focus =
    document.activeElement instanceof HTMLInputElement
      ? document.activeElement.dataset.safe
      : undefined;
  save();
  renderChoices();
  if (focus)
    $("safe-list")
      .querySelector<HTMLInputElement>(`[data-safe="${CSS.escape(focus)}"]`)
      ?.focus({ preventScroll: true });
  renderOrder();
  draw();
  calculate(!p.manual);
}
function renderChoices() {
  if (!p) return;
  const root = $("safe-list"),
    query = ($("safe-search") as HTMLInputElement).value.trim().toLowerCase();
  root.replaceChildren();
  const shown = data.safes.filter((s) =>
    (
      display(s) +
      " " +
      s.notes +
      " " +
      accessLabel(access(s)) +
      " " +
      access(s)
        .keys.map((k) => k.name)
        .join(" ") +
      (restricted(s) ? " locked restricted" : "")
    )
      .toLowerCase()
      .includes(query),
  );
  $("selection-count").textContent =
    `${p.order.length} selected / ${data.safes.length} source candidates${isLootRun ? ` · ${data.safes.filter((s) => s.kind === "safe").length} safes · ${data.safes.filter((s) => s.kind === "clinic").length} clinics` : ""} · ${data.safes.filter(restricted).length} reported access restrictions · ${shown.length} listed · maximum 64 per run`;
  for (const s of shown) {
    const row = el("div", undefined, "safe-choice"),
      label = el("label"),
      check = el("input");
    check.type = "checkbox";
    check.checked = p.order.includes(s.key);
    check.dataset.safe = s.key;
    check.addEventListener("change", () => toggle(s.key, check.checked));
    label.append(check, el("span", display(s)));
    row.append(
      label,
      button("Locate", () => focusSafe(s)),
    );
    if (restricted(s)) row.append(accessInfo(s));
    if (s.nearby)
      row.append(
        el(
          "small",
          `${s.nearby} nearby source candidate(s) · review possible overlap`,
        ),
      );
    if (s.matches.length)
      row.append(
        el("small", "Matched source reports: " + s.matches.join(", ")),
      );
    if (isLootRun && observationFor(s.key)) row.append(el("small", `Gameplay check: ${observationFor(s.key)!.result} · ${observationFor(s.key)!.observedAt}`));
    root.append(row);
  }
  if (!shown.length)
    root.append(el("p", `No ${candidateLabel} match this search.`));
}
function move(from: string, to: string) {
  if (!p) return;
  const a = p.order.indexOf(from),
    b = p.order.indexOf(to);
  if (a < 0 || b < 0 || a === b) return;
  p.order.splice(a, 1);
  p.order.splice(b, 0, from);
  p.manual = true;
  save();
  renderOrder();
  draw();
  calculate(false);
  $("visit-order")
    .querySelector<HTMLButtonElement>(`[data-key="${CSS.escape(from)}"]`)
    ?.focus({ preventScroll: true });
}
function renderOrder() {
  if (!p) return;
  const root = $("visit-order");
  root.replaceChildren();
  p.order.forEach((key, i) => {
    const s = find(key),
      row = el("li");
    row.draggable = true;
    row.dataset.stop = key;
    const handle = el("span", "↕", "safe-stop-drag");
    handle.draggable = true;
    handle.setAttribute("role", "img");
    handle.setAttribute(
      "aria-label",
      `Drag stop ${i + 1} to reorder; use Up/Down buttons with keyboard or touch`,
    );
    handle.title = "Drag to reorder";
    row.append(handle);
    const locate = button(display(s), () => focusSafe(s));
    locate.dataset.key = key;
    row.append(locate);
    if (restricted(s)) row.append(accessInfo(s));
    const controls = el("div", undefined, "safe-actions"),
      up = button("↑", () => move(key, p!.order[i - 1])),
      down = button("↓", () => move(key, p!.order[i + 1])),
      remove = button("Remove", () => toggle(key, false));
    up.disabled = i === 0;
    down.disabled = i === p!.order.length - 1;
    up.setAttribute("aria-label", "Move " + display(s) + " up");
    down.setAttribute("aria-label", "Move " + display(s) + " down");
    remove.setAttribute("aria-label", "Remove " + display(s));
    controls.append(up, down, remove);
    row.append(controls);
    row.addEventListener("dragstart", (e) => {
      dragKey = key;
      e.dataTransfer?.setData("text/plain", key);
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragover", (e) => e.preventDefault());
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      move(dragKey, key);
      dragKey = "";
    });
    row.addEventListener("dragend", () => {
      dragKey = "";
    });
    root.append(row);
  });
}
function calculate(optimize: boolean) {
  stopWork();
  if (!p || !active) return;
  if (isLootRun) $("planned-order").replaceChildren();
  if (!p.start) {
    status.textContent = "Choose a spawn or manual start to plan your run.";
    return;
  }
  if (!p.order.length) {
    status.textContent = isLootRun
      ? "No stops selected. Choose safes or clinics to build your run."
      : "No safes selected. Choose safes to build your run.";
    return;
  }
  const candidates = p.order.filter((key) => !isLootRun || !lootOptions.avoidRestricted || !restricted(find(key)));
  if (isLootRun) $("route-scope").textContent = `${p.order.length} selected · ${candidates.length} eligible${lootOptions.avoidRestricted ? ` · ${p.order.length - candidates.length} source-reported restricted safes skipped` : ""}${lootOptions.maxStops ? ` · up to ${lootOptions.maxStops} stops in suggested route` : ""}.`;
  if (!candidates.length) {
    status.textContent = "No eligible stops. Change the access filter or select another stop.";
    return;
  }
  if (p.mode === "roads" && !graph) {
    status.textContent =
      "Road network unavailable. Choose Direct lines or reload local captures to retry.";
    return;
  }
  const request = epoch;
  status.textContent = "Calculating run…";
  // Production is bundled inline; Vite's dev worker still imports modules.
  // Keep one pending bootstrap and send only the latest requested solve.
  if (!worker) {
    worker = new SafeRunWorker();
    workerReady = false;
    const booting = worker;
    bootstrapTimer = setTimeout(() => {
      if (worker !== booting) return;
      releaseWorker(booting);
      if (active && p?.start && p.order.length)
        status.textContent =
          "Route worker could not start within 10 seconds. Choose Optimize to retry.";
    }, 10000);
  }
  const ownedWorker = worker;
  const input = {
    start: p.start,
    stops: candidates.map((key) => ({ key, point: find(key).point })),
    mode: p.mode,
    optimize: optimize || (isLootRun && (lootOptions.clinicsFirst || lootOptions.maxStops !== null)),
    graph: p.mode === "roads" ? graph : null,
    ...(isLootRun ? { priorityKeys: lootOptions.clinicsFirst ? candidates.filter((key) => find(key).kind === "clinic") : [], maxStops: lootOptions.maxStops ?? undefined } : {}),
  };
  const fail = (message: string) => {
    if (request !== epoch || worker !== ownedWorker) return;
    releaseWorker(ownedWorker);
    stopWork();
    status.textContent = message;
  };
  timer = setTimeout(
    () =>
      fail(
        "Route calculation exceeded 10 seconds. Reduce selected stops or use Direct lines; previous order is retained.",
      ),
    10000,
  );
  ownedWorker.onerror = (e) => {
    e.preventDefault();
    fail(
      "Route worker failed. Previous order retained; choose Optimize to retry.",
    );
  };
  ownedWorker.onmessage = (e) => {
    if (e.data.ready) {
      if (worker !== ownedWorker) return;
      workerReady = true;
      if (bootstrapTimer) clearTimeout(bootstrapTimer);
      bootstrapTimer = null;
      if (request !== epoch || !active || !p) {
        releaseWorker(ownedWorker);
        return;
      }
      ownedWorker.postMessage(input);
      return;
    }
    if (request !== epoch || !p) return;
    if (e.data.error) {
      fail(e.data.error);
      return;
    }
    result = e.data.result as SolveOutput;
    releaseWorker(ownedWorker);
    if (timer) clearTimeout(timer);
    timer = null;
    if (optimize && (!isLootRun || (!lootOptions.avoidRestricted && !lootOptions.clinicsFirst && lootOptions.maxStops === null))) {
      p.order = result.order;
      p.manual = false;
      save();
      renderOrder();
    }
    for (const [key, marker] of safeMarkers) marker.setIcon(safeIcon(find(key), result.order.indexOf(key)));
    if (isLootRun) {
      const planned = $("planned-order");
      planned.replaceChildren();
      for (const key of result.order) {
        const row = el("li");
        row.append(button(display(find(key)), () => focusSafe(find(key))));
        planned.append(row);
      }
      $("route-scope").textContent = `${p.order.length} selected · ${result.order.length} in suggested route · ${p.order.length - result.order.length} skipped or deferred${lootOptions.avoidRestricted ? " · source-reported restrictions filtered" : ""}.`;
    }
    const description =
      p.mode === "direct"
        ? "Direct lines, not roads"
        : "Road paths with dashed off-road connectors";
    status.replaceChildren(
      el(
        "span",
        `${input.optimize ? "Nearest-neighbor" : "Manual"} order · ${result.order.length} stops · ${result.total.toFixed(0)} image px${result.missing ? " connected distance only" : ""}. ${description}.`,
      ),
    );
    result.legs.forEach((leg, i) => {
      if (leg.error) {
        status.append(
          el(
            "span",
            ` Missing leg ${i + 1} to ${display(find(result!.order[i]))}: ${leg.error}`,
          ),
        );
        return;
      }
      if (leg.road.length > 1)
        L.polyline(
          leg.road.map(([x, y]) => [y, x] as L.LatLngTuple),
          {
            color: "#ffd36e",
            weight: 3,
            dashArray: p!.mode === "direct" ? "8 7" : undefined,
            interactive: false,
          },
        ).addTo(lines);
      for (const c of leg.connectors)
        L.polyline(
          c.map(([x, y]) => [y, x] as L.LatLngTuple),
          { color: "#d8e7f0", dashArray: "4 6", weight: 2, interactive: false },
        ).addTo(lines);
    });
  };
  if (workerReady) ownedWorker.postMessage(input);
}
async function load() {
  if (loading || !active) return;
  const generation = ++loadEpoch;
  loading = true;
  ($("reload-data") as HTMLButtonElement).disabled = true;
  dataStatus.textContent = "Loading local captures…";
  try {
    const loaded = await loadDataset(isLootRun);
    if (!active || generation !== loadEpoch) return;
    const next = reconcile(p ?? stored, loaded.data);
    stopWork();
    status.textContent = "Refreshing run and local road coverage…";
    graph = null;
    $("road-status").textContent = "Refreshing local road coverage…";
    data = loaded.data;
    p = next.preference;
    stored = null;
    dataStatus.textContent = `${data.safes.length} positioned ${candidateLabel}${isLootRun ? ` (${data.safes.filter((s) => s.kind === "safe").length} safes, ${data.safes.filter((s) => s.kind === "clinic").length} clinics)` : ""} · ${data.spawns.length} reported spawns${data.referenceOnly ? " · " + data.referenceOnly + " unpositioned entries omitted" : ""}. ${next.notices.join(" ")}`;
    const sources = $("source-list");
    sources.replaceChildren();
    for (const s of loaded.sources) {
      const row = el("li"),
        link = el("a", s.name);
      link.href = s.page;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      row.append(link, document.createTextNode(" · captured " + s.date));
      sources.append(row);
    }
    const spawn = $<HTMLSelectElement>("spawn-select");
    spawn.replaceChildren(new Option("Choose spawn or set a manual start", ""));
    for (const s of data.spawns)
      spawn.append(
        new Option(
          display(s) +
            ` · X ${s.point[0].toFixed(0)}, Y ${s.point[1].toFixed(0)}`,
          s.key,
        ),
      );
    ($("route-mode") as HTMLSelectElement).value = p.mode;
    if (isLootRun) {
      $<HTMLInputElement>("avoid-restricted").checked = lootOptions.avoidRestricted;
      $<HTMLInputElement>("clinics-first").checked = lootOptions.clinicsFirst;
      $<HTMLSelectElement>("max-stops").value = lootOptions.maxStops === null ? "" : String(lootOptions.maxStops);
    }
    syncStart();
    ($("safe-settings") as HTMLFieldSetElement).disabled = false;
    ($("safe-choices") as HTMLFieldSetElement).disabled = false;
    renderChoices();
    renderOrder();
    if (isLootRun) { renderObservations(); syncObservationForm(); }
    draw();
    save();
    try {
      let loadedGraph: RoadGraph;
      let owned = false;
      let roadNotice = "";
      if (isLootRun) {
        try {
          const savedRoads = localStorage.getItem(roadNetworkKey);
          if (savedRoads) { loadedGraph = parseRoadGraph(savedRoads); owned = true; }
        } catch { roadNotice = "Saved road file is invalid or unavailable; it was not changed. "; }
      }
      loadedGraph ??= await loadRoads();
      if (!active || generation !== loadEpoch) return;
      graph = loadedGraph;
      $("road-status").textContent =
        `${roadNotice}${graph.edges.length} ${owned ? "imported" : "local starter"} road segments · ${graph.verification} · coverage may be incomplete. Missing legs stay undrawn.`;
    } catch {
      if (!active || generation !== loadEpoch) return;
      graph = null;
      $("road-status").textContent =
        "No usable local road network. Direct-line planning remains available.";
    }
    calculate(!p.manual);
  } catch (error) {
    if (!active || generation !== loadEpoch) return;
    dataStatus.textContent = `Local captures could not reload: ${error instanceof Error ? error.message : "unknown error"}. ${p ? "Previous valid map and run retained." : "No candidate data loaded."} Use Reload local captures to retry.`;
  } finally {
    if (active && generation === loadEpoch) {
      loading = false;
      ($("reload-data") as HTMLButtonElement).disabled = false;
    }
  }
}
$("reload-data").addEventListener("click", () => void load());
$("spawn-select").addEventListener("change", () => {
  const key = ($("spawn-select") as HTMLSelectElement).value,
    s = data.spawns.find((s) => s.key === key);
  chooseStart(s ? [...s.point] : null, s?.key ?? null);
});
$("clear-start").addEventListener("click", () => chooseStart(null, null));
$("pick-start").addEventListener("click", () => {
  picking = !picking;
  $("pick-start").setAttribute("aria-pressed", String(picking));
  status.textContent = picking
    ? "Click terrain to set your start. Right-click terrain also sets it."
    : "Start picking cancelled.";
});
map.on("click", (e) => {
  if (picking && pointValid([e.latlng.lng, e.latlng.lat]))
    chooseStart([e.latlng.lng, e.latlng.lat], null);
});
map.on("contextmenu", (e) => {
  if (pointValid([e.latlng.lng, e.latlng.lat]))
    chooseStart([e.latlng.lng, e.latlng.lat], null);
});
$("manual-start").addEventListener("submit", (e) => {
  e.preventDefault();
  const x = ($("start-x") as HTMLInputElement).value,
    y = ($("start-y") as HTMLInputElement).value,
    point: XY = [Number(x), Number(y)];
  if (!x.trim() || !y.trim() || !pointValid(point)) {
    status.textContent = "Enter X and Y inside 0–4096.";
    return;
  }
  chooseStart(point, null);
});
$("route-mode").addEventListener("change", () => {
  if (!p) return;
  p.mode = ($("route-mode") as HTMLSelectElement).value as Preference["mode"];
  save();
  calculate(!p.manual);
});
$("optimize").addEventListener("click", () => calculate(true));
$("safe-search").addEventListener("input", renderChoices);
$("select-all").addEventListener("click", () => {
  if (!p) return;
  if (data.safes.length > limits.selected) {
    status.textContent =
      "More than 64 candidates. Select the stops you want individually; selection retained.";
    return;
  }
  p.order = [
    ...p.order,
    ...data.safes.map((s) => s.key).filter((key) => !p!.order.includes(key)),
  ];
  save();
  renderChoices();
  renderOrder();
  draw();
  calculate(!p.manual);
});
if (isLootRun) for (const kind of ["safe", "clinic"] as const) {
  $(`select-${kind === "safe" ? "safes" : "clinics"}`).addEventListener("click", () => {
    if (!p) return;
    const additions = data.safes
      .filter((s) => s.kind === kind && !p!.order.includes(s.key))
      .map((s) => s.key);
    if (p.order.length + additions.length > limits.selected) {
      status.textContent = "At most 64 stops per run. Deselect some stops, then retry.";
      return;
    }
    p.order.push(...additions);
    save();
    renderChoices();
    renderOrder();
    draw();
    calculate(!p.manual);
  });
}
$("select-none").addEventListener("click", () => {
  if (!p) return;
  p.order = [];
  save();
  renderChoices();
  renderOrder();
  draw();
  calculate(false);
});
$("fit-route").addEventListener("click", () => {
  if (!p) return;
  const points = [
    ...(p.start ? [p.start] : []),
    ...(result?.order ?? p.order).map((k) => find(k).point),
  ];
  if (!points.length) {
    viewer.reset();
    return;
  }
  map.fitBounds(
    L.latLngBounds(points.map(([x, y]) => [y, x] as L.LatLngTuple)),
    { padding: [40, 40], maxZoom: 3, animate: false },
  );
});
$("safe-zoom-in").addEventListener("click", viewer.zoomIn);
$("safe-zoom-out").addEventListener("click", viewer.zoomOut);
$("safe-reset").addEventListener("click", viewer.reset);
$("safe-grid").addEventListener("change", () =>
  viewer.coordinateGrid.setVisible(
    ($("safe-grid") as HTMLInputElement).checked,
  ),
);
if (isLootRun) {
  $("import-loot-roads").addEventListener("click", async () => {
    const file = $<HTMLInputElement>("loot-road-file").files?.[0];
    if (!file || file.size > 2 * 1024 * 1024) { $("road-status").textContent = "Choose a road-network JSON file no larger than 2 MiB."; return; }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const next = parseRoadGraph(text);
      let persisted = true;
      try { localStorage.setItem(roadNetworkKey, text); }
      catch { persisted = false; }
      graph = next;
      $("road-status").textContent = `${next.edges.length} imported road segments · ${next.verification} · coverage may be incomplete. Missing legs stay undrawn.${persisted ? "" : " Works for this session but could not be saved."}`;
      calculate(!p?.manual);
    } catch (error) {
      $("road-status").textContent = `Road file rejected: ${error instanceof Error ? error.message : "invalid file"}. Current network retained.`;
    }
  });
  $("clear-loot-roads").addEventListener("click", async () => {
    try {
      const fallback = await loadRoads();
      localStorage.removeItem(roadNetworkKey);
      graph = fallback;
      $("road-status").textContent = `${fallback.edges.length} local starter road segments · ${fallback.verification} · incomplete coverage. Missing legs stay undrawn.`;
      calculate(!p?.manual);
    } catch { $("road-status").textContent = "Local starter roads unavailable. Imported network retained."; }
  });
  const optionsChanged = () => {
    lootOptions = {
      version: 1,
      avoidRestricted: $<HTMLInputElement>("avoid-restricted").checked,
      clinicsFirst: $<HTMLInputElement>("clinics-first").checked,
      maxStops: $<HTMLSelectElement>("max-stops").value ? Number($<HTMLSelectElement>("max-stops").value) : null,
    };
    saveLootOptions();
    calculate(true);
  };
  for (const id of ["avoid-restricted", "clinics-first", "max-stops"]) $(id).addEventListener("change", optionsChanged);
  $("observation-stop").addEventListener("change", syncObservationForm);
  $("save-observation").addEventListener("click", () => {
    const key = $<HTMLSelectElement>("observation-stop").value;
    const stop = data.safes.find((s) => s.key === key);
    if (!stop) { $("observation-status").textContent = "Choose a safe or clinic first."; return; }
    const observedAt = $<HTMLInputElement>("observation-date").value;
    const resultValue = $<HTMLSelectElement>("observation-result").value as ObservationResult;
    const note = $<HTMLTextAreaElement>("observation-note").value.trim();
    const entry: LootObservation = { key, name: stop.name, kind: stop.kind === "clinic" ? "clinic" : "safe", point: [...stop.point], capturedAt: stop.capturedAt, observedAt, gameBuild: $<HTMLInputElement>("observation-build").value.trim(), result: resultValue, note };
    const next: LootJournal = { version: 1, observations: [...lootJournal.observations.filter((row) => row.key !== key), entry] };
    if (persistJournal(next)) {
      renderObservations();
      $<HTMLSelectElement>("observation-stop").value = key;
      syncObservationForm();
      renderChoices();
      draw();
      $("observation-status").textContent = "Gameplay check saved locally. Source claims remain separate.";
    }
  });
  $("clear-observation").addEventListener("click", () => {
    const key = $<HTMLSelectElement>("observation-stop").value;
    if (!key) { $("observation-status").textContent = "Choose a stop first."; return; }
    const next: LootJournal = { version: 1, observations: lootJournal.observations.filter((row) => row.key !== key) };
    if (persistJournal(next)) { renderObservations(); $<HTMLSelectElement>("observation-stop").value = key; syncObservationForm(); renderChoices(); draw(); $("observation-status").textContent = "Gameplay check cleared."; }
  });
  $("export-observations").addEventListener("click", () => {
    if (!journalReadable) return;
    const blob = new Blob([JSON.stringify(lootJournal, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hajin-loot-run-gameplay-checks.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  });
}
window.addEventListener("pagehide", () => {
  active = false;
  loadEpoch++;
  loading = false;
  stopWork();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    active = true;
    void load();
  }
});
void load();

if(import.meta.hot)import.meta.hot.dispose(disposeModernLayout);
