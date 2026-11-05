export interface PaneState {
  dirty: boolean;
  committing: boolean;
  processing: boolean;
  saveAvailable?: boolean;
  waiting?: boolean;
}
export interface PaneIntent {
  id: string;
  label: string;
  run: () => void;
  revalidate: () => boolean;
  cancel?: () => void;
}
export interface PaneHostOptions {
  getState: () => PaneState;
  /** True means the real owning controller confirmed its save, not a timeout or button click. */
  save: () => Promise<boolean>;
  discard: () => void;
  revealTask?: () => void;
  onBlocked?: (message: string) => void;
  onClose?: () => void;
}

/** Owns original nodes and guarded departure, never cloned forms or inferred Save buttons. */
export function mountPaneHost(
  dialog: HTMLDialogElement,
  options: PaneHostOptions,
) {
  const host = document.querySelector<HTMLElement>("#ui-map-task"),
    key = document.querySelector<HTMLElement>("#map-key");
  if (document.documentElement.dataset.uiVariant !== "modern" || !host || !key)
    return undefined;
  if (
    !options ||
    typeof options.getState !== "function" ||
    typeof options.save !== "function" ||
    typeof options.discard !== "function"
  )
    throw new TypeError("Pane host requires real controller callbacks.");
  const originalParent = dialog.parentNode,
    originalNext = dialog.nextSibling,
    originalPane = dialog.getAttribute("data-ui-pane"),
    originalKeyHidden = key.hidden;
  const listeners = new AbortController();
  let disposed = false,
    pending: Readonly<PaneIntent> | null = null,
    saving = false,
    generation = 0,
    mode: "workspace" | "layers" = "layers";
  const guard = document.createElement("dialog");
  guard.id = "ui-pane-departure-guard";
  guard.setAttribute("aria-labelledby", "ui-pane-departure-title");
  guard.setAttribute("aria-describedby", "ui-pane-departure-description");
  const title = document.createElement("h2");
  title.id = "ui-pane-departure-title";
  title.textContent = "Keep your current work?";
  const description = document.createElement("p");
  description.id = "ui-pane-departure-description";
  const status = document.createElement("p");
  status.id = "ui-pane-departure-status";
  status.setAttribute("role", "status");
  const controls = document.createElement("div");
  controls.className = "ui-pane-departure-actions";
  const save = document.createElement("button"),
    discard = document.createElement("button"),
    stay = document.createElement("button"),
    proceed = document.createElement("button");
  for (const button of [save, discard, stay, proceed]) button.type = "button";
  save.textContent = "Save and continue";
  discard.textContent = "Discard and continue";
  stay.textContent = "Stay";
  proceed.textContent = "Continue";
  controls.append(save, discard, proceed, stay);
  guard.append(title, description, status, controls);
  document.body.append(guard);
  host.append(dialog);
  dialog.dataset.uiPane = "workspace";
  const read = () => {
    const state = options.getState();
    if (
      !state ||
      !["dirty", "committing", "processing"].every(
        (name) => typeof state[name as keyof PaneState] === "boolean",
      )
    )
      throw new TypeError("Invalid pane controller state.");
    return state;
  };
  const report = (message: string) => {
    status.textContent = message;
    try {
      options.onBlocked?.(message);
    } catch {
      /* A feedback adapter cannot authorize departure. */
    }
  };
  const focusFirst = (container: HTMLElement) => {
    const target =
      container.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]),textarea:not([disabled]),select:not([disabled])',
      ) ??
      container.querySelector<HTMLElement>(
        'button:not([disabled]),a[href],[tabindex="0"]',
      );
    target?.focus({ preventScroll: true });
  };
  const restore = () => {
    if (disposed) return;
    if (dialog.open) {
      options.revealTask?.();
      focusFirst(dialog);
    } else if (!key.hidden) focusFirst(key);
  };
  const paint = () => {
    if (disposed) return;
    const state = read(),
      busy = saving || state.committing || state.processing;
    description.textContent = pending
      ? `${pending.label}. Save your current work, discard it, or stay in this workspace.`
      : "Your current workspace is kept.";
    discard.hidden = !pending || !state.dirty;
    save.hidden = discard.hidden || state.saveAvailable===false;
    if(state.dirty&&state.saveAvailable===false)description.append(" This draft requires its current preview workflow. Stay to finish that review, or discard the draft.");
    save.disabled = discard.disabled = busy;
    proceed.hidden = !pending || state.dirty;
    proceed.disabled = busy;
    if(pending&&state.waiting&&busy)status.textContent="Still waiting for storage confirmation. Do not repeat this save. Your draft and destination are retained.";
  };
  const valid = (intent: PaneIntent) => {
    try {
      return intent.revalidate() === true;
    } catch {
      return false;
    }
  };
  const execute = (intent: Readonly<PaneIntent>) => {
    if (!valid(intent)) {
      try{intent.cancel?.();}catch{}
      pending = null;
      generation++;
      report(
        "That destination is no longer available. Your current work is kept.",
      );
      paint();
      return false;
    }
    pending = null;
    generation++;
    if (guard.open) guard.close();
    try {
      intent.run();
      return true;
    } catch (error) {
      report(
        error instanceof Error
          ? error.message
          : "The requested workspace could not open.",
      );
      return false;
    }
  };
  const request = (intent: PaneIntent) => {
    if (disposed) return false;
    if (pending) return false;
    if (
      !intent ||
      typeof intent.id !== "string" ||
      !intent.id.length ||
      intent.id.length > 128 ||
      typeof intent.label !== "string" ||
      !intent.label.length ||
      intent.label.length > 256 ||
      typeof intent.run !== "function" ||
      typeof intent.revalidate !== "function"
    )
      throw new TypeError("Invalid pane destination.");
    if (dialog.matches(":modal")) {
      report("Finish or cancel the current confirmation before leaving.");
      return false;
    }
    const state = read();
    if (!state.dirty && !state.committing && !state.processing && !saving)
      return execute(Object.freeze({ ...intent }));
    pending = Object.freeze({ ...intent });
    generation++;
    status.textContent = state.committing
      ? "The current save is still in progress. Stay here or wait for its confirmed outcome."
      : state.processing
        ? "Finish or cancel processing in its owning workspace before leaving."
        : "";
    paint();
    if (!guard.open) guard.showModal();
    stay.focus({ preventScroll: true });
    return false;
  };
  const keep = () => {
    if (disposed) return;
    const abandoned=pending;
    pending = null;
    try{abandoned?.cancel?.();}catch{}
    generation++;
    if (guard.open) guard.close();
    status.textContent = "";
    restore();
  };
  save.addEventListener(
    "click",
    async () => {
      if (disposed || !pending) return;
      const state = read();
      if (saving || state.committing || state.processing) {
        report("Wait for the current operation before saving or leaving.");
        paint();
        return;
      }
      const intent = pending,
        version = generation;
      saving = true;
      status.textContent = "Saving with the current workspace controller…";
      paint();
      try {
        const confirmed = await options.save();
        if (disposed) return;
        const current = read();
        if (pending !== intent || generation !== version) return;
        if (
          confirmed !== true ||
          current.dirty ||
          current.committing ||
          current.processing
        ) {
          report(
            "The save is not confirmed clean. Your work and destination are retained; finish recovery or stay here.",
          );
          return;
        }
        execute(intent);
      } catch (error) {
        if (!disposed && pending === intent && generation === version)
          report(
            error instanceof Error
              ? error.message
              : "The save failed. Your work and destination are retained.",
          );
      } finally {
        saving = false;
        if (!disposed) paint();
      }
    },
    { signal: listeners.signal },
  );
  discard.addEventListener(
    "click",
    () => {
      if (disposed || !pending) return;
      const state = read();
      if (saving || state.committing || state.processing) {
        report("Discard is unavailable while processing or saving.");
        paint();
        return;
      }
      const intent = pending;
      try {
        options.discard();
        const current = read();
        if (current.dirty || current.committing || current.processing) {
          report(
            "The current workspace did not confirm a clean discard. Stay here to finish it.",
          );
          paint();
          return;
        }
        execute(intent);
      } catch (error) {
        report(
          error instanceof Error
            ? error.message
            : "The draft could not be discarded.",
        );
        paint();
      }
    },
    { signal: listeners.signal },
  );
  proceed.addEventListener(
    "click",
    () => {
      if (disposed || !pending) return;
      const state = read();
      if (!saving && !state.dirty && !state.committing && !state.processing)
        execute(pending);
      else paint();
    },
    { signal: listeners.signal },
  );
  stay.addEventListener("click", keep, { signal: listeners.signal });
  guard.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      keep();
    },
    { signal: listeners.signal },
  );
  dialog.addEventListener(
    "close",
    () => {
      if (disposed || dialog.open) return;
      key.hidden = false;
      if (mode === "workspace") {
        mode = "layers";
        options.onClose?.();
      }
    },
    { signal: listeners.signal },
  );
  dialog.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        dialog.matches(":modal")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      request({
        id: "close-workspace",
        label: "Close workspace",
        run: () => dialog.close(),
        revalidate: () => dialog.isConnected,
      });
    },
    { signal: listeners.signal },
  );
  const open = () => {
    if (disposed || guard.open) return false;
    mode = "workspace";
    key.hidden = true;
    options.revealTask?.();
    if (!dialog.open) dialog.show();
    if (!dialog.matches(":modal") && !dialog.contains(document.activeElement))
      focusFirst(dialog);
    return true;
  };
  const modal = () => {
    if (disposed || guard.open) return false;
    mode = "workspace";
    key.hidden = true;
    options.revealTask?.();
    if (dialog.matches(":modal")) return true;
    if (dialog.open) dialog.close();
    dialog.showModal();
    return true;
  };
  const layers = (target:"key"|"layers"|"grid"|"updates"="layers") =>
    request({
      id: "layers",
      label: "Show Layers",
      run: () => {
        mode = "layers";
        if (dialog.open) dialog.close();
        key.hidden = false;
        key.dataset.uiToolTarget=target;
        options.revealTask?.();
        focusFirst(key);
      },
      revalidate: () => key.isConnected,
    });
  return {
    open,
    modal,
    layers,
    request,
    refresh: paint,
    suspend(){if(disposed)return;const abandoned=pending;pending=null;generation++;try{abandoned?.cancel?.();}catch{}if(guard.open)guard.close();status.textContent='';},
    snapshot: () => ({
      pending: pending ? { id: pending.id, label: pending.label } : null,
      saving,
      disposed,
      guardOpen: guard.open,
    }),
    destroy() {
      if (disposed) return;
      disposed = true;
      const abandoned=pending;pending = null;
      try{abandoned?.cancel?.();}catch{}
      generation++;
      listeners.abort();
      if (guard.open) guard.close();
      guard.remove();
      if (originalPane === null) dialog.removeAttribute("data-ui-pane");
      else dialog.setAttribute("data-ui-pane", originalPane);
      key.hidden = originalKeyHidden;
      if (originalParent?.isConnected)
        originalParent.insertBefore(
          dialog,
          originalNext?.parentNode === originalParent ? originalNext : null,
        );
    },
  };
}
