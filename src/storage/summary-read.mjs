export function readExistingRecord(
  name,
  store,
  key,
  { signal, timeout = 1500, preserveUndefined = false } = {},
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
    const openExisting = () => {
      if (settled) return;
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
          const q = preserveUndefined
            ? tx.objectStore(store).getAll(key, 1)
            : tx.objectStore(store).get(key);
          let value;
          q.onsuccess = () => (value = q.result);
          tx.oncomplete = () => finish(null, value);
          tx.onabort = () => finish(tx.error || Error("Summary read aborted"));
          tx.onerror = () => finish(tx.error);
        } catch (e) {
          finish(e);
        }
      };
    };
    // WebKit can retain an empty database shell even after an aborted upgrade.
    // Enumerate when supported so summary discovery does not open an absent DB.
    if (typeof indexedDB.databases === "function") {
      Promise.resolve()
        .then(() => indexedDB.databases())
        .then((databases) => {
          if (settled) return;
          if (!databases.some((entry) => entry.name === name))
            finish(null, undefined);
          else openExisting();
        })
        .catch((reason) => finish(reason));
    } else openExisting();
  });
}
