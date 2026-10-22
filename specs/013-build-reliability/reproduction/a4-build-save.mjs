import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
// Investigation artifact pinned to the reviewed baseline, not a production regression test.
const source = process.argv[2] || fileURLToPath(new URL('../../../', import.meta.url));
const preload = fileURLToPath(new URL('./a4-preload.mjs', import.meta.url));
const base = await mkdtemp('/tmp/dmz-a4-');
const baseline = join(base, 'baseline');
await mkdir(baseline);
// Pin source bytes even when another worker is implementing this feature in the worktree.
const archive = execFileSync('git', ['archive', 'db8a6e237aa822205ed346b178a3c7dc8fafea5c', 'scripts', 'src', 'schemas', 'package.json', 'content/site.json'], { cwd: source });
execFileSync('tar', ['-x', '-C', baseline], { input: archive });
const { serializeCatalog, readCatalog } = await import(pathToFileURL(join(baseline, 'scripts/catalog.mjs')));
const { applyFilePlan, inspectRecovery, createAuthorStore } = await import(pathToFileURL(join(baseline, 'scripts/author-store.mjs')));
const schema = JSON.parse(await readFile(join(baseline, 'schemas/pack.schema.json')));
const key = 'a4-synthetic';
const paths = {
  manifest: 'content/catalog/manifest.json',
  header: `content/catalog/${key}/pack.json`,
  alpha: `content/catalog/${key}/items/a4_alpha.json`,
  beta: `content/catalog/${key}/items/a4_beta.json`,
};
function pack(version) {
  return {
    schemaVersion: 1, id: 'a4:synthetic', contentVersion: version,
    game: { id: 'fictional-training', mode: 'test', build: 'synthetic-only' },
    title: 'SYNTHETIC A4 CONSISTENCY FIXTURE', description: 'Original software fixture, not game facts.',
    coverage: { expectedTotal: null, note: 'Fictional' },
    sources: [],
    items: ['alpha', 'beta'].map(name => ({
      id: `a4:${name}`, name: `SYNTHETIC ${name} revision ${version}`, kind: 'item', category: 'material',
      description: 'Original software fixture.', aliases: [], unit: 'count', sourceIds: [], status: 'fictional', stats: [],
    })),
    recipes: [], objectives: [], guides: [], maps: [], locations: [], claims: [], assets: [],
  };
}
const versions = Object.fromEntries(['0','1'].map(version => [version, serializeCatalog({ entries: [{ key, pack: pack(version), assetSources: {} }], schema })]));
async function fixture(name) {
  const root = join(base, name);
  await cp(baseline, root, { recursive: true });
  for (const [path, bytes] of versions['0']) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  }
  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'dist/last-good.txt'), 'SYNTHETIC last-good sentinel\n');
  return root;
}
const summary = value => ({ version: value.contentVersion, alpha: value.items[0].name, beta: value.items[1].name });
function build(root, gates = [], onGate = async () => {}) {
  let stdout = '', stderr = '', failure;
  const seen = [];
  const child = spawn(process.execPath, ['--import', preload, 'scripts/build.mjs'], {
    cwd: root, env: { ...process.env, A4_GATES: JSON.stringify(gates) }, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  const timeout = setTimeout(() => { failure = new Error('Build timed out'); child.kill(); }, 20000);
  child.stdout.on('data', data => stdout += data);
  child.stderr.on('data', data => stderr += data);
  child.on('message', message => {
    if (!message?.gate) return;
    seen.push(message.gate);
    Promise.resolve(onGate(message.gate)).then(() => child.send({ resume: message.gate })).catch(error => { failure = error; child.kill(); });
  });
  return new Promise((resolve, reject) => child.on('exit', (status, signal) => {
    clearTimeout(timeout);
    if (failure) return reject(failure);
    resolve({ status, signal, stdout: stdout.trim(), stderr: stderr.trim(), gates: seen });
  }));
}
function gate(id, event, path, count) { return { id, event, path, count }; }
async function built(root) {
  const output = summary(JSON.parse(await readFile(join(root, `dist/assets/content/packs/${key}.json`))));
  for (const name of ['alpha', 'beta']) {
    const page = await readFile(join(root, `dist/items/a4--${name}/index.html`), 'utf8');
    assert(page.includes(output[name]), `Generated ${name} HTML must match the built catalog`);
  }
  return output;
}
async function stateDigest(root) {
  const hash = createHash('sha256');
  async function walk(path) {
    const entries = (await readdir(join(root, path), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const next = `${path}/${entry.name}`;
      if (entry.isDirectory()) await walk(next);
      else hash.update(next).update('\0').update(await readFile(join(root, next))).update('\0');
    }
  }
  await walk('.author-state');
  return hash.digest('hex');
}
async function verifyPendingUnchanged(root, before) {
  assert.equal(await readFile(join(root, '.author-state/journal.json'), 'utf8'), before);
  assert.equal(await readFile(join(root, 'dist/last-good.txt'), 'utf8'), 'SYNTHETIC last-good sentinel\n');
}
const report = { baseline: 'db8a6e237aa822205ed346b178a3c7dc8fafea5c', node: process.version, platform: process.platform, root: base, hashes: {}, scenarios: [] };
for (const path of ['scripts/build.mjs', 'scripts/catalog.mjs', 'scripts/author-store.mjs']) report.hashes[path] = createHash('sha256').update(await readFile(join(baseline, path))).digest('hex');
{
  const root = await fixture('baseline-build');
  const result = await build(root);
  assert.equal(result.status, 0);
  report.scenarios.push({ name: 'baseline-old-revision', ...result, output: await built(root) });
}
{
  const root = await fixture('pending-before-build');
  await assert.rejects(applyFilePlan({ root, before: versions['0'], after: versions['1'], failpoint: (phase, index) => { if (phase === 'applied' && index === 0) throw new Error('SYNTHETIC interrupted save'); } }), { code: 'RECOVERY_REQUIRED' });
  const journal = await readFile(join(root, '.author-state/journal.json'), 'utf8');
  const recoveryDigest = await stateDigest(root);
  const result = await build(root);
  assert.equal(await stateDigest(root), recoveryDigest);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Repository recovery pending/);
  await verifyPendingUnchanged(root, journal);
  report.scenarios.push({ name: 'pending-before-build', ...result, recovery: await inspectRecovery({ root }), recoveryTreeUnchanged: true, journalUnchanged: true, lastGoodSentinelPreserved: true });
}
{
  const root = await fixture('pending-after-process-exit');
  const writerCode = `
    import { readFile } from 'node:fs/promises';
    import { readCatalog, serializeCatalog } from ${JSON.stringify(pathToFileURL(join(baseline, 'scripts/catalog.mjs')).href)};
    import { applyFilePlan } from ${JSON.stringify(pathToFileURL(join(baseline, 'scripts/author-store.mjs')).href)};
    const root = process.argv[1];
    const schema = JSON.parse(await readFile(root + '/schemas/pack.schema.json'));
    const snapshot = await readCatalog({ root, schema });
    const entries = structuredClone(snapshot.entries);
    entries[0].pack.contentVersion = '1';
    for (const item of entries[0].pack.items) item.name = item.name.replace('revision 0', 'revision 1');
    await applyFilePlan({ root, before: snapshot.files, after: serializeCatalog({ entries, schema }), failpoint: (phase, index) => { if (phase === 'applied' && index === 0) process.exit(29); } });
  `;
  assert.throws(() => execFileSync(process.execPath, ['--input-type=module', '-e', writerCode, root], { stdio: 'pipe' }), error => error.status === 29);
  const journal = await readFile(join(root, '.author-state/journal.json'), 'utf8');
  const recoveryDigest = await stateDigest(root);
  const result = await build(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Repository recovery pending/);
  const recovery = await inspectRecovery({ root });
  assert.equal(recovery.pending, true);
  assert.equal(recovery.lock.state, 'dead');
  await verifyPendingUnchanged(root, journal);
  assert.equal(await stateDigest(root), recoveryDigest);
  report.scenarios.push({ name: 'pending-after-process-exit', ...result, writerExitStatus: 29, recovery, recoveryTreeUnchanged: true, journalUnchanged: true, lastGoodSentinelPreserved: true });
}
{
  const root = await fixture('writer-active-mid-read');
  let resumeWriter, writerPaused, writer;
  const paused = new Promise(resolve => writerPaused = resolve);
  const held = new Promise(resolve => resumeWriter = resolve);
  const result = await build(root, [gate('start-writer', 'open', paths.beta, 1)], async () => {
    writer = applyFilePlan({ root, before: versions['0'], after: versions['1'], failpoint: async (phase, index) => { if (phase === 'applied' && index === 1) { writerPaused(); await held; } } });
    await paused;
  });
  const journal = await readFile(join(root, '.author-state/journal.json'), 'utf8');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Repository changed during read/);
  await verifyPendingUnchanged(root, journal);
  report.scenarios.push({ name: 'writer-active-mid-read', ...result, journalUnchanged: true, lastGoodSentinelPreserved: true });
  resumeWriter(); await writer;
}
{
  const root = await fixture('single-commit-mid-read');
  const store = await createAuthorStore({ root, schema });
  const initial = await store.read();
  const result = await build(root, [gate('commit-new', 'open', paths.beta, 1)], async () => {
    await store.save({ packKey: key, expectedRevision: initial.revision, pack: pack('1') });
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Catalog source changed during snapshot/);
  assert.equal(await readFile(join(root, 'dist/last-good.txt'), 'utf8'), 'SYNTHETIC last-good sentinel\n');
  report.scenarios.push({ name: 'single-completed-save-mid-read', ...result, lastGoodSentinelPreserved: true });
}
{
  const root = await fixture('repeated-save-aba');
  const store = await createAuthorStore({ root, schema });
  let state = await store.read();
  const saved = [summary(state.entries[0].pack)];
  const result = await build(root, [
    gate('commit-1', 'open', paths.beta, 1),
    gate('commit-0', 'open', paths.manifest, 2),
    gate('commit-1-again', 'close', paths.alpha, 2),
  ], async id => {
    state = await store.save({ packKey: key, expectedRevision: state.revision, pack: pack(id === 'commit-0' ? '0' : '1') });
    saved.push(summary(state.entry.pack));
  });
  assert.equal(result.status, 0);
  const output = await built(root);
  assert.deepEqual(output, { version: '0', alpha: 'SYNTHETIC alpha revision 0', beta: 'SYNTHETIC beta revision 1' });
  assert(saved.every(snapshot => JSON.stringify(snapshot) !== JSON.stringify(output)));
  assert.equal((await inspectRecovery({ root })).pending, false);
  report.scenarios.push({ name: 'repeated-completed-saves-aba', ...result, committedRevisions: saved, output, outputMatchesNoCommittedRevision: true, pendingRecovery: false });
}
await writeFile(join(base, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
