import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { readWeaponCamos } from "../../src/content/weapon-camos.mjs";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";
const server = process.env.DMZ_SITE_URL ? null : await startBrowserServer();
const base = process.env.DMZ_SITE_URL || server.base;
const catalog = await readWeaponCamos();
const rows = catalog.weapons
  .find((w) => w.id === "m4")
  .rows.filter((r) => r.group === "prestige");
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
      const badge = card.locator("[data-picker-prestiged]");
      const firstKey = `weapon:m4:${rows[0].id}`,
        secondKey = `weapon:m4:${rows[1].id}`;
      assert.equal(await page.locator("[data-picker-prestiged]").count(), 35);
      assert(!(await badge.isChecked()));
      await badge.focus();
      await page.keyboard.press("Space");
      await revision(page, 1);
      assert(await badge.isChecked());
      assert((await saved(page)).camoCompletions.includes(firstKey));
      assert.equal((await saved(page)).acquisition.m4?.manual || false, false);
      assert.equal(
        await card.locator("[data-prestige-name]").textContent(),
        rows[1].name,
      );
      await page.reload();
      await ready(page);
      assert(await badge.isChecked());
      await badge.uncheck();
      await revision(page, 2);
      assert.equal(
        await card.locator("[data-prestige-name]").textContent(),
        rows[0].name,
      );
      await card.locator("[data-prestige-complete]").click();
      await revision(page, 3);
      assert(await badge.isChecked());
      await card.locator("[data-prestige-complete]").click();
      await revision(page, 4);
      await badge.uncheck();
      await revision(page, 5);
      const value = await saved(page);
      assert(!value.camoCompletions.includes(firstKey));
      assert(
        value.camoCompletions.includes(secondKey),
        "Undoing first Prestige preserves later camos",
      );
      await card.locator("[data-prestige-open]").click();
      await card.locator("[data-prestige-link]").click();
      await ready(page);
      const full = page.locator(`[data-camo-complete="${rows[0].id}"]`);
      await full.check();
      await revision(page, 6);
      assert(await badge.isChecked());
      await full.uncheck();
      await revision(page, 7);
      assert(!(await badge.isChecked()));
      await page.locator("#weapon-picker > summary").click();
      await page.evaluate(() => {
        const native = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args) {
          if (this.name === "workspace") {
            IDBObjectStore.prototype.put = native;
            throw new DOMException(
              "Synthetic prestige save quota",
              "QuotaExceededError",
            );
          }
          return native.apply(this, args);
        };
      });
      await badge.click();
      await card.locator("[data-picker-error]:not([hidden])").waitFor();
      assert(
        !(await badge.isChecked()),
        "Failure restores actual saved status",
      );
      assert(!(await saved(page)).camoCompletions.includes(firstKey));
      assert(await badge.isDisabled());
      await card.locator(".picker-save-recovery").click();
      await page.locator("#workspace-retry").click();
      await revision(page, 8);
      assert(await badge.isChecked());
      assert((await saved(page)).camoCompletions.includes(secondKey));
      for (const width of [320, 390, 1440])
        for (const zoom of [1, 2]) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(
            (z) =>
              (document.documentElement.style.fontSize = z === 2 ? "200%" : ""),
            zoom,
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${name} ${width} ${zoom}`,
          );
        }
      const denied = await browser.newContext();
      await denied.addInitScript(() =>
        Object.defineProperty(window, "indexedDB", { value: undefined }),
      );
      const unavailable = await denied.newPage();
      await unavailable.goto(base + "/armory/");
      await unavailable.waitForFunction(
        () => !document.querySelector("#armory-error").hidden,
      );
      assert(
        await unavailable
          .locator("[data-picker-prestiged]")
          .first()
          .isDisabled(),
      );
      assert(
        await unavailable
          .locator("[data-picker-prestiged]")
          .first()
          .evaluate((n) => n.indeterminate),
      );
      await denied.close();
      health();
      console.log(
        `${name}:35 status controls, header↔first Prestige/full tracker, undo preserves later, reload, failed save/retry, unavailable state and6 layouts PASS`,
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
