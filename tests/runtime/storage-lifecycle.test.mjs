import test from "node:test";
import assert from "node:assert/strict";
let serial = 0;
async function freshStore(indexedDB) {
  globalThis.indexedDB = indexedDB;
  return import(`../../src/storage/store.mjs?lifecycle=${serial++}`);
}
function fakeDatabase(value = null) {
  return {
    closed: false,
    close() {
      this.closed = true;
    },
    transaction() {
      if (this.closed)
        throw new DOMException("Connection closed", "InvalidStateError");
      return {
        objectStore() {
          return {
            getAll() {
              const request = {};
              queueMicrotask(() => {
                request.result = [];
                request.onsuccess();
              });
              return request;
            },
            get() {
              const request = {};
              queueMicrotask(() => {
                request.result = value;
                request.onsuccess();
              });
              return request;
            },
          };
        },
      };
    },
  };
}
test("C5: a failed open permits a later independent read", async () => {
  let opens = 0;
  const store = await freshStore({
    open() {
      const request = {};
      const number = ++opens;
      queueMicrotask(() => {
        if (number === 1) {
          request.error = new Error("Injected open failure");
          request.onerror();
        } else {
          request.result = fakeDatabase({ value: "retained" });
          request.onsuccess();
        }
      });
      return request;
    },
  });
  await assert.rejects(store.readRecord("profiles", "demo:test"), /Injected/);
  assert.deepEqual(await store.readRecord("profiles", "demo:test"), {
    value: "retained",
  });
  assert.equal(opens, 2);
});
test("C5: versionchange closes old connection and next read reopens", async () => {
  const connections = [];
  const store = await freshStore({
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = fakeDatabase();
        connections.push(request.result);
        request.onsuccess();
      });
      return request;
    },
  });
  await store.readRecord("profiles", "demo:test");
  assert.equal(typeof connections[0].onversionchange, "function");
  connections[0].onversionchange();
  assert.equal(connections[0].closed, true);
  await store.readRecord("profiles", "demo:test");
  assert.equal(connections.length, 2);
});
test("C5: a closed transaction fails once, later read reconnects", async () => {
  const connections = [];
  const store = await freshStore({
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = fakeDatabase();
        connections.push(request.result);
        request.onsuccess();
      });
      return request;
    },
  });
  await store.readRecord("profiles", "demo:test");
  connections[0].close();
  await assert.rejects(
    store.readRecord("profiles", "demo:test"),
    /Connection closed/,
  );
  assert.equal(connections.length, 1, "No automatic operation replay");
  await store.readRecord("profiles", "demo:test");
  assert.equal(connections.length, 2);
});
test("C5: blocked late success closes only abandoned connection", async () => {
  const requests = [];
  const store = await freshStore({
    open() {
      const r = {};
      requests.push(r);
      return r;
    },
  });
  const first = store.readRecord("profiles", "demo:test");
  const rejected = assert.rejects(first, /blocked/);
  requests[0].onblocked();
  await rejected;
  const second = store.readRecord("profiles", "demo:test");
  const current = fakeDatabase({ value: "current" });
  requests[1].result = current;
  requests[1].onsuccess();
  assert.deepEqual(await second, { value: "current" });
  const abandoned = fakeDatabase();
  requests[0].result = abandoned;
  requests[0].onsuccess();
  assert.equal(abandoned.closed, true);
  assert.equal(current.closed, false);
  await store.readRecord("profiles", "demo:test");
  assert.equal(requests.length, 2);
});
test("C5: connection close event allows next independent operation", async () => {
  const connections = [];
  const store = await freshStore({
    open() {
      const r = {};
      queueMicrotask(() => {
        r.result = fakeDatabase();
        connections.push(r.result);
        r.onsuccess();
      });
      return r;
    },
  });
  await store.readRecord("profiles", "demo:test");
  connections[0].onclose();
  assert.deepEqual(await store.listRecords("profiles"), []);
  assert.equal(connections.length, 2);
});
test("C5: aborted uncertain write is never replayed", async () => {
  let opens = 0,
    writes = 0;
  const store = await freshStore({
    open() {
      opens++;
      const r = {};
      queueMicrotask(() => {
        r.result = {
          close() {},
          transaction() {
            const tx = {
              objectStore() {
                return {
                  get() {
                    const request = {};
                    queueMicrotask(() => {
                      request.result = null;
                      request.onsuccess();
                    });
                    return request;
                  },
                  put() {
                    writes++;
                    queueMicrotask(() => {
                      tx.error = new Error("Injected uncertain abort");
                      tx.onabort();
                    });
                  },
                };
              },
            };
            return tx;
          },
        };
        r.onsuccess();
      });
      return r;
    },
  });
  await assert.rejects(
    store.commitRecord("content", "demo:test", { revision: 0 }, 0),
    /uncertain abort/,
  );
  assert.equal(writes, 1);
  assert.equal(opens, 1);
});

