import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const mapOnly = process.argv.slice(2).includes("--map-only");
if (process.argv.slice(2).some((arg) => arg !== "--map-only"))
  throw Error("Only --map-only is supported.");
if (!mapOnly) {
  const html = await readFile(join(root, "dist/index.html"), "utf8");
  if (!html.includes('data-ui-variant="modern"'))
    throw Error(
      "Build the modern Guide first: set DMZ_UI_VARIANT=modern and run npm run build. This test runner never replaces a served build.",
    );
}
const guide = [
  "ui-shell",
  "ui-navigation-bounds",
  "ui-feature-coverage",
  "ui-directory",
  "ui-catalog-pagination",
  "ui-reference-directories",
  "ui-progression-journeys",
  "ui-weapons",
  "ui-weapon-updates",
  "ui-authoring",
  "ui-recovery",
  "ui-surface-rollback",
];
const map = [
  "ui-layout-browser",
  "ui-pane-modes-browser",
  "ui-state-browser",
  "ui-rollback-browser",
  "ui-bfcache-write-browser",
  "ui-lifecycle-browser",
  "ui-selection-integration-browser",
  "ui-feature-coverage-browser",
  "ui-bosses-browser",
  "ui-theme-browser",
  "route-atomic-browser",
  "pane-host-browser",
  "selection-pane-browser",
  "icon-save-browser",
];
async function run(cwd, path) {
  console.log(`\n071 verification: ${path}`);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path], {
      cwd,
      env: { ...process.env, DMZ_UI_VARIANT: "modern" },
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0
        ? resolve()
        : reject(Error(`${path} failed (${signal ?? code})`)),
    );
  });
}
if (!mapOnly)
  for (const name of guide) await run(root, `tests/browser/${name}.mjs`);
for (const name of map)
  await run(join(root, "tools/hajin-map"), `tests/${name}.mjs`);
console.log(
  "071 scoped modern automated suites PASS. Physical-device/zoom, performance and promotion gates are separate.",
);
