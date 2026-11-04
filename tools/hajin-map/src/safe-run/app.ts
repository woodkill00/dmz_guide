import L from "leaflet";
import SafeRunWorker from "./worker.ts?worker&inline";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { createMapView } from "../map/map-view.ts";
import { gridReferenceAt } from "../map/tactical-grid.ts";
import { hajin } from "../map/hajin.ts";
import { el } from "../workspace/dom.ts";
import { pointValid, type XY, type RoadGraph } from "../workspace/roads.ts";
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

document.querySelector("#app")!.innerHTML = `
<header class="safe-header"><div><p>HAJIN · FIELD PLANNING</p><h1>Safe runs</h1></div><a href="/">Open full map</a></header>
<main class="safe-layout"><aside id="safe-controls" tabindex="-1" aria-label="Safe-run planner">
<p class="safe-intro">Choose a start and safes to visit. These are source-reported candidates, not live or guaranteed spawns.</p>
<p id="data-status" role="status">Loading local source captures…</p><p id="saved-status" role="status"></p><button id="reload-data" type="button">Reload local captures</button>
<fieldset disabled id="safe-settings"><legend>1 · Start and routing</legend>
<label for="spawn-select">Spawn location</label><select id="spawn-select"><option value="">Choose spawn or set a manual start</option></select>
<p id="start-label">No start selected.</p><div class="safe-actions"><button id="pick-start" type="button" aria-pressed="false">Pick start on map</button><button id="clear-start" type="button">Clear start</button></div>
<form id="manual-start"><div class="safe-xy"><label>X <input id="start-x" type="number" min="0" max="4096" step="any" required></label><label>Y <input id="start-y" type="number" min="0" max="4096" step="any" required></label></div><button type="submit">Set manual start</button></form>
<label for="route-mode">Route geometry</label><select id="route-mode"><option value="direct">Direct lines · not roads</option><option value="roads">Local roads · partial, unverified</option></select><p id="road-status">Checking local road coverage…</p>
<div class="safe-actions"><button id="optimize" type="button">Optimize order</button><button id="fit-route" type="button">Fit run</button></div><p class="safe-note">Efficient nearest-neighbor order, not a guaranteed shortest tour. Open route, no return to spawn. Distances are image pixels, not game meters or travel times.</p></fieldset>
<fieldset disabled id="safe-choices"><legend>2 · Safe candidates</legend><label for="safe-search">Search safes, keys, access, source, notes or grid</label><input id="safe-search" type="search" maxlength="200"><div class="safe-actions"><button id="select-all" type="button">Select all safes</button><button id="select-none" type="button">Deselect all</button></div><p id="selection-count"></p><p class="safe-note safe-access-legend"><strong>Red !</strong>: source-reported locked/key/puzzle access. Gold: access not recorded, not guaranteed unlocked. Gray fill: excluded; red border still flags access requirements.</p><p class="safe-note">Search changes the list only. Matching names within 24 image pixels and compatible floors share one marker; differently named nearby entries stay separate for review. Key guides are linked only for a named access requirement in the same calibrated grid, never proximity alone.</p><div id="safe-list"></div></fieldset>
<section aria-labelledby="route-heading"><h2 id="route-heading">3 · Visit order</h2><p id="route-status" role="status">Choose your start to plan a run.</p><p class="safe-note">Drag rows or use ↑ / ↓. Manual order stays until you choose Optimize.</p><ol id="visit-order"></ol></section>
<details><summary>Source captures and limitations</summary><ul id="source-list"></ul><p>Safes may overlap across providers, have access requirements, or be absent in a match. Nearby warnings are review hints, not confirmed duplicates. This page rereads reviewed local captures; update providers through the main map. It does not collect new remote data.</p><p>Road mode uses the separate local road file, not the main workspace’s private road edits. Missing road legs are left undrawn and listed below; dashed lines are off-road connectors.</p><a href="${hajin.source}" target="_blank" rel="noopener noreferrer">Official map background</a></details>
</aside><section class="safe-terrain" aria-label="Safe-run map"><div id="safe-map" tabindex="0" role="region" aria-label="Hajin safe-run map. Arrow keys pan; plus and minus zoom."></div><div class="safe-map-tools" role="group" aria-label="Map controls"><button id="safe-zoom-in" type="button" aria-label="Zoom in">+</button><button id="safe-zoom-out" type="button" aria-label="Zoom out">−</button><button id="safe-reset" type="button">Full map</button><label><input id="safe-grid" type="checkbox" checked> Grid</label></div><p id="terrain-status" role="status"></p><p class="safe-map-credit">Source-reported safe locations · © Activision · manual planning</p></section></main>`;
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const status = $("route-status"),
  savedStatus = $("saved-status"),
  dataStatus = $("data-status");
