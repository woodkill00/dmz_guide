import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
// Actual controller/DOM. Persisted events below exercise adapters, not BFcache eligibility.
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  cacheDir: ".local/ui-state-review-vite",
  server: { host: "127.0.0.1", port: 5293, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const results = [];
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
        }),
        page = await context.newPage(),
        errors = [],
        egress = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await context.route("**/*", (r) => {
        if (new URL(r.request().url()).origin === "http://127.0.0.1:5293")
          return r.continue();
        egress.push(r.request().url());
        return r.abort();
      });
      const image = await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        c.getContext("2d").fillRect(0, 0, 128, 128);
        return c.toDataURL().split(",")[1];
      });
      await context.route("**/maps/hajin/v1/background.webp", (r) =>
        r.fulfill({
          contentType: "image/png",
          body: Buffer.from(image, "base64"),
        }),
      );
      await context.route("**/maps/hajin/official/markers.json", (r) =>
        r.fulfill({
          json: {
            schemaVersion: 1,
            sourcePage:
              "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
            capturedAt: "2026-11-05T00:00:00Z",
            categories: [],
            records: [],
          },
        }),
      );
      await page.goto("http://127.0.0.1:5293/");
      await page.waitForSelector(
        'html[data-ui-mounted="071-v1"][data-ui-adapter="map-pane"]',
      );
      await page.locator("#workspace-open").click();
      // Clean presentation search is not a draft, and must survive tool departure/return.
      await page.locator("#points-search").fill("Synthetic clean query");
      await page.locator("#workspace-tab-icons").click();
      assert.equal(
        await page.locator("#ui-pane-departure-guard").isVisible(),
        false,
        "Clean search must not create a dirty departure guard on blur/change",
      );
      await page.locator("#workspace-tab-points").click();
      assert.equal(
        await page.locator("#points-search").inputValue(),
        "Synthetic clean query",
        "Clean list query restores on return",
      );
      assert.equal(
        await page.locator("#ui-pane-departure-guard").isVisible(),
        false,
        "Search alone must not create dirty guard",
      );
      await page.locator("#point-title").fill("Synthetic pick draft");
      await page.locator("#pick-point-position").click();
      await page.waitForTimeout(100);
      assert.equal(
        await page.locator("#map").isVisible(),
        true,
        "Picking must reveal terrain in narrow fallback",
      );
      assert.equal(await page.locator("#workspace-dialog").isVisible(), false);
      await page.keyboard.press("Escape");
      await page.locator("#workspace-dialog").waitFor({ state: "visible" });
      assert.equal(
        await page.locator("#point-title").inputValue(),
        "Synthetic pick draft",
      );
      assert.equal(
        await page.locator("#ui-pane-departure-guard").isVisible(),
        false,
        "Picking Escape must not also request departure",
      );
      assert.equal(await page.locator("#ui-map-task").isVisible(), true);
      await page.evaluate(() =>
        window.dispatchEvent(
          new PageTransitionEvent("pagehide", { persisted: true }),
        ),
      );
      await page.evaluate(() =>
        window.dispatchEvent(
          new PageTransitionEvent("pageshow", { persisted: true }),
        ),
      );
      await page.waitForTimeout(150);
      assert.equal(
        await page.locator("#point-title").inputValue(),
        "Synthetic pick draft",
        "Persisted adapter resume must retain draft",
      );
      assert.equal(await page.locator("#workspace-dialog").isVisible(), true);
      assert.deepEqual(errors, []);
      assert.deepEqual(egress, []);
      results.push({
        engine: name,
        cleanQuery: true,
        narrowPick: true,
        pickEscape: true,
        persistedEventDraft: true,
        actualBFcacheEligibility: "not measured",
      });
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  await mkdir(".local", { recursive: true });
  await writeFile(
    ".local/071-map-state.json",
    JSON.stringify(results, null, 2),
  );
  await server.close();
}
console.log("Actual map state PASS " + results.length + " engines");
