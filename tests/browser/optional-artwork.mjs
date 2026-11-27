import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser, optionalCamoArtwork } from "./health.mjs";

// A clean install intentionally has no private camo-image cache.
const server = await startBrowserServer();
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    const health = monitorBrowser(browser, {
      optionalArtwork: await optionalCamoArtwork(server.base),
    });
    try {
      const context = await browser.newContext();
      await context.route("**/local-camo-images/**", (route) =>
        route.fulfill({ status: 404, body: "" }),
      );
      const page = await context.newPage();
      await page.goto(server.base + "/armory/camos/han-86/");
      const tile = page.locator("[data-camo-tile]").first();
      await tile.scrollIntoViewIfNeeded();
      await tile.locator("img").waitFor({ state: "hidden" });
      await tile.locator(".camo-image-fallback").waitFor({ state: "visible" });
      assert(await tile.locator("img").isHidden());
      await tile.waitFor({ state: "visible" });
      await page.waitForFunction(
        () => !document.querySelector("[data-camo-tile]").disabled,
      );
      await tile.click();
      assert(
        (
          await page.locator("[data-camo-detail]:visible p").first().innerText()
        ).trim(),
      );
      assert(await page.locator("[data-camo-complete]:visible").isEnabled());
      await page.goto(server.base + "/armory/#acquisition");
      const card = page.locator("[data-weapon-card]").first();
      const icon = card.locator("[data-picker-camo-open]");
      await icon.scrollIntoViewIfNeeded();
      await card
        .locator("[data-picker-camo-image]")
        .waitFor({ state: "hidden" });
      assert(await icon.locator(".picker-swatch > span").isVisible());
      assert(
        (await card.locator("[data-picker-camo-name]").innerText()).trim(),
      );
      await page.waitForFunction(
        () => !document.querySelector("[data-picker-camo-open]").disabled,
      );
      await icon.click();
      assert(
        (
          await card.locator("[data-picker-camo-requirement]").innerText()
        ).trim(),
      );
      assert(await card.locator("[data-picker-complete]").isEnabled());
      health();
      assert(
        (await health.diagnostics()).optionalArtwork.some(
          (value) => value.responses.length > 0,
        ),
      );
      console.log(
        `${name}: absent optional artwork retains named tiles, visible fallback, requirements and completion controls PASS`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.stop();
}
