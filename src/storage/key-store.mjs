import {
  emptyKeyWorkspace,
  validateKeyWorkspace,
} from "../domain/key-workspace.mjs";
let opened;
function database() {
  if (!opened) {
    const work = new Promise((resolve, reject) => {
      let rejected = false;
      if (!globalThis.indexedDB)
        return reject(new Error("Private browser storage is unavailable"));
      const r = indexedDB.open("dmz-keys-local", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("workspace");
      r.onerror = () => reject(r.error);
      r.onblocked = () => {
        rejected = true;
        reject(
          new Error("Close other key workspace tabs before opening storage"),
        );
      };
      r.onsuccess = () => {
        const db = r.result;
        if (rejected) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          opened = null;
        };
        db.onclose = () => {
          opened = null;
        };
        resolve(db);
      };
    });
    opened = work;
    void work.catch(() => {
      if (opened === work) opened = null;
    });
  }
  return opened;
}

function validateRecord(record) {
  if (
    !record ||
    typeof record !== "object" ||
    Array.isArray(record) ||
    Object.keys(record).sort().join() !== "previous,value"
  )
    throw Error("Invalid saved key record");
  validateKeyWorkspace(record.value);
  if (record.previous !== null) validateKeyWorkspace(record.previous);
  return record;
}
async function getRecord(key) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspace", "readonly"),
      r = tx.objectStore("workspace").get(key);
    let value;
    r.onsuccess = () => (value = r.result);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error || r.error);
    tx.onabort = () => reject(tx.error || Error("Private key read aborted"));
  });
}
export async function readKeyWorkspaceRecord() {
  const record = await getRecord("main");
  return record === undefined
    ? { value: emptyKeyWorkspace(), previous: null }
    : record;
}
export async function readKeyWorkspace() {
  const record = await readKeyWorkspaceRecord();
  try {
    return validateRecord(record);
  } catch {
    const error = Error(
      "Saved key workspace needs recovery; nothing was overwritten",
    );
    error.code = "KEY_CORRUPT";
    throw error;
  }
}
export async function saveKeyWorkspace(candidate, expectedRevision) {
  validateKeyWorkspace(candidate);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspace", "readwrite"),
      store = tx.objectStore("workspace"),
      r = store.get("main");
    let result, error;
    r.onsuccess = () => {
      try {
        const current =
          r.result === undefined
            ? emptyKeyWorkspace()
            : validateRecord(r.result).value;
        if (current.revision !== expectedRevision)
          throw Error(
            "Another tab saved newer key data. Export your draft, then reload saved keys.",
          );
        result = structuredClone(candidate);
        result.revision = expectedRevision + 1;
        validateKeyWorkspace(result);
        store.put({ value: result, previous: current }, "main");
      } catch (reason) {
        error = reason;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(error || tx.error);
    tx.onabort = () =>
      reject(
        error ||
          tx.error ||
          Error("Private key save aborted; previous data retained"),
      );
  });
}
export function keyRecordText(record) {
  const raw = JSON.stringify(record);
  if (
    typeof raw !== "string" ||
    new TextEncoder().encode(raw).length > 2 * 1048576
  )
    throw Error("Recovery record exceeds export limit");
  return raw;
}
export const readKeyQuarantine = () => getRecord("quarantine");
export async function recoverKeyWorkspace(candidate, expectedRecord) {
  validateKeyWorkspace(candidate);
  if (
    typeof expectedRecord !== "string" ||
    new TextEncoder().encode(expectedRecord).length > 2 * 1048576
  )
    throw Error("Invalid recovery reference");
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspace", "readwrite"),
      store = tx.objectStore("workspace"),
      r = store.get("main");
    let result, error;
    const abort = (reason) => {
      error = reason;
      tx.abort();
    };
    r.onsuccess = () => {
      try {
        if (keyRecordText(r.result) !== expectedRecord)
          throw Error("Saved key data changed; preview recovery again");
        let valid = false;
        try {
          validateRecord(r.result);
          valid = true;
        } catch {}
        if (valid)
          throw Error("Saved data is valid now; reload before restoring");
        let previous = emptyKeyWorkspace();
        try {
          validateKeyWorkspace(r.result?.previous);
          previous = r.result.previous;
        } catch {}
        result = structuredClone(candidate);
        result.revision = previous.revision + 1;
        validateKeyWorkspace(result);
        const q = store.get("quarantine");
        q.onsuccess = () => {
          try {
            const history = q.result === undefined ? [] : q.result;
            if (!Array.isArray(history) || history.length >= 8)
              throw Error(
                "Recovery archive is invalid or full; no data changed. Export it for manual recovery",
              );
            for (const item of history) keyRecordText(item);
            const next = [...history, r.result];
            if (
              new TextEncoder().encode(JSON.stringify(next)).length >
              16 * 1048576
            )
              throw Error("Recovery archive exceeds16MiB");
            store.put(next, "quarantine");
            store.put({ value: result, previous }, "main");
          } catch (reason) {
            abort(reason);
          }
        };
      } catch (reason) {
        abort(reason);
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(error || tx.error);
    tx.onabort = () =>
      reject(
        error || tx.error || Error("Recovery aborted; previous data retained"),
      );
  });
}
