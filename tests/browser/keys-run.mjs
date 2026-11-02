import { chromium, firefox, webkit } from "playwright";
import { runKeyWorkspaceTests } from "./key-workspace.mjs";
import { runKeysTests } from "./keys.mjs";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";
const server = await startBrowserServer();
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    const health = monitorBrowser(browser);
    try {
      await runKeyWorkspaceTests({ browser, base: server.base });
      await runKeysTests({ browser, base: server.base });
      health();
      server.assertAlive();
      console.log(name + " key regression PASS with browser health checks");
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
