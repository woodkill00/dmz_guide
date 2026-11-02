import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";
import AxeBuilder from "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs";
await mkdir("test-results", { recursive: true });
await writeFile("dist/__test-text-zoom.css", ":root{font-size:200%}");
const server = await startBrowserServer();
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const b = await engine.launch(),
      health = monitorBrowser(b);
    try {
      const c = await b.newContext(),
        p = await c.newPage();
      await p.goto(server.base + "/sitemap/");
      await p.locator("#home-mindmap-app:not([hidden])").waitFor();
      const notes = p.locator("#mindmap-notes");
      assert.equal(
        await notes.locator('[data-note="route:/"] a').getAttribute("href"),
        "/",
      );
      assert.equal(await notes.locator(".map-note").count(), 7);
      assert.equal(
        await p.locator("#detailed-link-audit").evaluate((n) => n.open),
        false,
      );
      assert.equal(await p.locator("#mindmap-lines path").count(), 6);
      const prepare = () =>
        p.getByRole("button", { name: "Expand DMZ Guide", exact: false });
      await prepare().focus();
      await p.keyboard.press("Enter");
      await p.waitForFunction(
        () =>
          document.activeElement
            ?.getAttribute("aria-label")
            ?.split(" · ")[0] === "Collapse DMZ Guide",
      );
      await p.keyboard.press("Tab");
      assert.equal(await p.evaluate(() => document.activeElement.tagName), "A");
      assert.equal(
        await p.evaluate(
          () => document.activeElement.closest("[data-note]")?.dataset.note,
        ),
        "route:/keys/",
      );
      const keys = notes.locator('[data-note="route:/keys/"] a');
      await keys.focus();
      await p.setViewportSize({ width: 900, height: 900 });
      await p.waitForTimeout(100);
      assert.equal(
        await p.evaluate(
          () => document.activeElement.closest("[data-note]")?.dataset.note,
        ),
        "route:/keys/",
      );
      await p.keyboard.press("Enter");
      await p.waitForURL("**/keys/");
      await p.goBack();
      await p.locator("#home-mindmap-app:not([hidden])").waitFor();
      await p.locator("#mindmap-home").click();
      await prepare().click();
      await p
        .getByRole("button", { name: "Expand Keys", exact: false })
        .click();
      assert.equal(
        await notes.locator('[data-note^="route:/keys/"]').count(),
        26,
      );
      let more = p.getByRole("button", { name: /Show \d+ more below Keys/ });
      await more.focus();
      await p.keyboard.press("Enter");
      assert.equal(
        await notes.locator('[data-note^="route:/keys/"]').count(),
        51,
      );
      await p.keyboard.press("Enter");
      assert.equal(
        await notes.locator('[data-note^="route:/keys/"]').count(),
        63,
      );
      assert.equal(
        await p.evaluate(
          () =>
            document.activeElement.getAttribute("aria-label")?.split(" · ")[0],
        ),
        "Collapse Keys",
      );
      await p.locator("#mindmap-outline-toggle").click();
      assert.equal(await notes.locator(".map-note").count(), 0);
      assert((await p.locator("#mindmap-outline .map-note").count()) <= 250);
      await p
        .getByRole("button", { name: "Collapse Keys", exact: false })
        .focus();
      await p.keyboard.press("Enter");
      assert.equal(
        await p.evaluate(
          () =>
            document.activeElement.getAttribute("aria-label")?.split(" · ")[0],
        ),
        "Expand Keys",
      );
      await p.keyboard.press("Enter");
      assert.equal(
        await p.evaluate(
          () =>
            document.activeElement.getAttribute("aria-label")?.split(" · ")[0],
        ),
        "Collapse Keys",
      );
      await p.setViewportSize({ width: 800, height: 900 });
      await p.waitForTimeout(100);
      assert.equal(
        await p.evaluate(
          () =>
            document.activeElement.getAttribute("aria-label")?.split(" · ")[0],
        ),
        "Collapse Keys",
      );
      await p.locator("#mindmap-outline-toggle").click();
      assert.equal(await p.locator("#mindmap-outline .map-note").count(), 0);
      await p.locator("#mindmap-query").fill("Hospital Chemical");
      assert.match(
        await p.locator("#mindmap-status").textContent(),
        /matching/,
      );
      assert(
        await notes
          .locator('[data-note="route:/keys/hospital-chemical-lockers/"] a')
          .count(),
      );
      assert(await notes.locator('[data-note="route:/"] a').count());
      assert(await notes.locator('[data-note="route:/keys/"] a').count());
      await p.locator("#mindmap-query").fill("a");
      assert(await p.locator("#mindmap-search-pages").isVisible());
      await p.locator("#mindmap-search-next").click();
      assert.match(
        await p.locator("#mindmap-search-range").textContent(),
        /^41/,
      );
      await p.locator("#mindmap-query").fill("not-a-page-xyz-9999");
      assert.match(
        await p.locator("#mindmap-status").textContent(),
        /^0 matching/,
      );
      await p.locator("#mindmap-home").click();
      await p
        .getByRole("button", { name: "Expand Source websites", exact: false })
        .click();
      const source = notes.locator('[data-note^="website:"] a').first();
      assert.equal(await source.getAttribute("target"), "_blank");
      assert.match(await source.getAttribute("rel"), /noopener/);
      assert.match(await source.getAttribute("href"), /^https?:/);
      await p.locator("#mindmap-zoom-in").click();
      assert.equal(await p.locator("#mindmap-zoom").textContent(), "110%");
      await p.locator("#mindmap-zoom-out").click();
      assert.equal(await p.locator("#mindmap-zoom").textContent(), "100%");
      await p.locator("#mindmap-fit").click();
      assert(
        Number(
          (await p.locator("#mindmap-zoom").textContent()).replace("%", ""),
        ) >= 25,
      );
      await p.locator("#mindmap-home").click();
      await p.setViewportSize({ width: 800, height: 900 });
      await prepare().click();
      await p
        .getByRole("button", { name: "Expand Keys", exact: false })
        .click();
      const pane = p.locator("#mindmap-viewport");
      await pane.scrollIntoViewIfNeeded();
      await pane.evaluate((n) => {
        n.scrollLeft = 100;
        n.scrollTop = 0;
      });
      const rect = await pane.boundingBox();
      await p.mouse.move(rect.x + 100, rect.y + rect.height - 20);
      await p.mouse.down();
      await p.mouse.move(rect.x + 40, rect.y + rect.height - 20, { steps: 5 });
      await p.mouse.up();
      assert(
        await pane.evaluate((n) => n.scrollLeft > 100),
        "Drag blank canvas pans without intercepting native note links",
      );
      await p.locator("#mindmap-home").click();
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
          if (zoom)
            await p.addStyleTag({ url: server.base + "/__test-text-zoom.css" });
          assert(
            await p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            name + " document overflow " + width + theme,
          );
          await p.locator("#mindmap-viewport").scrollIntoViewIfNeeded();
          if (name !== "webkit")
            await p.screenshot({
              path: `test-results/home-mindmap-${name}-${width}-${theme}${zoom ? "-200" : ""}.png`,
            });
        }
      health();
      console.log(
        name +
          " Home mindmap PASS: rooted notes, native one-click navigation, hierarchy/branch paging, keyboard/resize focus, single-representation cap, search paths/paging, external safeguards, zoom and eight layouts",
      );
      await c.close();
    } finally {
      await b.close();
    }
    const ax = await engine.launch();
    try {
      const c = await ax.newContext(),
        p = await c.newPage();
      await p.goto(server.base + "/sitemap/");
      await p.locator("#home-mindmap-app:not([hidden])").waitFor();
      await p
        .getByRole("button", { name: "Expand DMZ Guide", exact: false })
        .click();
      for (const [width, zoom] of [
        [1440, false],
        [768, false],
        [390, false],
        [320, true],
      ])
        for (const theme of ["dark", "light"]) {
          await p.setViewportSize({ width, height: 1000 });
          await p.evaluate(
            (t) => (document.documentElement.dataset.theme = t),
            theme,
          );
          if (zoom)
            await p.addStyleTag({ url: server.base + "/__test-text-zoom.css" });
          const result = await new AxeBuilder({ page: p }).analyze();
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
      await p.locator("#mindmap-outline-toggle").click();
      const outline = await new AxeBuilder({ page: p }).analyze();
      assert.equal(
        outline.violations.length,
        0,
        JSON.stringify(outline.violations.map((v) => v.id)),
      );
      console.log(
        name +
          " Home mindmap accessibility PASS: eight theme/layout scans plus outline",
      );
    } finally {
      await ax.close();
    }
  }
} catch (e) {
  failure = e;
  throw e;
} finally {
  await server.stop(failure);
}
