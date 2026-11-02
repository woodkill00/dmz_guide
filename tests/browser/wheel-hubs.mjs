import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import AxeBuilder from "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs";
await writeFile("dist/__test-text-zoom.css", ":root{font-size:200%}");
const server = await startBrowserServer();
let failure;
await mkdir("test-results", { recursive: true });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const b = await engine.launch(),
      health = monitorBrowser(b);
    try {
      const c = await b.newContext(),
        p = await c.newPage();
      await c.addInitScript(() => {
        window.__hubDatabaseReads = 0;
        const open = IDBFactory.prototype.open;
        IDBFactory.prototype.open = function (...args) {
          window.__hubDatabaseReads++;
          return open.apply(this, args);
        };
      });
      await p.goto(server.base + "/?pack=demo%3Atraining-pack");
      for (const id of ["dmz-guide", "dmz-fob", "dmz-weapons"])
        assert(
          await p
            .locator('.hub-heading [data-feature-id="' + id + '"]')
            .isVisible(),
        );
      await p.locator('.hub-heading [data-feature-id="dmz-fob"]').click();
      await p.waitForURL("**/dmz-fob/?pack=demo%3Atraining-pack");
      assert(
        await p
          .getByRole("heading", { name: "Upgrades", level: 2, exact: true })
          .isVisible(),
      );
      assert.equal(await p.evaluate(() => window.__hubDatabaseReads), 0);
      await p.locator('#upgrades [data-feature-id="upgrades"]').click();
      await p.waitForURL("**/upgrades/?pack=demo%3Atraining-pack");
      await p.locator('main[aria-busy="false"]').waitFor();
      for (const path of ["/dmz-guide/", "/dmz-weapons/"]) {
        await p.goto(server.base + path);
        assert.equal(await p.evaluate(() => window.__hubDatabaseReads), 0);
        assert(await p.locator("h1").isVisible());
      }
      await p.goto(server.base + "/sitemap/");
      await p.locator("#home-mindmap-app:not([hidden])").waitFor();
      for (const label of [
        "Map",
        "DMZ Guide",
        "DMZ FOB",
        "DMZ Weapons",
        "Tools & settings",
      ])
        assert(
          await p
            .locator("#mindmap-notes")
            .getByRole("link", {
              name: label === "Map" ? "Map ↗" : label,
              exact: true,
            })
            .count(),
        );
      await p
        .getByRole("button", { name: "Expand DMZ FOB", exact: false })
        .click();
      assert(
        await p
          .locator('#mindmap-notes [data-note="route:/upgrades/"] a')
          .count(),
      );
      await p.locator("#mindmap-home").click();
      await p
        .getByRole("button", { name: "Expand DMZ Guide", exact: false })
        .click();
      await p
        .getByRole("button", { name: "Expand Keys", exact: false })
        .click();
      await p.setViewportSize({ width: 800, height: 900 });
      const pane = p.locator("#mindmap-viewport");
      await pane.scrollIntoViewIfNeeded();
      await pane.evaluate((n) => {
        n.scrollLeft = 100;
        n.scrollTop = 300;
      });
      const rect = await pane.boundingBox(),
        point = { x: 220, y: 180 };
      await p.mouse.move(rect.x + 1 + point.x, rect.y + point.y + 1);
      const read = () =>
        pane.evaluate((n, point) => {
          const scale = Number(
            document
              .querySelector("#mindmap-world")
              .style.transform.slice(6, -1),
          );
          return {
            scale,
            left: n.scrollLeft,
            top: n.scrollTop,
            worldX: (n.scrollLeft + point.x) / scale,
            worldY: (n.scrollTop + point.y) / scale,
          };
        }, point);
      const before = await read();
      await p.mouse.wheel(0, -120);
      await p.waitForFunction(
        (s) =>
          Number(
            document
              .querySelector("#mindmap-world")
              .style.transform.slice(6, -1),
          ) > s,
        before.scale,
      );
      const after = await read();
      assert(Math.abs(after.worldX - before.worldX) < 2);
      assert(Math.abs(after.worldY - before.worldY) < 2);
      await p.mouse.wheel(0, 120);
      await p.waitForFunction(
        (s) =>
          Number(
            document
              .querySelector("#mindmap-world")
              .style.transform.slice(6, -1),
          ) < s,
        after.scale,
      );
      const defaults = await pane.evaluate((n) => {
        const scale = () =>
          document.querySelector("#mindmap-world").style.transform;
        const before = scale(),
          results = [];
        for (const options of [
          { ctrlKey: true },
          { metaKey: true },
          { shiftKey: true },
          { deltaX: 200, deltaY: 1 },
        ]) {
          const event = new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            deltaY: -120,
            ...options,
          });
          n.dispatchEvent(event);
          results.push(!event.defaultPrevented && scale() === before);
        }
        return results;
      });
      assert(defaults.every(Boolean));
      const range = await pane.evaluate((n) => {
        for (let i = 0; i < 50; i++)
          n.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              deltaY: -240,
            }),
          );
        const max = document.querySelector("#mindmap-zoom").textContent;
        for (let i = 0; i < 100; i++)
          n.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              deltaY: 240,
            }),
          );
        return [max, document.querySelector("#mindmap-zoom").textContent];
      });
      assert.deepEqual(range, ["200%", "25%"]);
      await p.locator("#mindmap-home").click();
      await p.locator("#mindmap-outline-toggle").click();
      const noOutlineZoom = await p
        .locator("#mindmap-outline")
        .evaluate((n) => {
          const before = document.querySelector("#mindmap-zoom").textContent,
            e = new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              deltaY: -120,
            });
          n.dispatchEvent(e);
          return (
            !e.defaultPrevented &&
            document.querySelector("#mindmap-zoom").textContent === before
          );
        });
      assert(noOutlineZoom);
      await p.locator("#mindmap-outline-toggle").click();
      await p.locator("#home-mindmap-title").hover();
      const zoomBefore = await p.locator("#mindmap-zoom").textContent();
      await p.mouse.wheel(0, 200);
      assert.equal(await p.locator("#mindmap-zoom").textContent(), zoomBefore);
      if (name !== "webkit") {
        await p.goto(server.base + "/dmz-fob/");
        await p.screenshot({
          path: `test-results/hubs-${name}-fob.png`,
          fullPage: true,
        });
      }
      health();
      console.log(
        name +
          " wheel/hubs PASS: real wheel directions/pointer anchor/range/modifier defaults/outside+outline; Home hubs/FOB Upgrades/context/no IDB",
      );
    } finally {
      await b.close();
    }
    const ax = await engine.launch();
    try {
      const c = await ax.newContext(),
        p = await c.newPage();
      for (const path of ["/dmz-guide/", "/dmz-fob/", "/dmz-weapons/"])
        for (const [width, zoom] of [
          [1440, false],
          [320, true],
        ])
          for (const theme of ["dark", "light"]) {
            await p.setViewportSize({ width, height: 1000 });
            await p.goto(server.base + path);
            await p.evaluate(
              (t) => (document.documentElement.dataset.theme = t),
              theme,
            );
            if (zoom)
              await p.addStyleTag({
                url: server.base + "/__test-text-zoom.css",
              });
            assert(
              await p.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
            );
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
      console.log(
        name +
          " hubs accessibility PASS: twelve page/layout/theme scans including320px200%",
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
