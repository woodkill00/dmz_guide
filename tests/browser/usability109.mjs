import { startOwnedServer } from "../../scripts/server-readiness.mjs";
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { monitorBrowser } from "./health.mjs";
const ownedServer = process.env.DMZ_SITE_URL
  ? null
  : await startOwnedServer({ entrypoint: "scripts/serve-ui.mjs" });
const base = process.env.DMZ_SITE_URL || ownedServer.base;
const routes = [
  "/",
  "/inventory/?pack=official%3Amw4-dmz-starter",
  "/upgrades/?pack=official%3Amw4-dmz-starter",
  "/missions/?pack=official%3Amw4-dmz-starter",
  "/armory/",
  "/keys/",
  "/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Abandage",
  "/needed/?pack=official%3Amw4-dmz-starter",
  "/quick-collect/?pack=official%3Amw4-dmz-starter",
  "/settings/",
  "/missions/audit/",
  "/quality/",
  "/help/",
  "/sitemap/",
  "/map/",
  "/map/x01/",
  "/map/safes/",
  "/map/loot/",
];
const reports = [];
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch(),
      health = monitorBrowser(browser);
    try {
      const context = await browser.newContext(),
        page = await context.newPage();
      const visit = async (url) => {
        const response = await page.goto(url);
        await page.waitForLoadState("networkidle", { timeout: 30000 });
        return response;
      };
      await visit(base + "/");
      await page.waitForSelector("[data-ui-navigation-toggle]");
      const dbs = await page.evaluate(async () =>
        typeof indexedDB.databases === "function"
          ? (await indexedDB.databases()).map((d) => d.name)
          : [],
      );
      assert.deepEqual(
        dbs,
        [],
        "Layout/public reading must not initialize player databases",
      );
      for (const route of ["/", "/map/", "/map/x01/", "/map/safes/"]) {
        await visit(base + route);
        await page.waitForSelector("[data-ui-navigation-toggle]");
        const toggle = page.locator("[data-ui-navigation-toggle]"),
          reset = page.locator("[data-ui-layout-reset]");
        if ((await toggle.getAttribute("aria-expanded")) === "false")
          await toggle.click();
        const link = page.locator(".site-nav a").first();
        await link.focus();
        await toggle.click();
        assert.equal(await toggle.isVisible(), true);
        assert.equal(await reset.isVisible(), true);
        assert.equal(
          await toggle.evaluate((n) => n === document.activeElement),
          true,
        );
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        await page.reload();
        await page.waitForLoadState("networkidle", { timeout: 30000 });
        await page.waitForSelector("[data-ui-navigation-toggle]");
        assert.equal(await toggle.isVisible(), true);
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        await toggle.press("Enter");
        assert.equal(await toggle.getAttribute("aria-expanded"), "true");
        await reset.click();
        assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      }
      await visit(base + "/");
      await page.waitForSelector("[data-ui-navigation-toggle]");
      await page.evaluate(() => {
        const n = document.querySelector(".site-header");
        n.style.position = "fixed";
        n.style.top = "0";
        n.style.height = "600px";
      });
      await page.waitForFunction(
        () =>
          parseFloat(
            document.documentElement.style.getPropertyValue("--ui-top-offset"),
          ) >= 590,
      );
      await page.reload();
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      await page.waitForSelector("[data-ui-navigation-toggle]");
      for (const width of [320, 390, 768, 1280, 1440, 1920])
        for (const big of [false, true]) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(
            (big) =>
              (document.documentElement.style.fontSize = big ? "200%" : ""),
            big,
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            "Shell overflow " + name + width + big,
          );
          const target = await page
            .locator("[data-ui-navigation-toggle]")
            .boundingBox();
          assert(target.height >= 44 && target.width >= 24);
        }
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
      await page.setViewportSize({ width: 390, height: 300 });
      await page.waitForFunction(
        () => document.documentElement.dataset.layoutShort === "true",
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
      await visit(base + "/");
      await page.waitForSelector('[data-weapon-save-state="ready"]');
      await page.evaluate(async () => {
        const { newProfile } = await import("/assets/src/domain/profile.mjs");
        const { saveProfile } = await import("/assets/src/storage/store.mjs");
        const pack = await (
          await fetch("/assets/content/packs/official-starter.json")
        ).json();
        const profile = newProfile(pack);
        profile.inventory = { "mw4:bandage": 7, "mw4:synthetics": 123 };
        profile.buildTargets = { "mw4:bandage": 2 };
        await saveProfile(profile, 0);
      });
      for (const width of [320, 1440])
        for (const route of routes) {
          await page.setViewportSize({ width, height: 1000 });
          const response = await visit(base + route);
          assert.equal(response.status(), 200, route);
          await page.waitForSelector('html[data-layout-system="109"]');
          await page
            .waitForLoadState("networkidle", { timeout: 5000 })
            .catch(() => {});
          if (await page.locator('main[aria-busy="true"]').count())
            await page.waitForSelector('main[aria-busy="false"]');
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            route + " overflow " + width,
          );
          reports.push({ engine: name, route, width, outcome: "passed" });
        }
      // Malformed UI-only preferences are retained until explicit reset.
      await visit(base + "/");
      await page.evaluate(() =>
        localStorage.setItem("dmz-layout-109", "invalid fixture"),
      );
      await page.reload();
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      await page.waitForSelector("[data-ui-navigation-toggle]");
      await page.locator("[data-ui-navigation-toggle]").click();
      assert.equal(
        await page.evaluate(() => localStorage.getItem("dmz-layout-109")),
        "invalid fixture",
      );
      await page.locator("[data-ui-layout-reset]").click();
      assert.equal(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem("dmz-layout-109")).version,
        ),
        1,
      );
      if (name === "chromium") {
        await page.setViewportSize({ width: 390, height: 1000 });
        await page.screenshot({ path: "test-results/109-home-mobile.png" });
      }
      health();
      console.log(
        name +
          ": collapse/focus/reload/reset allshells, actualstickyoffset,12zoomstates,shortheight,36familycases,UIpreferences and no read-created databases PASS",
      );
    } finally {
      await browser.close();
    }
  }
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/109-browser-matrix.json",
    JSON.stringify(reports, null, 2),
  );
} finally {
  await ownedServer?.stop();
}
