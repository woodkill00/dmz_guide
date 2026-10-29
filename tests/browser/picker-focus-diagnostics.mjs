/** Bounded, read-only evidence for synthetic modal-navigation acceptance. */
export function installPickerFocusDiagnostics() {
  const events = [];
  const start = performance.now();
  const describe = (node) =>
    node
      ? {
          tag: node.tagName || null,
          id: node.id || null,
          connected: node.isConnected ?? null,
          disabled: node.disabled ?? null,
          inert: node.inert ?? null,
        }
      : null;
  const snapshot = (kind, target = null, detail = null) => {
    events.push({
      ms: Math.round((performance.now() - start) * 100) / 100,
      kind,
      target: describe(target),
      detail,
      active: describe(document.activeElement),
      documentHasFocus: document.hasFocus(),
      visibilityState: document.visibilityState,
      picker: describe(document.querySelector("#pack-select")),
      dialogOpen:
        document.querySelector("#upgrade-spend-confirm")?.open ?? null,
      dialogModal:
        document.querySelector("#upgrade-spend-confirm")?.matches?.(":modal") ??
        null,
    });
    if (events.length > 100) events.shift();
  };
  const listener = (event) => snapshot(event.type, event.target);
  const types = [
    "focus",
    "blur",
    "focusin",
    "focusout",
    "close",
    "pointerdown",
    "keydown",
  ];
  const capture = { capture: true };
  for (const type of types) document.addEventListener(type, listener, capture);
  const windowListener = (event) =>
    snapshot(`window-${event.type}`, event.target);
  window.addEventListener("focus", windowListener);
  window.addEventListener("blur", windowListener);
  const observer = new MutationObserver((records) => {
    for (const record of records)
      snapshot("mutation", record.target, {
        type: record.type,
        attribute: record.attributeName,
        oldValue: record.oldValue,
        value: record.attributeName
          ? record.target.getAttribute(record.attributeName)
          : null,
        added: record.addedNodes.length,
        removed: record.removedNodes.length,
      });
  });
  const picker = document.querySelector("#pack-select");
  if (picker)
    observer.observe(picker, {
      attributes: true,
      attributeFilter: ["disabled", "inert"],
      attributeOldValue: true,
      childList: true,
    });
  const dialog = document.querySelector("#upgrade-spend-confirm");
  if (dialog)
    observer.observe(dialog, {
      attributes: true,
      attributeFilter: ["open"],
      attributeOldValue: true,
    });
  window.__dmzPickerFocusEvidence = {
    mark: (kind) => snapshot(kind),
    stop() {
      snapshot("capture-end");
      observer.disconnect();
      for (const type of types)
        document.removeEventListener(type, listener, capture);
      window.removeEventListener("focus", windowListener);
      window.removeEventListener("blur", windowListener);
      delete window.__dmzPickerFocusEvidence;
      return events;
    },
  };
  snapshot("capture-start");
}
