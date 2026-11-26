import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";

const server = process.env.DMZ_SITE_URL ? null : await startBrowserServer();
const base = process.env.DMZ_SITE_URL || server.base;
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    const health = monitorBrowser(browser);
    try {
      const page = await browser.newPage();
      await page.goto(base + "/armory/");
      await page.waitForSelector(
        'main[data-armory-ready="true"][data-armory-busy="false"]',
      );
      const groups = page.locator("details[data-picker-category]");
      assert.equal(await groups.count(), 9);
      assert(
        await groups.evaluateAll((nodes) => nodes.every((node) => node.open)),
      );
      const first = groups.first(),
        second = groups.nth(1);
      const card = first.locator("[data-weapon-card]").first();
      const goal = await card.locator("[data-picker-camo-name]").textContent();
      await card.locator("[data-picker-camo-open]").click();
      const requirement = await card
        .locator("[data-picker-camo-requirement]")
        .textContent();
      await first.locator(":scope > summary").click();
      assert(await card.isHidden());
      assert(await second.locator("[data-weapon-card]").first().isVisible());
      await page
        .locator("#weapon-context-search")
        .fill("Synthetic no matching weapon");
      assert(await first.isHidden());
      await page.locator("#weapon-context-search").fill("");
      assert(
        !(await first.evaluate((node) => node.open)),
        "Filtering preserves closed state",
      );
      const summary = first.locator(":scope > summary");
      await summary.focus();
      await page.keyboard.press("Enter");
      assert(await card.isVisible());
      assert(await card.locator("[data-picker-camo-detail]").isVisible());
      assert.equal(
        await card.locator("[data-picker-camo-requirement]").textContent(),
        requirement,
      );
      assert.equal(
        await card.locator("[data-picker-camo-name]").textContent(),
        goal,
      );
      await card.locator("[data-picker-manual]").check();
      await page.waitForSelector(
        'main[data-armory-revision="1"][data-armory-busy="false"]',
      );
      await summary.click();
      await second.locator(":scope > summary").click();
      assert(!(await first.evaluate((node) => node.open)));
      assert(!(await second.evaluate((node) => node.open)));
      await summary.click();
      assert(await card.locator("[data-picker-manual]").isChecked());
      await page.reload();
      await page.waitForSelector('main[data-armory-ready="true"]');
      assert(await card.locator("[data-picker-manual]").isChecked());
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
      health();
      console.log(
        `${name}: nine independent groups, keyboard, retained details/progress, filters, save/reload and responsive checks PASS`,
      );
    } finally {
      await browser.close();
    }
  }
} catch (error) {
  failure = error;
  throw error;
} finally {
  await server?.stop(failure);
}
