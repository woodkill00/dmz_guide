// Actual compact map header; synthetic marker/update endpoints, no provider work.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  root: fileURLToPath(new URL("../", import.meta.url)),
  cacheDir: ".local/ui-key-toolbar-vite",
  server: { host: "127.0.0.1", port: 0, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const settle = (p) =>
  p.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        p = await context.newPage(),
        errors = [],
        egress = [],
        calls = [];
      let online = true;
      p.on("pageerror", (e) => errors.push(e.message));
      await context.route("**/*", (r) => {
        if (new URL(r.request().url()).origin === base) return r.continue();
        egress.push(r.request().url());
        return r.abort();
      });
      const png = await p.evaluate(() => {
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
      await context.route("**/maps/hajin/official/icons/synthetic.png", (r) =>
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
            synthetic: true,
            categories: [
              {
                id: "dmz_gasStation",
                name: "Gas stations",
                group: "Facilities",
                icon: "/maps/hajin/official/icons/synthetic.png",
              },
            ],
            records: [
              {
                id: "synthetic-one",
                name: "SYNTHETIC station",
                category: "dmz_gasStation",
                mapId: "hajin",
                coordinateSpaceVersion: "hajin-official-v1-4096",
                x: 0.5,
                y: 0.5,
              },
            ],
          },
        }),
      );
      await context.route("**/__map-updates/**", (r) => {
        const path = new URL(r.request().url()).pathname;
        calls.push([r.request().method(), path]);
        if (path.endsWith("/capabilities"))
          return r.fulfill({
            json: online
              ? { enabled: true, token: "synthetic-token" }
              : { enabled: false, reason: "Synthetic update service offline" },
          });
        if (path.endsWith("/jobs")) return r.fulfill({ json: { jobs: [] } });
        return r.fulfill({ json: { error: "Synthetic source check refused" } });
      });
      const ready = async () => {
        await p.locator('html[data-ui-mounted="071-v1"]').waitFor();
        await p.locator("#ui-task-view").click();
        await p.waitForFunction(
          () => document.querySelector("#key-summary")?.textContent === "1 / 1",
        );
      };
      await p.goto(base);
      await ready();
      await p.waitForFunction(
        () => document.querySelector("#update-map-sources")?.disabled === false,
      );
      const header = p.locator("#key-controls");
      assert.ok(
        (await header.boundingBox()).height <= 128,
        "Desktop idle toolbar remains two compact rows",
      );
      assert.ok(!(await header.innerText()).includes("Choose the symbols"));
      const before = await p.evaluate(async () => {
        const { openWorkspace } = await import("/src/workspace/store.ts");
        const s = await openWorkspace();
        try {
          return JSON.stringify((await s.read()).current);
        } finally {
          s.close();
        }
      });
      await p.locator("#key-map-info > summary").focus();
      await p.keyboard.press("Enter");
      assert.ok(await p.locator("#key-summary-details").isVisible());
      assert.match(
        await p.locator("#key-summary-details").textContent(),
        /raw source locations.*custom points/,
      );
      await p.keyboard.press("Escape");
      assert.equal(
        await p.locator("#key-map-info").evaluate((n) => n.open),
        false,
      );
      assert.ok(await header.isVisible());
      await p.locator(".key-updates-menu > summary").click();
      assert.ok(await p.locator("#update-map-sources").isVisible());
      assert.ok(await p.locator("#manage-map-updates").isVisible());
      assert.equal(
        calls.filter(([method]) => method === "POST").length,
        0,
        "Opening a disclosure must not start a source job",
      );
      await p.keyboard.press("Escape");
      assert.equal(
        await p.locator(".key-updates-menu").evaluate((n) => n.open),
        false,
      );
      for (const width of [1440, 320])
        for (const theme of ["dark", "light"])
          for (const percent of [100, 200]) {
            await p.setViewportSize({ width, height: 1000 });
            await p.evaluate(
              ({ theme, percent }) => {
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.fontSize = percent + "%";
              },
              { theme, percent },
            );
            await p.locator("#ui-task-view").click();
            await settle(p);
            assert.ok(
              await p.evaluate(
                () =>
                  document.documentElement.scrollWidth <=
                  document.documentElement.clientWidth + 1,
              ),
            );
            for (const selector of [
              ".grid-toggle",
              "#key-show-all",
              "#key-hide-all",
              "#key-map-info > summary",
              ".key-updates-menu > summary",
            ]) {
              const control = p.locator(selector);
              await control.scrollIntoViewIfNeeded();
              const r = await control.boundingBox();
              assert.ok(r.width >= 43 && r.height >= 43, selector + " target");
              assert.equal(
                await control.evaluate((n) => {
                  const r = n.getBoundingClientRect(),
                    hit = document.elementFromPoint(
                      r.x + r.width / 2,
                      r.y + r.height / 2,
                    );
                  return n === hit || n.contains(hit);
                }),
                true,
                selector + " hit",
              );
            }
          }
      await p.setViewportSize({ width: 1440, height: 1000 });
      await p.evaluate(
        () => (document.documentElement.style.fontSize = "100%"),
      );
      await p.locator("#ui-task-view").click();
      assert.equal(
        await p.evaluate(async () => {
          const { openWorkspace } = await import("/src/workspace/store.ts");
          const s = await openWorkspace();
          try {
            return JSON.stringify((await s.read()).current);
          } finally {
            s.close();
          }
        }),
        before,
        "Presentation-only interactions do not save domain data",
      );
      await p.locator("#key-hide-all").click();
      await p
        .locator('[data-official-id="synthetic-one"]')
        .waitFor({ state: "detached" });
      await p.locator("#key-show-all").click();
      await p.locator('[data-official-id="synthetic-one"]').waitFor();
      await p.locator("#show-coordinate-grid").uncheck();
      assert.equal(await p.locator("#show-coordinate-grid").isChecked(), false);
      await p.locator("#show-coordinate-grid").check();
      await p.waitForFunction(
        () =>
          document.querySelector("#workspace-message")?.textContent ===
          "All layers shown",
      );
      await p.locator(".key-updates-menu > summary").click();
      await p.locator("#manage-map-updates").click();
      await p
        .getByRole("heading", { name: "Staged source checks", exact: true })
        .waitFor();
      assert.ok(
        await p.getByText("No staged updates.", { exact: true }).isVisible(),
      );
      await p.getByRole("button", { name: "Close", exact: true }).click();
      await p.locator("#update-map-sources").click();
      await p.waitForFunction(() =>
        document
          .querySelector("#map-source-updates > p")
          ?.textContent.includes("Update stopped"),
      );
      assert.ok(
        await p.locator("#map-source-updates > p").isVisible(),
        "Failure feedback is not hidden with idle help",
      );
      online = false;
      await p.reload();
      await ready();
      await p.waitForFunction(
        () =>
          document.querySelector("#map-source-updates > p")?.textContent ===
          "Synthetic update service offline",
      );
      assert.ok(await p.locator("#map-source-updates > p").isVisible());
      online = true;
      await p.evaluate(() =>
        localStorage.setItem("hajin-source-update-pending-v1", "{"),
      );
      await p.reload();
      await ready();
      await p
        .locator("#discard-map-update-receipt")
        .waitFor({ state: "visible" });
      assert.ok(await p.locator("#map-source-updates > p").isVisible());
      assert.equal(
        await p.evaluate(() =>
          localStorage.getItem("hajin-source-update-pending-v1"),
        ),
        "{",
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(egress, []);
      await context.close();
      console.log(
        `${name} compact toolbar PASS: eight layout/theme/text cases, hit/focus/Escape, details/no jobs, grid/bulk, staged review/error/unavailable/recovery`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
