import test from "node:test";
import assert from "node:assert/strict";
import {
  cp,
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  readdir,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const source = fileURLToPath(new URL("../..", import.meta.url));
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "dmz-build-cli-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const part of ["scripts", "src", "content", "schemas", "media"])
    await cp(join(source, part), join(root, part), { recursive: true });
  await mkdir(join(root, "dist"));
  await writeFile(join(root, "dist/index.html"), "OLD usable reader");
  await writeFile(join(root, "dist/old-only.txt"), "OLD sentinel");
  return root;
}
function build(root, preload) {
  return spawnSync(
    process.execPath,
    [...(preload ? ["--import", preload] : []), "scripts/build.mjs"],
    { cwd: root, encoding: "utf8", timeout: 30000 },
  );
}
for (const operation of ["write", "copy", "promote"]) {
  test(`actual build ${operation} failure retains OLD and never logs fresh success`, async (t) => {
    const root = await fixture(t);
    const preload = join(root, "failure.mjs");
    await writeFile(
      preload,
      `import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
const write = fs.writeFile, copy = fs.cp, rename = fs.rename;
let writes = 0;
fs.writeFile = async function(path, ...args) {
 if (${JSON.stringify(operation)} === 'write' && String(path).includes('candidate-') && ++writes === 2)
  throw new Error('Synthetic second-page write EIO');
 return write.call(this, path, ...args);
};
fs.cp = async function(...args) {
 if (${JSON.stringify(operation)} === 'copy') throw new Error('Synthetic copy EIO');
 return copy.apply(this,args);
};
fs.rename = async function(from, to) {
 if (${JSON.stringify(operation)} === 'promote' && String(from).includes('candidate-')) throw new Error('Synthetic promotion EPERM');
 return rename.call(this,from,to);
};
syncBuiltinESMExports();`,
    );
    const result = build(root, preload);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /OLD build retained at/);
    assert.doesNotMatch(result.stdout, /Built \d/);
    assert.equal(
      await readFile(join(root, "dist/index.html"), "utf8"),
      "OLD usable reader",
    );
    assert.equal(
      await readFile(join(root, "dist/old-only.txt"), "utf8"),
      "OLD sentinel",
    );
  });
}
test("actual source validation failure reports retained OLD instead of uncaught success", async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, "schemas/pack.schema.json"), "invalid JSON");
  const result = build(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /OLD build retained at/);
  assert.doesNotMatch(result.stdout, /Built \d/);
  assert.equal(
    await readFile(join(root, "dist/index.html"), "utf8"),
    "OLD usable reader",
  );
});
test("process exit between promotion steps preserves OLD recovery tree and blocks silent retry", async (t) => {
  const root = await fixture(t);
  const preload = join(root, "crash.mjs");
  await writeFile(
    preload,
    `import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
const rename = fs.rename;
fs.rename = async function(from,to) {
 await rename.call(this,from,to);
 if (String(to).includes('previous-')) process.exit(29);
};
syncBuiltinESMExports();`,
  );
  const result = build(root, preload);
  assert.equal(result.status, 29, result.stderr);
  assert.doesNotMatch(result.stdout, /Built \d/);
  const entries = await readdir(join(root, ".build-state"));
  const previous = entries.find((name) => name.startsWith("previous-"));
  assert(previous);
  assert.equal(
    await readFile(join(root, ".build-state", previous, "index.html"), "utf8"),
    "OLD usable reader",
  );
  const lock = await readFile(join(root, ".build-state/current.lock"));
  const retry = build(root);
  assert.equal(retry.status, 1);
  assert.match(retry.stderr, /Another build or interrupted build/);
  assert.deepEqual(
    await readFile(join(root, ".build-state/current.lock")),
    lock,
  );
  assert.deepEqual(
    (await readdir(join(root, ".build-state"))).sort(),
    entries.sort(),
  );
});

for (const omitted of ["pack", "media", "module"]) {
  test(`actual build rejects silently omitted ${omitted} before replacing OLD`, async (t) => {
    const root = await fixture(t);
    const preload = join(root, "omit.mjs");
    await writeFile(
      preload,
      `import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
const write = fs.writeFile, copy = fs.cp;
const omitted = ${JSON.stringify(omitted)};
fs.writeFile = async function(path, ...args) {
 const value = String(path).replaceAll('\\\\','/');
 if (value.includes('candidate-') && ((omitted === 'pack' && value.includes('/assets/content/packs/')) || (omitted === 'media' && /\\.(?:png|jpg|jpeg|webp)$/.test(value)))) return;
 return write.call(this,path,...args);
};
fs.cp = async function(from, to, ...args) {
 await copy.call(this,from,to,...args);
 if (omitted === 'module' && String(to).replaceAll('\\\\','/').endsWith('/assets/src')) await fs.unlink(String(to) + '/ui/render.mjs');
};
syncBuiltinESMExports();`,
    );
    const result = build(root, preload);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /OLD build retained at/);
    assert.doesNotMatch(result.stdout, /Built \d/);
    assert.equal(
      await readFile(join(root, "dist/index.html"), "utf8"),
      "OLD usable reader",
    );
  });
}
