import assert from "node:assert/strict";
import { mkdtemp, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { serializeCatalog } from "../../scripts/catalog.mjs";
import { execFileSync } from "node:child_process";
import { chromium, firefox, webkit } from "playwright";
import { createAuthorServer } from "../../scripts/author.mjs";
import { createWeaponManager } from "../../scripts/weapon-manager.mjs";
import { monitorBrowser } from "./health.mjs";
const root = await mkdtemp(join(tmpdir(), "dmz109-service-"));
await cp("schemas", join(root, "schemas"), { recursive: true });
const schema = JSON.parse(await readFile("schemas/pack.schema.json", "utf8"));
const pack = JSON.parse(
  await readFile("dist/assets/content/packs/demo-training.json", "utf8"),
);
for (const [path, bytes] of serializeCatalog({
  entries: [{ key: "demo-training", pack, assetSources: {} }],
  schema,
})) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), bytes);
}
await cp("content/weapon-intel.json", join(root, "content/weapon-intel.json"));
await mkdir(join(root, "empty-hooks"));
const git = (args) =>
  execFileSync(
    "git",
    ["-C", root, "-c", "core.hooksPath=" + join(root, "empty-hooks"), ...args],
    { stdio: "pipe", windowsHide: true },
  );
git(["init", "-b", "main"]);
git(["add", "content", "schemas"]);
git([
  "-c",
  "user.name=UI fixture",
  "-c",
  "user.email=fixture@example.invalid",
  "-c",
  "commit.gpgSign=false",
  "commit",
  "-m",
  "Public synthetic service fixture",
]);
const apps = [];
try {
  apps.push(await createAuthorServer({ root, port: 0 }));
  apps.push(await createWeaponManager({ root, port: 0, monitor: false }));
  for (const app of apps)
    for (const [file, type] of [
      ["src/client/layout-system.mjs", "javascript"],
      ["src/ui/layout-refinements.css", "text/css"],
    ]) {
      const response = await fetch(new URL("/assets/" + file, app.url));
      assert.equal(response.status, 200, file);
      assert(response.headers.get("content-type").includes(type));
    }
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch(),
      health = monitorBrowser(browser);
    try {
      for (const app of apps) {
        const page = await browser.newPage();
        await page.goto(app.url);
        if (app === apps[0])
          await page.waitForFunction(
            () => document.querySelector("#pack-select")?.options.length > 0,
          );
        else await page.waitForSelector('main[data-manager-ready="true"]');
        await page.waitForSelector('html[data-layout-system="109"]');
        const toggle = page.locator("[data-ui-navigation-toggle]");
        await toggle.click();
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        assert(await toggle.isVisible());
        await page.locator("[data-ui-layout-reset]").click();
        assert.equal(await toggle.getAttribute("aria-expanded"), "true");
        await page.close();
      }
      health();
      console.log(
        name +
          ": Studio and manager exact asset MIME, layout mount, collapse/reset and strict browser health PASS",
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  for (const app of apps.reverse()) await app.close();
}
// Fixture retained in the OS temp directory for diagnostics; no user repository writes.
