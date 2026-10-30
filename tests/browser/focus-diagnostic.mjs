// Supplemental synthetic diagnostics; never a substitute for the full suite.
import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";
import { runIndependentUpgradeJourneys } from "./independent-upgrade-journeys.mjs";
const name = process.argv[2] || "webkit";
const engine = { chromium, firefox, webkit }[name];
assert(engine, "Choose chromium, firefox or webkit");
const server = await startBrowserServer();
let browser, failure;
try {
  browser = await engine.launch({ headless: true });
  const health = monitorBrowser(browser);
  await runIndependentUpgradeJourneys({
    browser,
    base: server.base,
    captureScreenshots: false,
    diagnosticProgressOnly: true,
    prefix: `${name}-focus-diagnostic`,
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
