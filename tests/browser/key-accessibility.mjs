// Run after building/starting the local guide and npm run map:install.
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs";
import assert from "node:assert/strict";
const enlarged = process.env.KEY_TEST_ZOOM === "200";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext(),
      page = await context.newPage();
    for (const path of [
      "/keys/",
      "/keys/hospital-chemical-lockers/",
      "/keys/mill-explosives-lab/",
    ]) {
      await page.goto(
        (process.env.KEY_TEST_BASE || "http://127.0.0.1:4173") + path,
      );
      await page.waitForSelector('main[data-key-workspace-ready="true"]');
      for (const theme of ["dark", "light"])
        for (const width of enlarged ? [320] : [390, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(
            (t) => (document.documentElement.dataset.theme = t),
            theme,
          );
          await page.evaluate(
            (z) => (document.documentElement.style.fontSize = z ? "200%" : ""),
            enlarged,
          );
          const result = await new AxeBuilder({ page }).analyze();
          console.log(
            name,
            path,
            theme,
            width,
            enlarged ? "200%" : "100%",
            JSON.stringify(
              result.violations.map((v) => ({
                id: v.id,
                nodes: v.nodes.slice(0, 3).map((n) => ({
                  target: n.target,
                  summary: n.failureSummary,
                })),
              })),
              null,
              2,
            ),
          );
          assert.equal(result.violations.length, 0);
        }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("http://127.0.0.1:4173/keys/");
    await page.screenshot({ path: ".local/keys057-" + name + "-desktop.png" });
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.reload();
    await page.screenshot({ path: ".local/keys057-" + name + "-mobile.png" });
  } finally {
    await browser.close();
  }
}
