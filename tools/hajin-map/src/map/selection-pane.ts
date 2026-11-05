import type { Map as LeafletMap, Popup, PopupEvent } from "leaflet";

export interface SelectionPaneIntent {
  id: string;
  label: string;
  run: () => void;
  revalidate: () => boolean;
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
  const identities = new WeakMap<Popup, string>();
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
      if (frame.popup.getContent() === frame.node) {
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
      node = popup.getContent(),
      chrome = popup.getElement();
    if (
      !(node instanceof HTMLElement) ||
      !node.parentNode ||
      !chrome ||
      node.contains(map.getContainer())
    )
      return;
    if (active?.popup === popup && active.node === node) return;
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
    let id = identities.get(popup);
    if (!id) {
      id = `map-selection-${++identity}`;
      identities.set(popup, id);
    }
    const supplied = options.selectionIdentity?.(popup);
    if (
      typeof supplied === "string" &&
      supplied.length > 0 &&
      supplied.length <= 112
    )
      id = "selection:" + supplied;
    const valid = () =>
      !disposed &&
      map.hasLayer(popup) &&
      popup.getContent() === node &&
      node.parentNode === parent &&
      allowed();
    const run = () => {
      if (!valid()) return;
      if (active) finish(active, "replace");
      const frame: Frame = {
        popup,
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
          if (popup.getContent() !== node) {
            if (allowed()) finish(frame, "source-update");
            return; // A source refresh cannot remove a protected editor/draft.
          }
          if (node.parentNode === parent && frame.paneParent?.isConnected) {
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
      });
    } catch (error) {
      report(error);
    }
  };
  const close = (event: PopupEvent) => {
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
    if (active) finish(active, "dispose");
  };
}
