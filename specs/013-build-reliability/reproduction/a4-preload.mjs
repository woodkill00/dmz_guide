// Synthetic test-only scheduling hook. It never changes file contents or returns fake I/O.
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { relative } from 'node:path';
const gates = JSON.parse(process.env.A4_GATES || '[]');
const counts = new Map();
const originalOpen = fs.open;
async function barrier(event, path, count) {
  const gate = gates.find(g => !g.used && g.event === event && g.path === path && g.count === count);
  if (!gate) return;
  gate.used = true;
  await new Promise((resolve) => {
    const onMessage = message => {
      if (message?.resume !== gate.id) return;
      process.off('message', onMessage);
      resolve();
    };
    process.on('message', onMessage);
    process.send({ gate: gate.id, event, path, count });
  });
}
fs.open = async function(path, ...args) {
  const rel = relative(process.cwd(), String(path)).replaceAll('\\', '/');
  const count = (counts.get(rel) || 0) + 1;
  counts.set(rel, count);
  await barrier('open', rel, count);
  const handle = await originalOpen.call(this, path, ...args);
  const close = handle.close.bind(handle);
  handle.close = async () => {
    const result = await close();
    await barrier('close', rel, count);
    return result;
  };
  return handle;
};
syncBuiltinESMExports();
