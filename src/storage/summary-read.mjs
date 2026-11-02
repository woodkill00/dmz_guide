export function readExistingRecord(
  name,
  store,
  key,
  { signal, timeout = 1500 } = {},
) {
  return new Promise((resolve, reject) => {
    let db,
      tx,
      settled = false;
    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      db?.close();
      err ? reject(err) : resolve(value);
    };
    const abort = () => {
      try {
        tx?.abort();
      } catch {}
      finish(Error("Summary read cancelled or timed out"));
    };
    const timer = setTimeout(abort, timeout);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) return abort();
    if (!globalThis.indexedDB)
      return finish(Error("Browser storage unavailable"));
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => {
      r.transaction.abort();
      finish(null, undefined);
    };
    r.onerror = () => finish(r.error);
    r.onblocked = () => finish(Error("Summary read blocked"));
    r.onsuccess = () => {
      db = r.result;
      if (settled) {
        db.close();
        return;
      }
      try {
        tx = db.transaction(store, "readonly");
        const q = tx.objectStore(store).get(key);
        let value;
        q.onsuccess = () => (value = q.result);
        tx.oncomplete = () => finish(null, value);
        tx.onabort = () => finish(tx.error || Error("Summary read aborted"));
        tx.onerror = () => finish(tx.error);
      } catch (e) {
        finish(e);
      }
    };
  });
}
