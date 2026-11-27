import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser, optionalCamoArtwork } from "./health.mjs";
import { runDashboardModuleFailureTests } from "./dashboard.mjs";
const server = await startBrowserServer();
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    const health = monitorBrowser(browser, {
      optionalArtwork: await optionalCamoArtwork(server.base),
    });
    try {
      await runDashboardModuleFailureTests({ browser, base: server.base });
      const context = await browser.newContext();
      const page = await context.newPage();
      let release,
        finished = false,
        nativeClosed = false;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const url =
        server.base + "/local-camo-images/han-86/military-camo-1.webp";
      await page.route(url, async (route) => {
        await gate;
        await route.fulfill({ status: 404, body: "" });
      });
      const requested = page.waitForRequest(url);
      await page.setContent(
        `<img src="${url}" alt="Synthetic pending artwork">`,
        { waitUntil: "domcontentloaded" },
      );
      await requested;
      page.on("requestfinished", (request) => {
        if (request.url() === url) finished = true;
      });
      context.on("close", () => {
        nativeClosed = true;
      });
      const closing = context.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(
        nativeClosed,
        false,
        "Context must not cancel its pending declared image",
      );
      release();
      await closing;
      assert(finished, "Image response finished before native context close");
      health();
      console.log(
        `${name}: exact deliberate dashboard cancellation and native pending-image teardown drain PASS; strict active failures remain enabled`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.stop();
}
