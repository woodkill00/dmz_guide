import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";

const server = await createServer({ server: { host: "127.0.0.1", port: 0, hmr: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
const receipts = [];
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    const context = await browser.newContext();
    const page = await context.newPage(), pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    try {
      await page.route("**/__icon-save-fixture.html", route => route.fulfill({
        contentType: "text/html", body: '<!doctype html><html lang="en"><head><title>Synthetic icon controller</title></head><body><main id="host"></main></body></html>',
      }));
      await page.goto(base + "__icon-save-fixture.html");
      await page.evaluate(async () => {
        const { createIconStudio } = await import("/src/workspace/icon-studio.ts");
        window.__calls = []; window.__errors = []; window.__results = [];
        window.__create = () => createIconStudio({
          dirty: () => {}, notice: () => {},
          error: error => window.__errors.push(error.message),
          process: work => work(new AbortController().signal),
          save: async (design, description) => {
            window.__calls.push({ design: structuredClone(design), description });
            await new Promise((resolve, reject) => { window.__resolve = resolve; window.__reject = reject; });
          },
        });
        window.__studio = window.__create();
        document.querySelector("#host").append(window.__studio.root);
      });
      assert.equal(await page.evaluate(() => typeof window.__studio.saveDraft), "function", "Use the actual controller API, never infer save from a click");
      await page.locator("#icon-design-description").fill("");
      assert.equal(await page.evaluate(() => window.__studio.saveDraft()), false);
      assert.equal(await page.evaluate(() => window.__calls.length), 0);
      assert(await page.locator("#save-designed-icon").isDisabled());
      await page.locator("#icon-design-description").fill("Synthetic controller marker");
      await page.locator("#icon-design-label").fill("!!!");
      assert.equal(await page.evaluate(() => window.__studio.saveDraft()), false);
      assert.equal(await page.evaluate(() => window.__calls.length), 0);
      await page.locator("#icon-design-label").fill("A1");
      await page.waitForFunction(() => [...document.querySelectorAll(".icon-design-preview img")].every(i => i.complete && i.naturalWidth > 0));
      await page.evaluate(() => { window.__errors = []; });
      // The real Save button and two API calls must share one pending owning write.
      await page.locator("#save-designed-icon").click();
      await page.evaluate(() => {
        window.__studio.saveDraft().then(value => window.__results.push(value));
        window.__studio.saveDraft().then(value => window.__results.push(value));
      });
      assert.equal(await page.evaluate(() => window.__calls.length), 1);
      assert.deepEqual(await page.evaluate(() => window.__results), []);
      assert(await page.locator("#save-designed-icon").isDisabled());
      await page.evaluate(() => window.__reject(new Error("Synthetic quota failure")));
      await page.waitForFunction(() => window.__results.length === 2);
      assert.deepEqual(await page.evaluate(() => window.__results), [false, false]);
      assert.deepEqual(await page.evaluate(() => window.__errors), ["Synthetic quota failure"]);
      assert(await page.locator("#save-designed-icon").isEnabled());
      assert.equal(await page.locator("#icon-design-description").inputValue(), "Synthetic controller marker");
      await page.evaluate(() => {
        window.__results = [];
        window.__studio.saveDraft().then(value => window.__results.push(value));
      });
      await page.waitForFunction(() => window.__calls.length === 2);
      assert.deepEqual(await page.evaluate(() => window.__results), []);
      await page.evaluate(() => window.__resolve());
      await page.waitForFunction(() => window.__results.length === 1);
      assert.deepEqual(await page.evaluate(() => window.__results), [true]);
      assert.equal(await page.evaluate(() => window.__calls[1].design.label), "A1");
      // Late failure belongs to the retired controller, not the replacement with identical IDs.
      await page.evaluate(() => {
        window.__results = [];
        window.__old = window.__studio;
        window.__old.saveDraft().then(value => window.__results.push(value));
      });
      await page.waitForFunction(() => window.__calls.length === 3);
      await page.evaluate(() => {
        window.__old.destroy(); window.__old.root.remove();
        window.__studio = window.__create();
        document.querySelector("#host").append(window.__studio.root);
        window.__errors = [];
      });
      await page.waitForFunction(() => [...document.querySelectorAll(".icon-design-preview img")].every(i => i.complete && i.naturalWidth > 0));
      const newer = await page.locator("#icon-studio").evaluate(e => e.outerHTML);
      await page.evaluate(() => window.__reject(new Error("Late retired failure")));
      await page.waitForFunction(() => window.__results.length === 1);
      assert.deepEqual(await page.evaluate(() => window.__results), [false]);
      assert.deepEqual(await page.evaluate(() => window.__errors), []);
      assert.equal(await page.locator("#icon-studio").evaluate(e => e.outerHTML), newer);
      assert.equal(await page.evaluate(() => window.__calls.length), 3);
      assert.equal(await page.evaluate(() => window.__old.saveDraft()), false);
      assert.equal(await page.evaluate(() => window.__calls.length), 3);
      assert.deepEqual(pageErrors, []);
      receipts.push({ engine: name, validation: true, pendingShared: true, failureRetry: true, realConfirmation: true, retiredOwner: true, pageErrors });
      console.log(name + " icon Save controller validation/held/failure/retry/retired-owner PASS");
    } finally { await context.close(); await browser.close(); }
  }
  await mkdir(".local", { recursive: true });
  await writeFile(".local/icon-save-browser.json", JSON.stringify(receipts, null, 2));
} finally { await server.close(); }
