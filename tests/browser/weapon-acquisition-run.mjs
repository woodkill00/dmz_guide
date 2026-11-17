import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { runWeaponAcquisitionTests } from "./weapon-acquisition.mjs";
const server = await startBrowserServer();
try {
  for (const [name, engine] of Object.entries(
    process.argv.includes("--engines")
      ? { chromium, firefox, webkit }
      : { chromium },
  )) {
    const browser = await engine.launch();
    try {
      await runWeaponAcquisitionTests({
        browser,
        base: server.base,
        name,
        captureScreenshots: name !== "webkit",
      });
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.stop();
}
