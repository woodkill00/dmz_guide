import L from "leaflet";
import type { ToolTarget } from "../tool-links.ts";
export function mountFieldToolbar(
  map: L.Map,
  openTool: (target: ToolTarget) => Promise<void>,
) {
  const host = document.querySelector<HTMLElement>(".map-workspace")!,
    toolbar = document.createElement("div");
  toolbar.className = "field-toolbar";
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", "Map workflow tools");
  const status = document.createElement("p");
  status.className = "field-toolbar-status";
  status.setAttribute("role", "status");
  const button = (label: string, action: () => void) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", action);
    return b;
  };
  const run = (target: ToolTarget) => {
    void openTool(target).catch(
      (e) =>
        (status.textContent =
          e instanceof Error
            ? e.message
            : "Tool unavailable; keep your draft and retry."),
    );
  };
  toolbar.append(
    button("Search", () => run("explore")),
    button("Layers", () =>
      document.querySelector<HTMLButtonElement>("#layers")?.click(),
    ),
    button("Routes", () => run("routes")),
    button("Trackers", () => run("boss-checklist")),
  );
  const safeRun = document.createElement("a");
  safeRun.className = "field-tool-link";
  safeRun.href = "/safes.html";
  safeRun.target = "_blank";
  safeRun.rel = "noopener noreferrer";
  safeRun.textContent = "Safe Run map";
  safeRun.setAttribute("aria-label", "Safe Run map (opens in a new tab)");
  toolbar.append(safeRun);
  const lootRun = document.createElement("a");
  lootRun.className = "field-tool-link";
  lootRun.href = "/loot.html";
  lootRun.target = "_blank";
  lootRun.rel = "noopener noreferrer";
  lootRun.textContent = "Loot Run map";
  lootRun.setAttribute("aria-label", "Loot Run map (opens in a new tab)");
  toolbar.append(lootRun);
  const advanced = document.createElement("details"),
    summary = document.createElement("summary");
  summary.textContent = "Advanced";
  advanced.append(
    summary,
    button("Update impacts", () => run("update-impacts")),
    button("Source review", () => run("review")),
    button("Backups", () => run("backups")),
    button("Reset panel layout", () => {
      document.dispatchEvent(new Event("map-menu-reset"));
      collapsed = false;
      width = 380;
      height = 300;
      persist();
      paint();
      status.textContent =
        "Display layout reset. Map records and progress unchanged.";
    }),
  );
  const selectionButton = button("Selected details", () => {
    setPanelOpen(panel.hidden);
  });
  selectionButton.hidden = true;
  selectionButton.setAttribute("aria-expanded", "false");
  toolbar.append(advanced, selectionButton, status);
  advanced.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      advanced.open = false;
      summary.focus();
    }
  });
  host.append(toolbar);
  let collapsed = true,
    width = 380,
    height = 300,
    selected: Element | undefined,
    active: L.Popup | undefined,
    disposed = false;
  try {
    const raw = localStorage.getItem("hajin-selection-layout-v1");
    if (raw && raw.length < 1024) {
      const p = JSON.parse(raw);
      if (
        typeof p.collapsed === "boolean" &&
        Number.isFinite(p.width) &&
        p.width >= 320 &&
        p.width <= 600 &&
        Number.isFinite(p.height) &&
        p.height >= 160 &&
        p.height <= 700
      ) {
        collapsed = p.collapsed;
        width = p.width;
        height = p.height;
      }
    }
  } catch {}
  const panel = document.createElement("section");
  panel.className = "map-selection-inspector";
  setPanelOpen(false);
  panel.setAttribute("aria-label", "Selected location inspector");
  const heading = document.createElement("h2"),
    body = document.createElement("p"),
    note = document.createElement("p");
  heading.textContent = "Selected location";
  note.textContent =
    "Read-only selection summary. Use the marker popup for actions.";
  const collapse = button("Minimize", () => {
      collapsed = !collapsed;
      persist();
      paint();
    }),
    close = button("Close summary", () => {
      setPanelOpen(false);
      document.querySelector<HTMLElement>("#map")?.focus();
    }),
    actions = button("Go to marker actions", () => {
      const el = active?.getElement();
      el?.querySelector<HTMLElement>("button,a,input")?.focus();
      el?.scrollIntoView({ block: "nearest" });
    });
  const size = document.createElement("details"),
    sizeLabel = document.createElement("summary");
  sizeLabel.textContent = "Panel size";
  size.append(sizeLabel);
  for (const [axis, label, min, max] of [
    ["width", "Width", 320, 600],
    ["height", "Height", 160, 700],
  ] as const) {
    const l = document.createElement("label"),
      r = document.createElement("input");
    l.textContent = label;
    r.type = "range";
    r.min = String(min);
    r.max = String(max);
    r.value = String(axis === "width" ? width : height);
    r.setAttribute("aria-label", "Selection panel " + label.toLowerCase());
    r.addEventListener("input", () => {
      if (axis === "width") width = Number(r.value);
      else height = Number(r.value);
      persist();
      paint();
    });
    l.append(r);
    size.append(l);
  }
  panel.append(heading, collapse, close, body, note, actions, size);
  host.append(panel);
  function setPanelOpen(open: boolean) {
    panel.hidden = !open;
    selectionButton.setAttribute("aria-expanded", String(open));
  }
  function persist() {
    try {
      localStorage.setItem(
        "hajin-selection-layout-v1",
        JSON.stringify({ collapsed, width, height }),
      );
    } catch {
      status.textContent =
        "Panel layout works for this session; storage unavailable.";
    }
  }
  function paint() {
    panel.style.setProperty("--selection-width", width + "px");
    panel.style.setProperty("--selection-height", height + "px");
    body.hidden = collapsed;
    note.hidden = collapsed;
    actions.hidden = collapsed;
    size.hidden = collapsed;
    collapse.textContent = collapsed ? "Expand" : "Minimize";
    collapse.setAttribute("aria-expanded", String(!collapsed));
  }
  paint();
  function clear() {
    selected?.classList.remove("map-marker-selected");
    selected = undefined;
    active = undefined;
    setPanelOpen(false);
    selectionButton.hidden = true;
    selectionButton.setAttribute("aria-expanded", "false");
    body.textContent = "";
  }
  function opened(event: L.PopupEvent) {
    if (document.documentElement.dataset.uiVariant === "modern") return;
    clear();
    active = event.popup;
    const el = event.popup.getElement();
    if (!el) return;
    const content = el
      .querySelector(".leaflet-popup-content")
      ?.cloneNode(true) as HTMLElement | undefined;
    if (!content) return;
    content
      .querySelectorAll(
        "button,input,select,textarea,script,style,iframe,svg,[hidden]",
      )
      .forEach((n) => n.remove());
    content
      .querySelectorAll("h2,h3,h4,p,div,li,dt,dd,summary")
      .forEach((node) => node.append(document.createTextNode("\n")));
    body.textContent = (content.textContent || "").trim().slice(0, 6000);
    heading.textContent = (
      content.querySelector("h2,h3,strong")?.textContent || "Selected location"
    ).slice(0, 200);
    const source = (
      event.popup as L.Popup & {
        _source?: L.Layer & { getElement?: () => Element };
      }
    )._source;
    selected = source?.getElement?.();
    selected?.classList.add("map-marker-selected");
    selectionButton.hidden = false;
    setPanelOpen(false);
    paint();
  }
  const closed = (event: L.PopupEvent) => {
    if (event.popup === active) clear();
  };
  map.on("popupopen", opened);
  map.on("popupclose", closed);
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setPanelOpen(false);
      document.querySelector<HTMLElement>("#map")?.focus();
    }
  });
  L.DomEvent.disableClickPropagation(toolbar);
  L.DomEvent.disableScrollPropagation(toolbar);
  L.DomEvent.disableClickPropagation(panel);
  L.DomEvent.disableScrollPropagation(panel);
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    clear();
    map.off("popupopen", opened);
    map.off("popupclose", closed);
    toolbar.remove();
    panel.remove();
  };
  map.once("unload", cleanup);
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) cleanup();
  });
  return cleanup;
}
