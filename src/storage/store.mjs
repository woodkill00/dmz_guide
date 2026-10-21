import { clone } from "../content/limits.mjs";
import { validateProfile } from "../domain/profile.mjs";
let dbPromise;
function database() {
  if (!dbPromise)
    dbPromise = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB)
        return reject(new Error("Browser storage unavailable"));
      const r = indexedDB.open("dmz-guide-local", 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore("profiles");
        r.result.createObjectStore("content");
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () =>
        reject(new Error("Storage upgrade blocked; close other guide tabs"));
    });
  return dbPromise;
}
export async function readRecord(store, key) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const r = tx.objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}
export async function commitRecord(
  store,
  key,
  value,
  expectedRevision,
  { keepPrevious = true, initialPrevious = null } = {},
) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    let result, error;
    const get = os.get(key);
    get.onsuccess = () => {
      try {
        const old = get.result;
        const actual = old?.value?.revision || 0;
        if (actual !== expectedRevision) {
          error = new Error(
            "Another tab saved newer changes. Export unsaved edits, then reload.",
          );
          tx.abort();
          return;
        }
        const next = clone(value);
        next.revision = actual + 1;
        result = {
          value: next,
          previous: keepPrevious
            ? old?.value || initialPrevious
            : old?.previous || null,
        };
        os.put(result, key);
      } catch (e) {
        error = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result.value);
    tx.onerror = () =>
      reject(error || tx.error || new Error("Storage save failed"));
    tx.onabort = () =>
      reject(error || tx.error || new Error("Storage save aborted"));
  });
}
export const loadProfile = async (id) => await readRecord("profiles", id);
export async function saveProfile(p, expectedRevision) {
  validateProfile(p);
  return commitRecord("profiles", p.packId, p, expectedRevision);
}

export async function listRecords(store) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const r = tx.objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}
