import test from "node:test";
import assert from "node:assert/strict";
import { closeDialog } from "../../src/client/dialog-focus.mjs";
import { setImmediate } from "node:timers/promises";

class Dialog extends EventTarget {
  open = true;
  ownerDocument = Object.assign(new EventTarget(), {
    body: new EventTarget(),
    documentElement: new EventTarget(),
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

test("BODY at close dispatch defers the sole focus attempt beyond native cleanup", async () => {
  const dialog = new Dialog(),
    document = dialog.ownerDocument;
  document.activeElement = document.body;
  const replacement = {};
  let nativeCleanup = true,
    calls = 0,
    complete;
  const done = new Promise((resolve) => (complete = resolve));
  closeDialog(dialog, () => {
    calls++;
    // Observed WebKit behavior: focus inside close dispatch returns with BODY.
    if (!nativeCleanup) document.activeElement = replacement;
    complete();
  });
  dialog.settled();
  nativeCleanup = false;
  assert.equal(
    calls,
    0,
    "Never attempt restoration inside native close dispatch",
  );
  await done;
  assert.equal(calls, 1, "One deferred attempt, not a focus retry");
  assert.equal(document.activeElement, replacement);
});

test("progress focus resolves the replacement control after native close settles", async () => {
  const dialog = new Dialog();
  let active = "confirm",
    control = "old select",
    calls = 0,
    complete;
  const done = new Promise((resolve) => (complete = resolve));
  closeDialog(dialog, () => {
    active = control;
    calls++;
    complete();
  });
  assert.equal(dialog.open, false);
  assert.equal(calls, 0, "Do not race the browser's close focus restoration");
  control = "rerendered select";
  active = "native restored old control";
  dialog.settled();
  assert.equal(
    calls,
    0,
    "Close dispatch itself is not native cleanup completion",
  );
  await done;
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

for (const interaction of [
  "pointerdown",
  "keydown",
  "navigation",
  "reopen",
  "outside-focus",
])
  test(`BODY close task preserves newer ${interaction}`, async () => {
    const dialog = new Dialog(),
      document = dialog.ownerDocument;
    document.activeElement = document.body;
    let calls = 0;
    closeDialog(dialog, () => calls++);
    dialog.settled();
    if (interaction === "navigation") closeDialog(dialog);
    else if (interaction === "reopen") dialog.open = true;
    else if (interaction === "outside-focus")
      document.activeElement = new EventTarget();
    else document.dispatchEvent(new Event(interaction));
    await setImmediate();
    assert.equal(
      calls,
      0,
      "Queued close restoration must not override newer intent",
    );
  });

test("native outside return target does not suppress the requested correction target", async () => {
  const dialog = new Dialog(),
    document = dialog.ownerDocument;
  const nativeOrigin = new EventTarget(),
    correction = new EventTarget();
  document.activeElement = nativeOrigin;
  let complete;
  const done = new Promise((resolve) => (complete = resolve));
  closeDialog(dialog, () => {
    document.activeElement = correction;
    complete();
  });
  dialog.settled();
  assert.equal(document.activeElement, nativeOrigin);
  await done;
  assert.equal(document.activeElement, correction);
});

test("newer outside focus supersedes the native return baseline", async () => {
  const dialog = new Dialog(),
    document = dialog.ownerDocument;
  document.activeElement = new EventTarget();
  let calls = 0;
  closeDialog(dialog, () => calls++);
  dialog.settled();
  const newer = new EventTarget();
  document.activeElement = newer;
  await setImmediate();
  assert.equal(calls, 0);
  assert.equal(document.activeElement, newer);
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

test("only the latest dismissal restores focus; guards can reject stale targets", async () => {
  const dialog = new Dialog();
  let active = "confirm",
    current = true,
    complete;
  let done = new Promise((resolve) => (complete = resolve));
  closeDialog(dialog, () => (active = "stale"));
  dialog.open = true;
  closeDialog(dialog, () => {
    if (current) active = "latest";
    complete();
  });
  dialog.settled();
  await done;
  assert.equal(active, "latest");
  dialog.open = true;
  done = new Promise((resolve) => (complete = resolve));
  closeDialog(dialog, () => {
    if (current) active = "wrong pack";
    complete();
  });
  current = false;
  dialog.settled();
  await done;
  assert.equal(active, "latest");
});

test("an already closed native dialog restores from one task without a new event", async () => {
  const dialog = new Dialog();
  dialog.open = false;
  let calls = 0,
    complete;
  const done = new Promise((resolve) => (complete = resolve));
  closeDialog(dialog, () => {
    calls++;
    complete();
  });
  assert.equal(calls, 0);
  await done;
  assert.equal(calls, 1);
  dialog.settled();
  assert.equal(calls, 1);
});

test("navigation dismissal blurs its modal control before native close cleanup", () => {
  const dialog = new Dialog(),
    document = dialog.ownerDocument,
    events = [];
  const button = (dialog.closingControl = {
    blur() {
      events.push("blur");
      document.activeElement = document.body;
    },
  });
  document.activeElement = button;
  dialog.close = () => {
    events.push("close");
    assert.equal(
      document.activeElement,
      document.body,
      "A stale modal control must not carry native blur into the next view",
    );
    dialog.open = false;
  };
  closeDialog(dialog);
  assert.deepEqual(events, ["blur", "close"]);
  const nextPicker = {};
  document.activeElement = nextPicker;
  dialog.settled();
  assert.equal(document.activeElement, nextPicker);
});

test("navigation dismissal never blurs newer focus outside its modal", () => {
  const dialog = new Dialog();
  let blurs = 0;
  const newer = { blur: () => blurs++ };
  dialog.ownerDocument.activeElement = newer;
  closeDialog(dialog);
  assert.equal(blurs, 0);
  assert.equal(dialog.ownerDocument.activeElement, newer);
});
