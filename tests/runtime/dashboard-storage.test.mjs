import test from "node:test";
import assert from "node:assert/strict";
import { readExistingRecord } from "../../src/storage/summary-read.mjs";
test("087 discovery does not open an absent database", async (t) => {
  const original = globalThis.indexedDB;
  t.after(() => (globalThis.indexedDB = original));
  let opened = 0;
  globalThis.indexedDB = {
    databases: async () => [],
    open() {
      opened++;
      throw Error("Must not open");
    },
  };
  assert.equal(
    await readExistingRecord("absent", "profiles", "key"),
    undefined,
  );
  assert.equal(opened, 0);
});
test("087 expired enumeration cannot initiate a late open", async (t) => {
  const original = globalThis.indexedDB;
  t.after(() => (globalThis.indexedDB = original));
  let release,
    opened = 0;
  globalThis.indexedDB = {
    databases: () => new Promise((resolve) => (release = resolve)),
    open() {
      opened++;
    },
  };
  await assert.rejects(
    readExistingRecord("held", "profiles", "key", { timeout: 10 }),
    /timed out/,
  );
  release([{ name: "held" }]);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(opened, 0);
});
test("087 late successful open closes after cancellation", async (t) => {
  const original = globalThis.indexedDB;
  t.after(() => (globalThis.indexedDB = original));
  let request,
    closed = 0;
  globalThis.indexedDB = {
    databases: async () => [{ name: "held" }],
    open() {
      request = {};
      return request;
    },
  };
  const controller = new AbortController(),
    result = readExistingRecord("held", "profiles", "key", {
      signal: controller.signal,
    });
  await new Promise((resolve) => setTimeout(resolve, 0));
  controller.abort();
  await assert.rejects(result, /cancelled/);
  request.result = {
    close() {
      closed++;
    },
  };
  request.onsuccess();
  assert.equal(closed, 1);
});
