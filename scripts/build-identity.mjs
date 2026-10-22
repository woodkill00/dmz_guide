import { lstat, opendir, open } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
export const identityDigest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const sortedHashes = (entries) =>
  Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b, "en")));
export async function captureBuildSources(root) {
  const files = new Map();
  let total = 0,
    entries = 0;
  const stamp = (s) => `${s.dev}:${s.ino}:${s.size}:${s.mtimeMs}:${s.ctimeMs}`;
  async function walk(relative, depth = 0) {
    if (
      relative.split("/").some((part) => part === "__pycache__") ||
      /\.py[co]$/.test(relative)
    )
      return;
    if (depth > 16 || ++entries > 50000)
      throw new Error("Build identity source scan limit reached");
    const path = join(root, relative),
      stat = await lstat(path);
    if (stat.isSymbolicLink())
      throw new Error("Build identity source cannot be a symlink");
    if (stat.isDirectory()) {
      for await (const entry of await opendir(path))
        await walk(`${relative}/${entry.name}`, depth + 1);
    } else if (stat.isFile()) {
      if (stat.size > 64 * 1024 * 1024 || total + stat.size > 128 * 1024 * 1024)
        throw new Error("Build identity source byte limit reached");
      const handle = await open(
        path,
        constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
      );
      try {
        if (stamp(await handle.stat()) !== stamp(stat))
          throw new Error("Build identity source changed during capture");
        const buffer = Buffer.alloc(stat.size + 1);
        let count = 0;
        while (count < buffer.length) {
          const part = await handle.read(
            buffer,
            count,
            buffer.length - count,
            count,
          );
          if (!part.bytesRead) break;
          count += part.bytesRead;
        }
        if (count !== stat.size || stamp(await handle.stat()) !== stamp(stat))
          throw new Error("Build identity source changed during capture");
        total += count;
        files.set(relative, identityDigest(buffer.subarray(0, count)));
      } finally {
        await handle.close();
      }
    } else throw new Error("Build identity source must be a regular file");
  }
  for (const relative of [
    "src",
    "schemas",
    "scripts",
    "content/site.json",
    "package.json",
    "package-lock.json",
  ])
    await walk(relative);
  return sortedHashes(files);
}
export async function describeGit(root) {
  try {
    const options = {
      cwd: root,
      timeout: 5000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    };
    const head = (
      await run("git", ["rev-parse", "HEAD"], options)
    ).stdout.trim();
    const dirty = Boolean(
      (
        await run(
          "git",
          [
            "--no-optional-locks",
            "status",
            "--porcelain",
            "--untracked-files=normal",
          ],
          options,
        )
      ).stdout.trim(),
    );
    return { revision: /^[a-f0-9]{40,64}$/.test(head) ? head : null, dirty };
  } catch {
    return { revision: null, dirty: "unknown" };
  }
}
export function createBuildIdentity({
  sourceFiles,
  catalogFiles,
  packs,
  mediaFiles,
  outputFiles,
  git,
}) {
  const body = {
    format: "dmz-build-identity",
    version: 1,
    algorithm: "sha256-observed-inputs-and-output-v1",
    evidenceScope:
      "Observed stable source inputs across generation and captured catalog/media bytes; not pre-execution provenance, authorship or a signature.",
    runtimeMajor: Number(process.versions.node.split(".")[0]),
    git,
    sourceFiles,
    schemaHash: sourceFiles["schemas/pack.schema.json"],
    capturedCatalogFiles: sortedHashes(
      [...catalogFiles].map(([path, bytes]) => [path, identityDigest(bytes)]),
    ),
    capturedPackHashes: sortedHashes(
      packs.map(([key, bytes]) => [key, identityDigest(bytes)]),
    ),
    capturedMediaFiles: sortedHashes(
      mediaFiles.map((file) => [file.url, identityDigest(file.bytes)]),
    ),
    outputFiles: sortedHashes(
      [...outputFiles].map(([path, hash]) => [
        path.replaceAll("\\", "/"),
        hash,
      ]),
    ),
    outputSelfExclusion: "assets/build-identity.json",
  };
  return { ...body, buildId: identityDigest(JSON.stringify(body)) };
}
