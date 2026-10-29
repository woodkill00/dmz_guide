import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { observeBrowserAction } from "../browser/action-observers.mjs";

test("browser observer failure is caught while the UI action is still pending", async () => {
  let releaseAction, rejectFirst, rejectSecond;
  const action = new Promise((resolve) => (releaseAction = resolve));
  const first = new Promise((_, reject) => (rejectFirst = reject));
  const second = new Promise((_, reject) => (rejectSecond = reject));
  const failure = new Error("synthetic response deadline");
  const watched = observeBrowserAction(() => action, [first, second]);
  const caught = assert.rejects(watched, (error) => error === failure);
  rejectFirst(failure);
  await caught;
  // A later observer rejection remains supervised after fail-fast completion.
  rejectSecond(new Error("synthetic later response deadline"));
  releaseAction();
  await setImmediate();
});

test("browser action failure retains its identity and later observers stay handled", async () => {
  let rejectObserver;
  const observer = new Promise((_, reject) => (rejectObserver = reject));
  const failure = new Error("synthetic click failure");
  await assert.rejects(
    observeBrowserAction(() => {
      throw failure;
    }, [observer]),
    (error) => error === failure,
  );
  rejectObserver(new Error("synthetic later deadline"));
  await setImmediate();
});

test("successful browser action returns every original response in order", async () => {
  const save = { status: 200 },
    changes = { status: 200 };
  let invoked = false;
  const result = await observeBrowserAction(() => {
    invoked = true;
  }, [Promise.resolve(save), Promise.resolve(changes)]);
  assert.equal(invoked, true);
  assert.equal(result[0], save);
  assert.equal(result[1], changes);
});
