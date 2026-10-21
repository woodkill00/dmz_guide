import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
export async function runReflowTests({ browser, base }) {
  const context = await browser.newContext(),
    page = await context.newPage();
  const routes = [
    "planner",
    "inventory",
    "settings",
    "editor",
    "maps",
    "progression",
    "community",
  ];
  for (const width of [320, 390])
    for (const route of routes) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${base}/${route}/?pack=demo%3Atraining-pack`);
      await page.waitForFunction(
        () =>
          document.querySelector("#save-status")?.textContent &&
          !document
            .querySelector("main")
            .getAttribute("aria-busy")
            ?.includes("true"),
      );
      await page.addStyleTag({ url: base + "/__test-text-zoom.css" });
      assert.equal(
        await page
          .locator("html")
          .evaluate((n) => parseFloat(getComputedStyle(n).fontSize)),
        32,
        "Actual 200% root text",
      );
      await page.locator(".nav-more summary").focus();
      await page.keyboard.press("Enter");
      assert(await page.locator(".nav-more").evaluate((n) => n.open));
      assert(await page.locator('.nav-more a[href^="/settings/"]').isVisible());
      await page.keyboard.press("Enter");
      await page.screenshot({
        path: `test-results/${route}-${width}-text200.png`,
        fullPage: true,
      });
      const offenders = await page.evaluate(() =>
        [...document.querySelectorAll("main *")]
          .filter((n) => {
            const r = n.getBoundingClientRect();
            return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
          })
          .slice(0, 40)
          .map((n) => ({
            tag: n.tagName,
            id: n.id,
            width: n.getBoundingClientRect().width,
            right: n.getBoundingClientRect().right,
          })),
      );
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        )
      ) {
        await writeFile(
          `test-results/${route}-${width}-overflow.json`,
          JSON.stringify(offenders, null, 2),
        );
        assert.fail(
          `200% text overflow: ${route} ${width} ${JSON.stringify(offenders.slice(0, 5))}`,
        );
      }
    }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(base + "/maps/");
  await page.locator(".nav-more summary").click();
  await page.screenshot({
    path: "test-results/maps-landscape-nav.png",
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await context.close();
}
