/** Presentation width only; never writes workspace data or changes the camera. */
export function mountTaskResize(root: HTMLElement) {
  const storageKey = "dmz-ui-map-pane-v1";
  let preferred: number | undefined,
    writable = true,
    disposed = false;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw !== null) {
      if (raw.length > 128) throw Error("Oversized width preference");
      const value = JSON.parse(raw);
      if (
        !value ||
        Object.keys(value).sort().join(",") !== "version,width" ||
        value.version !== 1 ||
        !Number.isFinite(value.width) ||
        value.width < 180 ||
        value.width > 4096
      )
        throw Error("Invalid width preference");
      preferred = value.width;
    }
  } catch {
    writable = false;
  }
  const handle = document.createElement("div");
  handle.id = "ui-map-task-resizer";
  handle.tabIndex = 0;
  handle.hidden = true;
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-label", "Resize map side menu");
  handle.setAttribute("aria-orientation", "vertical");
  handle.setAttribute("aria-controls", "ui-map-task");
  handle.title =
    "Drag to resize. Arrow keys adjust; Home/End select minimum/maximum.";
  root.append(handle);
  const events = new AbortController();
  let visible = false,
    width = 384,
    minimum = 288,
    maximum = 384;
  let drag: { id: number; previous: number | undefined } | undefined;
  const bounds = () => {
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    minimum = Math.min(4096, Math.ceil(18 * rem));
    maximum = Math.max(
      minimum,
      Math.floor(Math.min(4096, root.clientWidth - 20 * rem)),
    );
    return rem;
  };
  const refresh = (docked: boolean) => {
    if (disposed) return;
    const rem = bounds();
    width = Math.round(
      Math.max(minimum, Math.min(maximum, preferred ?? 24 * rem)),
    );
    root.style.setProperty("--ui-map-task-width", `${width}px`);
    visible = docked;
    if (!visible && document.activeElement === handle)
      document
        .querySelector<HTMLButtonElement>("#ui-task-view")
        ?.focus({ preventScroll: true });
    handle.hidden = !visible;
    handle.setAttribute("aria-valuemin", String(minimum));
    handle.setAttribute("aria-valuemax", String(maximum));
    handle.setAttribute("aria-valuenow", String(width));
    handle.setAttribute("aria-valuetext", `${width} pixels`);
  };
  const persist = () => {
    if (!writable || preferred === undefined) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ version: 1, width: preferred }),
      );
    } catch {
      writable = false;
    }
  };
  const setWidth = (next: number) => {
    bounds();
    preferred = Math.round(Math.max(minimum, Math.min(maximum, next)));
    refresh(visible);
  };
  handle.addEventListener(
    "pointerdown",
    (event) => {
      if (!visible || !event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      handle.focus({ preventScroll: true });
      drag = { id: event.pointerId, previous: preferred };
      handle.setPointerCapture(event.pointerId);
      handle.dataset.dragging = "true";
    },
    { signal: events.signal },
  );
  handle.addEventListener(
    "pointermove",
    (event) => {
      if (drag?.id !== event.pointerId) return;
      setWidth(event.clientX - root.getBoundingClientRect().left);
    },
    { signal: events.signal },
  );
  const finish = (event: PointerEvent, cancel: boolean) => {
    if (drag?.id !== event.pointerId) return;
    const previous = drag.previous;
    drag = undefined;
    delete handle.dataset.dragging;
    if (handle.hasPointerCapture(event.pointerId))
      handle.releasePointerCapture(event.pointerId);
    if (cancel) {
      preferred = previous;
      refresh(visible);
    } else persist();
  };
  handle.addEventListener("pointerup", (event) => finish(event, false), {
    signal: events.signal,
  });
  handle.addEventListener("pointercancel", (event) => finish(event, true), {
    signal: events.signal,
  });
  handle.addEventListener(
    "lostpointercapture",
    (event) => finish(event, true),
    { signal: events.signal },
  );
  handle.addEventListener(
    "keydown",
    (event) => {
      if (
        !visible ||
        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
      )
        return;
      event.preventDefault();
      const step = event.shiftKey ? 64 : 16;
      setWidth(
        event.key === "Home"
          ? minimum
          : event.key === "End"
            ? maximum
            : width + (event.key === "ArrowLeft" ? -step : step),
      );
      persist();
    },
    { signal: events.signal },
  );
  return {
    refresh,
    destroy() {
      disposed = true;
      events.abort();
      if (drag && handle.hasPointerCapture(drag.id))
        handle.releasePointerCapture(drag.id);
      handle.remove();
      root.style.removeProperty("--ui-map-task-width");
    },
  };
}
