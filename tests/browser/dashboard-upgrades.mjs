import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";
import { validateProfile } from "../../src/domain/profile.mjs";
const server = process.env.DMZ_SITE_URL ? null : await startBrowserServer();
const base = process.env.DMZ_SITE_URL || server.base;
const read = (page) =>
  page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).readRecord("profiles", "official:mw4-dmz-starter")
      ).value,
  );
const ready = (page, n) =>
  page.waitForFunction(
    (rev) =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes(`revision ${rev}`),
    n,
  );
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch(),
      health = monitorBrowser(browser);
    try {
      const context = await browser.newContext();
      await context.route(
        "**/assets/src/client/collection-action.mjs",
        async (route) => {
          const response = await route.fetch();
          let source = await response.text();
          source = source
            .replace(
              "export async function commitFoundOperation",
              "async function originalCommitFoundOperation",
            )
            .replace(
              "export async function verifyFoundOperation",
              "async function originalVerifyFoundOperation",
            );
          source += `\nexport async function commitFoundOperation(op,options){if(op.kind!=='upgrade')return originalCommitFoundOperation(op,options);return originalCommitFoundOperation(op,{save:async(...args)=>{window.upgradeWrites=(window.upgradeWrites||0)+1;const saved=await saveProfile(...args);if(window.holdUpgradeAck)return new Promise(resolve=>window.releaseUpgradeAck=()=>resolve(saved));return saved}})}\nexport async function verifyFoundOperation(op,options){if(op.kind==='upgrade'&&window.failUpgradeRead){window.failUpgradeRead=false;throw Error('Synthetic upgrade reread failure')}return originalVerifyFoundOperation(op,options)}\n`;
          await route.fulfill({ response, body: source });
        },
      );
      const page = await context.newPage();
      await page.goto(base + "/");
      await page.waitForSelector('[data-weapon-save-state="ready"]');
      await page.evaluate(async () => {
        const { newProfile } = await import("/assets/src/domain/profile.mjs");
        const { saveProfile } = await import("/assets/src/storage/store.mjs");
        const pack = await (
          await fetch("/assets/content/packs/official-starter.json")
        ).json();
        const value = newProfile(pack);
        value.inventory["mw4:synthetics"] = 17;
        value.inventory["mw4:currency-dmz-cash"] = 100;
        value.buildTargets = { "mw4:bandage": 2 };
        await saveProfile(value, 0);
      });
      await page.locator("#hub-refresh").click();
      await ready(page, 1);
      const root = page.locator("#dashboard-upgrades");
      const tier = (id) =>
        root.locator(
          `[data-dash-upgrade-complete="mw4:upgrade-bank-upgrade-${id}"]`,
        );
      const baseline = (await read(page)).inventory;
      assert(
        await root
          .locator('.item-card[data-item-size="compact"]')
          .first()
          .isVisible(),
      );
      const requirement = root.locator("a[data-item-card]").first();
      const href = await requirement.getAttribute("href");
      assert(new URL(href, base).pathname === "/local/");
      assert(await requirement.locator(".std-item-icon").count());
      await tier("i").click();
      await ready(page, 2);
      assert(await tier("ii").isVisible());
      assert.deepEqual((await read(page)).inventory, baseline);
      const undo = page.locator(
        '#dashboard-upgrade-feedback [data-dash-upgrade-action="undo"]',
      );
      assert((await undo.textContent()).includes("Bank Upgrade I"));
      await undo.click();
      await ready(page, 3);
      assert(await tier("i").isVisible());
      assert.equal(
        (await read(page)).upgradeProgress["mw4:upgrade-bank-upgrade-i"]
          .completion,
        "unknown",
      );
      await tier("i").click();
      await ready(page, 4);
      await tier("ii").click();
      await ready(page, 5);
      await undo.click();
      await ready(page, 6);
      assert.equal(
        (await read(page)).upgradeProgress["mw4:upgrade-bank-upgrade-i"]
          .completion,
        "completed",
      );
      assert.equal(
        (await read(page)).upgradeProgress["mw4:upgrade-bank-upgrade-ii"]
          .completion,
        "unknown",
      );
      await page.locator("[data-dash-item]").first().click();
      const draft = page
        .locator('[data-dashboard-found] input[name="amount"]')
        .first();
      await draft.fill("2");
      await tier("ii").click();
      assert.equal((await read(page)).revision, 6);
      assert.equal(await draft.inputValue(), "2");
      await draft.fill("");
      await page.evaluate(() => {
        const native = IDBDatabase.prototype.transaction;
        IDBDatabase.prototype.transaction = function (...args) {
          const tx = native.apply(this, args);
          if (this.name === "dmz-armory-local" && args[1] === "readwrite") {
            IDBDatabase.prototype.transaction = native;
            tx.addEventListener(
              "complete",
              (event) => {
                event.stopImmediatePropagation();
                window.releaseArmoryDraft = () =>
                  tx.dispatchEvent(new Event("complete"));
              },
              { capture: true, once: true },
            );
          }
          return tx;
        };
      });
      await page
        .locator('[data-weapon-card="m4"] [data-picker-extraction-step="1"]')
        .click();
      await page.waitForFunction(
        () => typeof window.releaseArmoryDraft === "function",
      );
      await tier("ii").click();
      assert.equal(
        (await read(page)).revision,
        6,
        "Pending armory changes block upgrade writes",
      );
      await page.evaluate(() => window.releaseArmoryDraft());
      await page.waitForSelector('[data-weapon-save-state="ready"]');
      await page.evaluate(() => {
        const native = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (...args) {
          if (this.name === "profiles") {
            IDBObjectStore.prototype.put = native;
            throw new DOMException(
              "Synthetic upgrade quota",
              "QuotaExceededError",
            );
          }
          return native.apply(this, args);
        };
      });
      await tier("ii").click();
      await root.locator('[data-dash-upgrade-action="retry"]').waitFor();
      assert.equal((await read(page)).revision, 6);
      assert(await tier("ii").isDisabled());
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        root.locator('[data-dash-upgrade-action="export"]').click(),
      ]);
      const proposal = validateProfile(
        JSON.parse(await readFile(await download.path(), "utf8")),
      );
      assert.equal(
        proposal.upgradeProgress["mw4:upgrade-bank-upgrade-ii"].completion,
        "completed",
      );
      assert.deepEqual(proposal.inventory, baseline);
      await root.locator('[data-dash-upgrade-action="retry"]').click();
      await ready(page, 7);
      assert(await tier("iii").isVisible());
      await page.evaluate(() => {
        window.upgradeWrites = 0;
        window.failUpgradeRead = true;
      });
      await tier("iii").click();
      await root.locator('[data-dash-upgrade-action="verify"]').waitFor();
      assert.equal((await read(page)).revision, 8);
      assert(await tier("iii").isDisabled());
      assert.equal(
        await root.locator('[data-dash-upgrade-action="retry"]').count(),
        0,
      );
      await page.evaluate(async () => {
        const { readRecord, saveProfile } = await import(
          "/assets/src/storage/store.mjs"
        );
        const value = (await readRecord("profiles", "official:mw4-dmz-starter"))
          .value;
        value.inventory["mw4:synthetics"]++;
        await saveProfile(value, value.revision);
      });
      await root.locator('[data-dash-upgrade-action="verify"]').click();
      await ready(page, 9);
      assert.equal(await page.evaluate(() => window.upgradeWrites), 1);
      assert.equal((await read(page)).inventory["mw4:synthetics"], 18);
      assert.equal(
        await root.locator('[data-dash-upgrade-action="undo"]').count(),
        0,
      );
      await page.evaluate(() => {
        window.upgradeWrites = 0;
        window.holdUpgradeAck = true;
      });
      await tier("iv").click();
      await page.waitForFunction(
        () => typeof window.releaseUpgradeAck === "function",
      );
      await page.evaluate(() =>
        dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })),
      );
      await page.evaluate(async () => {
        const { readRecord, saveProfile } = await import(
          "/assets/src/storage/store.mjs"
        );
        const value = (await readRecord("profiles", "official:mw4-dmz-starter"))
          .value;
        value.upgradeProgress["mw4:upgrade-bank-upgrade-i"].completion =
          "incomplete";
        await saveProfile(value, value.revision);
      });
      await page.evaluate(() => {
        dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
        window.holdUpgradeAck = false;
        window.releaseUpgradeAck();
      });
      await ready(page, 11);
      assert(await tier("i").isVisible());
      assert.equal(await page.evaluate(() => window.upgradeWrites), 1);
      assert.equal((await read(page)).revision, 11);
      assert.equal((await read(page)).inventory["mw4:synthetics"], 18);
      await page.locator('[data-dash-more="upgrades"]').click();
      await root
        .locator(
          '[data-dash-upgrade-complete="mw4:upgrade-uncommon-ingredient-printing"]',
        )
        .click();
      await ready(page, 12);
      const printing = await page.evaluate(async () => {
        const { automaticIngredientBlueprint } = await import(
          "/assets/src/domain/inventory-presentation.mjs"
        );
        const { readRecord } = await import("/assets/src/storage/store.mjs");
        const pack = await (
          await fetch("/assets/content/packs/official-starter.json")
        ).json();
        const profile = (await readRecord("profiles", pack.id)).value;
        return pack.items.some(
          (item) =>
            automaticIngredientBlueprint(pack, profile, item)?.id ===
            "mw4:upgrade-uncommon-ingredient-printing",
        );
      });
      assert(
        printing,
        "Dashboard completion grants the existing derived ingredient-printing ownership",
      );
      for (const width of [320, 390, 1440])
        for (const zoom of [1, 2]) {
          await page.setViewportSize({ width, height: 1000 });
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
            path: `test-results/dashboard-upgrades-${width}.png`,
          });
        }
      }
      for (const path of [
        "/inventory/?pack=official%3Amw4-dmz-starter",
        "/quick-collect/?pack=official%3Amw4-dmz-starter",
        "/upgrades/?pack=official%3Amw4-dmz-starter",
        "/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Asynthetics",
        "/items/",
      ]) {
        await page.goto(base + path);
        await page
          .locator(".std-item-icon")
          .first()
          .waitFor({ state: "attached" });
        assert.equal(
          await page.locator('.std-item-icon[aria-hidden="true"] a').count(),
          0,
        );
      }
      await context.close();
      health();
      console.log(
        `${name}: current tier/next/Undo, full icon requirements, unchanged stock, draft isolation, quota/export/retry, read failure/no replay, concurrent writer/persisted Back,6 responsive states and shared item surfaces PASS`,
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
