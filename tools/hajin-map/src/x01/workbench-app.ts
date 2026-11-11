import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import "./workbench-style.css";
import hubRaw from "./dmzhub-snapshot.json";
import codRaw from "./codcentral-snapshot.json";
import {
  hubCategory,
  hubName,
  validateHubSnapshot,
  type HubSnapshot,
} from "./dmzhub-model.ts";
import { layerNames, validateSnapshot, type X01Snapshot } from "./model.ts";
import {
  codSharedIcon,
  hubSharedIcon,
  loadSharedHajinIcons,
  type SharedIcons,
} from "./shared-icons.ts";
import {
  alignPoint,
  candidateMatches,
  deriveAlignment,
  pairedConnectors,
  routeLegs,
  sourceDiff,
  type Alignment,
  type Floor,
  type Stop,
} from "./workbench-model.ts";
import {
  emptyState,
  makeBackup,
  parseBackup,
  readPrivateState,
  savePrivateState,
  validatePhoto,
  type PrivatePoint,
  type PrivateState,
} from "./workbench-store.ts";

let hub: HubSnapshot = validateHubSnapshot(hubRaw),
  cod: X01Snapshot = validateSnapshot(codRaw),
  state: PrivateState = emptyState();
const query = new URL(location.href).searchParams;
let floor: Floor = query.get("floor") === "2" ? 2 : 1,
  selectedId = query.get("marker") || "",
  showHub = true,
  showCod = true,
  showCustom = true,
  compare = false,
  search = "",
  draftUpdate: {
    source: "hub" | "cod";
    snapshot: HubSnapshot | X01Snapshot;
    changes: ReturnType<typeof sourceDiff>;
  } | null = null,
  importDraft: PrivateState | null = null;
