import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { monitorBrowser } from "./health.mjs";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173";
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
        source = source.replace(
          "export async function verifyFoundOperation",
          "async function originalVerifyFoundOperation",
        );
        source +=
          '\nexport async function verifyFoundOperation(op,options){if(op.kind==="order" && window.failOrderRead){window.failOrderRead=false;throw Error("Synthetic failed canonical read")}return originalVerifyFoundOperation(op,options)}';
        await route.fulfill({ response, body: source });
      },
    );
    await context.route("**/assets/src/client/common.mjs", async (route) => {
      const response = await route.fetch();
      let source = await response.text();
      source = source.replace(
        "onCommitted?.(saved);",
        "if(window.holdOrderAck)await new Promise(resolve=>window.releaseOrderAck=()=>resolve());\n    onCommitted?.(saved);",
      );
      await route.fulfill({ response, body: source });
    });
    await context.route(
      "**/assets/src/storage/dashboard-context.mjs",
      async (route) => {
        const response = await route.fetch();
        let source = await response.text();
        source = source.replace(
          "export async function readDashboardProfile",
          "async function originalReadDashboardProfile",
        );
        source +=
          '\nexport async function readDashboardProfile(...args){const value=await originalReadDashboardProfile(...args);if(window.failDirectoryRead){window.failDirectoryRead=false;throw Error("Synthetic canonical read failure")}if(window.holdDirectoryRead){window.holdDirectoryRead=false;window.heldDirectoryReads=(window.heldDirectoryReads||0)+1;await new Promise(resolve=>window.releaseDirectoryRead=()=>resolve())}return value}';
        await route.fulfill({ response, body: source });
      },
    );
    const page = await context.newPage();
    await page.goto(base + "/");
    await page.waitForSelector('[data-weapon-save-state="ready"]');
    const data = await page.evaluate(async () => {
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const { hajinOrderSequence } = await import(
        "/assets/src/content/hajin-order-sequence.mjs"
      );
      const pack = await (
        await fetch("/assets/content/packs/official-starter.json")
      ).json();
      const profile = newProfile(pack);
      profile.inventory["mw4:synthetics"] = 42;
      await saveProfile(profile, 0);
      return {
        ids: hajinOrderSequence.pages[0].objectiveIds,
        stock: profile.inventory,
      };
    });
    const read = () =>
      page.evaluate(
        async () =>
          (
            await (
              await import("/assets/src/storage/store.mjs")
            ).readRecord("profiles", "official:mw4-dmz-starter")
          ).value,
      );
    const waitRevision = async (n) => {
      await page.waitForFunction(
        async (rev) =>
          (
            await (
              await import("/assets/src/storage/store.mjs")
            ).readRecord("profiles", "official:mw4-dmz-starter")
          ).value.revision === rev,
        n,
      );
    };
    const check = (key) => page.locator('[data-order-complete="' + key + '"]');
    const clickMission = async (id) => {
      const control = check(id);
      for (const details of await control
        .locator("xpath=ancestor::details")
        .all())
        if (!(await details.evaluate((n) => n.open)))
          await details.locator(":scope > summary").click();
      await control.click();
    };
    const directory = base + "/missions/?pack=official%3Amw4-dmz-starter";
    await page.goto(directory);
    await check("hajin-1").waitFor();
    assert(data.ids.length > 1);
    await clickMission(data.ids[0]);
    await waitRevision(2);
    await page.waitForFunction(
      () =>
        document.querySelector('[data-order-complete="hajin-1"]')
          ?.indeterminate,
    );
    assert.equal(await check(data.ids[0]).isChecked(), true);
    assert.equal(await page.locator("#progress-track").isEnabled(), true);
    await page.goto(base + "/");
    await check("hajin-1").waitFor();
    assert.equal(await check("hajin-1").evaluate((n) => n.indeterminate), true);
    assert.equal(await check(data.ids[0]).count(), 0);
    await check("hajin-1").click();
    await waitRevision(3);
    await page.waitForFunction(
      () =>
        !document.querySelector('#dashboard-orders [data-order-key="hajin-1"]'),
    );
    assert.equal(
      await page
        .locator("[data-order-show-completed]")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    await page.locator("[data-order-show-completed]").check();
    assert.equal(await check("hajin-1").isChecked(), true);
    for (const id of data.ids)
      assert.equal((await read()).completion[id], "completed");
    await clickMission(data.ids[0]);
    await waitRevision(4);
    await page.waitForFunction(
      () =>
        document.querySelector(
          '#dashboard-orders [data-order-complete="hajin-1"]',
        )?.indeterminate,
    );
    await page.goto(directory);
    await check("hajin-1").waitFor();
    assert.equal(await check(data.ids[0]).isChecked(), false);
    assert.equal(await check(data.ids[1]).isChecked(), true);
    // Real transaction abort keeps exact proposal and restores committed controls.
    await page.evaluate(() => {
      const old = IDBObjectStore.prototype.put;
      window.restoreOrderPut = () => (IDBObjectStore.prototype.put = old);
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === "profiles")
          throw new DOMException("Synthetic quota", "QuotaExceededError");
        return old.apply(this, args);
      };
    });
    await check("hajin-1").click();
    await page.locator('[data-order-recover="retry"]').waitFor();
    assert.equal((await read()).revision, 4);
    assert.equal(await check("hajin-1").evaluate((n) => n.indeterminate), true);
    await page.evaluate(() => {
      window.restoreOrderPut();
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    await page.waitForTimeout(150);
    assert.equal((await read()).revision, 4);
    await page.locator('[data-order-recover="retry"]').click();
    await waitRevision(5);
    await page.waitForFunction(
      () => document.querySelector('[data-order-complete="hajin-1"]')?.checked,
    );
    assert.equal(await page.locator("#progress-track").isEnabled(), true);
    const x01 = page.locator(
      '#mission-directory-x01 [data-order-complete="x01-1"]',
    );
    await x01.click();
    await waitRevision(6);
    // A newer focused native link must survive a delayed durable acknowledgement.
    await page.evaluate(() => (window.holdOrderAck = true));
    await clickMission(data.ids[1]);
    await waitRevision(7);
    const newer = page.locator("#mission-directory-hajin a").first();
    await newer.focus();
    await page.evaluate(() => {
      window.holdOrderAck = false;
      window.releaseOrderAck();
    });
    await page.waitForFunction(
      (id) =>
        !document.querySelector('[data-order-complete="' + id + '"]')?.checked,
      data.ids[1],
    );
    assert.equal(
      await newer.evaluate((n) => n === document.activeElement),
      true,
    );
    // A persisted return with another writer must adopt canonical state after settling.
    await page.evaluate(() => (window.holdOrderAck = true));
    await clickMission(data.ids[1]);
    await waitRevision(8);
    await page.evaluate(async (id) => {
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
      const store = await import("/assets/src/storage/store.mjs");
      const current = (
        await store.readRecord("profiles", "official:mw4-dmz-starter")
      ).value;
      current.completion[id] = "unknown";
      await store.saveProfile(current, current.revision);
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
      window.holdOrderAck = false;
      window.releaseOrderAck();
    }, data.ids[1]);
    await page.waitForFunction(async (id) => {
      const { state } = await import("/assets/src/client/common.mjs");
      return (
        state.revision === 9 &&
        !document.querySelector('[data-order-complete="' + id + '"]')?.checked
      );
    }, data.ids[1]);

    await page.goto(base + "/");
    await page.locator("[data-order-show-completed]").waitFor();
    await page.locator("[data-order-show-completed]").check();
    assert.equal(await check("x01-1").isChecked(), true);
    // Durable write then failed verification must never apply a second write.
    await page.evaluate(() => (window.failOrderRead = true));
    await check("hajin-1").click();
    await waitRevision(10);
    await page
      .locator('#dashboard-order-feedback [data-dash-upgrade-action="verify"]')
      .waitFor();
    assert.equal(
      await page
        .locator('#dashboard-order-feedback [data-dash-upgrade-action="retry"]')
        .count(),
      0,
    );
    await page
      .locator('#dashboard-order-feedback [data-dash-upgrade-action="verify"]')
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("revision 10"),
    );
    assert.equal((await read()).revision, 10);
    assert.deepEqual((await read()).inventory, data.stock);
    await page.goto(directory);
    await check("hajin-1").waitFor();
    await page.evaluate(() => (window.failDirectoryRead = true));
    await clickMission(data.ids[1]);
    await waitRevision(11);
    await page.locator('[data-order-recover="retry"]').waitFor();
    await page.evaluate(() => (window.holdDirectoryRead = true));
    await page.locator('[data-order-recover="retry"]').click();
    await page.waitForFunction(() => !!window.releaseDirectoryRead);
    await page.locator('[data-order-recover="retry"]').dispatchEvent("click");
    await page.evaluate(async (id) => {
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
      const store = await import("/assets/src/storage/store.mjs");
      const current = (
        await store.readRecord("profiles", "official:mw4-dmz-starter")
      ).value;
      current.completion[id] = "completed";
      await store.saveProfile(current, current.revision);
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
      window.releaseDirectoryRead();
    }, data.ids[1]);
    await page.waitForFunction(async (id) => {
      const { state } = await import("/assets/src/client/common.mjs");
      return (
        state.revision === 12 &&
        document.querySelector('[data-order-complete="' + id + '"]')?.checked
      );
    }, data.ids[1]);
    assert.equal((await read()).revision, 12);
    assert.equal(await page.evaluate(() => window.heldDirectoryReads), 1);
    await page.goto(base + "/");
    await page.locator("[data-order-show-completed]").waitFor();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      if (name === "chromium")
        await page.locator("#dashboard-orders").screenshot({
          path: "test-results/orders-" + name + "-" + width + ".png",
        });
    }
    health();
    console.log(
      name +
        ": mission/page/mixed completion, hidden completed+show/reopen/focus, cross-page sync, X01, quota/retry, no-replay verification, held-save newer-focus/persisted-return, stock preserved and320/390/1440 layouts PASS",
    );
  } finally {
    await browser.close();
  }
}
