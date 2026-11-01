import { emptyArmory, validateArmory } from "../domain/armory-workspace.mjs";
let opened;
function database() {
  if (!opened) {
    const work = new Promise((resolve, reject) => {
      let rejected = false;
      if (!globalThis.indexedDB)
        return reject(new Error("Private browser storage is unavailable"));
      const r = indexedDB.open("dmz-armory-local", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("workspace");
      r.onerror = () => reject(r.error);
      r.onblocked = () => {
        rejected = true;
        reject(new Error("Close other armory tabs before opening storage"));
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
export async function readArmory() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspace", "readonly"),
      r = tx.objectStore("workspace").get("main");
    r.onsuccess = () =>
      resolve(r.result || { value: emptyArmory(), previous: null });
    r.onerror = () => reject(r.error);
  });
}
export async function saveArmory(candidate, expectedRevision) {
  validateArmory(candidate);
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspace", "readwrite"),
      store = tx.objectStore("workspace"),
      r = store.get("main");
    let result, error;
    r.onsuccess = () => {
      try {
        const current = r.result?.value || emptyArmory();
        if (current.revision !== expectedRevision)
          throw new Error(
            "Another tab saved newer armory data. Export your unsaved work, then reload.",
          );
        result = structuredClone(candidate);
        result.revision = expectedRevision + 1;
        validateArmory(result);
        let previous = current;
        try {
          validateArmory(previous);
        } catch {
          previous = r.result?.previous || null;
          if (previous) validateArmory(previous);
        }
        store.put({ value: result, previous }, "main");
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
          new Error("Private save aborted; previous data retained"),
      );
  });
}
