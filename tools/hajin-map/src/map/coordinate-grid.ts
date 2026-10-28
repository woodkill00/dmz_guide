import L from "leaflet";
import { gridGeometry, tacticalGrid } from "./tactical-grid.ts";
import { hajin } from "./hajin.ts";
const preferenceKey = "hajin-coordinate-grid-v1";
export function createCoordinateGrid(map: L.Map, bounds: L.LatLngBounds) {
  const supported =
    hajin.coordinateSpaceVersion === tacticalGrid.canonicalVersion &&
    hajin.provenance.sha256 === tacticalGrid.canonicalDigest &&
    hajin.width === 4096 &&
    hajin.height === 4096;
  const pane = map.createPane("hajin-coordinate-grid");
  pane.style.zIndex = "350";
  pane.style.pointerEvents = "none";
  pane.setAttribute("aria-hidden", "true");
  const ns = "http://www.w3.org/2000/svg",
    svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 4096 4096");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("hajin-coordinate-grid");
  const geometry = gridGeometry();
  for (const [a, b] of geometry.lines) {
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", String(a.x));
    line.setAttribute("y1", String(a.y));
    line.setAttribute("x2", String(b.x));
    line.setAttribute("y2", String(b.y));
    line.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(line);
  }
  const labels = geometry.cells.map((cell) => {
    const text = document.createElementNS(ns, "text");
    text.classList.add("coordinate-grid-cell");
    text.dataset.grid = cell.reference;
    text.textContent = cell.reference;
    svg.append(text);
    return { text, cell };
  });
  const layer = L.svgOverlay(svg, bounds, {
    pane: "hajin-coordinate-grid",
    interactive: false,
  });
  let visible = true;
  try {
    visible = localStorage.getItem(preferenceKey) !== "0";
  } catch {
    /* Advisory preference; default on. */
  }
  function typography() {
    const scale = Math.abs(map.project([0, 1]).x - map.project([0, 0]).x);
    if (!Number.isFinite(scale) || scale <= 0) return;
    for (const { text, cell } of labels) {
      text.setAttribute("font-size", String(11 / scale));
      text.style.strokeWidth = String(2 / scale) + "px";
      text.setAttribute("x", String(cell.corner.x + 3 / scale));
      text.setAttribute("y", String(cell.corner.y + 3 / scale));
    }
  }
  function display() {
    if (visible && supported) {
      layer.addTo(map);
      svg.classList.remove("leaflet-image-layer");
      typography();
    } else layer.remove();
  }
  map.on("zoomend", typography);
  display();
  return {
    supported,
    isVisible: () => visible && supported,
    setVisible(value: boolean) {
      visible = value;
      display();
      try {
        localStorage.setItem(preferenceKey, value ? "1" : "0");
      } catch {
        /* View remains usable without persistence. */
      }
    },
    destroy() {
      map.off("zoomend", typography);
      layer.remove();
      pane.remove();
    },
  };
}
