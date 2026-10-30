// Supplemental synthetic diagnostics; never a substitute for the full suite.
// Execute the unchanged cancelled-navigation journey in 100 fresh contexts,
// stopping at the first failure and retaining its bounded focus-event evidence.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";
import { runIndependentUpgradeSpending } from "./independent-upgrade-spending.mjs";

assert(
  process.argv.length <= 3 && (process.argv[2] || "chromium") === "chromium",
  "Usage: node tests/browser/cancellation-focus-diagnostic.mjs [chromium]",
);
const server = await startBrowserServer();
let browser, failure;
try {
  // Match the full Chromium suite, including its browser sandbox and CI channel.
  browser = await chromium.launch({
    headless: true,
    chromiumSandbox: true,
    ...(process.env.CI
      ? { channel: "chrome" }
      : process.env.CHROMIUM_PATH
        ? { executablePath: process.env.CHROMIUM_PATH }
        : existsSync("/usr/bin/chromium")
          ? { executablePath: "/usr/bin/chromium" }
          : {}),
  });
  const health = monitorBrowser(browser);
  await runIndependentUpgradeSpending({
    browser,
    base: server.base,
    captureScreenshots: false,
    focusedCancellationOnly: true,
    prefix: `${process.platform}-chromium-cancellation-focus-diagnostic`,
  });
  health();
  server.assertAlive();
} catch (error) {
  failure = error;
  throw error;
} finally {
  try {
    await browser?.close();
  } finally {
    await server.stop(failure);
  }
}
