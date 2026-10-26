import test from "node:test";
import assert from "node:assert/strict";
import { closeDialog } from "../../src/client/dialog-focus.mjs";

class Dialog extends EventTarget {
  open = true;
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
