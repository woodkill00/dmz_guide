import { $, esc, state, init, error } from "./common.mjs";
import { readRecord } from "../storage/store.mjs";
import {
  projectLocation,
  placementReason,
  filterLocations,
  floorOf,
  unmetItemIds,
  safePlanText,
  effectiveScope,
} from "../domain/locations.mjs";
const NS = "http://www.w3.org/2000/svg";
let filters = {},
  selectedId = "",
  camera = { x: 0, y: 0, size: 100 },
  needed = [],
  goalMessage = "",
  generation = 0,
  assetURL = null,
  pendingDecode = null;
const svg = (tag, attributes = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attributes))
    node.setAttribute(k, String(v));
  return node;
};
const option = (value, label) =>
  `<option value="${esc(value)}">${esc(label)}</option>`;
const currentMap = () => state.pack.maps.find((m) => m.id === filters.mapId);
function releaseImage() {
  pendingDecode?.cancel();
  if (assetURL) {
    URL.revokeObjectURL(assetURL);
    assetURL = null;
  }
}
function decodeLocalImage(url, timeout) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (pendingDecode === job) pendingDecode = null;
      if (err) {
        image.removeAttribute("src");
        URL.revokeObjectURL(url);
        reject(err);
      } else resolve(image);
    };
    const job = { cancel: () => finish(new Error("Map image load cancelled")) };
    pendingDecode = job;
    const timer = setTimeout(
      () => finish(new Error("Map image decode timed out")),
      timeout,
    );
    image.src = url;
    image.decode().then(
      () => finish(),
      (e) => finish(e),
    );
  });
}
function resetCamera() {
  camera = { x: 0, y: 0, size: 100 };
  updateCamera();
}
function updateCamera() {
  const n = $("#location-map");
  n.setAttribute(
    "viewBox",
    `${camera.x} ${camera.y} ${camera.size} ${camera.size}`,
  );
  $("#camera-status").textContent =
    `Zoom ${(100 / camera.size).toFixed(1)}× · camera ${camera.x.toFixed(0)}, ${camera.y.toFixed(0)}`;
}
function moveCamera(action) {
  const step = camera.size / 5;
  if (action === "reset") return resetCamera();
  if (action === "in" || action === "out") {
    const size = Math.max(
      20,
      Math.min(100, camera.size * (action === "in" ? 0.8 : 1.25)),
    );
    camera.x += (camera.size - size) / 2;
    camera.y += (camera.size - size) / 2;
    camera.size = size;
  } else if (action === "left") camera.x -= step;
  else if (action === "right") camera.x += step;
  else if (action === "up") camera.y -= step;
  else if (action === "down") camera.y += step;
  camera.x = Math.max(0, Math.min(100 - camera.size, camera.x));
  camera.y = Math.max(0, Math.min(100 - camera.size, camera.y));
  updateCamera();
}
function sources(ids) {
  return ids
    .map((id) => {
      const s = state.pack.sources.find((s) => s.id === id);
      if (!s) return `<li>Unknown source ${esc(id)}</li>`;
      let href = "";
      try {
        const u = new URL(s.url);
        if (["https:", "http:"].includes(u.protocol)) href = u.href;
      } catch {}
      return `<li>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>` : esc(s.title)} · reviewed ${esc(s.reviewedAt || "unknown")} · ${esc(s.supports || "Scope unknown")}</li>`;
    })
    .join("");
}
function showDetail() {
  const l = state.pack.locations.find((l) => l.id === selectedId);
  if (!l) {
    $("#location-detail").innerHTML =
      "<h2>Location details</h2><p>Select a location from the list or map.</p>";
    return;
  }
  const m = state.pack.maps.find((m) => m.id === l.mapId);
  const items = l.itemIds.map(
    (id) => state.pack.items.find((i) => i.id === id)?.name || id,
  );
  $("#location-detail").innerHTML =
    `<h2>${esc(l.name)}</h2><p>${esc(l.description)}</p><dl><dt>Floor / grid</dt><dd>${esc(floorOf(l))} / ${esc(l.grid || "unknown")}</dd><dt>Coordinates</dt><dd>${l.coordinates ? esc(`${l.coordinates.x}, ${l.coordinates.y}`) : "Unknown"} ${esc(placementReason(m, l))}</dd><dt>Landmark directions</dt><dd>${esc(l.description || "Unknown")}</dd><dt>Category / evidence status</dt><dd>${esc(l.category || "uncategorized")} / ${esc(l.status)}</dd><dt>Spawn classification</dt><dd>${esc(l.spawnKind)}. Not a guarantee of availability.</dd><dt>Declared item relations</dt><dd>${esc(items.join(", ") || "No verified item relation")}</dd><dt>Build / content / coordinate version</dt><dd>${esc(effectiveScope(state.pack, l))} / ${esc(state.pack.contentVersion)} / ${esc(m?.coordinateVersion || "unknown")}</dd></dl><h3>Sources</h3><ul>${sources(l.sourceIds)}</ul>`;
}
function selectLocation(id, focus = false) {
  selectedId = id;
  for (const n of document.querySelectorAll("[data-location-id]"))
    n.setAttribute("aria-pressed", String(n.dataset.locationId === id));
  showDetail();
  if (focus) $("#location-detail").focus();
}
function renderResults() {
  const map = currentMap(),
    records = filterLocations(state.pack, filters, needed);
  if (!records.some((l) => l.id === selectedId)) selectedId = "";
  const markers = $("#map-markers");
  markers.replaceChildren();
  let plotted = 0;
  $("#location-list").innerHTML = records
    .map((l, index) => {
      const point = projectLocation(map, l);
      if (point) {
        plotted++;
        const g = svg("g", {
          tabindex: "0",
          role: "button",
          "aria-label": `Select ${l.name}`,
          "aria-pressed": String(selectedId === l.id),
          "data-location-id": l.id,
          transform: `translate(${point.x} ${point.y})`,
        });
        g.append(
          svg("circle", {
            r: 3.3,
            fill: "#c8ee96",
            stroke: "#172016",
            "stroke-width": 0.8,
          }),
        );
        const text = svg("text", {
          "text-anchor": "middle",
          "dominant-baseline": "central",
          "font-size": 3.5,
          fill: "#172016",
          "pointer-events": "none",
        });
        text.textContent = String(index + 1);
        g.append(text);
        g.addEventListener("click", () => selectLocation(l.id));
        g.addEventListener("keydown", (e) => {
          if (["Enter", " "].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            selectLocation(l.id, true);
          }
        });
        markers.append(g);
      }
      return `<li><button type="button" data-location-id="${esc(l.id)}" aria-pressed="${selectedId === l.id}">${index + 1}. ${esc(l.name)}</button><p>Floor ${esc(floorOf(l))} · Grid ${esc(l.grid || "unknown")} · ${esc(l.spawnKind)} spawn · ${esc(l.status)}${point ? "" : ` · ${esc(placementReason(map, l))}`}</p></li>`;
    })
    .join("");
  $("#location-list")
    .querySelectorAll("button")
    .forEach((b) =>
      b.addEventListener("click", () => selectLocation(b.dataset.locationId)),
    );
  $("#location-count").textContent =
    `${records.length} matching location${records.length === 1 ? "" : "s"} · ${plotted} plotted · ${records.length - plotted} list only.${records.length ? "" : " No matches. Clear filters or choose another map."}`;
  $("#goal-context").textContent =
    goalMessage +
    (filters.goalOnly && !records.length
      ? " No verified location relation matches these unmet needs."
      : "");
  showDetail();
}
function renderMapContext() {
  const m = currentMap();
  $("#map-context").textContent = m
    ? `${m.name} · build ${effectiveScope(state.pack, m)} · content ${state.pack.contentVersion} · coordinate ${m.coordinateVersion} · ${m.coordinateSpace} · origin ${m.origin || "unknown"} · axes ${m.axis || "unknown"} · bounds ${m.extent?.join(", ") || "unknown"}`
    : "No maps in this pack. Choose another pack.";
}
function schematic(map) {
  const g = $("#map-background");
  g.replaceChildren();
  g.append(
    svg("rect", { x: 0, y: 0, width: 100, height: 100, fill: "#17251e" }),
  );
  if (
    map?.id === "demo:training-map" &&
    state.pack.game.id === "fictional-training"
  ) {
    for (let n = 0; n <= 100; n += 10) {
      g.append(
        svg("path", {
          d: `M ${n} 0 V 100 M 0 ${n} H 100`,
          stroke: "#52684f",
          "stroke-width": 0.3,
        }),
      );
    }
    for (const [x, y, w, h] of [
      [12, 22, 18, 18],
      [60, 50, 22, 22],
      [40, 10, 20, 20],
    ])
      g.append(
        svg("rect", {
          x,
          y,
          width: w,
          height: h,
          fill: "#344b3b",
          stroke: "#8da57b",
          "stroke-width": 0.5,
        }),
      );
    $("#imagery-status").textContent =
      "FICTIONAL ORIGINAL SCHEMATIC — NOT A GAME MAP. Training coordinates only.";
  } else
    $("#imagery-status").textContent =
      "No map imagery available. Coordinate markers, if calibrated, and the complete list remain usable.";
}
async function loadImage(token) {
  const map = currentMap();
  releaseImage();
  schematic(map);
  if (!map?.assetId) return;
  $("#imagery-status").textContent = "Loading validated local map image…";
  try {
    const record = await readRecord("content", state.pack.id);
    if (token !== generation) return;
    const asset = state.pack.assets.find((a) => a.id === map.assetId),
      payload = record?.value?.payloads?.find((p) => p.assetId === map.assetId);
    if (!asset || !payload)
      throw new Error("Local validated raster payload unavailable");
    const { bytesFromBase64, imageInfo, hashBytes, TRANSFER_LIMITS } =
      await import("../content/portable.mjs");
    if (token !== generation) return;
    const bytes = bytesFromBase64(payload.base64),
      info = imageInfo(bytes);
    if (
      info.mime !== asset.mime ||
      info.width !== asset.width ||
      info.height !== asset.height ||
      bytes.length !== asset.bytes ||
      (await hashBytes(bytes)) !== asset.sha256
    )
      throw new Error("Local raster metadata or integrity mismatch");
    if (token !== generation) return;
    const url = URL.createObjectURL(new Blob([bytes], { type: asset.mime }));
    try {
      const image = await decodeLocalImage(url, TRANSFER_LIMITS.decodeMs);
      if (
        image.naturalWidth !== info.width ||
        image.naturalHeight !== info.height
      )
        throw new Error("Decoded image dimensions mismatch");
      if (token !== generation) {
        URL.revokeObjectURL(url);
        return;
      }
      assetURL = url;
      const node = svg("image", {
        href: url,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        preserveAspectRatio: "none",
      });
      node.addEventListener("error", () => {
        if (token === generation) {
          releaseImage();
          schematic(map);
          $("#imagery-status").textContent =
            "Image unavailable. Complete list and details remain usable.";
        }
      });
      $("#map-background").replaceChildren(node);
      $("#imagery-status").textContent =
        `Local owner image · ${asset.name || asset.id}. Bounds and coordinate version shown above; imagery does not verify game facts.`;
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  } catch (e) {
    if (token === generation) {
      schematic(map);
      $("#imagery-status").textContent =
        `Image unavailable: ${e.message}. Complete list and details remain usable.`;
    }
  }
}
async function loadNeeds(token) {
  needed = [];
  goalMessage =
    "No active goal. Add one in the planner to see declared item relations.";
  renderResults();
  if (!state.profile.goals.length) return;
  try {
    const { planShared } = await import("../domain/shared-plan.mjs");
    if (token !== generation) return;
    const plan = planShared(state.pack, state.profile);
    needed = unmetItemIds(state.pack, plan);
    const reasons = [
      ...new Set((plan.goals || []).flatMap((g) => g.reasons || [])),
    ];
    goalMessage = needed.length
      ? `${needed.length} unmet item or retained-tool needs. Only declared item relations are shown; spawns remain uncertain.`
      : "No unmet non-currency needs in this plan. No verified location recommendation.";
    if (reasons.length)
      goalMessage += ` Plan limitations: ${safePlanText(state.pack, state.profile, reasons.join("; "))}`;
  } catch (e) {
    if (token !== generation) return;
    goalMessage = `Goal context unavailable: ${safePlanText(state.pack, state.profile, e.message)}. Check the planner or rebind content in Settings; no recommendations inferred.`;
  }
  if (token === generation) renderResults();
}
function mapChanged() {
  generation++;
  selectedId = "";
  filters.floor = "";
  const m = currentMap();
  $("#floor-select").innerHTML =
    option("", "All floors") +
    [
      ...new Set([
        ...(m?.floors || []),
        ...state.pack.locations.filter((l) => l.mapId === m?.id).map(floorOf),
      ]),
    ]
      .map((f) => option(f, f))
      .join("");
  resetCamera();
  renderMapContext();
  renderResults();
  loadImage(generation);
  loadNeeds(generation);
}
function packChanged() {
  generation++;
  releaseImage();
  filters = {
    mapId: state.pack.maps[0]?.id || "",
    floor: "",
    category: "",
    query: "",
    sourceId: "",
    coordinateVersion: "",
    goalOnly: false,
  };
  selectedId = "";
  needed = [];
  $("#map-select").innerHTML = state.pack.maps
    .map((m) => option(m.id, m.name))
    .join("");
  $("#location-category").innerHTML =
    option("", "All categories") +
    [...new Set(state.pack.locations.map((l) => l.category || "uncategorized"))]
      .map((c) => option(c, c))
      .join("");
  $("#location-source").innerHTML =
    option("", "All sources") +
    state.pack.sources.map((s) => option(s.id, s.title)).join("");
  $("#coordinate-version").innerHTML =
    option("", "All coordinate versions") +
    [...new Set(state.pack.maps.map((m) => m.coordinateVersion))]
      .map((v) => option(v, v))
      .join("");
  $("#location-search").value = "";
  $("#goal-locations").checked = false;
  mapChanged();
}
$("#map-select").addEventListener("change", (e) => {
  filters.mapId = e.target.value;
  mapChanged();
});
for (const [id, key] of [
  ["floor-select", "floor"],
  ["location-category", "category"],
  ["location-source", "sourceId"],
  ["coordinate-version", "coordinateVersion"],
])
  $("#" + id).addEventListener("change", (e) => {
    filters[key] = e.target.value;
    if (key === "floor") {
      selectedId = "";
      resetCamera();
    }
    renderResults();
  });
$("#location-search").addEventListener("input", (e) => {
  filters.query = e.target.value;
  renderResults();
});
$("#goal-locations").addEventListener("change", (e) => {
  filters.goalOnly = e.target.checked;
  renderResults();
});
for (const b of document.querySelectorAll("[data-camera]"))
  b.addEventListener("click", () => moveCamera(b.dataset.camera));
$("#location-map").addEventListener("keydown", (e) => {
  const action = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    "+": "in",
    "=": "in",
    "-": "out",
    Home: "reset",
  }[e.key];
  if (action) {
    e.preventDefault();
    moveCamera(action);
  }
});
document.addEventListener("pack-changing", () => {
  generation++;
  releaseImage();
});
window.addEventListener("pagehide", () => {
  generation++;
  releaseImage();
});
init(packChanged).catch(error);
