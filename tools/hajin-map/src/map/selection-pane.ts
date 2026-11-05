import type { Map as LeafletMap, Popup, PopupEvent } from "leaflet";

export interface SelectionPaneIntent {
  id: string;
  label: string;
  run: () => void;
  revalidate: () => boolean;
  cancel?: () => void;
}
export type SelectionCloseReason =
  | "back"
  | "popup-close"
  | "source-update"
  | "replace"
  | "dispose";
export interface SelectionPaneOptions {
  request: (intent: SelectionPaneIntent) => unknown;
  canInspect: () => boolean;
  /** Move this original node. Call cleanup when the owner leaves this detail. */
  showDetail: (
    node: HTMLElement,
    onBackCleanup: () => void,
  ) => void | (() => void);
  getOrigin?: (popup: Popup) => HTMLElement | null;
  selectionIdentity?: (popup: Popup) => string;
  onClose?: (reason: SelectionCloseReason) => void;
  onError?: (error: unknown) => void;
}
interface Frame {
  popup: Popup;
  raw: ReturnType<Popup["getContent"]>;
  identityMatches: () => boolean;
  node: HTMLElement;
  parent: Node;
  next: ChildNode | null;
  chrome: HTMLElement;
  marked: boolean;
  origin: HTMLElement | null;
  paneParent: Node | null;
  paneNext: ChildNode | null;
  lastFocus: HTMLElement | null;
  release?: () => void;
  contentChanged: () => void;
  focusChanged: (event: FocusEvent) => void;
}
const sourceClass = "ui-map-selection-source";
const pendingClass = "ui-map-selection-pending";
interface PendingPopup {
  popup: Popup;
  chrome: HTMLElement;
  marked: boolean;
}

// Leaflet already evaluated a function on open. Read that exact DOM result;
// evaluating the factory here would duplicate actions and lose its identity.
function renderedContent(
  popup: Popup,
  raw = popup.getContent(),
): HTMLElement | null {
  if (raw instanceof HTMLElement) return raw;
  if (typeof raw !== "function") return null;
  const parent = popup.getElement()?.querySelector(".leaflet-popup-content");
  return parent?.childNodes.length === 1 &&
    parent.firstChild instanceof HTMLElement
    ? parent.firstChild
    : null;
}
function retainsSource(frame: Frame) {
  if (!frame.identityMatches() || frame.popup.getContent() !== frame.raw)
    return false;
  if (typeof frame.raw !== "function") return frame.raw === frame.node;
  const parent = frame.popup
    .getElement()
    ?.querySelector(".leaflet-popup-content");
  return (
    !!parent &&
    (!parent.childNodes.length ||
      renderedContent(frame.popup, frame.raw) === frame.node)
  );
}

