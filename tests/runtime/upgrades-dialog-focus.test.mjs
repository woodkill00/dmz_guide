import test from "node:test";
import assert from "node:assert/strict";
import { closeDialog } from "../../src/client/dialog-focus.mjs";
import { setImmediate } from "node:timers/promises";

class Dialog extends EventTarget {
  open = true;
  ownerDocument = Object.assign(new EventTarget(), {
    body: {},
    documentElement: {},
    activeElement: null,
  });
  contains(node) {
    return node === this.closingControl;
  }
  close() {
    this.open = false;
  }
  settled() {
    this.dispatchEvent(new Event("close"));
  }
}

test("progress focus resolves the replacement control after native close settles", () => {
  const dialog = new Dialog();
  let active = "confirm",
    control = "old select",
    calls = 0;
  closeDialog(dialog, () => {
    active = control;
    calls++;
  });
  assert.equal(dialog.open, false);
  assert.equal(calls, 0, "Do not race the browser's close focus restoration");
  control = "rerendered select";
  active = "native restored old control";
  dialog.settled();
  assert.equal(active, "rerendered select");
  dialog.settled();
  assert.equal(calls, 1, "Close notification cannot replay focus");
});

test("closed modal keeps focus until native blur; restore once after cleanup", async () => {
  const dialog = new Dialog(),
    document = dialog.ownerDocument;
  const button = (dialog.closingControl = new EventTarget());
  document.activeElement = button;
  let calls = 0,
    restored;
  const done = new Promise((resolve) => (restored = resolve));
  closeDialog(dialog, () => {
    assert.equal(document.activeElement, document.body);
    calls++;
    restored();
  });
  dialog.settled();
  assert.equal(
    calls,
    0,
    "Do not focus a new outside control during modal cleanup",
  );
  button.dispatchEvent(new Event("blur"));
  assert.equal(calls, 0, "The native blur stack must finish first");
  document.activeElement = document.body;
  await done;
  assert.equal(calls, 1);
  button.dispatchEvent(new Event("blur"));
  await setImmediate();
  assert.equal(calls, 1);
});

for (const interaction of [
  "pointerdown",
  "keydown",
  "navigation",
  "reopen",
  "outside-focus",
])
  test(`late modal cleanup never steals focus after ${interaction}`, async () => {
    const dialog = new Dialog(),
      document = dialog.ownerDocument;
    const button = (dialog.closingControl = new EventTarget());
    document.activeElement = button;
    let calls = 0;
    closeDialog(dialog, () => calls++);
    dialog.settled();
    button.dispatchEvent(new Event("blur"));
    document.activeElement = document.body;
    if (interaction === "navigation") closeDialog(dialog);
    else if (interaction === "reopen") dialog.open = true;
    else if (interaction === "outside-focus") document.activeElement = {};
    else document.dispatchEvent(new Event(interaction));
    await setImmediate();
    assert.equal(calls, 0);
  });

test("cancelling before native blur detaches its listener", async () => {
  const dialog = new Dialog(),
    document = dialog.ownerDocument;
  let removed = 0;
  const button = (dialog.closingControl = new (class extends EventTarget {
    removeEventListener(type, ...args) {
      if (type === "blur") removed++;
      super.removeEventListener(type, ...args);
    }
  })());
  document.activeElement = button;
  let calls = 0;
  closeDialog(dialog, () => calls++);
  dialog.settled();
  closeDialog(dialog);
  assert.equal(removed, 1);
  button.dispatchEvent(new Event("blur"));
  document.activeElement = document.body;
  await setImmediate();
  assert.equal(calls, 0);
});

test("a superseded posted restoration cannot cancel the newer request", async () => {
  const dialog = new Dialog(),
    document = dialog.ownerDocument,
    calls = [];
  let restored;
  const done = new Promise((resolve) => (restored = resolve));
  for (const label of ["old", "new"]) {
    dialog.open = true;
    const button = (dialog.closingControl = new EventTarget());
    document.activeElement = button;
    closeDialog(dialog, () => {
      calls.push(label);
      if (label === "new") restored();
    });
    dialog.settled();
    button.dispatchEvent(new Event("blur"));
    document.activeElement = document.body;
  }
  await done;
  assert.deepEqual(calls, ["new"]);
});

test("navigation invalidates pending focus and a reopened modal keeps focus", () => {
  const dialog = new Dialog();
  let calls = 0;
  closeDialog(dialog, () => calls++);
  closeDialog(dialog);
  dialog.settled();
  assert.equal(calls, 0);
  dialog.open = true;
  closeDialog(dialog, () => calls++);
  dialog.open = true;
  dialog.settled();
  assert.equal(calls, 0, "Never focus behind a newly opened modal");
});

test("only the latest dismissal restores focus; guards can reject stale targets", () => {
  const dialog = new Dialog();
  let active = "confirm",
    current = true;
  closeDialog(dialog, () => (active = "stale"));
  dialog.open = true;
  closeDialog(dialog, () => {
    if (current) active = "latest";
  });
  dialog.settled();
  assert.equal(active, "latest");
  dialog.open = true;
  closeDialog(dialog, () => {
    if (current) active = "wrong pack";
  });
  current = false;
  dialog.settled();
  assert.equal(active, "latest");
});

test("an already closed native dialog can restore directly without a new event", () => {
  const dialog = new Dialog();
  dialog.open = false;
  let calls = 0;
  closeDialog(dialog, () => calls++);
  assert.equal(calls, 1);
  dialog.settled();
  assert.equal(calls, 1);
});
