import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";
import { runNavigationDirectoryTests } from "./navigation-directory.mjs";
import AxeBuilder from "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs";
await mkdir("test-results", { recursive: true });
await writeFile("dist/__test-text-zoom.css", ":root{font-size:200%}");
const server = await startBrowserServer();
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch(),
      health = monitorBrowser(browser);
    try {
      const context = await browser.newContext(),
        p = await context.newPage();
      await p.goto(server.base + "/sitemap/");
      await p.locator("#topology-app:not([hidden])").waitFor();
      assert.equal(await p.locator("#topology-error").isVisible(), false);
      assert((await p.locator("#topology-nodes button").count()) <= 40);
      await p.locator('#topology-groups button[data-group="Prepare"]').click();
      await p
        .locator('#topology-nodes button[data-node="route:/upgrades/"]')
        .click();
      assert.match(
        await p.locator("#topology-inspector").textContent(),
        /incoming contextual/,
      );
      assert.equal(
        await p.locator("#topology-inspector>a").getAttribute("href"),
        "/upgrades/",
      );
      await p.locator("#topology-show-connections").click();
      assert((await p.locator(".topology-crosslink").count()) > 0);
      await p.locator("#topology-reset").click();
      await p.locator("#topology-query").fill("hospital chemical");
      assert((await p.locator("#topology-nodes button").count()) > 0);
      await p.locator("#topology-query").fill("does-not-exist-999");
      assert.equal(await p.locator("#topology-nodes button").count(), 0);
      assert.match(
        await p.locator("#topology-status").textContent(),
        /0 matching/,
      );
      await p.locator("#topology-reset").click();
      await p.locator("#topology-service").selectOption("Map");
      assert((await p.locator("#topology-nodes button").count()) > 0);
      for (const b of await p
        .locator("#topology-nodes small")
        .allTextContents())
        assert.match(b, /Map/);
      await p.locator("#topology-reset").click();
      await p.locator("#topology-next").click();
      assert.match(await p.locator("#topology-range").textContent(), /^41/);
      await p.locator("#topology-root").click();
      assert.match(await p.locator("#topology-range").textContent(), /^1–40/);
      const download = p.waitForEvent("download");
      await p.getByRole("link", { name: "Download inventory JSON" }).click();
      assert.match((await download).suggestedFilename(), /topology\.json/);
      await p.locator("#topology-reset").focus();
      await p.keyboard.press("Enter");
      assert.equal(await p.locator("#topology-query").inputValue(), "");
      for (const [width, zoom] of [
        [1440, false],
        [768, false],
        [390, false],
        [320, true],
      ])
        for (const theme of ["dark", "light"]) {
          await p.setViewportSize({ width, height: 1000 });
          await p.evaluate(
            (theme) => (document.documentElement.dataset.theme = theme),
            theme,
          );
          if (zoom) {
            await p.addStyleTag({ url: server.base + "/__test-text-zoom.css" });
          }
          assert(
            await p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            name + " overflow " + width + theme,
          );
          if (width === 320)
            assert(
              await p
                .locator("#topology-groups button")
                .first()
                .evaluate((n) => n.getBoundingClientRect().width >= 120),
              "Readable single-column branches with enlarged narrow text",
            );
          await p
            .locator("#topology-groups button")
            .first()
            .scrollIntoViewIfNeeded();
          if (name !== "webkit")
            await p.screenshot({
              path: `test-results/topology-${name}-${width}-${theme}${zoom ? "-200" : ""}.png`,
            });
        }
      await context.close();
      const noJS = await browser.newContext({ javaScriptEnabled: false }),
        np = await noJS.newPage();
      await np.goto(server.base + "/sitemap/");
      assert(
        await np
          .getByRole("heading", { name: "Complete generated route directory" })
          .isVisible(),
      );
      assert((await np.locator(".sitemap-pack").count()) > 0);
      await noJS.close();
      await runNavigationDirectoryTests({
        browser,
        base: server.base,
        captureScreenshots: false,
      });
      health();
      server.assertAlive();
      // Axe injects SVG measurement styles. Run it in a separate browser so
      // its own CSP diagnostics cannot replace strict functional health checks.
      const axeBrowser = await engine.launch();
      try {
        const ac = await axeBrowser.newContext(),
          ap = await ac.newPage();
        await ap.goto(server.base + "/sitemap/");
        await ap.locator("#topology-app:not([hidden])").waitFor();
        await ap
          .locator('#topology-groups button[data-group="Prepare"]')
          .click();
        await ap
          .locator('#topology-nodes button[data-node="route:/upgrades/"]')
          .click();
        for (const [width, zoom] of [
          [1440, false],
          [768, false],
          [390, false],
          [320, true],
        ])
          for (const theme of ["dark", "light"]) {
            await ap.setViewportSize({ width, height: 1000 });
            await ap.evaluate(
              (theme) => (document.documentElement.dataset.theme = theme),
              theme,
            );
            if (zoom)
              await ap.addStyleTag({
                url: server.base + "/__test-text-zoom.css",
              });
            const result = await new AxeBuilder({ page: ap }).analyze();
            assert.equal(
              result.violations.length,
              0,
              JSON.stringify(
                result.violations.map((v) => ({
                  id: v.id,
                  nodes: v.nodes.map((n) => n.target),
                })),
              ),
            );
          }
      } finally {
        await axeBrowser.close();
      }
      console.log(
        name +
          " topology PASS: complete inventory/search/branches/neighbors/links/pagination/export/keyboard/noJS, eight layouts and axe scans; existing sitemap/navigation regression",
      );
    } finally {
      await browser.close();
    }
  }
} catch (e) {
  failure = e;
  throw e;
} finally {
  await server.stop(failure);
}
