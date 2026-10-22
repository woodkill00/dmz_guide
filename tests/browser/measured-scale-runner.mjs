import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";
import { runMeasuredScaleTests } from "./measured-scale.mjs";
import { runInventoryPaginationLayout } from "./inventory-pagination-layout.mjs";
const server = await startBrowserServer();
let failure;
try {
  const engines = process.argv.includes("--engines")
    ? { firefox, webkit }
    : { chromium };
  for (const [name, engine] of Object.entries(engines)) {
    const browser = await engine.launch({
      headless: true,
      ...(name === "chromium"
        ? { channel: "chrome", chromiumSandbox: true }
        : {}),
    });
    const health = monitorBrowser(browser);
    try {
      await runMeasuredScaleTests({ browser, base: server.base, prefix: name });
      await runInventoryPaginationLayout(browser, server.base, name);
      health();
      server.assertAlive();
      console.log(
        `${name}: measured-scale functional and measurement evidence passed`,
      );
    } finally {
      await browser.close();
    }
  }
} catch (error) {
  failure = error;
  throw error;
} finally {
  await server.stop(failure);
}
