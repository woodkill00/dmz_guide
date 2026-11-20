import * as fs from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { publishBuild } from "./build-output.mjs";
import {
  createManifest,
  validateBundle,
  sourceFingerprint,
} from "./unified-map-bundle.mjs";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export async function buildUnifiedMap() {
  const owned = join(root, ".local", "unified-map");
  for (const directory of [join(root, ".local"), owned]) {
    await fs.mkdir(directory, { recursive: true });
    const info = await fs.lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory())
      throw Error("Map output root must be a real directory");
  }
  const before = await sourceFingerprint(root);
  return publishBuild({
    root: owned,
    generate: async (candidate) => {
      await new Promise((ok, fail) => {
        const child = spawn(
          process.execPath,
          [
            join(root, "tools/hajin-map/node_modules/vite/bin/vite.js"),
            "build",
            "--mode",
            "development",
            "--outDir",
            candidate,
          ],
          {
            cwd: join(root, "tools/hajin-map"),
            env: { ...process.env, DMZ_UNIFIED_SITE: "1" },
            stdio: "inherit",
            windowsHide: true,
          },
        );
        child.once("error", fail);
        child.once("exit", (code) =>
          code === 0 ? ok() : fail(Error("Map build failed " + code)),
        );
      });
      if (before !== (await sourceFingerprint(root)))
        throw Error("Map sources changed during build; retry");
      return createManifest(candidate, before);
    },
    validate: async (candidate) =>
      validateBundle(candidate, { fingerprint: before }),
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await buildUnifiedMap();
