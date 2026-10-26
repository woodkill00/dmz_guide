// Discover tests ourselves so Windows and Unix shells run the same files.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = readdirSync(new URL('../tests/', import.meta.url))
  .filter(name => name.endsWith('.test.ts')).sort().map(name => `tests/${name}`);
if (!files.length) throw new Error('No map unit tests discovered.');
const run = spawnSync(process.execPath, ['--experimental-strip-types', '--test', ...files], { stdio: 'inherit' });
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
