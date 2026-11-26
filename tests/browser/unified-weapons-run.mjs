import { chromium, firefox, webkit } from "playwright";
import { runUnifiedWeaponsTests } from "./unified-weapons.mjs";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";
const server = process.env.DMZ_SITE_URL ? null : await startBrowserServer();
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch(),
      health = monitorBrowser(browser);
    try {
      await runUnifiedWeaponsTests({
        browser,
        name,
        base: process.env.DMZ_SITE_URL || server.base,
      });
      health();
      server?.assertAlive();
    } finally {
      await browser.close();
    }
  }
} catch (error) {
  failure = error;
  throw error;
} finally {
  await server?.stop(failure);
}
