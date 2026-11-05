import type { Map as LeafletMap, PopupEvent } from "leaflet";

/** Opt-in local evidence only: no storage export, persistence or report requests. */
export function mountSelectionDiagnostics(map: LeafletMap) {
  if (new URLSearchParams(location.search).get("debug-selection") !== "1")
    return () => {};
  const events: { at: number; type: string; value: unknown }[] = [];
  const start = performance.now();
  let frame = 0,
    disposed = false,
    last = "";
  const record = (type: string, value: unknown) => {
    events.push({ at: Math.round(performance.now() - start), type, value });
    if (events.length > 160) events.shift();
  };
  const rect = (n: Element | null) => {
    if (!n) return null;
    const r = n.getBoundingClientRect(),
      s = getComputedStyle(n);
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height),
      display: s.display,
      visibility: s.visibility,
      opacity: s.opacity,
      hidden: n instanceof HTMLElement ? n.hidden : false,
    };
  };
  const snapshot = () => ({
    layout: document.documentElement.dataset.mapLayout,
    space: document.documentElement.dataset.mapSpace,
    variant: document.documentElement.dataset.uiVariant,
    task: rect(document.querySelector("#ui-map-task")),
    detail: rect(document.querySelector("#ui-selection-detail")),
    heading: rect(
      document.querySelector("#ui-selection-detail .marker-popup-title"),
    ),
    dialogOpen:
      document.querySelector<HTMLDialogElement>("#workspace-dialog")?.open,
    sourcePopups: document.querySelectorAll(".ui-map-selection-source").length,
  });
  const sample = () => {
    if (disposed) return;
    const state = snapshot(),
      key = JSON.stringify(state);
    if (key !== last) {
      last = key;
      record("presentation", state);
    }
    frame = requestAnimationFrame(sample);
  };
  const popup = (e: PopupEvent) =>
    record(e.type, {
      stack: new Error().stack
        ?.split("\n")
        .slice(1, 12)
        .join("\n")
        .slice(0, 2400),
      connected: !!e.popup.getElement()?.isConnected,
    });
  const clicked = (e: Event) => {
    const marker = (e.target as Element)?.closest?.(
      "[data-source-marker-id],.leaflet-marker-icon",
    );
    if (marker)
      record("marker-click", {
        source: marker.getAttribute("data-source-id"),
        id: marker.getAttribute("data-source-marker-id"),
        className: marker.className,
      });
  };
  const source = () => record("source-status", null);
  const failed = (e: ErrorEvent) =>
    record("error", { message: e.message.slice(0, 1200) });
  const button = document.createElement("button");
  button.id = "map-copy-diagnostic";
  button.type = "button";
  button.textContent = "Map diagnostic";
  button.style.cssText =
    "position:fixed;bottom:8px;right:8px;z-index:20000;padding:8px 12px;font:14px sans-serif;color:#fff;background:#24352b;border:1px solid #aabb7d;border-radius:4px";
  const dialog = document.createElement("dialog"),
    label = document.createElement("label"),
    area = document.createElement("textarea"),
    close = document.createElement("button");
  dialog.id = "map-diagnostic-report";
  dialog.style.cssText =
    "width:min(680px,calc(100vw - 32px));max-height:calc(100dvh - 32px)";
  label.textContent = "Local map diagnostic — copy this text into chat";
  area.id = "map-diagnostic-text";
  label.htmlFor = area.id;
  area.readOnly = true;
  area.style.cssText =
    "display:block;width:100%;height:min(420px,60dvh);box-sizing:border-box";
  close.textContent = "Close";
  close.type = "button";
  close.onclick = () => dialog.close();
  dialog.append(label, area, close);
  button.onclick = () => {
    area.value = JSON.stringify(
      {
        kind: "local-map-selection-diagnostic",
        page: { origin: location.origin, pathname: location.pathname },
        viewport: {
          width: innerWidth,
          height: innerHeight,
          dpr: devicePixelRatio,
          visualWidth: visualViewport?.width,
          visualHeight: visualViewport?.height,
          scale: visualViewport?.scale,
        },
        current: snapshot(),
        events,
      },
      null,
      2,
    );
    dialog.showModal();
    area.focus();
    area.select();
  };
  document.body.append(button, dialog);
  map.on("popupopen popupclose", popup);
  document.addEventListener("click", clicked, true);
  document.addEventListener("map-source-status", source);
  window.addEventListener("error", failed);
  sample();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    map.off("popupopen popupclose", popup);
    document.removeEventListener("click", clicked, true);
    document.removeEventListener("map-source-status", source);
    window.removeEventListener("error", failed);
    button.remove();
    dialog.remove();
  };
}
