import L from "leaflet";
import type { ExplorerRecord } from "../workspace/explorer-index.ts";
const normalize = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
export function matchingItemAreas(
  name: string,
  records: readonly ExplorerRecord[],
  exact = true,
) {
  return records
    .filter(
      (record) =>
        (!exact || normalize(record.title) === normalize(name)) &&
        record.x !== null &&
        record.y !== null &&
        Number.isFinite(record.x) &&
        Number.isFinite(record.y) &&
        record.x >= 0 &&
        record.x <= 4096 &&
        record.y >= 0 &&
        record.y <= 4096,
    )
    .slice(0, 64);
}
/** Temporary reference rings only; no markers, source masks or workspace data are saved. */
export function mountItemAreaHighlight(
  map: L.Map,
  revealMap: () => void = () => {},
) {
  const pane =
    map.getPane("item-area-highlight") || map.createPane("item-area-highlight");
  pane.style.zIndex = "620";
  pane.style.pointerEvents = "none";
  const layer = L.layerGroup().addTo(map);
  let frame = 0;
  let signature = "",
    dismissed = false,
    control: L.Control | undefined,
    focusPending: (() => void) | undefined;
  const observer = new MutationObserver(() => {
    if (map.getContainer().getAttribute("aria-busy") === "false") {
      focusPending?.();
      focusPending = undefined;
    }
  });
  observer.observe(map.getContainer(), {
    attributes: true,
    attributeFilter: ["aria-busy"],
  });
  function clear() {
    cancelAnimationFrame(frame);
    layer.clearLayers();
    control?.remove();
    control = undefined;
    focusPending = undefined;
  }
  return {
    show(name: string, records: readonly ExplorerRecord[], exact = true) {
      if (!exact) dismissed = false;
      if (dismissed) return;
      const matches = matchingItemAreas(name, records, exact);
      const next = JSON.stringify([
        name,
        matches.map((record) => [record.key, record.x, record.y]),
      ]);
      if (next === signature) return;
      signature = next;
      clear();
      if (!matches.length) return;
      const points = matches.map((record) => L.latLng(record.y!, record.x!));
      for (const [index, point] of points.entries()) {
        const ring = L.circleMarker(point, {
          pane: "item-area-highlight",
          radius: 24,
          color: "#fff39a",
          weight: 4,
          fillColor: "#fff39a",
          fillOpacity: 0.18,
          interactive: false,
        }).addTo(layer);
        ring
          .getElement()
          ?.setAttribute("data-item-area-highlight", matches[index].key);
      }
      const focus = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (!layer.getLayers().length) return;
          revealMap();
          map.invalidateSize({ animate: false });
          map.fitBounds(L.latLngBounds(points), {
            padding: [50, 50],
            maxZoom: 3,
            animate: false,
          });
        });
      };
      if (map.getContainer().getAttribute("aria-busy") === "false") focus();
      else focusPending = focus;
      control = new L.Control({ position: "bottomleft" });
      control.onAdd = () => {
        const box = L.DomUtil.create("div", "key-grid-context");
        box.dataset.itemAreaHighlightNotice = "true";
        box.style.marginBottom =
          "calc(4.5rem + env(safe-area-inset-bottom, 0px))";
        box.setAttribute("role", "status");
        const title = document.createElement("strong");
        title.textContent = `${name} · highlighted`;
        const note = document.createElement("p");
        note.textContent =
          "Source location reference, not a confirmed item spawn.";
        const close = document.createElement("button");
        close.type = "button";
        close.style.minHeight = "44px";
        close.textContent = "Clear area highlight";
        close.addEventListener("click", () => {
          dismissed = true;
          clear();
          map.getContainer().focus();
        });
        box.append(title, note, close);
        L.DomEvent.disableClickPropagation(box);
        L.DomEvent.disableScrollPropagation(box);
        box.addEventListener("keydown", (event) => event.stopPropagation());
        return box;
      };
      control.addTo(map);
    },
    clear,
    destroy() {
      observer.disconnect();
      clear();
      layer.remove();
    },
  };
}
