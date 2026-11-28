import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export async function runOrderEarlyReturnTests({ browser, base }) {
  const context = await browser.newContext(),
    errors = [];
  try {
    await context.addInitScript(() => {
      window.__holdOrderInit = true;
      window.__orderInitGates = [];
    });
    await context.route("**/assets/src/client/common.mjs", async (route) => {
      const response = await route.fetch(),
        source = await response.text();
      const anchor = "let schema, manifest;";
      assert.equal(
        source.split(anchor).length,
        2,
        "One exact initialization seam",
      );
      await route.fulfill({
        response,
        body: source.replace(
          anchor,
          "if(window.__holdOrderInit)await new Promise(resolve=>window.__orderInitGates.push(resolve));\n" +
            anchor,
        ),
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/missions/?pack=official%3Amw4-dmz-starter");
    await page.waitForFunction(() => window.__orderInitGates?.length === 1);
    await page.evaluate(() => {
      dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
      dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    await page.waitForFunction(() => window.__orderInitGates.length >= 2);
    await page.evaluate(() => {
      window.__holdOrderInit = false;
      for (const release of window.__orderInitGates) release();
    });
    await page.locator('main[aria-busy="false"]').waitFor();
    assert.deepEqual(
      errors,
      [],
      "Returning during first load must not dereference an absent profile",
    );
    assert(
      await page
        .locator('#hajin-page-1 [data-order-complete="hajin-1"]')
        .isEnabled(),
    );
    console.log(
      browser.browserType().name() + " held-initialization Orders return PASS",
    );
  } finally {
    await context.close();
  }
}

export async function runOrderReturnTests({ browser, base }) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/missions/?pack=official%3Amw4-dmz-starter");
    await page.locator('main[aria-busy="false"]').waitFor();
    const control = page.locator(
      '#hajin-page-1 [data-order-complete="mw4:order-gear-up"]',
    );
    await control.click();
    await page.waitForFunction(
      () =>
        document.querySelector(
          '#hajin-page-1 [data-order-complete="mw4:order-gear-up"]',
        )?.checked &&
        document.querySelector("main").getAttribute("aria-busy") === "false",
    );
    const saved = await page.evaluate(async () => {
      const { loadProfile } = await import("/assets/src/storage/store.mjs");
      return (await loadProfile("official:mw4-dmz-starter")).value;
    });
    assert.equal(saved.completion["mw4:order-gear-up"], "completed");
    // Deterministic BFCache lifecycle: another writer edits canonical storage
    // while a clean document is suspended, then the same document returns.
    await page.evaluate(async () => {
      dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
      const { loadProfile, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const current = (await loadProfile("official:mw4-dmz-starter")).value;
      await saveProfile(
        {
          ...current,
          completion: { ...current.completion, "mw4:order-gear-up": "unknown" },
        },
        current.revision,
      );
      dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    await page.waitForFunction(
      () => {
        const c = document.querySelector(
          '#hajin-page-1 [data-order-complete="mw4:order-gear-up"]',
        );
        return c && !c.checked && !c.disabled;
      },
      null,
      { timeout: 5000 },
    );
    assert.equal(await control.isChecked(), false);
    const after = await page.evaluate(
      async () =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("official:mw4-dmz-starter")
        ).value,
    );
    assert.equal(
      after.revision,
      saved.revision + 1,
      "Return reads canonical state without replaying a write",
    );
    assert.deepEqual(
      after.inventory,
      saved.inventory,
      "Return preserves quantities",
    );
    console.log(
      browser.browserType().name() + " clean Orders cached-return refresh PASS",
    );
  } finally {
    await context.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { chromium, firefox, webkit } = await import("playwright");
  const { startBrowserServer } = await import("./server.mjs");
  const server = await startBrowserServer();
  try {
    for (const [name, type] of Object.entries({
      chromium,
      firefox,
      webkit,
    }).filter(
      ([name]) => !process.env.BROWSER || process.env.BROWSER === name,
    )) {
      const browser = await type.launch();
      try {
        await runOrderEarlyReturnTests({ browser, base: server.base });
        await runOrderReturnTests({ browser, base: server.base });
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.stop();
  }
}
