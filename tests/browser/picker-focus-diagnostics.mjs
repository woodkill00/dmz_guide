/** Bounded synthetic focus evidence; optional transparent native-call instrumentation. */
export function installPickerFocusDiagnostics({
  dialogSelector = "#upgrade-spend-confirm",
  controlSelector = null,
  rootSelector = null,
  traceCalls = false,
} = {}) {
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
          upgradeId: node.dataset?.upgradeId ?? null,
          upgradeField: node.dataset?.upgradeField ?? null,
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
      control: controlSelector
        ? describe(document.querySelector(controlSelector))
        : null,
      dialogOpen: document.querySelector(dialogSelector)?.open ?? null,
      dialogModal:
        document.querySelector(dialogSelector)?.matches?.(":modal") ?? null,
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
  const dialog = document.querySelector(dialogSelector);
  if (dialog)
    observer.observe(dialog, {
      attributes: true,
      subtree: true,
      attributeFilter: ["open", "disabled"],
      attributeOldValue: true,
    });
  if (controlSelector) {
    const control = document.querySelector(controlSelector);
    if (control)
      observer.observe(control, {
        attributes: true,
        attributeFilter: ["disabled"],
        attributeOldValue: true,
      });
  }
  if (rootSelector) {
    const root = document.querySelector(rootSelector);
    if (root) observer.observe(root, { childList: true });
  }
  const wrappers = [];
  if (traceCalls) {
    for (const [prototype, name] of [
      [HTMLElement.prototype, "focus"],
      [HTMLDialogElement.prototype, "close"],
    ]) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      const original = descriptor.value;
      const wrapper = function (...args) {
        snapshot(`${name}-call-before`, this);
        try {
          return Reflect.apply(original, this, args);
        } finally {
          snapshot(`${name}-call-after`, this);
        }
      };
      Object.defineProperty(prototype, name, { ...descriptor, value: wrapper });
      wrappers.push(() => {
        if (prototype[name] === wrapper)
          Object.defineProperty(prototype, name, descriptor);
      });
    }
  }
  window.__dmzPickerFocusEvidence = {
    mark: (kind) => snapshot(kind),
    stop() {
      snapshot("capture-end");
      observer.disconnect();
      for (const restore of wrappers) restore();
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
