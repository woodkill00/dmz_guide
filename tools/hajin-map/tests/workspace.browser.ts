// Executed by the existing synthetic-only browser harness; never fetch provider data.
import assert from 'node:assert/strict';

export async function runWorkspaceBrowser(page, base) {
  const result = await page.evaluate(async base => {
    const { parseSnapshot } = await import(`${base}/src/workspace/validation.ts`);
    const value = { schemaVersion: 1, sourceId: 'synthetic', acquisitionStatus: 'authorized' };
    try { parseSnapshot(JSON.stringify(value), 'synthetic'); return false; }
    catch { return true; }
  }, base);
  assert.equal(result, true, 'Browser boundary rejects imported permission upgrades.');
  const storage = await page.evaluate(async base => {
    const { openWorkspace } = await import(`${base}/src/workspace/store.ts`);
    const name = `dmz-map-workspace-test-${crypto.randomUUID()}`;
    const a = await openWorkspace({ name }), b = await openWorkspace({ name });
    const initial = await a.read();
    await a.commit({ note: 'first synthetic revision' }, 0);
    let conflict = false;
    try { await b.commit({ note: 'unsaved tab draft' }, 0); } catch (error) { conflict = error.name === 'RevisionConflict'; }
    const draft = b.getDraft(), exportedDraft = JSON.parse(b.exportDraft());
    await a.commit({ note: 'second synthetic revision' }, 1);
    const beforeAbort = await a.read();
    // Inject a quota abort after one write is already queued. Both writes must roll back.
    const originalPut = IDBObjectStore.prototype.put;
    let writes = 0, quota = false;
    IDBObjectStore.prototype.put = function (...args) {
      if (++writes === 2) throw new DOMException('Synthetic quota exhaustion', 'QuotaExceededError');
      return originalPut.apply(this, args);
    };
    try { await a.commit({ note: 'must not persist' }, 2); } catch (error) { quota = error.name === 'QuotaExceededError'; }
    finally { IDBObjectStore.prototype.put = originalPut; }
    const afterAbort = await a.read(), quotaDraft = a.getDraft();
    await a.restorePrevious(2);
    const recovered = await b.read();
    a.close(); b.close();
    const reopened = await openWorkspace({ name }), persisted = await reopened.read();
    // A real versionchange must close our connection, not silently accept future saves.
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 2);
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
    let closed = false;
    try { await reopened.commit({ note: 'after versionchange' }, 3); } catch (error) { closed = error.message.includes('closed'); }
    const closedDraft = reopened.getDraft();
    reopened.close();
    await new Promise((resolve, reject) => { const request = indexedDB.deleteDatabase(name); request.onsuccess = resolve; request.onerror = () => reject(request.error); });
    return { initial, conflict, draft, exportedDraft, beforeAbort, afterAbort, quota, quotaDraft, recovered, persisted, closed, closedDraft };
  }, base);
  assert.deepEqual(storage.initial, { current: null, previous: null });
  assert.equal(storage.conflict, true);
  assert.deepEqual(storage.draft, { note: 'unsaved tab draft' });
  assert.deepEqual(storage.exportedDraft, storage.draft);
  assert.equal(storage.quota, true);
  assert.deepEqual(storage.afterAbort, storage.beforeAbort);
  assert.deepEqual(storage.quotaDraft, { note: 'must not persist' });
  assert.equal(storage.recovered.current.revision, 3);
  assert.equal(storage.recovered.current.data.note, 'first synthetic revision');
  assert.deepEqual(storage.persisted, storage.recovered);
  assert.equal(storage.closed, true);
  assert.deepEqual(storage.closedDraft, { note: 'after versionchange' });
  const migration = await page.evaluate(async base => {
    const { openWorkspace } = await import(`${base}/src/workspace/store.ts`);
    const { planLegacyMaskMigration, stageMaskMigration } = await import(`${base}/src/workspace/migration.ts`);
    const name = `dmz-map-workspace-test-${crypto.randomUUID()}`, store = await openWorkspace({ name });
    const raw = JSON.stringify({ version: 1, master: false, selection: 'mixed', enabled: ['one'] });
    let writes = 0;
    const legacy = { getItem: () => raw, setItem: () => { writes++; } };
    const plan = planLegacyMaskMigration(legacy, { official: ['one', 'two'] }, ['official']);
    const staged = stageMaskMigration(await store.read(), plan);
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => { throw new DOMException('Synthetic migration quota failure', 'QuotaExceededError'); };
    let failed = false;
    try { await store.commit(staged.data, staged.expectedRevision); } catch { failed = true; }
    finally { IDBObjectStore.prototype.put = original; }
    const afterFailure = await store.read();
    await store.commit(staged.data, staged.expectedRevision);
    const saved = await store.read(), repeated = stageMaskMigration(saved, plan);
    store.close();
    await new Promise((resolve, reject) => { const req = indexedDB.deleteDatabase(name); req.onsuccess = resolve; req.onerror = () => reject(req.error); });
    return { failed, afterFailure, saved, alreadyApplied: repeated.alreadyApplied, legacyWrites: writes, rawUnchanged: legacy.getItem() === raw };
  }, base);
  assert.equal(migration.failed, true);
  assert.deepEqual(migration.afterFailure, { current: null, previous: null });
  assert.equal(migration.saved.current.data.visibility.sourceEnabled.official, false);
  assert.deepEqual(migration.saved.current.data.migrations, ['source-masks-v1']);
  assert.equal(migration.alreadyApplied, true);
  assert.equal(migration.legacyWrites, 0);
  assert.equal(migration.rawUnchanged, true);
  return ['workspace browser entrypoint and inert snapshot boundary', 'separate IndexedDB CAS, quota rollback, drafts, recovery, reopen and versionchange', 'one-time mask migration marker/state atomicity, failed migration recovery and untouched legacy state'];
}