// Minimal atomic IDB model: writes become durable only on completion, abort
// retains both current and previous. This exercises the real store module.
async function atomicStore(initial) {
  let record = structuredClone(initial),
    puts = 0;
  const store = await freshStore({
    open() {
      const r = {};
      queueMicrotask(() => {
        r.result = {
          close() {},
          transaction() {
            const tx = {
              abort() {
                queueMicrotask(() => tx.onabort());
              },
              objectStore() {
                return {
                  get() {
                    const request = {};
                    queueMicrotask(() => {
                      request.result = structuredClone(record);
                      request.onsuccess();
                    });
                    return request;
                  },
                  put(value) {
                    puts++;
                    queueMicrotask(() => {
                      record = structuredClone(value);
                      tx.oncomplete();
                    });
                  },
                };
              },
            };
            return tx;
          },
        };
        r.onsuccess();
      });
      return r;
    },
  });
  return { store, read: () => structuredClone(record), puts: () => puts };
}
test("B12 exact post-CAS revision byte boundary refuses atomically", async () => {
  const { newProfile, validateProfile } = await import(
    "../../src/domain/profile.mjs"
  );
  const { LIMITS } = await import("../../src/content/limits.mjs");
  const p = newProfile({
    schemaVersion: 2,
    id: "test:limit",
    contentVersion: "x",
  });
  p.revision = 9;
  const bytes = () => Buffer.byteLength(JSON.stringify(p));
  const count = Math.floor((LIMITS.profileBytes - bytes() + 1) / 105);
  for (let index = 0; index < count; index++)
    p.inventory[`item:${String(index).padStart(95, "0")}`] = 0;
  const remaining = LIMITS.profileBytes - bytes();
  if (remaining) p.inventory[`i:${"x".repeat(remaining - 7)}`] = 0;
  assert.equal(bytes(), LIMITS.profileBytes);
  validateProfile(p);
  const { readFile } = await import("node:fs/promises");
  const vm = await import("node:vm");
  const common = await readFile("src/client/common.mjs", "utf8");
  const download = common
    .slice(
      common.indexOf("export function download("),
      common.indexOf("let draftGuard ="),
    )
    .replace("export function", "function");
  let blob;
  vm.runInNewContext(`${download}; download("private.json", profile);`, {
    profile: p,
    Blob,
    URL: {
      createObjectURL(value) {
        blob = value;
        return "blob:synthetic";
      },
      revokeObjectURL() {},
    },
    document: {
      createElement() {
        return { click() {} };
      },
    },
    setTimeout() {},
  });
  assert.equal(blob.size, LIMITS.profileBytes);
  const { parseProfile } = await import("../../src/domain/profile.mjs");
  assert.deepEqual(parseProfile(await blob.text()), p);
  const before = { value: p, previous: { original: "retained" } };
  const db = await atomicStore(before);
  await assert.rejects(db.store.saveProfile(p, 9), /byte limit/i);
  assert.equal(db.puts(), 0);
  assert.deepEqual(db.read(), before);
  const small = structuredClone(p);
  delete small.inventory[Object.keys(small.inventory)[0]];
  const saved = await db.store.saveProfile(small, 9);
  assert.equal(saved.revision, 10);
  validateProfile(saved);
  assert.deepEqual(db.read().previous, p);
});
test("B12 exhausted revision refuses without replacing current or previous", async () => {
  const { newProfile } = await import("../../src/domain/profile.mjs");
  const p = newProfile({
    schemaVersion: 2,
    id: "test:limit",
    contentVersion: "x",
  });
  p.revision = Number.MAX_SAFE_INTEGER;
  const before = { value: p, previous: { original: "retained" } };
  const db = await atomicStore(before);
  await assert.rejects(db.store.saveProfile(p, p.revision), /revision limit/i);
  assert.equal(db.puts(), 0);
  assert.deepEqual(db.read(), before);
});
