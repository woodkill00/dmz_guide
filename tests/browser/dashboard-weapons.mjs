import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";
import { readWeaponCamos } from "../../src/content/weapon-camos.mjs";
import { parseArmoryBackup } from "../../src/domain/armory-workspace.mjs";
const server = process.env.DMZ_SITE_URL ? null : await startBrowserServer();
const base = process.env.DMZ_SITE_URL || server.base;
const camos = await readWeaponCamos();
const ready = (page, n) =>
  page.waitForSelector(
    `[data-dash-content="weapons"][data-weapon-save-state="ready"]${n === undefined ? "" : `[data-weapon-revision="${n}"]`}`,
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
      await page.goto(base + "/");
      await ready(page);
      const root = page.locator('[data-dash-content="weapons"]');
      assert.equal(
        await root.locator("[data-dashboard-weapon-type]").count(),
        9,
      );
      assert.equal(await root.locator("[data-dashboard-manual]").count(), 35);
      const dbs = await page.evaluate(async () =>
        (await indexedDB.databases()).map((d) => d.name),
      );
      assert(
        !dbs.includes("dmz-armory-local"),
        "Reading Home must not create an armory database",
      );
      assert(
        !dbs.includes("dmz-guide-local"),
        "Reading Home must not create an inventory database",
      );
      await page.evaluate(async () => {
        const { emptyArmory } = await import(
          "/assets/src/domain/armory-workspace.mjs"
        );
        const { saveArmory } = await import(
          "/assets/src/storage/armory-store.mjs"
        );
        const value = emptyArmory();
        value.acquisition.m4 = {
          manual: true,
          manualExtractions: 2,
          attachments: [],
          blueprints: [],
        };
        value.acquisition.axion = {
          manual: false,
          manualExtractions: 3,
          attachments: [],
          blueprints: [],
        };
        value.acquisition["han-86"] = {
          manual: true,
          manualExtractions: 0,
          attachments: [],
          blueprints: [],
        };
        value.camoCompletions = [
          "weapon:m4:military-camo-1",
          "weapon:m4:pyroclast",
        ];
        await saveArmory(value, 0);
        const { newProfile } = await import("/assets/src/domain/profile.mjs");
        const { saveProfile } = await import("/assets/src/storage/store.mjs");
        const pack = await (
          await fetch("/assets/content/packs/official-starter.json")
        ).json();
        const profile = newProfile(pack);
        profile.buildTargets = { "mw4:bandage": 2 };
        await saveProfile(profile, 0);
      });
      await page.locator("#hub-refresh").click();
      await ready(page, 1);
      const card = (id) => root.locator(`[data-weapon-card="${id}"]`);
      const m4 = card("m4"),
        axion = card("axion"),
        han = card("han-86");
      const ar = root.locator('[data-dashboard-weapon-type="assault-rifle"]');
      const complete = ar.locator("[data-dashboard-completed]");
      const plus = m4.locator('[data-picker-extraction-step="1"]');
      const minus = m4.locator('[data-picker-extraction-step="-1"]');
      assert.equal(await root.locator("[data-dashboard-manual]").count(), 34);
      assert(await axion.isHidden());
      assert.equal(
        await axion
          .locator("[data-weapon-context]")
          .getAttribute("data-progress"),
        "completed",
      );
      assert.equal(
        await han
          .locator("[data-weapon-context]")
          .getAttribute("data-progress"),
        "next",
      );
      assert.equal(
        await card("cronen-osprey")
          .locator("[data-weapon-context]")
          .getAttribute("data-progress"),
        "remaining",
      );
      assert.equal(
        await m4.locator("[data-picker-camo-name]").textContent(),
        "Military Camo 2",
      );
      assert.equal(
        await m4.locator("[data-prestige-name]").textContent(),
        "Pyroclast Terminus",
      );
      for (const group of await root
        .locator("[data-dashboard-weapon-type]")
        .all()) {
        const names = await group
          .locator("[data-weapon-pending] [data-weapon-context] strong")
          .allTextContents();
        assert.deepEqual(
          names,
          [...names].sort((a, b) => a.localeCompare(b)),
        );
      }
      await plus.focus();
      await page.keyboard.press("Enter");
      await ready(page, 2);
      assert(await m4.isHidden());
      await page.waitForFunction(() =>
        document.activeElement?.parentElement?.hasAttribute(
          "data-dashboard-completed",
        ),
      );
      await complete.locator(":scope > summary").click();
      assert(await m4.isVisible());
      await minus.click();
      await ready(page, 3);
      assert(await m4.isVisible());
      assert(await m4.getAttribute("data-dashboard-manual"));
      const names = await ar
        .locator("[data-weapon-pending] [data-weapon-context] strong")
        .allTextContents();
      assert.deepEqual(
        names,
        [...names].sort((a, b) => a.localeCompare(b)),
      );
      await m4.locator("[data-picker-camo-open]").click();
      const gun = camos.weapons.find((w) => w.id === "m4");
      assert.equal(
        await m4.locator("[data-picker-camo-requirement]").textContent(),
        gun.rows[1].requirement,
      );
      await m4.locator("[data-picker-complete]").click();
      await ready(page, 4);
      assert.equal(
        await m4.locator("[data-picker-camo-name]").textContent(),
        gun.rows[2].name,
      );
      const tile = page.locator("[data-dash-item]").first();
      await tile.click();
      const draft = page
        .locator('[data-dashboard-found] input[name="amount"]')
        .first();
      await draft.fill("2");
      await page.evaluate(() => {
        const native = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args) {
          if (this.name === "workspace") {
            IDBObjectStore.prototype.put = native;
            throw new DOMException(
              "Synthetic dashboard quota",
              "QuotaExceededError",
            );
          }
          return native.apply(this, args);
        };
      });
      await plus.click();
      await root.locator('[data-weapon-save-state="retained"]').count();
      await root
        .locator("[data-dashboard-weapon-error]")
        .filter({ hasText: "Synthetic dashboard quota" })
        .waitFor();
      assert.equal((await saved(page)).acquisition.m4.manualExtractions, 2);
      assert(
        await m4.isVisible(),
        "Failed saves must not move the card into Completed",
      );
      assert.equal(await draft.inputValue(), "2");
      await page.locator("#hub-refresh").click();
      assert.equal(await draft.inputValue(), "2");
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        root.locator('[data-weapon-recovery="export"]').click(),
      ]);
      const backup = parseArmoryBackup(
        await readFile(await download.path(), "utf8"),
      );
      assert.equal(backup.acquisition.m4.manualExtractions, 3);
      await root.locator('[data-weapon-recovery="retry"]').click();
      await ready(page, 5);
      assert.equal(await draft.inputValue(), "2");
      assert(
        (await saved(page)).camoCompletions.includes(
          "weapon:m4:military-camo-2",
        ),
      );
      await draft.fill("");
      await page.evaluate(async () => {
        const { readArmory, saveArmory } = await import(
          "/assets/src/storage/armory-store.mjs"
        );
        const { editAcquisition } = await import(
          "/assets/src/domain/weapon-acquisition.mjs"
        );
        const value = (await readArmory()).value;
        await saveArmory(
          editAcquisition(value, "m4", { kind: "manual", value: false }),
          value.revision,
        );
      });
      await han.locator('[data-picker-extraction-step="1"]').click();
      await root
        .locator("[data-dashboard-weapon-error]")
        .filter({ hasText: "Another tab" })
        .waitFor();
      page.once("dialog", (dialog) => dialog.accept());
      await root.locator('[data-weapon-recovery="reload"]').click();
      await ready(page, 6);
      assert(!(await m4.locator("[data-picker-manual]").isChecked()));
      await page.evaluate(() => {
        const native = IDBDatabase.prototype.transaction;
        window.armoryWriteCount = 0;
        IDBDatabase.prototype.transaction = function (...args) {
          const tx = native.apply(this, args);
          if (args[1] === "readwrite" && this.name === "dmz-armory-local") {
            window.armoryWriteCount++;
            if (window.armoryWriteCount === 1)
              tx.addEventListener(
                "complete",
                (event) => {
                  event.stopImmediatePropagation();
                  window.releaseDashboardSave = () =>
                    tx.dispatchEvent(new Event("complete"));
                },
                { capture: true, once: true },
              );
          }
          return tx;
        };
      });
      await han.locator('[data-picker-extraction-step="1"]').click();
      await page.waitForFunction(
        () => typeof window.releaseDashboardSave === "function",
      );
      assert(
        await han.locator('[data-picker-extraction-step="1"]').isDisabled(),
      );
      await page.evaluate(() =>
        dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })),
      );
      await page.evaluate(async () => {
        const { readArmory, saveArmory } = await import(
          "/assets/src/storage/armory-store.mjs"
        );
        const { editAcquisition } = await import(
          "/assets/src/domain/weapon-acquisition.mjs"
        );
        const value = (await readArmory()).value;
        await saveArmory(
          editAcquisition(value, "m4", { kind: "manual", value: true }),
          value.revision,
        );
      });
      await page.evaluate(() => {
        dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
        window.releaseDashboardSave();
      });
      await ready(page, 8);
      assert.equal(
        await page.evaluate(() => window.armoryWriteCount),
        2,
        "Resume rereads without replaying the extraction",
      );
      assert.equal((await saved(page)).revision, 8);
      assert.equal(
        (await saved(page)).acquisition["han-86"].manualExtractions,
        1,
      );
      assert(await m4.locator("[data-picker-manual]").isChecked());
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
      if (name === "chromium") {
        await page.evaluate(
          () => (document.documentElement.style.fontSize = ""),
        );
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await root.evaluate((n) => n.scrollIntoView({ block: "start" }));
          await page.screenshot({
            path: `test-results/dashboard-weapons-${width}.png`,
          });
        }
      }
      const missing = await browser.newContext();
      await missing.route("**/assets/src/ui/weapon-camos.json", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "{}",
        }),
      );
      const missingPage = await missing.newPage();
      await missingPage.goto(base + "/");
      await missingPage
        .locator('[data-dash-content="weapons"]')
        .filter({ hasText: "Weapon list unavailable" })
        .waitFor();
      assert.equal(
        await missingPage.locator("[data-dashboard-manual]").count(),
        0,
      );
      assert(
        !(await missingPage.locator("#dashboard-weapons").innerText()).includes(
          "All listed weapons have",
        ),
      );
      await missing.close();
      const denied = await browser.newContext();
      await denied.addInitScript(() =>
        Object.defineProperty(window, "indexedDB", { value: undefined }),
      );
      const deniedPage = await denied.newPage();
      await deniedPage.goto(base + "/");
      await deniedPage
        .locator('[data-dash-content="weapons"]')
        .filter({ hasText: "Armory unavailable" })
        .waitFor();
      assert.equal(
        await deniedPage.locator("[data-dashboard-manual]").count(),
        0,
      );
      assert(
        !(await deniedPage.locator("#dashboard-weapons").innerText()).includes(
          "All listed weapons have",
        ),
      );
      await denied.close();
      health();
      console.log(
        `${name}:9 types/35 cards, pending/completed/alphabetic/colors, count+camo synchronization, profile draft, quota/export/retry,CAS,reload, held-ack persisted resume without replay and6 layouts PASS`,
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