let alignment: Alignment, otherAlignment: Alignment;
let sharedIcons: SharedIcons = {};
const refreshAlignment = () => {
  alignment = deriveAlignment(hub, cod, floor);
  otherAlignment = deriveAlignment(hub, cod, floor === 1 ? 2 : 1);
};
refreshAlignment();
const app = document.querySelector<HTMLElement>("#app")!;
app.innerHTML = `<main class="x01-workbench"><header class="wb-head"><div><p class="x01-eyebrow">DMZ FIELD GUIDE · X01</p><h1>X01 planning workbench</h1><p>Compare sources · mark discoveries · plan schematic routes</p></div><nav aria-label="X01 views"><a href="/x01-dmzhub.html">DMZHub source map</a><a href="/x01.html">COD Central source map</a><a href="/">Hajin map</a></nav></header><div class="wb-grid"><aside id="workbench-controls" class="wb-panel" aria-label="X01 source and location controls"><h2>Explore</h2><div class="wb-row" role="group" aria-label="Floor"><label><input type="radio" name="wb-floor" value="1" checked>First floor</label><label><input type="radio" name="wb-floor" value="2">Second floor</label></div><div class="wb-row" role="group" aria-label="Visible sources"><label><input id="wb-show-hub" type="checkbox" checked>DMZHub</label><label><input id="wb-show-cod" type="checkbox" checked>COD Central</label><label><input id="wb-show-custom" type="checkbox" checked>Mine</label></div><div class="wb-row"><label><input id="wb-compare" type="checkbox">Side-by-side source maps</label></div><label>Find a place or marker<input id="wb-search" type="search" maxlength="100" placeholder="safe, printer, room"></label><p id="wb-count" class="wb-stats" role="status"></p><div id="wb-nearby" class="wb-nearby" hidden><strong>Markers here</strong><div id="wb-nearby-list" class="wb-list"></div><button id="wb-nearby-close" type="button">Close list</button></div><div id="wb-results" class="wb-list" aria-label="X01 locations"></div><details id="wb-review-panel"><summary>Source review</summary><p id="wb-alignment" class="wb-stats"></p><p>Matching names and positions are candidates only. Choose Same or Separate to record your review.</p><div id="wb-candidates"></div></details></aside><section class="wb-map-panel" aria-label="X01 workbench maps"><div class="wb-mapbar"><button id="wb-zoom-in" type="button" aria-label="Zoom in">+</button><button id="wb-zoom-out" type="button" aria-label="Zoom out">−</button><button id="wb-fit" type="button">Fit</button><button id="wb-add" type="button">Add my POI</button><span id="wb-map-status"></span></div><div id="wb-maps" class="wb-maps"><div id="wb-map" role="region" aria-label="X01 DMZHub floor with optional calibrated COD Central markers" tabindex="0"></div><div id="wb-cod-map" role="region" aria-label="COD Central X01 floor comparison" tabindex="0"></div></div><p class="wb-caption">COD Central overlay uses a measured display alignment. Dashed route legs are schematic; access and travel time are unverified. Right-click to add your own point.</p></section><aside class="wb-panel" aria-label="X01 planning tools"><h2>Selected location</h2><div id="wb-detail">Choose a map marker or result.</div><p id="wb-message" class="wb-status" role="status"></p><details id="wb-custom-panel"><summary>My POI</summary><form id="wb-point-form" class="wb-form"><input id="wb-point-id" type="hidden"><label>Name<input id="wb-point-name" maxlength="100" required></label><label>Type<input id="wb-point-kind" maxlength="50" value="Place"></label><div class="wb-inline"><label>Floor<select id="wb-point-floor"><option value="1">First</option><option value="2">Second</option></select></label><label>Photo (PNG/JPEG/WebP, ≤2 MiB)<input id="wb-point-photo" type="file" accept="image/png,image/jpeg,image/webp"></label></div><div class="wb-inline"><label>X (0–1)<input id="wb-point-x" type="number" min="0" max="1" step="0.000001" required></label><label>Y (0–1)<input id="wb-point-y" type="number" min="0" max="1" step="0.000001" required></label></div><label>Notes<textarea id="wb-point-notes" maxlength="2000"></textarea></label><div class="wb-row"><button type="submit">Save POI</button><button id="wb-point-delete" type="button">Delete POI</button><button id="wb-point-clear" type="button">New</button></div></form></details><details id="wb-route-panel"><summary>Waypoints and route</summary><p class="wb-stats">Select a marker, then Add waypoint. Move stops with buttons. Lines are straight schematic segments through reported floor connectors.</p><div class="wb-row"><button id="wb-route-add" type="button">Add selected</button><button id="wb-route-clear" type="button">Clear route</button></div><div id="wb-route-list"></div><div id="wb-route-legs"></div></details><details id="wb-observe-panel"><summary>Gameplay observations</summary><form id="wb-observe-form" class="wb-form"><p id="wb-observe-target">Select a location first.</p><label>Date<input id="wb-observe-date" type="date" required></label><label>Game build<input id="wb-observe-build" maxlength="80" placeholder="e.g. Season 1 build"></label><label>Outcome<select id="wb-observe-outcome"><option value="confirmed">Confirmed in my match</option><option value="absent">Absent in my match</option><option value="uncertain">Uncertain</option></select></label><label>Notes<textarea id="wb-observe-notes" maxlength="2000"></textarea></label><button type="submit">Save observation</button></form><div id="wb-observations"></div></details><details id="wb-update-panel"><summary>Review source update</summary><p>Capture a source snapshot locally, then choose its JSON draft. Nothing is applied until you review the diff.</p><label>Source<select id="wb-update-source"><option value="hub">DMZHub</option><option value="cod">COD Central</option></select></label><label>Snapshot JSON<input id="wb-update-file" type="file" accept="application/json,.json"></label><button id="wb-update-review" type="button">Review file</button><div id="wb-update-preview"></div><button id="wb-update-apply" type="button" disabled>Apply reviewed update</button></details><details id="wb-backup-panel"><summary>Backup and restore</summary><button id="wb-export" type="button">Download private backup</button><label>Backup JSON<input id="wb-import-file" type="file" accept="application/json,.json"></label><button id="wb-import-review" type="button">Preview restore</button><div id="wb-import-preview"></div><button id="wb-import-apply" type="button" disabled>Replace private workspace</button></details></aside></div></main>`;
const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const message = (value: string, error = false) => {
  const host = $("#wb-message");
  host.textContent = value;
  host.classList.toggle("wb-error", error);
};
const hubBounds = L.latLngBounds([0, 0], [4096, 4096]),
  codBounds = L.latLngBounds([0, 0], [1188, 1320]);
const contentBounds = (floor: Floor) => {
  const f = hub.floors[floor - 1].grid.frame;
  return L.latLngBounds(
    [4096 * (1 - f.y - f.height), 4096 * f.x],
    [4096 * (1 - f.y), 4096 * (f.x + f.width)],
  );
};
const map = L.map("wb-map", {
  crs: L.CRS.Simple,
  minZoom: -4,
  maxZoom: 3,
  zoomSnap: 0.25,
  scrollWheelZoom: true,
  zoomControl: false,
  attributionControl: false,
}).fitBounds(contentBounds(floor));
const codMap = L.map("wb-cod-map", {
  crs: L.CRS.Simple,
  minZoom: -3,
  maxZoom: 3,
  zoomSnap: 0.25,
  scrollWheelZoom: true,
  zoomControl: false,
  attributionControl: false,
}).fitBounds(codBounds);
map.setMaxBounds(hubBounds.pad(0.5));
codMap.setMaxBounds(codBounds.pad(0.5));
let hubBase: L.Layer | undefined, codBase: L.ImageOverlay | undefined;
const hubLayer = L.layerGroup().addTo(map),
  codLayer = L.layerGroup().addTo(map),
  mineLayer = L.layerGroup().addTo(map),
  routeLayer = L.layerGroup().addTo(map),
  codNative = L.layerGroup().addTo(codMap);
