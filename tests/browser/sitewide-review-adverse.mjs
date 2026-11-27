import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173";
for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  try {
    let context = await browser.newContext(),
      page = await context.newPage();
    await page.goto(base + "/help/");
    const corrupt = await page.evaluate(async () => {
      const { readQualityReviews, saveQualityReviews } = await import(
        "/assets/src/storage/quality-review-store.mjs"
      );
      await saveQualityReviews({ version: 1, entries: [] }, 0);
      await new Promise((resolve, reject) => {
        const q = indexedDB.open("dmz-editorial-local", 1);
        q.onsuccess = () => {
          const db = q.result,
            tx = db.transaction("reviews", "readwrite");
          tx.objectStore("reviews").put(undefined, "site-quality");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        q.onerror = () => reject(q.error);
      });
      let readFailed = false,
        saveFailed = false;
      try {
        await readQualityReviews();
      } catch {
        readFailed = true;
      }
      try {
        await saveQualityReviews({ version: 1, entries: [] }, 0);
      } catch {
        saveFailed = true;
      }
      const preserved = await new Promise((resolve, reject) => {
        const q = indexedDB.open("dmz-editorial-local", 1);
        q.onsuccess = () => {
          const db = q.result,
            tx = db.transaction("reviews", "readonly"),
            r = tx.objectStore("reviews").getAll("site-quality", 1);
          r.onsuccess = () =>
            resolve(r.result.length === 1 && r.result[0] === undefined);
          tx.oncomplete = () => db.close();
        };
        q.onerror = () => reject(q.error);
      });
      return { readFailed, saveFailed, preserved };
    });
    assert.deepEqual(corrupt, {
      readFailed: true,
      saveFailed: true,
      preserved: true,
    });
    await context.close();
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(base + "/help/");
    const quota = await page.evaluate(async () => {
      const { readQualityReviews, saveQualityReviews } = await import(
        "/assets/src/storage/quality-review-store.mjs"
      );
      const first = await saveQualityReviews({ version: 1, entries: [] }, 0),
        put = IDBObjectStore.prototype.put;
      let rejected = false;
      IDBObjectStore.prototype.put = function () {
        throw new DOMException(
          "Synthetic editorial quota",
          "QuotaExceededError",
        );
      };
      try {
        await saveQualityReviews({ version: 1, entries: [] }, first.revision);
      } catch {
        rejected = true;
      } finally {
        IDBObjectStore.prototype.put = put;
      }
      const retained = await readQualityReviews();
      return {
        rejected,
        revision: retained.revision,
        entries: retained.value.entries.length,
      };
    });
    assert.deepEqual(quota, { rejected: true, revision: 1, entries: 0 });
    await page.goto(base + "/quality/");
    await page.waitForFunction(
      () => document.querySelector("#quality-rows select")?.disabled === false,
    );
    await page
      .locator("#quality-import")
      .locator("xpath=ancestor::details")
      .locator(":scope > summary")
      .click();
    await page.evaluate(() => {
      const original = File.prototype.text;
      File.prototype.text = function () {
        if (this.name === "slow.json")
          return new Promise(
            (_resolve, reject) => (window.__rejectOldImport = reject),
          );
        return original.call(this);
      };
    });
    await page.locator("#quality-import").setInputFiles({
      name: "slow.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
    await page.waitForFunction(
      () => typeof window.__rejectOldImport === "function",
    );
    await page.locator("#quality-import").setInputFiles({
      name: "current.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1,"entries":[]}'),
    });
    await page.locator("#quality-import-apply").waitFor({ state: "visible" });
    await page.evaluate(() => {
      window.__rejectOldImport(Error("Old import failed"));
      return new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.ok(await page.locator("#quality-error").isHidden());
    assert.ok(await page.locator("#quality-import-apply").isVisible());
    const held = page.evaluate(() =>
      navigator.locks.request(
        "dmz-quality-reviews-v1",
        () => new Promise((resolve) => (window.__releaseImport = resolve)),
      ),
    );
    await page.waitForFunction(
      () => typeof window.__releaseImport === "function",
    );
    await page.locator("#quality-import-apply").click();
    assert.ok(await page.locator("#quality-import").isDisabled());
    await page.evaluate(() => window.__releaseImport());
    await held;
    await page.waitForFunction(
      () => document.querySelector("#quality-import-apply").hidden,
    );
    const saved = await page.evaluate(
      async () =>
        (
          await (
            await import("/assets/src/storage/quality-review-store.mjs")
          ).readQualityReviews()
        ).revision,
    );
    assert.equal(saved, 2);
    assert.ok(await page.locator("#quality-import").isEnabled());
    await context.close();
    console.log(
      `${name}: editorial present-undefined corruption preserved, quota CAS retention, stale File.text error isolation and import pending freeze PASS`,
    );
  } finally {
    await browser.close();
  }
}
