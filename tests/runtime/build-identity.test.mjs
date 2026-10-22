import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  captureBuildSources,
  createBuildIdentity,
  describeGit,
  identityDigest,
} from "../../scripts/build-identity.mjs";
test("identity binds captured content and output, not later mutable catalog files", () => {
  const options = {
    sourceFiles: { "schemas/pack.schema.json": "a".repeat(64) },
    catalogFiles: new Map([
      ["content/catalog/manifest.json", Buffer.from("captured")],
    ]),
    packs: [["fixture", Buffer.from("assembled")]],
    mediaFiles: [],
    outputFiles: new Map([["index.html", "b".repeat(64)]]),
    git: { revision: null, dirty: "unknown" },
  };
  const first = createBuildIdentity(options);
  assert.equal(
    first.capturedCatalogFiles["content/catalog/manifest.json"],
    identityDigest("captured"),
  );
  assert.deepEqual(first, createBuildIdentity(options));
  options.outputFiles.set("index.html", "c".repeat(64));
  assert.notEqual(first.buildId, createBuildIdentity(options).buildId);
});
test("static source changes are detected and missing Git is honestly unknown", async () => {
  const root = await mkdtemp(join(tmpdir(), "dmz-identity-"));
  try {
    for (const name of ["src", "schemas", "scripts", "content"])
      await mkdir(join(root, name));
    for (const name of [
      "content/site.json",
      "package.json",
      "package-lock.json",
      "schemas/pack.schema.json",
      "src/test.mjs",
    ])
      await writeFile(join(root, name), "{}");
    const first = await captureBuildSources(root);
    await writeFile(join(root, "src/test.mjs"), "changed");
    const after = await captureBuildSources(root);
    assert.notDeepEqual(first, after);
    assert.deepEqual(await describeGit(root), {
      revision: null,
      dirty: "unknown",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("generated Python caches are excluded from source evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "dmz-identity-cache-"));
  try {
    for (const name of ["src", "schemas", "scripts", "content"])
      await mkdir(join(root, name));
    for (const name of [
      "content/site.json",
      "package.json",
      "package-lock.json",
      "schemas/pack.schema.json",
    ])
      await writeFile(join(root, name), "{}");
    const first = await captureBuildSources(root);
    await mkdir(join(root, "scripts/__pycache__"));
    await writeFile(
      join(root, "scripts/__pycache__/generated.pyc"),
      "generated",
    );
    await writeFile(join(root, "scripts/generated.pyo"), "generated");
    assert.deepEqual(await captureBuildSources(root), first);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
