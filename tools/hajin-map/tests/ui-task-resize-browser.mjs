// Real full map with synthetic terrain and fresh, disposable browser profiles.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  cacheDir: ".local/ui-task-resize-vite",
  server: { host: "127.0.0.1", port: 0, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`,
  key = "dmz-ui-map-pane-v1";
const settle = (p) =>
  p.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
const camera = (p) =>
  p.evaluate(async () => {
    const { viewer } = await import("/src/main.ts");
    const c = viewer.map.getCenter();
    return { lat: c.lat, lng: c.lng, zoom: viewer.map.getZoom() };
  });
const stored = (p) =>
  p.evaluate(async () => {
    const { openWorkspace } = await import("/src/workspace/store.ts");
    const s = await openWorkspace();
    try {
      return JSON.stringify((await s.read()).current);
    } finally {
      s.close();
    }
  });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        page = await context.newPage(),
        errors = [],
        external = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await context.route("**/*", (r) => {
        if (new URL(r.request().url()).origin === base) return r.continue();
        external.push(r.request().url());
        return r.abort();
      });
      const png = await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        c.getContext("2d").fillRect(0, 0, 128, 128);
        return c.toDataURL().split(",")[1];
      });
      await context.route("**/maps/hajin/v1/background.webp", (r) =>
        r.fulfill({
          contentType: "image/png",
          body: Buffer.from(png, "base64"),
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
            records: [],
          },
        }),
      );
      const ready = async () => {
        await page
          .locator('html[data-ui-mounted="071-v1"][data-ui-adapter="map-pane"]')
          .waitFor();
        await page.locator("#ui-task-view").click();
        await page
          .locator("#ui-map-task-resizer")
          .waitFor({ state: "visible" });
        await settle(page);
      };
      await page.goto(base);
      await ready();
      await page.locator("#workspace-open").click();
      await page
        .locator("#point-title")
        .fill("SYNTHETIC retained resize draft");
      await page.evaluate(
        () => (window.__resizeField = document.querySelector("#point-title")),
      );
      await page.waitForFunction(() => {
        const i = document.querySelector("#map .leaflet-image-layer");
        return i?.complete && i.naturalWidth > 0;
      });
      await page.evaluate(async () => {
        const { viewer } = await import("/src/main.ts");
        viewer.map.setView([2048, 2048], 1, { animate: false });
      });
      const before = await camera(page),
        domain = await stored(page),
        handle = page.getByRole("separator", { name: "Resize map side menu" });
      const initial = await page.locator("#ui-map-task").boundingBox(),
        rect = await handle.boundingBox();
      await page.mouse.move(rect.x + 12, rect.y + 140);
      await page.mouse.down();
      await page.mouse.move(rect.x + 152, rect.y + 140, { steps: 10 });
      await page.mouse.up();
      await settle(page);
      assert.ok(
        (await page.locator("#ui-map-task").boundingBox()).width >
          initial.width + 120,
      );
      const dragged = Number(await handle.getAttribute("aria-valuenow"));
      await handle.focus();
      await page.keyboard.press("ArrowLeft");
      assert.equal(
        Number(await handle.getAttribute("aria-valuenow")),
        dragged - 16,
      );
      await page.keyboard.press("Shift+ArrowRight");
      assert.equal(
        Number(await handle.getAttribute("aria-valuenow")),
        dragged + 48,
      );
      await page.keyboard.press("End");
      await settle(page);
      assert.equal(
        await handle.getAttribute("aria-valuenow"),
        await handle.getAttribute("aria-valuemax"),
      );
      assert.ok(
        (await page.locator(".map-workspace").boundingBox()).width >= 319,
      );
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowRight");
      await settle(page);
      const preference = await page.evaluate(
        (key) => localStorage.getItem(key),
        key,
      );
      assert.equal(
        await page.evaluate(
          () => document.querySelector("#point-title") === window.__resizeField,
        ),
        true,
      );
      assert.equal(
        await page.locator("#point-title").inputValue(),
        "SYNTHETIC retained resize draft",
      );
      assert.deepEqual(await camera(page), before);
      assert.equal(await stored(page), domain);
      await page
        .getByRole("button", { name: "Cancel draft / preview", exact: true })
        .click();
      await page.reload();
      await ready();
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), key),
        preference,
      );
      assert.equal(
        Number(await handle.getAttribute("aria-valuenow")),
        JSON.parse(preference).width,
      );
      await handle.focus();
      await page.keyboard.press("End");
      const widePreference = await page.evaluate(
        (key) => localStorage.getItem(key),
        key,
      );
      await page.setViewportSize({ width: 1100, height: 1000 });
      await settle(page);
      assert.ok(
        Number(await handle.getAttribute("aria-valuenow")) <
          JSON.parse(widePreference).width,
      );
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), key),
        widePreference,
      );
      await page.setViewportSize({ width: 1440, height: 1000 });
      await ready();
      assert.equal(
        Number(await handle.getAttribute("aria-valuenow")),
        JSON.parse(widePreference).width,
      );
      await handle.focus();
      await page.keyboard.press("Home");
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), key),
        preference,
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await settle(page);
      assert.equal(await handle.isVisible(), false);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await ready();
      assert.equal(
        Number(await handle.getAttribute("aria-valuenow")),
        JSON.parse(preference).width,
      );
      // Real capture cancellation reverts the transient width and keeps saved bytes.
      await handle.evaluate((node) =>
        node.addEventListener(
          "pointerdown",
          (event) => (window.__resizePointerId = event.pointerId),
          { once: true },
        ),
      );
      const capture = await handle.boundingBox();
      await page.mouse.move(capture.x + 12, capture.y + 140);
      await page.mouse.down();
      await page.mouse.move(capture.x + 100, capture.y + 140, { steps: 4 });
      await page.evaluate(() => {
        const h = document.querySelector("#ui-map-task-resizer");
        h.releasePointerCapture(window.__resizePointerId);
      });
      await page.mouse.up();
      await settle(page);
      assert.equal(
        Number(await handle.getAttribute("aria-valuenow")),
        JSON.parse(preference).width,
      );
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), key),
        preference,
      );
      await page.evaluate((key) => {
        const prototype = Object.getPrototypeOf(localStorage),
          original = prototype.setItem;
        prototype.setItem = function (k, v) {
          if (k === key)
            throw new DOMException(
              "Synthetic denied preference write",
              "QuotaExceededError",
            );
          return original.call(this, k, v);
        };
      }, key);
      await handle.focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(
        Number(await handle.getAttribute("aria-valuenow")),
        JSON.parse(preference).width + 16,
      );
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), key),
        preference,
      );
      await page.reload();
      await ready();
      const invalid = '{"version":99,"width":600}';
      await page.evaluate(
        ({ key, invalid }) => localStorage.setItem(key, invalid),
        { key, invalid },
      );
      await page.reload();
      await ready();
      await handle.focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(
        await page.evaluate((key) => localStorage.getItem(key), key),
        invalid,
      );
      assert.equal(await stored(page), domain);
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      await context.close();
      console.log(
        `${name} map menu resize PASS: pointer/keyboard/bounds/reload/fallback/invalid bytes/form/camera/domain`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
