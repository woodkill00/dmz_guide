const pendingFocus = new WeakMap();

// Native modal focus restoration can outlive close(). Resolve the current
// control only when the close event arrives, after any caller rerender.
export function closeDialog(dialog, restoreFocus) {
  const previous = pendingFocus.get(dialog);
  if (previous) dialog.removeEventListener("close", previous);
  pendingFocus.delete(dialog);
  if (!dialog.open) {
    restoreFocus?.();
    return;
  }
  if (restoreFocus) {
    const restore = () => {
      pendingFocus.delete(dialog);
      if (!dialog.open) restoreFocus();
    };
    pendingFocus.set(dialog, restore);
    dialog.addEventListener("close", restore, { once: true });
  }
  dialog.close();
}
