const pendingFocus = new WeakMap();

// A close event can precede the native blur of a control in the closed modal.
// Wait for that cleanup when needed; never poll or refocus over new user input.
export function closeDialog(dialog, restoreFocus) {
  pendingFocus.get(dialog)?.();
  if (!restoreFocus) {
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
  const restore = (afterBlur = false) => {
    if (pendingFocus.get(dialog) !== cancel) return;
    const active = document.activeElement;
    const newerFocus =
      afterBlur &&
      active &&
      active !== document.body &&
      active !== document.documentElement &&
      !dialog.contains(active);
    cancel();
    if (!dialog.open && !newerFocus) restoreFocus();
  };
  const onBlur = () => {
    // A posted task, unlike a microtask inside an event callback, runs after
    // the native focus-cleanup task. There is one attempt, not a timed retry.
    task = new MessageChannel();
    task.port1.onmessage = () => restore(true);
    task.port2.postMessage(null);
  };
  const onClose = () => {
    if (dialog.open) {
      cancel();
      return;
    }
    closingControl = document.activeElement;
    if (closingControl && dialog.contains(closingControl)) {
      closingControl.addEventListener("blur", onBlur, { once: true });
    } else {
      restore();
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
