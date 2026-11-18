import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
const catalog = await readFile(
  new URL("../../src/ui/weapon-camos.json", import.meta.url),
  "utf8",
);
const server = await startBrowserServer();
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      for (const kind of ["deadline", "pagehide"]) {
        const context = await browser.newContext(),
          page = await context.newPage();
        try {
          let held;
          const requested = new Promise((resolve) => {
            held = resolve;
          });
          await page.route("**/assets/src/ui/weapon-camos.json", (route) =>
            held(route),
          );
          await page.goto(server.base + "/armory/camos/", {
            waitUntil: "commit",
          });
          const route = await requested;
          if (kind === "pagehide")
            await page.evaluate(() =>
              window.dispatchEvent(
                new PageTransitionEvent("pagehide", { persisted: true }),
              ),
            );
          await page
            .locator("#camo-save-error")
            .waitFor({ state: "visible", timeout: 15000 });
          assert.match(
            await page.locator("#camo-save-error").textContent(),
            /Reload this page/,
          );
          // A response released after abort must never admit an editor or create storage.
          await route
            .fulfill({ body: catalog, contentType: "application/json" })
            .catch(() => {});
          assert.equal(
            await page.locator("[data-overview-camo]:enabled").count(),
            0,
          );
          assert.equal(await page.locator("[data-camo-weapon]").count(), 35);
          const databases = await page.evaluate(async () =>
            typeof indexedDB.databases === "function"
              ? (await indexedDB.databases()).map((d) => d.name)
              : [],
          );
          assert(!databases.includes("dmz-armory-local"));
        } finally {
          await context.close();
        }
      }
      console.log(
        `092 ${name} catalog10sec deadline/pagehide abort/late-response failclosed PASS`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.stop();
}
