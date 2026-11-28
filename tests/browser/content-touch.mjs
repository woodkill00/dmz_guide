import { pollBrowser } from "./poll.mjs";
// Actual touch events in isolated desktop browser engines; not physical Android/TalkBack.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser, optionalCamoArtwork } from "./health.mjs";
const AxeBuilder = createRequire(
  new URL("../../tools/hajin-map/package.json", import.meta.url),
)("@axe-core/playwright").default;
const server = await startBrowserServer(),
  results = [];
await mkdir("test-results/content112", { recursive: true });
const pack = "official%3Amw4-dmz-starter";
const ready = (page) => page.locator('main[aria-busy="false"]').waitFor();
async function reveal(page, selector) {
  const target = page.locator(selector).first(),
    detail = target.locator("xpath=ancestor::div[@data-item-detail]");
  if ((await detail.count()) && (await detail.getAttribute("hidden")) !== null)
    await page
      .locator(
        `[data-show-use="${await detail.getAttribute("data-item-detail")}"][aria-expanded]`,
      )
      .tap();
  const ancestors = target.locator("xpath=ancestor::details");
  for (let i = 0; i < (await ancestors.count()); i++)
    if (!(await ancestors.nth(i).evaluate((n) => n.open)))
      await ancestors.nth(i).locator(":scope > summary").tap();
}
let failure;
try {
  for (const [engine, type] of Object.entries({
    chromium,
    firefox,
    webkit,
  }).filter(([name]) => !process.env.BROWSER || process.env.BROWSER === name)) {
    const browser = await type.launch(),
      health = monitorBrowser(browser, {
        optionalArtwork: await optionalCamoArtwork(server.base),
      });
    try {
      const context = await browser.newContext({
          hasTouch: true,
          viewport: { width: 390, height: 844 },
        }),
        page = await context.newPage();
      page.setDefaultTimeout(15000);
      const go = async (path) => {
        await page.goto(server.base + path);
      };
      await context.addInitScript(() => {
        window.__touchStarts = 0;
        addEventListener("touchstart", () => window.__touchStarts++, {
          passive: true,
        });
      });
      await go("/inventory/?pack=" + pack);
      await ready(page);
      await page.locator("#inventory-query").fill("Control Unit");
      const stock =
        '[data-field="inventory"][data-id="mw4:ingredient-control-unit"]';
      await reveal(page, stock);
      await page.locator(stock).first().fill("2");
      await page
        .getByRole("button", { name: "Save inventory", exact: true })
        .tap();
      assert(
        await page.evaluate(() => window.__touchStarts > 0),
        `${engine}: actual touchstart delivered`,
      );
      await pollBrowser(
        page,
        async () =>
          (
            await (
              await import("/assets/src/storage/store.mjs")
            ).loadProfile("official:mw4-dmz-starter")
          )?.value.inventory["mw4:ingredient-control-unit"] === 2,
      );
      await go("/quick-collect/?pack=" + pack);
      await ready(page);
      await page.locator("#collect-query").fill("Control Unit");
      const collect = page.locator(
        '[data-collect-row="mw4:ingredient-control-unit"]',
      );
      assert.equal(
        await collect.locator("[data-collect-remaining]").innerText(),
        "28",
      );
      await collect.locator("input").fill("1");
      await collect
        .getByRole("button", { name: "Add found Control Unit", exact: true })
        .tap();
      await pollBrowser(
        page,
        async () =>
          (
            await (
              await import("/assets/src/storage/store.mjs")
            ).loadProfile("official:mw4-dmz-starter")
          )?.value.inventory["mw4:ingredient-control-unit"] === 3,
      );
      await go("/needed/?pack=" + pack);
      await ready(page);
      await page.locator("#needed-query").fill("Control Unit");
      assert.equal(
        await page
          .locator(
            '[data-needed-item="mw4:ingredient-control-unit"] [data-needed-missing] .needed-number',
          )
          .innerText(),
        "27",
      );
      await go("/upgrades/?pack=" + pack);
      await ready(page);
      const upgrade = page.locator("[data-complete-upgrade]:visible").first(),
        id = await upgrade.getAttribute("data-complete-upgrade");
      await upgrade.tap();
      await page.locator("#upgrade-progress-apply").tap();
      await page.waitForFunction(
        () => !document.querySelector("#upgrade-progress-confirm").open,
      );
      await page.reload();
      await ready(page);
      await reveal(page, "#upgrade-layout");
      await page.locator("#upgrade-layout").selectOption("flat");
      assert(
        await page
          .locator(`[data-complete-upgrade="${id}"]`)
          .first()
          .isChecked(),
      );
      await go("/missions/?pack=" + pack);
      await ready(page);
      await page
        .locator('#hajin-page-1 [data-order-complete="mw4:order-gear-up"]')
        .tap();
      await page.waitForFunction(
        () =>
          document.querySelector(
            '#hajin-page-1 [data-order-complete="mw4:order-gear-up"]',
          )?.checked === true,
      );
      await page.reload();
      await ready(page);
      assert(
        await page
          .locator('#hajin-page-1 [data-order-complete="mw4:order-gear-up"]')
          .isChecked(),
      );
      await go("/armory/");
      await page
        .locator('main[data-armory-ready="true"][data-armory-busy="false"]')
        .waitFor();
      const card = page.locator('[data-weapon-card="m4"]');
      await reveal(page, '[data-weapon-card="m4"] [data-picker-manual]');
      await card.locator("[data-picker-manual]").tap();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-weapon-card="m4"] [data-picker-manual]')
            ?.checked === true,
      );
      await card.locator('[data-picker-extraction-step="1"]').tap();
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-weapon-card="m4"] [data-weapon-context-progress]',
          )?.textContent === "1/3",
      );
      await card.locator('[data-picker-extraction-step="-1"]').tap();
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-weapon-card="m4"] [data-weapon-context-progress]',
          )?.textContent === "0/3",
      );
      await card.locator("[data-picker-camo-open]").tap();
      assert.match(
        await card.locator("[data-picker-camo-requirement]").innerText(),
        /^Earn 9 more weapon unlocks$/,
      );
      await card.locator("[data-picker-complete]").tap();
      await page.waitForFunction(() =>
        document
          .querySelector('[data-weapon-card="m4"] [data-picker-camo-link]')
          ?.getAttribute("href")
          ?.endsWith("military-camo-2"),
      );
      assert.match(await card.ariaSnapshot(), /Manual owned: M4/);
      for (const [path, needsReady] of [
        ["/", false],
        ["/inventory/?pack=" + pack, true],
        ["/needed/?pack=" + pack, true],
        ["/upgrades/?pack=" + pack, true],
        ["/missions/?pack=" + pack, true],
        ["/armory/", false],
        ["/quality/", false],
      ]) {
        await go(path);
        if (needsReady) await ready(page);
        else if (path === "/armory/")
          await page.locator('main[data-armory-ready="true"]').waitFor();
        else await page.locator("main").waitFor();
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 844 });
          await page.evaluate(
            () => (document.documentElement.style.fontSize = "200%"),
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
            `${engine} ${path} ${width} enlarged text overflow`,
          );
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(
          () => (document.documentElement.style.fontSize = ""),
        );
        // Axe's optional CSS preload probes inject inline styles rejected by
        // the real CSP. Run all rules against the already loaded page styles;
        // retain strict CSP/console health and do not bypass browser policy.
        const audit = await new AxeBuilder({ page })
          .options({ preload: false })
          .analyze();
        assert.deepEqual(
          audit.violations,
          [],
          `${engine} ${path} accessibility`,
        );
      }
      if (engine !== "webkit")
        await page.screenshot({
          path: `test-results/content112/touch-${engine}-quality.png`,
          fullPage: false,
        });
      await context.close();
      health();
      server.assertAlive();
      results.push({
        engine,
        status: "passed",
        touch: "emulated with actual tap events",
        physical: false,
      });
      console.log(engine + " touch/reference journeys PASS");
    } finally {
      await browser.close();
    }
  }
} catch (error) {
  failure = error;
  throw error;
} finally {
  await writeFile(
    "test-results/content112/touch-results.json",
    JSON.stringify(
      {
        results,
        completed: !failure,
        failure: failure?.message || null,
        physicalAndroid: "pending separate device observation",
        screenReader: "pending separate TalkBack observation",
      },
      null,
      2,
    ) + "\n",
  );
  await server.stop(failure);
}
