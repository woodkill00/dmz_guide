// Synthetic terrain only. This suite requires the real modern map adapter.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  cacheDir: ".local/ui-layout-review-vite",
  server: { host: "127.0.0.1", port: 5283, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const rows = [],
  cameraFailures = [];
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      for (const [width, height, textScale] of [
        [1440, 900, 1],
        [844, 390, 1],
        [667, 375, 1],
        [320, 400, 1],
        [1440, 900, 2],
        [320, 400, 2],
        [667, 375, 2],
      ]) {
        const context = await browser.newContext({
            viewport: { width, height },
          }),
          page = await context.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await context.route("**/*", (r) =>
          new URL(r.request().url()).origin === "http://127.0.0.1:5283"
            ? r.continue()
            : r.abort(),
        );
        const painter = await context.newPage();
        const bytes = await painter.evaluate(() => {
          const c = document.createElement("canvas");
          c.width = c.height = 128;
          c.getContext("2d").fillRect(0, 0, 128, 128);
          return c.toDataURL().split(",")[1];
        });
        await painter.close();
        await context.route("**/maps/hajin/v1/background.webp", (r) =>
          r.fulfill({
            body: Buffer.from(bytes, "base64"),
            contentType: "image/png",
          }),
        );
        await context.route("**/maps/hajin/official/markers.json", (r) =>
          r.fulfill({
            json: {
              schemaVersion: 1,
              sourcePage:
                "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
              capturedAt: "2026-11-05T00:00:00Z",
              categories: [],
              markers: [],
            },
          }),
        );
        await page.goto("http://127.0.0.1:5283/");
        await page.waitForSelector(
          'html[data-ui-mounted="071-v1"][data-ui-adapter="map-pane"]',
        );
        await page.waitForTimeout(150);
        const camera = await page.evaluate(async () => {
          const { viewer } = await import("/src/main.ts");
          viewer.map.setView([2048, 2048], 0, { animate: false });
          const c = viewer.map.getCenter();
          return { lat: c.lat, lng: c.lng, zoom: viewer.map.getZoom() };
        });
        if (textScale === 2) {
          await page.evaluate(
            () => (document.documentElement.style.fontSize = "200%"),
          );
          await page.waitForTimeout(150);
        }
        await page.locator("#workspace-open").click();
        await page.locator("#point-title").fill("Synthetic preserved draft");
        await page.locator("#point-title").focus();
        await page.setViewportSize({
          width: Math.max(320, width - 20),
          height,
        });
        assert.equal(
          await page.locator("#point-title").inputValue(),
          "Synthetic preserved draft",
        );
        await page.waitForTimeout(150);
        assert.equal(
          await page
            .locator("#point-title")
            .evaluate((e) => document.activeElement === e),
          true,
          "Focused editor survives fallback",
        );
        const rects = await page.evaluate(() => {
          const rect = (s) => {
            const e = document.querySelector(s),
              r = e.getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              hidden: !r.width || !r.height,
            };
          };
          return {
            viewport: {
              width: innerWidth,
              height: innerHeight,
              visual: visualViewport
                ? {
                    width: visualViewport.width,
                    height: visualViewport.height,
                    offsetTop: visualViewport.offsetTop,
                    offsetLeft: visualViewport.offsetLeft,
                    scale: visualViewport.scale,
                  }
                : null,
            },
            width: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth,
            mode: document.documentElement.dataset.mapLayout,
            font: parseFloat(
              getComputedStyle(document.querySelector(".workspace")).fontSize,
            ),
            controls: rect(".ui-map-view-controls"),
            route: rect("#ui-map-route"),
            dialog: rect("#workspace-dialog"),
            task: rect("#ui-map-task"),
            terrain: rect(".map-workspace"),
            shell: rect(".workspace"),
          };
        });
        assert.ok(rects.width <= rects.client + 1, JSON.stringify(rects));
        assert.ok(
          !rects.task.hidden,
          JSON.stringify({ name, width, height, textScale, ...rects }),
        );
        assert.ok(
          rects.task.x >= -1 &&
            rects.task.x + rects.task.width <= rects.client + 1,
        );
        assert.ok(rects.mode === "task" || rects.mode === "docked");
        assert.ok(
          rects.task.height > 0 &&
            rects.task.y >= rects.controls.y + rects.controls.height - 1,
          "Task must not overlap contextual controls " + JSON.stringify(rects),
        );
        assert.equal(
          await page.locator("#ui-map-task #workspace-dialog").count(),
          1,
        );
        assert.equal(await page.locator("#ui-map-task #map-key").count(), 1);
        assert.equal(
          await page.locator("#ui-map-route #route-plan-summary").count(),
          1,
        );
        const focusHit = await page.locator("#point-title").evaluate((e) => {
          e.scrollIntoView({ block: "center" });
          const r = e.getBoundingClientRect(),
            hit = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
          return {
            ok: hit === e || e.contains(hit),
            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          };
        });
        assert.ok(
          focusHit.ok,
          "Editor center must be pointer reachable " + JSON.stringify(focusHit),
        );
        await page.locator("#ui-map-view").click();
        await page.waitForSelector('html[data-map-view="map"]');
        await page.locator("#ui-task-view").click();
        assert.equal(
          await page.locator("#point-title").inputValue(),
          "Synthetic preserved draft",
        );
        await page.waitForTimeout(150);
        const cameraAfter = await page.evaluate(async () => {
          const { viewer } = await import("/src/main.ts");
          const c = viewer.map.getCenter();
          return { lat: c.lat, lng: c.lng, zoom: viewer.map.getZoom() };
        });
        if (JSON.stringify(cameraAfter) !== JSON.stringify(camera))
          cameraFailures.push({
            name,
            width,
            height,
            textScale,
            before: camera,
            after: cameraAfter,
          });
        assert.deepEqual(errors, []);
        rows.push({
          name,
          width,
          height,
          textScale,
          cameraBefore: camera,
          cameraAfter,
          ...rects,
        });
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  await mkdir(".local", { recursive: true });
  await writeFile(".local/071-map-layout.json", JSON.stringify(rows, null, 2));
  assert.deepEqual(
    cameraFailures,
    [],
    "Explicit camera must survive fallback and Map/Task switches",
  );
  console.log(`Modern map layout PASS ${rows.length} cases`);
} finally {
  await server.close();
}
