// Synthetic baseline reproduction. Production sources are copied unchanged.
import { cp, mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const source = resolve(process.argv[2] || '.');
const root = await mkdtemp(join(tmpdir(), 'dmz-a3-reproduction-'));
try {
  for (const entry of ['scripts', 'src', 'content', 'schemas', 'media'])
    await cp(join(source, entry), join(root, entry), { recursive: true });
  await mkdir(join(root, 'dist'));
  await writeFile(join(root, 'dist/index.html'), '<h1>OLD usable reader</h1>');
  await writeFile(join(root, 'dist/old-only.txt'), 'OLD sentinel');
  const preload = join(root, 'fail-output-write.mjs');
  await writeFile(preload, `import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { sep } from 'node:path';
const original = fs.writeFile;
let count = 0;
fs.writeFile = async function(path, ...args) {
  if (String(path).includes(sep + 'dist' + sep) && ++count === 2)
    throw Object.assign(new Error('Synthetic EIO: second generated page write'), { code: 'EIO' });
  return original.call(this, path, ...args);
};
syncBuiltinESMExports();\n`);
  const result = spawnSync(process.execPath, ['--import', preload, 'scripts/build.mjs'], { cwd: root, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Synthetic EIO/);
  const current = await readFile(join(root, 'dist/index.html'), 'utf8');
  const oldExists = await access(join(root, 'dist/old-only.txt')).then(() => true, () => false);
  assert.equal(oldExists, false);
  assert.notEqual(current, '<h1>OLD usable reader</h1>');
  console.log(JSON.stringify({baseline: 'db8a6e2', injected: 'second generated page write EIO', exit: result.status, oldSentinelRetained: oldExists, oldReaderRetained: current === '<h1>OLD usable reader</h1>', partialReplacementExists: true, diagnosis: 'REPRODUCED: failed build deletes OLD reader and leaves partial replacement'}, null, 2));
} finally {
  await rm(root, { recursive: true, force: true });
}
