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
