import assert from "node:assert/strict";
export async function runShowcase({ browser, base }) {
  const context = await browser.newContext(),
    page = await context.newPage();
  for (const [width, route, label, ready] of [
    [1440, "/", "home-desktop", null],
    [390, "/", "home-390", null],
    [390, "/catalog/", "catalog-real-390", "#catalog-pack"],
    [390, "/maps/", "locations-real-390", "#location-list button"],
    [
      1280,
      "/maps/?pack=demo%3Atraining-pack",
      "fictional-schematic-1280",
      "#location-list button",
    ],
    [390, "/progression/", "progression-real-390", "#progress-rows article"],
    [390, "/community/", "community-real-390", "#correction-record option"],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + route);
    if (ready)
      await page.waitForSelector(ready, {
        state: ready.endsWith("option") ? "attached" : "visible",
      });
    assert.equal(await page.locator("#error:not([hidden])").count(), 0);
    await page.screenshot({
      path: `test-results/final-${label}.png`,
      fullPage: true,
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  await context.close();
}
