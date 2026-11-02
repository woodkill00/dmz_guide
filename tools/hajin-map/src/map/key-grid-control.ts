import L from "leaflet";
import { parseKeyGridTarget, keyGridCorners } from "./key-grid-link.ts";
export function keyGridFocus(map: L.Map, supported: boolean, search: string) {
  const target = parseKeyGridTarget(search);
  let applied = false,
    disposed = false,
    frame = 0;
  let polygon: L.Polygon | undefined, control: L.Control | undefined;
  const cleanup = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    polygon?.remove();
    control?.remove();
  };
  window.addEventListener("pagehide", cleanup, { once: true });
  map.once("unload", cleanup);
  return () => {
    if (applied || disposed || !supported || !target) return;
    applied = true;
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (disposed) return;
        const corners = keyGridCorners(target.reference).map((p) =>
          L.latLng(p.y, p.x),
        );
        polygon = L.polygon(corners, {
          color: "#f4ca72",
          weight: 3,
          fillColor: "#f4ca72",
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map);
        map.fitBounds(L.latLngBounds(corners), {
          padding: [35, 35],
          animate: false,
          maxZoom: 3,
        });
        const widget = new L.Control({ position: "topright" });
        control = widget;
        widget.onAdd = () => {
          const box = L.DomUtil.create("div", "key-grid-context");
          box.setAttribute("role", "status");
          const heading = document.createElement("strong");
          heading.textContent = `${target.name} · grid ${target.reference}`;
          const note = document.createElement("p");
          note.textContent =
            "Reported grid area only. Door position is not verified.";
          const close = document.createElement("button");
          close.type = "button";
          close.textContent = "Dismiss key area";
          close.addEventListener("click", () => {
            polygon?.remove();
            control?.remove();
            document.querySelector<HTMLElement>("#map")?.focus();
          });
          box.append(heading, note, close);
          L.DomEvent.disableClickPropagation(box);
          L.DomEvent.disableScrollPropagation(box);
          box.addEventListener("keydown", (event) => event.stopPropagation());
          return box;
        };
        widget.addTo(map);
        document.querySelector<HTMLElement>("#map")!.dataset.keyGridTarget =
          target.reference;
      });
    });
  };
}
