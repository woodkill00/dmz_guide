import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";

const displayKey = "dmz-ui-display-v1.guide";
const hubIDs = ["home", "hajin-map", "dmz-guide", "dmz-fob", "dmz-weapons"];

export async function runUIShellTests({ browser, base }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const ready = async () => {
    await page.waitForFunction(
      () => document.documentElement.dataset.uiShellMounted === "071-v1",
    );
    assert.equal(
      await page.locator("html").getAttribute("data-ui-variant"),
      "modern",
    );
    assert.equal(
      await page.locator("html").getAttribute("data-ui-adapter"),
      "guide-shell",
    );
  };
  const density = async () => {
    const menu = page.locator(".site-nav .nav-more");
    if (!(await menu.evaluate((e) => e.open)))
      await menu.locator(":scope > summary").click();
    return menu.locator("[data-ui-density]");
  };
  try {
    await page.goto(base + "/");
    await ready();
    const originalURL = page.url();
    const [child] = await Promise.all([
      context.waitForEvent("page"),
      page
        .locator('.ui-primary-links [data-feature-id="dmz-fob"]')
        .click({ modifiers: ["ControlOrMeta"] }),
    ]);
    await child.waitForURL("**/dmz-fob/");
    assert.equal(
      page.url(),
      originalURL,
      "Modified link must not depart the current workspace",
    );
    await child.close();
    await page.bringToFront();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
        ),
        false,
      );
      await page.waitForFunction(
        (expected) =>
          document.documentElement.dataset.uiNavigationLayout === expected,
        width < 700 ? "mobile" : "desktop",
      );
      const nav = page.locator(".site-nav");
      if (width < 700) {
        const summary = nav.locator(".ui-mobile-sections > summary");
        await summary.focus();
        await page.keyboard.press("Enter");
        assert(
          await nav.locator(".ui-mobile-sections").evaluate((e) => e.open),
        );
        for (const id of hubIDs)
          assert(
            await nav
              .locator(`.ui-mobile-sections [data-feature-id="${id}"]`)
              .isVisible(),
            id,
          );
        await page.keyboard.press("Escape");
        assert.equal(
          await summary.evaluate((e) => document.activeElement === e),
          true,
        );
        assert.equal(
          await nav.locator(".ui-mobile-sections").evaluate((e) => e.open),
          false,
        );
      } else {
        for (const id of hubIDs)
          assert(
            await nav
              .locator(`.ui-primary-links [data-feature-id="${id}"]`)
              .isVisible(),
            id,
          );
      }
    }
    await (await density()).click();
    assert.equal(
      await page.locator("html").getAttribute("data-density"),
      "compact",
    );
    await page.reload();
    await ready();
    assert.equal(
      await page.locator("html").getAttribute("data-density"),
      "compact",
    );

    // Invalid records are session-only fallbacks; a user toggle must preserve exact original bytes.
    for (const raw of [
      "{broken",
      JSON.stringify({ version: 99, density: "compact" }),
      " ".repeat(17000),
      JSON.stringify({
        version: 1,
        density: "compact",
        extra: "é".repeat(9000),
      }),
    ]) {
      await page.evaluate(
        ({ key, raw }) => {
          localStorage.setItem(key, raw);
          localStorage.setItem(
            "dmz-ui-display-v1.map",
            '{"version":1,"density":"comfortable"}',
          );
        },
        { key: displayKey, raw },
      );
      await page.reload();
      await ready();
      assert.equal(
        await page.locator("html").getAttribute("data-density"),
        "comfortable",
      );
      await (await density()).click();
      assert.equal(
        await page.locator("html").getAttribute("data-density"),
        "compact",
      );
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), displayKey),
        raw,
      );
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("dmz-ui-display-v1.map"),
        ),
        '{"version":1,"density":"comfortable"}',
      );
    }
  } finally {
    await context.close();
  }

  const denied = await browser.newContext();
  try {
    await denied.addInitScript(() => {
      Storage.prototype.getItem = function () {
        throw new DOMException("denied", "SecurityError");
      };
      Storage.prototype.setItem = function () {
        throw new DOMException("denied", "SecurityError");
      };
    });
    const p = await denied.newPage();
    await p.goto(base + "/");
    await p.waitForFunction(
      () => document.documentElement.dataset.uiShellMounted === "071-v1",
    );
    await p.locator(".site-nav .nav-more > summary").click();
    await p.locator("[data-ui-density]").click();
    assert.equal(
      await p.locator("html").getAttribute("data-density"),
      "compact",
    );
  } finally {
    await denied.close();
  }

  const noJS = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 568 },
  });
  try {
    const p = await noJS.newPage();
    await p.goto(base + "/");
    assert.equal(
      await p.locator("html").getAttribute("data-ui-variant"),
      "modern",
    );
    assert.equal(await p.locator("html").getAttribute("data-ui-mounted"), null);
    await p.locator(".ui-mobile-sections > summary").click();
    await p.locator('.ui-mobile-sections [data-feature-id="dmz-fob"]').click();
    await p.waitForURL("**/dmz-fob/");
    assert(await p.locator("main h1").isVisible());
    assert.equal(await p.locator("html").getAttribute("data-ui-mounted"), null);
  } finally {
    await noJS.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = await startBrowserServer();
  try {
    for (const [name, engine] of Object.entries({
      chromium,
      firefox,
      webkit,
    })) {
      const browser = await engine.launch();
      const health = monitorBrowser(browser);
      try {
        await runUIShellTests({ browser, base: server.base });
        health();
        server.assertAlive();
        console.log(
          name +
            " 071 modern shell/preferences/no-JS PASS (not77-target activation)",
        );
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.stop();
  }
}
