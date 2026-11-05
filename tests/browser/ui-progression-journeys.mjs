import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";
import { runKeysTests } from "./keys.mjs";
import { runKeyWorkspaceTests } from "./key-workspace.mjs";
import { runTieredUpgradeTests } from "./tiered-upgrades.mjs";
import { keyAccess } from "../../src/content/key-access.mjs";
const server = await startBrowserServer();
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    const health = monitorBrowser(browser);
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.goto(server.base + "/keys/");
      assert.equal(await page.locator("html").getAttribute("data-ui-variant"), "modern");
      await page.locator("#key-filters:not([hidden])").waitFor();
      assert.equal(await page.locator("[data-key-row]").count(), keyAccess.uses.length);
      assert.ok(await page.locator(".key-location-group[data-ui-directory][data-ui-directory-pagination=false]").count());
      assert.equal(await page.locator(".key-location-group [data-ui-directory-rows]").count(), 0);
      assert.equal(await page.locator("#key-source-review [data-ui-directory-pagination=true] [data-ui-directory-rows]").count(), 2);
      for (const [path, selector] of [
        ["inventory", "#inventory-fields"], ["upgrades", "#progress-rows"],
        ["missions", "#progress-rows"], ["progression", "#progress-rows"],
        ["collection", "#shopping-list"], ["collection", "#recipe-list"],
        ["collection", "#coverage-list"], ["maps", "#location-list"],
      ]) {
        await page.goto(`${server.base}/${path}/`);
        const host = page.locator(selector);
        assert.equal(await host.getAttribute("data-ui-directory-layout"), "live", `${path} retains its live owner`);
        assert.equal(await host.getAttribute("data-ui-directory-pagination"), "false");
        assert.equal(await host.locator("[data-ui-directory-rows]").count(), 0);
      }
      await context.close();
      await runKeysTests({ browser, base: server.base });
      await runKeyWorkspaceTests({ browser, base: server.base });
      await runTieredUpgradeTests({ browser, base: server.base });
      health();
      server.assertAlive();
      console.log(`${name} native directory and private key/upgrade preservation PASS`);
    } finally { await browser.close(); }
  }
} catch (error) { failure = error; throw error; }
finally { await server.stop(failure); }