const viewer = createMapView(
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
try {
  const value = localStorage.getItem(stateKey);
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
const display = (s: Stop) => `${s.name} · ${grid(s)} · ${s.sourceName}`;
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
    localStorage.setItem(stateKey, text);
    savedStatus.textContent = preferenceNotice + "Run saved in this browser.";
  } catch {
    savedStatus.textContent =
      preferenceNotice +
      "Run is usable, but preferences could not be saved. Browser storage is unavailable or full.";
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
        `${s.floor === null ? "Floor unknown" : "Floor " + s.floor}${s.nearby ? " · Nearby differently named source candidate: review before counting as a separate safe." : ""}`,
      ),
    );
    if (s.matches.length)
      content.append(el("p", "Also reported by " + s.matches.join(", ")));
    content.append(accessInfo(s, true));
    content.append(
      button(index < 0 ? "Include safe" : "Exclude safe", () =>
        toggle(s.key, index < 0),
      ),
    );
    const marker = L.marker([s.point[1], s.point[0]], {
      icon: L.divIcon({
        className:
          "safe-number-marker" +
          (restricted(s) ? " safe-locked" : "") +
          (index < 0 ? " safe-excluded" : ""),
        html:
          (index < 0 ? "−" : String(index + 1)) +
          (restricted(s)
            ? '<span class="safe-lock-cue" aria-hidden="true">!</span>'
            : ""),
        iconSize: [28, 28],
      }),
      title: display(s) + " · " + accessLabel(access(s)),
      alt: display(s) + " · " + accessLabel(access(s)),
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
      status.textContent = "At most 64 safes per run. Deselect a stop first.";
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
    `${p.order.length} selected / ${data.safes.length} source candidates · ${data.safes.filter(restricted).length} reported access restrictions · ${shown.length} listed · maximum 64 per run`;
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
    root.append(row);
  }
  if (!shown.length)
    root.append(el("p", "No safe candidates match this search."));
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
  if (!p.start) {
    status.textContent = "Choose a spawn or manual start to plan your run.";
    return;
  }
  if (!p.order.length) {
    status.textContent = "No safes selected. Choose safes to build your run.";
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
    stops: p.order.map((key) => ({ key, point: find(key).point })),
    mode: p.mode,
    optimize,
    graph: p.mode === "roads" ? graph : null,
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
        "Route calculation exceeded 10 seconds. Reduce selected safes or use Direct lines; previous order is retained.",
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
    if (optimize) {
      p.order = result.order;
      p.manual = false;
      save();
      renderOrder();
      draw();
    }
    const description =
      p.mode === "direct"
        ? "Direct lines, not roads"
        : "Road paths with dashed off-road connectors";
    status.replaceChildren(
      el(
        "span",
        `${p.manual ? "Manual" : "Nearest-neighbor"} order · ${p.order.length} stops · ${result.total.toFixed(0)} image px${result.missing ? " connected distance only" : ""}. ${description}.`,
      ),
    );
    result.legs.forEach((leg, i) => {
      if (leg.error) {
        status.append(
          el(
            "span",
            ` Missing leg ${i + 1} to ${display(find(p!.order[i]))}: ${leg.error}`,
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
    const loaded = await loadDataset();
    if (!active || generation !== loadEpoch) return;
    const next = reconcile(p ?? stored, loaded.data);
    stopWork();
    status.textContent = "Refreshing run and local road coverage…";
    graph = null;
    $("road-status").textContent = "Refreshing local road coverage…";
    data = loaded.data;
    p = next.preference;
    stored = null;
    dataStatus.textContent = `${data.safes.length} positioned safe candidates · ${data.spawns.length} reported spawns${data.referenceOnly ? " · " + data.referenceOnly + " unpositioned entries omitted" : ""}. ${next.notices.join(" ")}`;
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
    syncStart();
    ($("safe-settings") as HTMLFieldSetElement).disabled = false;
    ($("safe-choices") as HTMLFieldSetElement).disabled = false;
    renderChoices();
    renderOrder();
    draw();
    save();
    try {
      const loadedGraph = await loadRoads();
      if (!active || generation !== loadEpoch) return;
      graph = loadedGraph;
      $("road-status").textContent =
        `${graph.edges.length} local road segments · ${graph.verification} · incomplete coverage. Missing legs stay undrawn.`;
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
      "More than 64 candidates. Select the safes you want individually; selection retained.";
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
    ...p.order.map((k) => find(k).point),
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
