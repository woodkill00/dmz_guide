import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { upgradeFixture } from "../helpers/upgrades.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { setWatchPin } from "../../src/domain/upgrade-progress.mjs";
test("failed pin candidates remain separate, exportable and explicitly discardable without retry", async () => {
  const pack = upgradeFixture(),
    profile = newProfile(pack),
    state = { pack, profile, saving: false };
  const original = structuredClone(profile),
    handlers = new Map(),
    downloads = [],
    errors = [];
  let section,
    calls = 0,
    removed = false;
  const context = vm.createContext({
    state,
    setWatchPin,
    esc: String,
    persist: async () => {
      calls++;
      return false;
    },
    download: (name, candidate) => downloads.push([name, candidate]),
    status() {},
    error: (reason) => errors.push(reason.message),
    document: {
      createElement: () =>
        (section = {
          setAttribute() {},
          focus() {},
          remove: () => (removed = true),
          querySelector: (selector) => ({
            addEventListener: (_, fn) => handlers.set(selector, fn),
          }),
        }),
      querySelector: (selector) =>
        selector === "main" ? { append() {} } : section,
    },
  });
  const source = readFileSync(
    new URL("../../src/client/watch-pin.mjs", import.meta.url),
    "utf8",
  )
    .replace(/^import .*?;\n/gms, "")
    .replace("export async function", "async function");
  vm.runInContext(source, context);
  assert.equal(await context.saveWatchPin(pack.items[0].id, true), false);
  assert.deepEqual(profile, original);
  assert.equal(calls, 1);
  handlers.get("#watch-pin-export")();
  assert.deepEqual(downloads[0][1].watchPins, [pack.items[0].id]);
  assert.equal(downloads[0][1].revision, original.revision);
  await context.saveWatchPin(pack.items[1].id, true);
  assert.equal(calls, 1);
  assert.match(errors.at(-1), /Export or discard/);
  state.saving = true;
  handlers.get("#watch-pin-discard")();
  assert.equal(removed, false);
  state.saving = false;
  handlers.get("#watch-pin-discard")();
  assert.equal(removed, true);
  assert.deepEqual(profile, original);
  await context.saveWatchPin(pack.items[1].id, true);
  assert.equal(calls, 2);
});
