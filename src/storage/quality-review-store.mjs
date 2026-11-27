import { readExistingRecord } from "./summary-read.mjs";
import { validateQualityLog } from "../domain/site-quality.mjs";
const databaseName = "dmz-editorial-local",
  storeName = "reviews",
  recordKey = "site-quality";
function validateRecord(record) {
  if (
    !record ||
    Array.isArray(record) ||
    Object.keys(record).sort().join() !== "revision,value" ||
    !Number.isSafeInteger(record.revision) ||
    record.revision < 1
  )
    throw Error(
      "Invalid saved editorial record; export/recover before replacing it",
    );
  validateQualityLog(record.value);
  return record;
}
export async function readQualityReviews() {
  const record = await readExistingRecord(databaseName, storeName, recordKey, {
    preserveUndefined: true,
  });
  return record === undefined || record.length === 0
    ? null
    : validateRecord(record[0]);
}
export async function saveQualityReviews(candidate, expectedRevision) {
  validateQualityLog(candidate);
  if (
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    expectedRevision >= Number.MAX_SAFE_INTEGER
  )
    throw Error("Invalid editorial revision");
  const db = await new Promise((resolve, reject) => {
    if (!globalThis.indexedDB)
      return reject(Error("Editorial storage unavailable; export your notes"));
    let rejected = false;
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      rejected = true;
      reject(Error("Editorial database blocked; close other review tabs"));
    };
    request.onsuccess = () => {
      if (rejected) {
        request.result.close();
        return;
      }
      resolve(request.result);
    };
  });
  return new Promise((resolve, reject) => {
    let tx, error, result;
    const finish = (reason) => {
      db.close();
      reason ? reject(reason) : resolve(result);
    };
    try {
      tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName),
        request = store.getAll(recordKey, 1);
      request.onsuccess = () => {
        try {
          const current =
            request.result.length === 0
              ? null
              : validateRecord(request.result[0]);
          if ((current?.revision || 0) !== expectedRevision)
            throw Error(
              "Another tab changed editorial reviews. Export your notes, then Reload reviews.",
            );
          result = {
            value: structuredClone(candidate),
            revision: expectedRevision + 1,
          };
          store.put(result, recordKey);
        } catch (reason) {
          error = reason;
          tx.abort();
        }
      };
      tx.oncomplete = () => finish();
      tx.onabort = () =>
        finish(error || tx.error || Error("Editorial save aborted"));
      tx.onerror = () =>
        finish(error || tx.error || Error("Editorial save failed"));
    } catch (reason) {
      finish(reason);
    }
  });
}