type Visible = {
  id: string;
  name: string;
  source: "hub" | "cod" | "mine";
  floor: Floor;
  x: number;
  y: number;
  kind: string;
  keyRoom: boolean;
};
let visible: Visible[] = [];
const point = (row: { x: number; y: number }) =>
  L.latLng(4096 * (1 - row.y), 4096 * row.x);
const codPoint = (row: { x: number; y: number }) =>
  L.latLng(1188 * (1 - row.y), 1320 * row.x);
function currentRecords(): Visible[] {
  const rows: Visible[] = [];
  if (showHub)
    for (const row of hub.markers.filter((item) => item.floor === floor)) {
      const cat = hubCategory(hub, row.categoryId);
      rows.push({
        id: row.id,
        name: hubName(hub, row),
        source: "hub",
        floor,
        x: row.x,
        y: row.y,
        kind: cat.name,
        keyRoom: cat.slug === "key-room",
      });
    }
  if (showCod && alignment.accepted)
    for (const row of cod.markers.filter((item) => item.floor === floor)) {
      const p = alignPoint(row, alignment);
      rows.push({
        id: row.id,
        name: row.name,
        source: "cod",
        floor,
        x: p.x,
        y: p.y,
        kind: layerNames[row.layer],
        keyRoom: row.layer === "key",
      });
    }
  if (showCustom)
    for (const row of state.points.filter((item) => item.floor === floor))
      rows.push({
        id: row.id,
        name: row.name,
        source: "mine",
        floor,
        x: row.x,
        y: row.y,
        kind: row.kind,
        keyRoom: false,
      });
  return rows;
}
function allStops(): Map<string, Stop> {
  const rows = new Map<string, Stop>();
  for (const row of hub.markers) {
    const cat = hubCategory(hub, row.categoryId);
    rows.set(row.id, {
      id: row.id,
      floor: row.floor,
      x: row.x,
      y: row.y,
      name: hubName(hub, row),
      keyRoom: cat.slug === "key-room",
    });
  }
  for (const row of cod.markers) {
    const fit = row.floor === floor ? alignment : otherAlignment;
    if (!fit.accepted) continue;
    const p = alignPoint(row, fit);
    rows.set(row.id, {
      id: row.id,
      floor: row.floor,
      ...p,
      name: row.name,
      keyRoom: row.layer === "key",
    });
  }
  for (const row of state.points)
    rows.set(row.id, {
      id: row.id,
      floor: row.floor,
      x: row.x,
      y: row.y,
      name: row.name,
    });
  return rows;
}
function showImages() {
  if (hubBase) map.removeLayer(hubBase);
  if (codBase) codMap.removeLayer(codBase);
  let imageError = false;
  const report = () => {
      if (!imageError) {
        imageError = true;
        message(
          "A local floor image is missing. Marker lists remain available.",
          true,
        );
      }
    },
    slug = hub.floors[floor - 1].slug,
    group = L.layerGroup();
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++)
      L.imageOverlay(
        `/maps/x01/dmzhub/tiles/${slug}/2/${x}/${y}.webp`,
        [
          [4096 - (y + 1) * 1024, x * 1024],
          [4096 - y * 1024, (x + 1) * 1024],
        ],
        { interactive: false, alt: "" },
      )
        .on("error", report)
        .addTo(group);
  hubBase = group.addTo(map);
  group.eachLayer((layer) => (layer as L.ImageOverlay).bringToBack());
  codBase = L.imageOverlay(
    `/maps/x01/codcentral/floor-${floor}.webp`,
    codBounds,
    { interactive: false, alt: "" },
  )
    .on("error", report)
    .addTo(codMap);
  codBase.bringToBack();
}
function makeIcon(row: Visible) {
  const span = document.createElement("span");
  let icon = "";
  if (row.source === "hub") {
    const item = hub.markers.find((marker) => marker.id === row.id);
    if (item) {
      const category = hubCategory(hub, item.categoryId);
      icon =
        hubSharedIcon(category.slug, sharedIcons) ||
        (item.icon || category.icon
          ? `/maps/x01/dmzhub/icons/${item.icon || category.icon}`
          : "");
    }
  } else if (row.source === "cod") {
    const item = cod.markers.find((marker) => marker.id === row.id);
    if (item) icon = codSharedIcon(item.layer, sharedIcons) || "";
  }
  if (icon) {
    const image = document.createElement("img");
    image.src = icon;
    image.alt = "";
    image.onerror = () => {
      image.remove();
      span.textContent = row.kind.slice(0, 1).toUpperCase();
    };
    span.append(image);
  } else
    span.textContent =
      row.source === "mine" ? "✦" : row.kind.slice(0, 1).toUpperCase();
  const reviewed =
    row.source === "cod" &&
    state.decisions.some(
      (decision) =>
        decision.status === "same" &&
        decision.candidateId.startsWith(`${row.id}__`),
    );
  return L.divIcon({
    className:
      row.source === "cod"
        ? `wb-cod-pin${selectedId === row.id ? " wb-selected" : ""}${reviewed ? " is-reviewed" : ""}`
        : `wb-mark${selectedId === row.id ? " wb-selected" : ""}`,
    html: span,
    iconSize: row.source === "cod" ? [18, 18] : [30, 30],
    iconAnchor: row.source === "cod" ? [9, 9] : [15, 15],
  });
}
function markerClick(row: Visible) {
  const nearby = visible.filter((other) => {
    const a = map.latLngToContainerPoint(point(row)),
      b = map.latLngToContainerPoint(point(other));
    return a.distanceTo(b) <= 24;
  });
  if (nearby.length > 1) showNearby(nearby);
  else select(row.id);
}
function renderMarkers() {
  hubLayer.clearLayers();
  codLayer.clearLayers();
  mineLayer.clearLayers();
  codNative.clearLayers();
  visible = currentRecords();
  for (const row of visible) {
    const marker = L.marker(point(row), {
      icon: makeIcon(row),
      title: `${row.name}, ${row.kind}, ${row.source}`,
      keyboard: true,
    });
    marker.on("click", () => markerClick(row));
    marker.addTo(
      row.source === "hub"
        ? hubLayer
        : row.source === "cod"
          ? codLayer
          : mineLayer,
    );
  }
  for (const row of cod.markers.filter((item) => item.floor === floor)) {
    const span = document.createElement("span");
    span.textContent = "C";
    const marker = L.marker(codPoint(row), {
      icon: L.divIcon({
        className: "wb-cod-pin",
        html: span,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      title: `${row.name}, COD Central`,
      keyboard: true,
    });
    marker.on("click", () => select(row.id));
    marker.addTo(codNative);
  }
}
function showNearby(rows: Visible[]) {
  const host = $("#wb-nearby"),
    list = $("#wb-nearby-list");
  host.hidden = false;
  list.replaceChildren();
  for (const row of rows) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${row.name} · ${row.kind} · ${row.source}`;
    button.onclick = () => {
      host.hidden = true;
      select(row.id);
    };
    list.append(button);
  }
  list.querySelector("button")?.focus();
}
function select(id: string) {
  const record = [...visible, ...allStops().values()].find(
    (row) => row.id === id,
  );
  if (!record) return;
  selectedId = id;
  if (record.floor !== floor) setFloor(record.floor);
  else render();
  const stop = allStops().get(id);
  if (stop)
    map.flyTo(point(stop), Math.max(map.getZoom(), -1), { animate: false });
  const next = new URL(location.href);
  next.searchParams.set("marker", id);
  next.searchParams.set("floor", String(floor));
  history.replaceState(null, "", next);
}
function setFloor(next: Floor) {
  floor = next;
  refreshAlignment();
  showImages();
  render();
  const nextURL = new URL(location.href);
  nextURL.searchParams.set("floor", String(floor));
  history.replaceState(null, "", nextURL);
}
function renderResults() {
  const host = $("#wb-results");
  host.replaceChildren();
  const found = visible
    .filter(
      (row) =>
        !search ||
        `${row.name} ${row.kind} ${row.source}`
          .toLocaleLowerCase()
          .includes(search),
    )
    .slice(0, 100);
  for (const row of found) {
    const button = document.createElement("button"),
      title = document.createElement("span"),
      meta = document.createElement("small");
    button.type = "button";
    button.setAttribute("aria-current", String(selectedId === row.id));
    title.textContent = row.name;
    meta.textContent = `${row.source} · ${row.kind}`;
    button.append(title, meta);
    button.onclick = () => select(row.id);
    host.append(button);
  }
  $("#wb-count").textContent =
    `${visible.length} visible markers · ${found.length} listed${visible.length > 100 ? " (first 100)" : ""}`;
}
function renderAlignment() {
  const host = $("#wb-alignment");
  host.textContent = alignment.accepted
    ? `${alignment.anchors.length} named anchors · average fit error ${(alignment.rmse * 100).toFixed(2)}% of image · largest ${(alignment.maxError * 100).toFixed(2)}%. Overlay is approximate.`
    : "Alignment quality is insufficient; COD Central overlay is unavailable.";
}
function render() {
  for (const input of document.querySelectorAll<HTMLInputElement>(
    'input[name="wb-floor"]',
  ))
    input.checked = Number(input.value) === floor;
  renderMarkers();
  $("#wb-map-status").textContent =
    `Floor ${floor} · ${visible.length} markers`;
  renderResults();
  renderAlignment();
  renderCandidates();
  renderDetails();
  renderRoute();
  renderObservations();
}
async function commit(next: PrivateState) {
  try {
    state = await savePrivateState(next);
    render();
    message("Saved locally.");
    return true;
  } catch (error) {
    message(String(error), true);
    return false;
  }
}
const node = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  value: string,
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
};
function renderCandidates() {
  const host = $("#wb-candidates");
  host.replaceChildren();
  for (const candidate of candidateMatches(hub, cod, alignment)) {
    const codRow = cod.markers.find((row) => row.id === candidate.codId)!,
      hubRow = hub.markers.find((row) => row.id === candidate.hubId)!,
      decision = state.decisions.find(
        (row) => row.candidateId === candidate.id,
      );
    const box = node(
      "div",
      `${codRow.name} ↔ ${hubName(hub, hubRow)} · ${candidate.reason} · ${(candidate.distance * 100).toFixed(1)}% apart`,
    );
    box.className = "wb-review-row";
    for (const status of ["same", "separate", "clear"] as const) {
      const button = node(
        "button",
        status === "same"
          ? "Same"
          : status === "separate"
            ? "Separate"
            : "Clear",
      );
      button.type = "button";
      button.setAttribute("aria-pressed", String(decision?.status === status));
      button.onclick = () =>
        commit({
          ...state,
          decisions: [
            ...state.decisions.filter(
              (row) => row.candidateId !== candidate.id,
            ),
            ...(status === "clear"
              ? []
              : [{ candidateId: candidate.id, status }]),
          ],
        });
      box.append(button);
    }
    host.append(box);
  }
  if (!host.childElementCount)
    host.append(node("p", "No candidates on this floor."));
}
function renderDetails() {
  const host = $("#wb-detail");
  host.replaceChildren();
  const stop = allStops().get(selectedId);
  if (!stop) {
    host.append(node("p", "Choose a map marker or result."));
    return;
  }
  const source = selectedId.startsWith("dmzhub-")
    ? "DMZHub"
    : selectedId.startsWith("x01-")
      ? "COD Central"
      : "My POI";
  host.append(
    node("h3", stop.name),
    node(
      "p",
      `${source} · Floor ${stop.floor} · ${(stop.x * 100).toFixed(1)}%, ${(stop.y * 100).toFixed(1)}%`,
    ),
  );
  const own = state.points.find((row) => row.id === selectedId);
  if (own) {
    host.append(node("p", own.notes || "No notes."));
    const edit = node("button", "Edit my POI");
    edit.onclick = () => fillPoint(own);
    host.append(edit);
    for (const photo of state.photos.filter((row) => row.pointId === own.id)) {
      const image = document.createElement("img");
      image.className = "wb-photo";
      image.alt = photo.name;
      const url = URL.createObjectURL(photo.blob);
      image.src = url;
      image.onload = () => URL.revokeObjectURL(url);
      host.append(image);
    }
  } else {
    const codRow = cod.markers.find((row) => row.id === selectedId);
    if (codRow) host.append(node("p", codRow.description));
    const hubRow = hub.markers.find((row) => row.id === selectedId);
    if (hubRow)
      host.append(node("p", hubCategory(hub, hubRow.categoryId).name));
  }
  const link = document.createElement("a");
  link.href = `/x01-workspace.html?floor=${stop.floor}&marker=${encodeURIComponent(stop.id)}`;
  link.textContent = "Link to this marker";
  host.append(link);
}
function renderRoute() {
  const list = $("#wb-route-list"),
    legsHost = $("#wb-route-legs");
  list.replaceChildren();
  legsHost.replaceChildren();
  routeLayer.clearLayers();
  const stops = allStops(),
    ordered = state.routeIds
      .map((id) => stops.get(id))
      .filter((row): row is Stop => !!row),
    missing = state.routeIds.filter((id) => !stops.has(id));
  for (const [index, id] of state.routeIds.entries()) {
    const stop = stops.get(id),
      row = node(
        "div",
        stop
          ? `${index + 1}. ${stop.name} · floor ${stop.floor}`
          : `${index + 1}. Missing source marker ${id}`,
      );
    row.className = "wb-route-row";
    for (const [label, delta] of [
      ["↑", -1],
      ["↓", 1],
      ["Remove", 0],
    ] as const) {
      const button = node("button", label);
      button.type = "button";
      button.disabled =
        delta !== 0 &&
        (index + delta < 0 || index + delta >= state.routeIds.length);
      button.onclick = () => {
        const ids = [...state.routeIds];
        if (delta === 0) ids.splice(index, 1);
        else
          [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
        void commit({ ...state, routeIds: ids });
      };
      row.append(button);
    }
    list.append(row);
  }
  if (!state.routeIds.length) list.append(node("p", "No waypoints selected."));
  if (missing.length)
    legsHost.append(
      node(
        "p",
        `${missing.length} route stop(s) are missing from the current source snapshot. Restore the source or remove them; route lines are incomplete.`,
      ),
    );
  for (const leg of routeLegs(
    missing.length ? [] : ordered,
    pairedConnectors(hub),
  )) {
    legsHost.append(
      node("p", `${leg.from.name} → ${leg.to.name}: ${leg.warning}`),
    );
    const draw = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      L.polyline([point(a), point(b)], {
        color: "#ffe477",
        weight: 3,
        dashArray: "7 7",
        interactive: false,
      }).addTo(routeLayer);
    if (leg.connector) {
      const first =
          leg.from.floor === 1 ? leg.connector.first : leg.connector.second,
        last = leg.to.floor === 1 ? leg.connector.first : leg.connector.second;
      if (leg.from.floor === floor) draw(leg.from, first);
      if (leg.to.floor === floor) draw(last, leg.to);
    } else if (leg.from.floor === floor && leg.to.floor === floor)
      draw(leg.from, leg.to);
  }
}
function renderObservations() {
  const host = $("#wb-observations");
  host.replaceChildren();
  $("#wb-observe-target").textContent =
    allStops().get(selectedId)?.name || "Select a location first.";
  for (const row of state.observations.filter(
    (row) => row.targetId === selectedId,
  )) {
    const box = node(
      "div",
      `${row.date} · ${row.outcome}${row.build ? " · " + row.build : ""} ${row.notes}`,
    );
    box.className = "wb-review-row";
    const remove = node("button", "Delete");
    remove.onclick = () =>
      commit({
        ...state,
        observations: state.observations.filter((item) => item.id !== row.id),
      });
    box.append(remove);
    host.append(box);
  }
}
function fillPoint(row?: PrivatePoint, coordinates?: { x: number; y: number }) {
  const value = <
    T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  >(
    selector: string,
    text: string,
  ) => {
    $<T>(selector).value = text;
  };
  value("#wb-point-id", row?.id || "");
  value("#wb-point-name", row?.name || "");
  value("#wb-point-kind", row?.kind || "Place");
  value("#wb-point-floor", String(row?.floor || floor));
  value("#wb-point-x", String(row?.x ?? coordinates?.x ?? ""));
  value("#wb-point-y", String(row?.y ?? coordinates?.y ?? ""));
  value("#wb-point-notes", row?.notes || "");
  $("#wb-custom-panel").setAttribute("open", "");
  $<HTMLInputElement>("#wb-point-name").focus();
}
function checked(selector: string) {
  return $<HTMLInputElement>(selector).checked;
}
for (const input of document.querySelectorAll<HTMLInputElement>(
  'input[name="wb-floor"]',
))
  input.onchange = () => setFloor(Number(input.value) as Floor);
for (const [selector, action] of [
  ["#wb-show-hub", (v: boolean) => (showHub = v)],
  ["#wb-show-cod", (v: boolean) => (showCod = v)],
  ["#wb-show-custom", (v: boolean) => (showCustom = v)],
] as const)
  $<HTMLInputElement>(selector).onchange = () => {
    action(checked(selector));
    render();
  };
$<HTMLInputElement>("#wb-search").oninput = (event) => {
  search = (event.target as HTMLInputElement).value.toLocaleLowerCase().trim();
  renderResults();
};
$<HTMLInputElement>("#wb-compare").onchange = () => {
  compare = checked("#wb-compare");
  $("#wb-maps").classList.toggle("compare", compare);
  setTimeout(() => {
    map.invalidateSize();
    codMap.invalidateSize();
    if (compare) codMap.fitBounds(codBounds);
  }, 10);
};
$("#wb-nearby-close").addEventListener("click", () => {
  $("#wb-nearby").hidden = true;
});
$("#wb-zoom-in").addEventListener("click", () => map.zoomIn());
$("#wb-zoom-out").addEventListener("click", () => map.zoomOut());
$("#wb-fit").addEventListener("click", () =>
  map.fitBounds(contentBounds(floor)),
);
$("#wb-add").addEventListener("click", () => fillPoint());
$("#wb-point-clear").addEventListener("click", () => fillPoint());
map.on("contextmenu", (event: L.LeafletMouseEvent) => {
  const p = { x: event.latlng.lng / 4096, y: 1 - event.latlng.lat / 4096 };
  if (p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)
    fillPoint(undefined, {
      x: Number(p.x.toFixed(6)),
      y: Number(p.y.toFixed(6)),
    });
});
$<HTMLFormElement>("#wb-point-form").onsubmit = async (event) => {
  event.preventDefault();
  try {
    const id =
        $<HTMLInputElement>("#wb-point-id").value ||
        `mine_${crypto.randomUUID().replaceAll("-", "")}`,
      previous = state.points.find((row) => row.id === id),
      row: PrivatePoint = {
        id,
        name: $<HTMLInputElement>("#wb-point-name").value.trim(),
        kind: $<HTMLInputElement>("#wb-point-kind").value.trim() || "Place",
        floor: Number($<HTMLSelectElement>("#wb-point-floor").value) as Floor,
        x: Number($<HTMLInputElement>("#wb-point-x").value),
        y: Number($<HTMLInputElement>("#wb-point-y").value),
        notes: $<HTMLTextAreaElement>("#wb-point-notes").value,
        createdAt: previous?.createdAt || new Date().toISOString(),
      };
    const file = $<HTMLInputElement>("#wb-point-photo").files?.[0];
    if (file) await validatePhoto(file);
    const photos = [
      ...state.photos.filter((photo) => photo.pointId !== id),
      ...(!file
        ? state.photos.filter((photo) => photo.pointId === id)
        : [
            {
              id: `photo_${crypto.randomUUID().replaceAll("-", "")}`,
              pointId: id,
              name: file.name,
              mime: file.type as "image/png" | "image/jpeg" | "image/webp",
              blob: file,
            },
          ]),
    ];
    if (
      await commit({
        ...state,
        points: [...state.points.filter((point) => point.id !== id), row],
        photos,
      })
    ) {
      selectedId = id;
      render();
    }
  } catch (error) {
    message(String(error), true);
  }
};
$("#wb-point-delete").addEventListener("click", async () => {
  const id = $<HTMLInputElement>("#wb-point-id").value;
  if (!id) return;
  if (
    await commit({
      ...state,
      points: state.points.filter((row) => row.id !== id),
      photos: state.photos.filter((row) => row.pointId !== id),
      routeIds: state.routeIds.filter((row) => row !== id),
      observations: state.observations.filter((row) => row.targetId !== id),
    })
  ) {
    selectedId = "";
    fillPoint();
    render();
  }
});
$("#wb-route-add").addEventListener("click", () => {
  if (!allStops().has(selectedId)) {
    message("Select a marker first.", true);
    return;
  }
  if (state.routeIds.includes(selectedId)) {
    message("Already in route.");
    return;
  }
  void commit({ ...state, routeIds: [...state.routeIds, selectedId] });
});
$("#wb-route-clear").addEventListener("click", () =>
  commit({ ...state, routeIds: [] }),
);
$<HTMLFormElement>("#wb-observe-form").onsubmit = (event) => {
  event.preventDefault();
  if (!allStops().has(selectedId)) {
    message("Select a marker first.", true);
    return;
  }
  void commit({
    ...state,
    observations: [
      ...state.observations,
      {
        id: `obs_${crypto.randomUUID().replaceAll("-", "")}`,
        targetId: selectedId,
        date: $<HTMLInputElement>("#wb-observe-date").value,
        build: $<HTMLInputElement>("#wb-observe-build").value.trim(),
        outcome: $<HTMLSelectElement>("#wb-observe-outcome").value as
          | "confirmed"
          | "absent"
          | "uncertain",
        notes: $<HTMLTextAreaElement>("#wb-observe-notes").value,
      },
    ],
  });
};
$<HTMLInputElement>("#wb-observe-date").value = new Date()
  .toISOString()
  .slice(0, 10);
async function jsonFile(selector: string, max: number) {
  const file = $<HTMLInputElement>(selector).files?.[0];
  if (!file) throw Error("Choose a JSON file.");
  if (file.size > max) throw Error("File is too large.");
  return JSON.parse(await file.text()) as unknown;
}
for (const selector of ["#wb-update-source", "#wb-update-file"])
  $(selector).addEventListener("change", () => {
    draftUpdate = null;
    $<HTMLButtonElement>("#wb-update-apply").disabled = true;
    $("#wb-update-preview").replaceChildren();
  });
$<HTMLInputElement>("#wb-import-file").addEventListener("change", () => {
  importDraft = null;
  $<HTMLButtonElement>("#wb-import-apply").disabled = true;
  $("#wb-import-preview").replaceChildren();
});
$("#wb-update-review").addEventListener("click", async () => {
  try {
    const source = $<HTMLSelectElement>("#wb-update-source").value as
        | "hub"
        | "cod",
      input = await jsonFile("#wb-update-file", 1_000_000);
    if (source === "hub") {
      const snapshot = validateHubSnapshot(input);
      for (const f of [1, 2] as const)
        if (!deriveAlignment(snapshot, cod, f).accepted)
          throw Error(`Floor ${f} calibration failed; update not applied.`);
      draftUpdate = {
        source,
        snapshot,
        changes: sourceDiff(
          hub.markers,
          snapshot.markers,
          (row) => row.title || `Marker #${row.sourceId}`,
        ),
      };
    } else {
      const snapshot = validateSnapshot(input);
      for (const f of [1, 2] as const)
        if (!deriveAlignment(hub, snapshot, f).accepted)
          throw Error(`Floor ${f} calibration failed; update not applied.`);
      draftUpdate = {
        source,
        snapshot,
        changes: sourceDiff(cod.markers, snapshot.markers, (row) => row.name),
      };
    }
    const preview = $("#wb-update-preview");
    preview.replaceChildren(
      node(
        "p",
        `${draftUpdate.changes.length} changes: ${draftUpdate.changes.filter((row) => row.kind === "added").length} added, ${draftUpdate.changes.filter((row) => row.kind === "removed").length} removed, ${draftUpdate.changes.filter((row) => row.kind === "moved").length} moved, ${draftUpdate.changes.filter((row) => row.kind === "floor").length} changed floor, ${draftUpdate.changes.filter((row) => row.kind === "renamed").length} renamed.`,
      ),
    );
    for (const row of draftUpdate.changes.slice(0, 100))
      preview.append(
        node("div", `${row.kind}: ${row.after || row.before || row.id}`),
      );
    $<HTMLButtonElement>("#wb-update-apply").disabled = false;
  } catch (error) {
    draftUpdate = null;
    $<HTMLButtonElement>("#wb-update-apply").disabled = true;
    message(String(error), true);
  }
});
$("#wb-update-apply").addEventListener("click", async () => {
  if (!draftUpdate) return;
  const changed = draftUpdate.changes.length > 0,
    next = {
      ...state,
      hubOverride:
        draftUpdate.source === "hub"
          ? (draftUpdate.snapshot as HubSnapshot)
          : state.hubOverride,
      codOverride:
        draftUpdate.source === "cod"
          ? (draftUpdate.snapshot as X01Snapshot)
          : state.codOverride,
      decisions: changed ? [] : state.decisions,
    };
  if (await commit(next)) {
    hub = state.hubOverride || validateHubSnapshot(hubRaw);
    cod = state.codOverride || validateSnapshot(codRaw);
    refreshAlignment();
    showImages();
    render();
    draftUpdate = null;
    $<HTMLButtonElement>("#wb-update-apply").disabled = true;
    message(
      changed
        ? "Source update applied locally. Duplicate reviews cleared for recheck."
        : "Source snapshot refreshed locally; duplicate reviews retained.",
    );
  }
});
$("#wb-export").addEventListener("click", async () => {
  try {
    const data = await makeBackup(state),
      blob = new Blob([JSON.stringify(data)], { type: "application/json" }),
      url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "x01-private-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    message(String(error), true);
  }
});
$("#wb-import-review").addEventListener("click", async () => {
  try {
    importDraft = await parseBackup(
      await jsonFile("#wb-import-file", 30_000_000),
    );
    $("#wb-import-preview").textContent =
      `Restore ${importDraft.points.length} POIs, ${importDraft.photos.length} photos, ${importDraft.observations.length} observations? This replaces this private workspace.`;
    $<HTMLButtonElement>("#wb-import-apply").disabled = false;
  } catch (error) {
    importDraft = null;
    $<HTMLButtonElement>("#wb-import-apply").disabled = true;
    message(String(error), true);
  }
});
$("#wb-import-apply").addEventListener("click", async () => {
  if (!importDraft) return;
  if (await commit({ ...importDraft, revision: state.revision })) {
    hub = state.hubOverride || validateHubSnapshot(hubRaw);
    cod = state.codOverride || validateSnapshot(codRaw);
    refreshAlignment();
    showImages();
    render();
    importDraft = null;
    $<HTMLButtonElement>("#wb-import-apply").disabled = true;
    message("Private workspace restored.");
  }
});
readPrivateState()
  .then((saved) => {
    state = saved;
    hub = saved.hubOverride || hub;
    cod = saved.codOverride || cod;
    refreshAlignment();
    showImages();
    render();
    if (selectedId) select(selectedId);
  })
  .catch((error) => {
    showImages();
    render();
    message(`Private storage unavailable: ${String(error)}`, true);
  });
loadSharedHajinIcons().then((icons) => {
  sharedIcons = icons;
  render();
});
