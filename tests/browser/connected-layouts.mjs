import assert from "node:assert/strict";

const routes = [
  "missions",
  "keys",
  "items",
  "inventory",
  "upgrades",
  "weapons",
  "field-desk",
  "run-plan",
  "data-review",
];
const viewports = [
  [320, 640],
  [390, 844],
  [768, 600],
  [1280, 800],
  [1920, 1080],
  [844, 390],
];

export async function runConnectedLayouts({ browser, base }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    for (const route of routes) {
      await page.goto(`${base}/${route}/?pack=official%3Amw4-dmz-starter`);
      await page.waitForFunction(
        () =>
          document.querySelector("main")?.getAttribute("aria-busy") !== "true",
      );
      for (const [width, height] of viewports) {
        await page.setViewportSize({ width, height });
        const state = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          viewport: innerWidth,
          heading: !!document.querySelector("main h1"),
          menu: !!document.querySelector(".nav-more > summary"),
        }));
        assert(state.heading, `${route}/${width} has a primary heading`);
        assert(state.menu, `${route}/${width} has shared navigation`);
        assert(
          state.scrollWidth <= state.viewport + 1,
          `${route}/${width} horizontal overflow: ${state.scrollWidth}`,
        );
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      const summary = page.locator(".nav-more > summary");
      await summary.focus();
      assert.equal(
        await summary.evaluate((node) => document.activeElement === node),
        true,
      );
      assert.equal(
        await summary.evaluate(
          (node) => getComputedStyle(node).transitionDuration,
        ),
        "0s",
      );
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".nav-more").getAttribute("open"), "");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".nav-more").getAttribute("open"), null);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    assert.deepEqual(errors, []);
    console.log(
      `Connected layouts: ${routes.length * viewports.length} route/viewport cases plus keyboard and reduced motion PASS`,
    );
  } finally {
    await context.close();
  }
}
