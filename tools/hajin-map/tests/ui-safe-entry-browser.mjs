// Real native new-tab entry. Synthetic safe/source data; no owner profiles.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  root: fileURLToPath(new URL("../", import.meta.url)),
  cacheDir: ".local/ui-safe-entry-vite",
  server: { host: "127.0.0.1", port: 0, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
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
        p = await context.newPage(),
        errors = [],
        external = [];
      context.on("page", (page) =>
        page.on("pageerror", (e) => errors.push(e.message)),
      );
      p.on("pageerror", (e) => errors.push(e.message));
      await context.route("**/*", (r) => {
        if (new URL(r.request().url()).origin === base) return r.continue();
        external.push(r.request().url());
        return r.abort();
      });
      const png = await p.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        c.getContext("2d").fillRect(0, 0, 128, 128);
        return c.toDataURL().split(",")[1];
      });
      await context.route("**/background.webp", (r) =>
        r.fulfill({
          contentType: "image/png",
          body: Buffer.from(png, "base64"),
        }),
      );
      await context.route("**/icons/*.png", (r) =>
        r.fulfill({
          contentType: "image/png",
          body: Buffer.from(png, "base64"),
        }),
      );
      await context.route("**/current-captures.local.json", (r) =>
        r.fulfill({ status: 404, body: "Synthetic no capture pointer" }),
      );
      await context.route("**/providers.local.json", (r) =>
        r.fulfill({ status: 404, body: "Synthetic no providers" }),
      );
      await context.route("**/roads.local.json", (r) =>
        r.fulfill({ status: 404, body: "Synthetic no roads" }),
      );
      await context.route("**/__map-updates/**", (r) =>
        r.fulfill({
          json: { enabled: false, reason: "Synthetic read-only service" },
        }),
      );
      await context.route("**/official/markers.json", (r) =>
        r.fulfill({
          json: {
            schemaVersion: 1,
            sourcePage:
              "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
            capturedAt: "2026-11-05T00:00:00Z",
            synthetic: true,
            categories: [
              {
                id: "safe",
                name: "Safes",
                group: "Synthetic loot",
                icon: "/maps/hajin/official/icons/safe.png",
              },
              {
                id: "spawn",
                name: "Spawn Point",
                group: "Synthetic starts",
                icon: "/maps/hajin/official/icons/spawn.png",
              },
            ],
            records: [
              ["a", "SYNTHETIC Alpha", "safe", 0.2, 0.3],
              ["b", "SYNTHETIC Bravo", "safe", 0.7, 0.3],
              ["start", "SYNTHETIC Spawn", "spawn", 0.1, 0.2],
            ].map(([id, name, category, x, y]) => ({
              id,
              name,
              category,
              x,
              y,
              mapId: "hajin",
              coordinateSpaceVersion: "hajin-official-v1-4096",
            })),
          },
        }),
      );
      await p.goto(base);
      await p.locator('html[data-ui-adapter="map-pane"]').waitFor();
      await p.locator("#workspace-open").click();
      await p.locator("#point-title").fill("SYNTHETIC main-map draft");
      await p.evaluate(
        () => (window.__entryDraft = document.querySelector("#point-title")),
      );
      const before = await stored(p),
        link = p.getByRole("link", {
          name: "Safe Run map (opens in a new tab)",
          exact: true,
        });
      const [safe] = await Promise.all([p.waitForEvent("popup"), link.click()]);
      await safe.locator('html[data-ui-adapter="safe-run-layout"]').waitFor();
      await safe.locator("#safe-settings:not([disabled])").waitFor();
      assert.equal(new URL(safe.url()).pathname, "/safes.html");
      assert.equal(await safe.locator("h1").textContent(), "Safe Run map");
      assert.equal(
        await safe
          .getByRole("link", { name: "Return to main map" })
          .getAttribute("href"),
        "/",
      );
      const rect = await safe.locator("main.safe-layout").boundingBox();
      assert.ok(
        Math.abs(rect.x) < 1 && Math.abs(rect.width - 1440) < 1,
        "Safe map owns the full viewport width",
      );
      assert.equal(
        await safe.locator("#safe-map .safe-number-marker").count(),
        2,
      );
      assert.equal(await safe.locator("#safe-map .official-marker").count(), 0);
      await safe.locator("#spawn-select").selectOption("official:start");
      await safe.waitForFunction(() =>
        document
          .querySelector("#route-status")
          ?.textContent.includes("2 stops"),
      );
      await safe
        .locator('#safe-map .leaflet-overlay-pane path[stroke="#ffd36e"]')
        .first()
        .waitFor({ state: "attached" });
      assert.ok(
        (await safe
          .locator('#safe-map .leaflet-overlay-pane path[stroke="#ffd36e"]')
          .count()) > 0,
        "Safe run draws its own route",
      );
      await safe.locator("#select-none").click();
      assert.equal(await safe.locator("#visit-order li").count(), 0);
      await safe.locator("#select-all").click();
      await safe.waitForFunction(() =>
        document
          .querySelector("#route-status")
          ?.textContent.includes("2 stops"),
      );
      assert.equal(
        await p.locator("#point-title").inputValue(),
        "SYNTHETIC main-map draft",
      );
      assert.equal(
        await p.evaluate(
          () => document.querySelector("#point-title") === window.__entryDraft,
        ),
        true,
      );
      assert.equal(await stored(p), before);
      for (const width of [1440, 320]) {
        await safe.setViewportSize({ width, height: 844 });
        await safe.locator("#safe-task-view").click();
        assert.ok(
          await safe.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth + 1,
          ),
        );
        assert.ok(await safe.locator("#safe-controls").isVisible());
        await safe.locator("#safe-map-view").click();
        assert.ok(await safe.locator("#safe-map").isVisible());
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      await context.close();
      console.log(
        `${name} Safe Run entry PASS: native new tab, own full-width map/route/start/subset, Main Map draft/DB isolation, responsive Map/Plan`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
