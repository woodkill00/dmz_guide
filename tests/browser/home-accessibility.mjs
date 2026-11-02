// Requires the guide running locally and map development dependencies installed.
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs";
import assert from "node:assert/strict";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext(),
      page = await context.newPage();
    for (const path of [
      "/",
      "/features/",
      "/search/",
      "/missions/",
      "/upgrades/",
    ]) {
      await page.goto(
        (process.env.HOME_TEST_BASE || "http://127.0.0.1:4173") + path,
      );
      if (["/missions/", "/upgrades/"].includes(path))
        await page.waitForSelector('main[aria-busy="false"]');
      else if (path === "/search/")
        await page.locator(".search-result").first().waitFor();
      for (const [width, zoom] of [
        [1440, false],
        [320, true],
      ])
        for (const theme of ["dark", "light"]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            ({ theme, zoom }) => {
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.fontSize = zoom ? "200%" : "";
            },
            { theme, zoom },
          );
          const result = await new AxeBuilder({ page }).analyze();
          console.log(
            name,
            path,
            width,
            zoom ? "200%" : "100%",
            theme,
            JSON.stringify(
              result.violations.map((v) => ({
                id: v.id,
                nodes: v.nodes.slice(0, 2).map((n) => ({
                  target: n.target,
                  summary: n.failureSummary,
                })),
              })),
            ),
          );
          assert.equal(result.violations.length, 0);
        }
    }
  } finally {
    await browser.close();
  }
}
