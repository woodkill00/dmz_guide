import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs";
import { pageEditorFixture } from "../helpers/page-editor.mjs";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const f = await pageEditorFixture(),
    browser = await engine.launch(),
    context = await browser.newContext(),
    page = await context.newPage(),
    errors = [];
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = () => page.locator("#pe-add-section:enabled").waitFor();
  try {
    await page.goto(f.url("test:order"));
    await ready();
    await page.locator("#pe-add-section").click();
    await page
      .getByLabel("Section title", { exact: true })
      .fill("Lost acknowledgement fixture");
    await page.locator("#pe-validate").click();
    await page.locator("#pe-save:enabled").waitFor();
    let submitted;
    await page.route("**/api/page-edits/commit", async (route) => {
      submitted = route.request().postDataJSON();
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      await route.abort("failed");
    });
    await page.locator("#pe-save").click();
    await page
      .locator("#pe-status")
      .filter({ hasText: /^Save outcome unresolved/ })
      .waitFor();
    assert.equal((await f.get("test:order")).document.revision, 1);
    for (const theme of ["dark", "light"]) {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      const result = await new AxeBuilder({ page }).analyze();
      assert.deepEqual(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        [],
        `${name} ${theme} recovery state axe`,
      );
    }
    // An operation recovery write admitted just before pagehide must not allow
    // the now-inactive page to submit a repository mutation afterwards.
    const leaving = await context.newPage();
    leaving.on("dialog", (d) => d.accept());
    await leaving.goto(f.url("test:upgrade"));
    await leaving.locator("#pe-add-section:enabled").waitFor();
    await leaving.locator("#pe-add-section").click();
    await leaving.locator("#pe-validate").click();
    await leaving.locator("#pe-save:enabled").waitFor();
    await leaving.evaluate(() => {
      const original = indexedDB.open.bind(indexedDB);
      window.__restoreOpen = () => (indexedDB.open = original);
      indexedDB.open = (...args) => {
        const request = original(...args);
        Object.defineProperty(request, "onsuccess", {
          set(fn) {
            request.addEventListener("success", (event) => {
              window.__releaseRecovery = () => fn.call(request, event);
            });
          },
        });
        return request;
      };
    });
    let posts = 0;
    leaving.on("request", (r) => {
      if (r.url().endsWith("/api/page-edits/commit")) posts++;
    });
    await leaving.locator("#pe-save").click();
    await leaving.waitForFunction(() => !!window.__releaseRecovery);
    await leaving.evaluate(() => {
      dispatchEvent(new PageTransitionEvent("pagehide"));
      window.__restoreOpen();
      window.__releaseRecovery();
    });
    await leaving
      .locator("#pe-status")
      .filter({ hasText: /^Save outcome unresolved/ })
      .waitFor();
    assert.equal(posts, 0);
    assert.equal((await f.get("test:upgrade")).document.revision, 0);
    await leaving.close();
    assert.equal(await page.locator("#pe-save").isDisabled(), true);
    await page.locator("#pe-check-operation").click();
    await page
      .locator("#pe-status")
      .filter({ hasText: /^Saved to repository/ })
      .waitFor();
    assert.equal((await f.get("test:order")).document.revision, 1);
    const repeated = await f.post("/api/page-edits/commit", submitted);
    // A background checkpoint can hold the repository snapshot lock after the
    // save acknowledgement. Resolve the existing operation by GET, never by
    // resubmitting another mutation or treating an unresolved receipt as saved.
    let receipt = repeated;
    const receiptDeadline = Date.now() + 30000;
    while (receipt.state === "unresolved" && Date.now() < receiptDeadline) {
      const response = await fetch(
        f.app.url + "/api/page-edits/operations/" + submitted.operationId,
        { headers: f.headers },
      );
      assert.equal(response.status, 200);
      receipt = await response.json();
      if (receipt.state === "unresolved")
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(receipt.state, "committed");
    assert.equal(receipt.documentRevision, 1);
    assert.equal((await f.get("test:order")).document.revision, 1);
    await page.unroute("**/api/page-edits/commit");
    await page.evaluate(() => {
      IDBObjectStore.prototype.put = function () {
        throw new DOMException("Synthetic quota fixture", "QuotaExceededError");
      };
    });
    await page.locator("#pe-add-section").click();
    await page
      .locator("#pe-status")
      .filter({ hasText: /^Unsaved changes · recovery unavailable/ })
      .waitFor();
    await page.locator("#pe-validate").click();
    await page
      .locator("#pe-error")
      .filter({ hasText: /Synthetic quota fixture/ })
      .waitFor();
    assert.equal(await page.locator("#pe-save").isDisabled(), true);
    assert.equal((await f.get("test:order")).document.revision, 1);
    await page.reload();
    await ready();
    await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open("dmz-page-editor-recovery", 1);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction("drafts", "readwrite"),
          s = tx.objectStore("drafts"),
          r = s.openCursor();
        r.onsuccess = () => {
          const c = r.result;
          if (c) {
            c.update({ ...c.value, value: { ...c.value.value, version: 999 } });
            c.continue();
          }
        };
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.reload();
    await page
      .locator("#pe-error")
      .filter({ hasText: /unsupported data/ })
      .waitFor();
    assert.equal(await page.locator("#pe-add-section").isDisabled(), true);
    assert.equal((await f.get("test:order")).document.revision, 1);
    assert.deepEqual(errors, []);
    console.log(
      `093 ${name} lost-ack/exact-replay/quota/future-recovery retention PASS`,
    );
  } finally {
    await context.close();
    await browser.close();
    await f.close();
  }
}
