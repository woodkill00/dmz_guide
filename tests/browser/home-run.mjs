import { writeFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { runHomeWorkflowTests } from "./home-workflows.mjs";
import { runKeysTests } from "./keys.mjs";
import { runNavigationDirectoryTests } from "./navigation-directory.mjs";
import { runCompactUITests } from "./compact-ui.mjs";
import { runUpgradeDashboardTests } from "./upgrade-dashboard.mjs";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";
await writeFile("dist/__test-text-zoom.css", ":root{font-size:200%}");
const server = await startBrowserServer();
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const b = await engine.launch(),
      health = monitorBrowser(b);
    try {
      await runHomeWorkflowTests({ browser: b, base: server.base });
      await runKeysTests({ browser: b, base: server.base });
      await runNavigationDirectoryTests({
        browser: b,
        base: server.base,
        captureScreenshots: false,
      });
      await runCompactUITests({ browser: b, base: server.base });
      await runUpgradeDashboardTests({ browser: b, base: server.base });
      health();
      server.assertAlive();
      console.log(
        name +
          " home and existing navigation/key/compact/upgrade regressions PASS with strict browser health",
      );
    } finally {
      await b.close();
    }
  }
} catch (e) {
  failure = e;
  throw e;
} finally {
  await server.stop(failure);
}
