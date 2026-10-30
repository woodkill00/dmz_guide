const pendingFocus = new WeakMap();

// A close event can precede completion of native focus cleanup, even when
// BODY is already active. Restore once from a later task, never inside close.
export function closeDialog(dialog, restoreFocus) {
  pendingFocus.get(dialog)?.();
  if (!restoreFocus) {
    // Navigation invalidates the old modal without a restoration target. Release
    // its focused control before native close can queue cleanup for it. Otherwise
    // that late blur can clear a picker focused in the newly rendered catalog.
    // A newer outside focus belongs to the user and must never be disturbed.
    const active = dialog.ownerDocument.activeElement;
    if (active && dialog.contains(active)) active.blur?.();
    if (dialog.open) dialog.close();
    return;
  }
  const document = dialog.ownerDocument;
  let closingControl, task;
  const cancel = () => {
    if (pendingFocus.get(dialog) === cancel) pendingFocus.delete(dialog);
    dialog.removeEventListener("close", onClose);
    closingControl?.removeEventListener("blur", onBlur);
    document.removeEventListener("pointerdown", cancel, true);
    document.removeEventListener("keydown", cancel, true);
    task?.port1.close();
    task?.port2.close();
  };
  const restore = (allowedFocus = null) => {
    if (pendingFocus.get(dialog) !== cancel) return;
    const active = document.activeElement;
    const newerFocus =
      active &&
      active !== allowedFocus &&
      active !== document.body &&
      active !== document.documentElement &&
      !dialog.contains(active);
    cancel();
    if (!dialog.open && !newerFocus) restoreFocus();
  };
  const queueRestore = (allowedFocus = null) => {
    // A posted task, unlike a microtask inside an event callback, runs after
    // the native focus-cleanup task. There is one attempt, not a timed retry.
    task = new MessageChannel();
    task.port1.onmessage = () => restore(allowedFocus);
    task.port2.postMessage(null);
  };
  const onBlur = () => queueRestore();
  const onClose = () => {
    if (dialog.open) {
      cancel();
      return;
    }
    closingControl = document.activeElement;
    if (closingControl && dialog.contains(closingControl)) {
      closingControl.addEventListener("blur", onBlur, { once: true });
    } else {
      // WebKit can ignore an otherwise valid focus() during close dispatch even
      // with BODY active and :modal false. Preserve any native return target as
      // the baseline, but never override a different focus chosen after close.
      queueRestore(closingControl);
    }
  };
  pendingFocus.set(dialog, cancel);
  document.addEventListener("pointerdown", cancel, true);
  document.addEventListener("keydown", cancel, true);
  if (dialog.open) {
    dialog.addEventListener("close", onClose, { once: true });
    dialog.close();
  } else {
    onClose();
  }
}
