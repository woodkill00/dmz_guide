import { runUpgradeTests } from "./upgrades.mjs";
import { firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { runEditorTests } from "./editor.mjs";
import { runLocalNetworkTests } from "./offline.mjs";
import { monitorBrowser } from "./health.mjs";
await writeFile("dist/__test-text-zoom.css", ":root{font-size:200%}");
const server = await startBrowserServer();
const { base } = server;
const passed = [];
let failure;
try {
  await mkdir("test-results", { recursive: true });
  for (const [name, engine] of Object.entries({ firefox, webkit })) {
    const browser = await engine.launch({ headless: true });
    const health = monitorBrowser(browser);
    try {
      await runUpgradeTests({
        browser,
        base,
        // Preserve the repository's CSP-safe WebKit functional/layout policy.
        captureScreenshots: name !== "webkit",
      });
      const { runMetadataFloorTests } = await import("./metadata-floor.mjs");
      await runMetadataFloorTests({
        browser,
        base,
        mode: "fixed",
        captureScreenshots: name !== "webkit",
      });
      const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
        }),
        page = await context.newPage();
      await page.goto(base);
      await page.locator(".nav-more summary").focus();
      await page.keyboard.press("Enter");
      assert(await page.locator(".nav-more").evaluate((n) => n.open));
      await page.getByRole("link", { name: "Maps", exact: true }).click();
      await page.waitForSelector("#location-list button");
      assert.match(
        await page.locator("#location-count").textContent(),
        /0 plotted/,
      );
      if (name !== "webkit")
        await page.screenshot({
          path: `test-results/${name}-maps-390.png`,
          fullPage: true,
        });
      await context.close();
      await runEditorTests({
        browser,
        base,
        captureScreenshots: name !== "webkit",
      });
      await runLocalNetworkTests({
        browser,
        base,
        captureScreenshots: name !== "webkit",
      });
      const { runDraftSafetyTests } = await import("./draft-safety.mjs");
      await runDraftSafetyTests({
        browser,
        base,
        captureScreenshots: name !== "webkit",
      });
      const { runRecoveryTruthfulnessTests } = await import(
        "./recovery-truthfulness.mjs"
      );
      await runRecoveryTruthfulnessTests({
        browser,
        base,
        captureScreenshots: name !== "webkit",
      });
      const { runReaderFlowTests } = await import("./reader-flow.mjs");
      await runReaderFlowTests({
        browser,
        base,
        captureScreenshots: name !== "webkit",
      });
      health();
      server.assertAlive();
      passed.push(
        `${name}: native navigation, narrow maps, IndexedDB portable raster roundtrip and local-network tests passed`,
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
for (const message of passed) console.log(message);
