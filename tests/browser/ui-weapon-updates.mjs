import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { runWeaponManagerTests } from "./weapon-manager.mjs";
import { runCodmunityTests } from "./codmunity.mjs";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";

export async function runUIWeaponUpdatesTests({ browser, base, includeTransactions = true }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(base + "/armory/updates/");
    await page.waitForFunction(() => document.documentElement.dataset.uiShellMounted === "071-v1");
    assert.equal(await page.locator("html").getAttribute("data-ui-variant"), "modern");
    assert.match(await page.locator("main").innerText(), /local|start|manual/i);
    const links = page.locator('main a[href="http://127.0.0.1:4176/"]');
    assert(await links.count() > 0);
    for (const link of await links.all()) {
      assert.equal(await link.getAttribute("target"), "_blank");
      assert.match(await link.getAttribute("rel"), /noopener/);
    }
    assert.equal(await page.locator("#manager-apply").count(), 0, "Static reader must not impersonate the manager write API");
    assert.equal(await page.locator("#codmunity-apply").count(), 0);
  } finally { await context.close(); }
  if (includeTransactions) {
    // Existing bounded temp repositories/fixtures retain actual CAS/apply/rollback and source-preview checks.
    // Their runners are injected; no live provider request or owner repository write is authorized.
    await runWeaponManagerTests({ browser });
    await runCodmunityTests({ browser, base });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startBrowserServer();
  try {
    for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
      const browser = await engine.launch(), health = monitorBrowser(browser);
      try { await runUIWeaponUpdatesTests({ browser, base: server.base }); health(); console.log(name + "071 weapon update/manager preservation PASS"); }
      finally { await browser.close(); }
    }
  } finally { await server.stop(); }
}
