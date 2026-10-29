import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { installPickerFocusDiagnostics } from "../browser/picker-focus-diagnostics.mjs";

test("picker diagnostics are bounded, read-only, timestamped and detach observers", () => {
  const picker = {
    tagName: "SELECT",
    id: "pack-select",
    isConnected: true,
    disabled: false,
    inert: false,
    getAttribute: () => null,
  };
  const dialog = {
    tagName: "DIALOG",
    id: "upgrade-spend-confirm",
    open: false,
  };
  const document = Object.assign(new EventTarget(), {
    activeElement: picker,
    hasFocus: () => true,
    querySelector: (selector) =>
      selector === "#pack-select" ? picker : dialog,
  });
  const window = new EventTarget();
  let callback,
    disconnected = false,
    observed = 0,
    now = 0;
  class MutationObserver {
    constructor(fn) {
      callback = fn;
    }
    observe() {
      observed++;
    }
    disconnect() {
      disconnected = true;
    }
  }
  runInNewContext(`(${installPickerFocusDiagnostics.toString()})()`, {
    document,
    window,
    MutationObserver,
    performance: { now: () => ++now },
  });
  assert.equal(observed, 2);
  const recorder = window.__dmzPickerFocusEvidence;
  document.dispatchEvent(new Event("focusin"));
  callback([
    {
      target: picker,
      type: "attributes",
      attributeName: "disabled",
      oldValue: "",
      addedNodes: [],
      removedNodes: [],
    },
  ]);
  let evidence = recorder.stop();
  assert.equal(evidence.length, 4);
  assert.equal(evidence[1].kind, "focusin");
  assert.equal(evidence[2].detail.attribute, "disabled");
  assert(
    evidence.every(
      (entry) => entry.documentHasFocus && entry.active.id === "pack-select",
    ),
  );
  assert(evidence.every((entry, i) => !i || entry.ms >= evidence[i - 1].ms));
  assert.equal(disconnected, true);
  assert.equal(window.__dmzPickerFocusEvidence, undefined);
  document.dispatchEvent(new Event("focusin"));
  window.dispatchEvent(new Event("blur"));
  assert.equal(
    evidence.length,
    4,
    "Detached listeners do not append late evidence",
  );
  assert.equal(document.activeElement, picker);
  assert.equal(picker.disabled, false);
  // The same recorder's bounded push never accumulates unbounded fixture data.
  for (let i = 0; i < 150; i++) recorder.mark(`sample-${i}`);
  assert.equal(evidence.length, 100);
  assert.equal(evidence.at(-1).kind, "sample-149");
});

test("diagnostic focus/close wrappers preserve receivers, arguments, return and thrown errors", () => {
  let received,
    throws = false;
  const sentinel = new Error("native sentinel");
  class HTMLElement {
    focus(...args) {
      received = { receiver: this, args };
      if (throws) throw sentinel;
      return 42;
    }
  }
  class HTMLDialogElement {
    close(...args) {
      received = { receiver: this, args };
      return 43;
    }
  }
  const originalFocus = HTMLElement.prototype.focus;
  const originalClose = HTMLDialogElement.prototype.close;
  const document = Object.assign(new EventTarget(), {
    activeElement: null,
    hasFocus: () => false,
    querySelector: () => null,
  });
  const window = new EventTarget();
  class MutationObserver {
    observe() {}
    disconnect() {}
  }
  runInNewContext(
    `(${installPickerFocusDiagnostics.toString()})({ traceCalls: true })`,
    {
      document,
      window,
      MutationObserver,
      HTMLElement,
      HTMLDialogElement,
      performance,
    },
  );
  const target = new HTMLElement(),
    options = { preventScroll: true };
  assert.equal(target.focus(options), 42);
  assert.equal(received.receiver, target);
  assert.equal(received.args[0], options);
  throws = true;
  assert.throws(
    () => target.focus(),
    (error) => error === sentinel,
  );
  const dialog = new HTMLDialogElement();
  assert.equal(dialog.close("native-value"), 43);
  assert.equal(received.receiver, dialog);
  assert.equal(received.args[0], "native-value");
  const events = window.__dmzPickerFocusEvidence.stop();
  assert.equal(
    events.filter((event) => event.kind === "focus-call-before").length,
    2,
  );
  assert.equal(
    events.filter((event) => event.kind === "focus-call-after").length,
    2,
  );
  assert.equal(HTMLElement.prototype.focus, originalFocus);
  assert.equal(HTMLDialogElement.prototype.close, originalClose);
});