/** One read-only selection frame. Domain nodes/actions and the camera remain owner controlled. */
export function mountSelectionPane(
  map: LeafletMap,
  options: SelectionPaneOptions,
) {
  const doc = map.getContainer().ownerDocument;
  if (doc.documentElement.dataset.uiVariant !== "modern") return () => {};
  let active: Frame | null = null,
    disposed = false,
    identity = 0;
  const pending = new WeakMap<Popup, PendingPopup>();
  const clearPending = (entry: PendingPopup, close = false) => {
    if (pending.get(entry.popup) !== entry) return;
    pending.delete(entry.popup);
    if (!entry.marked) entry.chrome.classList.remove(pendingClass);
    if (close && map.hasLayer(entry.popup)) map.closePopup(entry.popup);
  };

  const report = (error: unknown) => options.onError?.(error);
  const allowed = () => {
    try {
      return options.canInspect() === true;
    } catch (error) {
      report(error);
      return false;
    }
  };
  const finish = (
    frame: Frame,
    reason: SelectionCloseReason,
    fromOwner = false,
  ) => {
    if (active !== frame) return;
    // Clear ownership before any callback: host release can synchronously call cleanup.
    active = null;
    frame.popup.off("contentupdate", frame.contentChanged);
    frame.node.removeEventListener("focusin", frame.focusChanged);
    if (!fromOwner) {
      try {
        frame.release?.();
      } catch (error) {
        report(error);
      }
    }
    if (!frame.node.parentNode || frame.node.parentNode === frame.paneParent) {
      if (retainsSource(frame)) {
        frame.parent.insertBefore(
          frame.node,
          frame.next?.parentNode === frame.parent ? frame.next : null,
        );
      } else frame.node.remove(); // Never insert obsolete content beside a newer source node.
    }
    if (!frame.marked) frame.chrome.classList.remove(sourceClass);
    if (map.hasLayer(frame.popup)) map.closePopup(frame.popup);
    options.onClose?.(reason);
    if (reason === "back") {
      queueMicrotask(() => {
        if (disposed || active) return;
        const target = frame.origin?.isConnected
          ? frame.origin
          : map.getContainer();
        target.focus({ preventScroll: true });
      });
    }
  };
  const open = (event: PopupEvent) => {
    if (disposed) return;
    const popup = event.popup,
      raw = popup.getContent(),
      node = renderedContent(popup, raw),
      chrome = popup.getElement();
    if (
      !(node instanceof HTMLElement) ||
      !node.parentNode ||
      !chrome ||
      node.contains(map.getContainer())
    )
      return;
    if (active?.popup === popup && active.node === node) return;
    if (pending.has(popup)) return; // The first live attempt owns cancellation/revalidation.
    const parent = node.parentNode,
      next = node.nextSibling;
    const focused = doc.activeElement;
    const origin =
      options.getOrigin?.(popup) ??
      (focused instanceof HTMLElement &&
      focused !== doc.body &&
      focused.isConnected
        ? focused
        : null);
    const id = `map-selection-${++identity}`;
    const supplied = options.selectionIdentity?.(popup);
    const identityMatches = () => {
      if (!options.selectionIdentity) return true;
      try {
        return (
          typeof supplied === "string" &&
          supplied.length <= 65536 &&
          options.selectionIdentity(popup) === supplied
        );
      } catch (error) {
        report(error);
        return false;
      }
    };
    const pendingEntry: PendingPopup = {
      popup,
      chrome,
      marked: chrome.classList.contains(pendingClass),
    };
    pending.set(popup, pendingEntry);
    chrome.classList.add(pendingClass);
    const valid = () =>
      !disposed &&
      pending.get(popup) === pendingEntry &&
      map.hasLayer(popup) &&
      identityMatches() &&
      popup.getContent() === raw &&
      renderedContent(popup, raw) === node &&
      node.parentNode === parent &&
      allowed();
    const run = () => {
      if (!valid()) return;
      clearPending(pendingEntry);
      if (active) finish(active, "replace");
      const frame: Frame = {
        popup,
        raw,
        identityMatches,
        node,
        parent,
        next,
        chrome,
        marked: chrome.classList.contains(sourceClass),
        origin,
        paneParent: null,
        paneNext: null,
        lastFocus: null,
        focusChanged: (event) => {
          if (event.target instanceof HTMLElement)
            frame.lastFocus = event.target;
        },
        contentChanged: () => {
          if (active !== frame) return;
          if (
            node.parentNode === parent &&
            frame.paneParent?.isConnected &&
            renderedContent(popup) === node
          ) {
            frame.paneParent.insertBefore(
              node,
              frame.paneNext?.parentNode === frame.paneParent
                ? frame.paneNext
                : null,
            );
            if (
              (!doc.activeElement || doc.activeElement === doc.body) &&
              frame.lastFocus?.isConnected
            )
              frame.lastFocus.focus({ preventScroll: true });
          }
          if (!retainsSource(frame)) {
            if (allowed()) finish(frame, "source-update");
            // A source refresh cannot remove a protected editor/draft.
          }
        },
      };
      active = frame;
      popup.on("contentupdate", frame.contentChanged);
      node.addEventListener("focusin", frame.focusChanged);
      try {
        const release = options.showDetail(node, () =>
          finish(frame, "back", true),
        );
        if (typeof release === "function") frame.release = release;
        if (active !== frame) return;
        frame.paneParent = node.parentNode;
        frame.paneNext = node.nextSibling;
        if (!node.isConnected || frame.paneParent === parent) {
          finish(frame, "replace");
          return;
        }
        chrome.classList.add(sourceClass);
      } catch (error) {
        frame.paneParent = node.parentNode;
        finish(frame, "replace");
        report(error);
      }
    };
    try {
      options.request({
        id,
        label: "Inspect map location",
        run,
        revalidate: valid,
        cancel: () => clearPending(pendingEntry, true),
      });
    } catch (error) {
      clearPending(pendingEntry, true);
      report(error);
    }
  };
  const close = (event: PopupEvent) => {
    const entry = pending.get(event.popup);
    if (entry) clearPending(entry);
    if (active?.popup === event.popup && allowed())
      finish(active, "popup-close");
  };
  map.on("popupopen", open);
  map.on("popupclose", close);
  return () => {
    if (disposed) return;
    disposed = true;
    map.off("popupopen", open);
    map.off("popupclose", close);
    const abandoned: PendingPopup[] = [];
    map.eachLayer((layer) => {
      const entry = pending.get(layer as Popup);
      if (entry) abandoned.push(entry);
    });
    for (const entry of abandoned) clearPending(entry, true);
    if (active) finish(active, "dispose");
  };
}
