import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";
const server = process.env.DMZ_SITE_URL ? null : await startBrowserServer();
const base = process.env.DMZ_SITE_URL || server.base;
const ready = (page) =>
  page.waitForSelector(
    'main[data-armory-ready="true"][data-armory-busy="false"]',
  );
const revision = (page, n) =>
  page.waitForSelector(
    `main[data-armory-revision="${n}"][data-armory-busy="false"]`,
  );
const saved = (page) =>
  page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/armory-store.mjs")
        ).readArmory()
      ).value,
  );
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch(),
      health = monitorBrowser(browser);
    try {
      const page = await browser.newPage();
      await page.goto(base + "/armory/");
      await ready(page);
      const card = page.locator('[data-weapon-card="m4"]');
      const plus = card.locator('[data-picker-extraction-step="1"]');
      const minus = card.locator('[data-picker-extraction-step="-1"]');
      assert.equal(
        await page.locator("[data-picker-extraction-step]").count(),
        70,
      );
      assert(await minus.isDisabled());
      assert.match(
        await card.locator("[data-weapon-context-progress]").textContent(),
        /—\/3/,
      );
      await page.evaluate(() => {
        const native = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function (...args) {
          const tx = native.apply(this, args);
          if (args[1] === "readwrite" && this.name === "dmz-armory-local") {
            IDBDatabase.prototype.transaction = native;
            tx.addEventListener(
              "complete",
              (event) => {
                event.stopImmediatePropagation();
                window.releaseExtractionSave = () =>
                  tx.dispatchEvent(new Event("complete"));
              },
              { capture: true, once: true },
            );
          }
          return tx;
        };
      });
      for (let n = 1; n <= 3; n++) {
        await plus.click();
        if (n === 1) {
          await page.waitForFunction(
            () => typeof window.releaseExtractionSave === "function",
          );
          assert(await plus.isDisabled());
          assert(await minus.isDisabled());
          assert(
            await page
              .locator(
                '[data-weapon-card="han-86"] [data-picker-extraction-step="1"]',
              )
              .isDisabled(),
          );
          assert.match(
            await card.locator("[data-weapon-context-progress]").textContent(),
            /—\/3/,
          );
          await page.evaluate(() => window.releaseExtractionSave());
        }
        await revision(page, n);
        assert.match(
          await card.locator("[data-weapon-context-progress]").textContent(),
          new RegExp(`${n}/3`),
        );
      }
      assert.equal(
        await card
          .locator("[data-weapon-context]")
          .getAttribute("data-progress"),
        "completed",
      );
      assert.equal((await saved(page)).acquisition.m4.manual, false);
      assert.deepEqual((await saved(page)).camoCompletions || [], []);
      await minus.click();
      await revision(page, 4);
      assert.equal((await saved(page)).acquisition.m4.manualExtractions, 2);
      assert.equal(
        await card
          .locator("[data-weapon-context]")
          .getAttribute("data-progress"),
        "next",
      );
      await card.locator("[data-weapon-context]").click();
      await ready(page);
      await page.locator('a[href="#acquisition"]').first().click();
      assert.match(
        await page.locator("#weapon-extraction-count").textContent(),
        /2/,
      );
      if (!(await page.locator("#weapon-picker").evaluate((node) => node.open)))
        await page.locator("#weapon-picker > summary").click();
      for (const n of [5, 6]) {
        await minus.focus();
        await page.keyboard.press("Enter");
        await revision(page, n);
      }
      assert(await minus.isDisabled());
      await page.waitForFunction(() =>
        document.activeElement?.matches(
          '[data-weapon-card="m4"] [data-picker-camo-open]',
        ),
      );
      assert.equal((await saved(page)).acquisition.m4.manualExtractions, 0);
      await page.evaluate(async () => {
        const { readArmory, saveArmory } = await import(
          "/assets/src/storage/armory-store.mjs"
        );
        const { editAcquisition } = await import(
          "/assets/src/domain/weapon-acquisition.mjs"
        );
        const workspace = (await readArmory()).value;
        await saveArmory(
          editAcquisition(workspace, "m4", { kind: "count", value: 9999 }),
          workspace.revision,
        );
      });
      await page.reload();
      await ready(page);
      await page.locator("#weapon-picker > summary").click();
      assert(await plus.isDisabled());
      assert(!(await minus.isDisabled()));
      await page.evaluate(() => {
        const native = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args) {
          if (this.name === "workspace") {
            IDBObjectStore.prototype.put = native;
            throw new DOMException(
              "Synthetic extraction save failure",
              "QuotaExceededError",
            );
          }
          return native.apply(this, args);
        };
      });
      await minus.click();
      await card.locator("[data-picker-error]:not([hidden])").waitFor();
      assert.equal((await saved(page)).acquisition.m4.manualExtractions, 9999);
      assert(await minus.isDisabled());
      await card.locator(".picker-save-recovery").click();
      await page.locator("#workspace-retry").click();
      await revision(page, 8);
      assert.equal((await saved(page)).acquisition.m4.manualExtractions, 9998);
      assert(!(await plus.isDisabled()));
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
        `${name}: all card controls, unknown→3→0, ownership/camo independence, detail sync,9999 limit, failed save/retry and layouts PASS`,
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
