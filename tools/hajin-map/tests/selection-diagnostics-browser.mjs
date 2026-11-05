import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  cacheDir: root + "/.local/diagnostic-vite",
  server: { host: "127.0.0.1", port: 0, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const b = await engine.launch();
    try {
      const p = await b.newPage({ viewport: { width: 1280, height: 800 } }),
        external = [],
        errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      const png = Buffer.from(
        await p.evaluate(() => {
          const c = document.createElement("canvas");
          c.width = c.height = 64;
          return c.toDataURL().split(",")[1];
        }),
        "base64",
      );
      await p.route("**/*", (r) => {
        const u = new URL(r.request().url());
        if (u.origin !== base) {
          external.push(u.href);
          return r.abort();
        }
        if (u.pathname.endsWith("/official/markers.json"))
          return r.fulfill({
            json: {
              schemaVersion: 1,
              sourcePage:
                "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
              capturedAt: "2026-11-05T00:00:00Z",
              categories: [
                {
                  id: "safe",
                  name: "Synthetic safes",
                  group: "Loot",
                  icon: "/maps/hajin/official/icons/safe.png",
                },
              ],
              records: [
                {
                  id: "synthetic-safe",
                  name: "Synthetic safe",
                  category: "safe",
                  x: 0.5,
                  y: 0.5,
                  mapId: "hajin",
                  coordinateSpaceVersion: "hajin-official-v1-4096",
                  notes: "private sentinel should never be exported",
                },
              ],
            },
          });
        if (/\.(png|webp)$/.test(u.pathname))
          return r.fulfill({ contentType: "image/png", body: png });
        if (u.pathname.startsWith("/maps/"))
          return r.fulfill({ status: 404, body: "Synthetic missing file" });
        return r.continue();
      });
      await p.goto(base);
      await p.locator('html[data-ui-mounted="071-v1"]').waitFor();
      assert.equal(await p.locator("#map-copy-diagnostic").count(), 0);
      await p.goto(base + "/?debug-selection=1");
      await p.locator('html[data-ui-mounted="071-v1"]').waitFor();
      await p.locator("#ui-map-view").click();
      await p.locator('[data-official-id="synthetic-safe"]').click();
      await p.locator("#ui-selection-detail").waitFor();
      await p.waitForTimeout(300);
      await p.locator("#map-copy-diagnostic").click();
      const report = JSON.parse(
        await p.locator("#map-diagnostic-text").inputValue(),
      );
      assert.equal(report.kind, "local-map-selection-diagnostic");
      assert.ok(report.events.some((e) => e.type === "popupopen"));
      assert.ok(report.current.detail.width > 0);
      assert.equal(JSON.stringify(report).includes("private sentinel"), false);
      await p.locator("#map-diagnostic-report button").click();
      await p.evaluate(() => {
        for (let i = 0; i < 200; i++)
          window.dispatchEvent(
            new ErrorEvent("error", { message: "Synthetic recorder limit" }),
          );
      });
      await p.locator("#map-copy-diagnostic").click();
      const capped = JSON.parse(
        await p.locator("#map-diagnostic-text").inputValue(),
      );
      assert.ok(capped.events.length <= 160);
      assert.deepEqual(external, []);
      assert.deepEqual(errors, []);
      console.log(
        name +
          " diagnostic PASS: default off, real marker lifecycle/geometry, no notes export, bounded events, no report requests",
      );
    } finally {
      await b.close();
    }
  }
} finally {
  await server.close();
}
