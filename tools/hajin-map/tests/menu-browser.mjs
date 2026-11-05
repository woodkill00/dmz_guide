import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
// Synthetic map/markers only, no provider requests or owner-local assets.
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
const server = await createServer({
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
  server: { host: "127.0.0.1", port: 5282, strictPort: true, hmr: false },
});
await server.listen();
await mkdir(".local", { recursive: true });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const painter = await context.newPage();
      const png = await painter.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        c.getContext("2d").fillRect(0, 0, 128, 128);
        return c.toDataURL().split(",")[1];
      });
      await painter.close();
      const image = Buffer.from(png, "base64"),
        icon = "/maps/hajin/official/icons/synthetic.png";
      await context.route("**/maps/hajin/v1/background.webp", (r) =>
        r.fulfill({ body: image, contentType: "image/png" }),
      );
      await context.route("**/maps/hajin/official/icons/*", (r) =>
        r.fulfill({ body: image, contentType: "image/png" }),
      );
      await context.route("**/maps/hajin/official/markers.json", (r) =>
        r.fulfill({
          json: {
            schemaVersion: 1,
            sourcePage:
              "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
            capturedAt: "2026-10-26T00:00:00Z",
            synthetic: true,
            categories: [
              {
                id: "synthetic-other",
                name: "Synthetic stations",
                group: "Facilities",
                icon,
              },
              {
                id: "dmz_gasStation",
                name: "Synthetic stations",
                group: "Facilities",
                icon,
              },
            ],
            records: [
              {
                id: "synthetic-two",
                name: "Synthetic other station",
                category: "synthetic-other",
                mapId: "hajin",
                coordinateSpaceVersion: "hajin-official-v1-4096",
                x: 0.7,
                y: 0.7,
              },
              {
                id: "synthetic-one",
                name: "Synthetic station",
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

      await page.goto("http://127.0.0.1:5282/");
      await page.locator("#workspace-open:enabled").waitFor();
      await page.locator('[data-official-id="synthetic-one"]').waitFor();
      const combined = page.locator("#combined-map-categories");
      await combined.waitFor();
      assert.equal(await combined.evaluate((n) => n.open), false);
      await combined.locator(":scope > summary").click();
      const source = page.locator(
        'details[data-menu-section="source-official"]',
      );
      assert.equal(await source.evaluate((n) => n.open), false);
      await source.locator(":scope > summary").click();
      const category = source.locator('[data-key-category="dmz_gasStation"]');
      assert(await category.isChecked());
      await combined.locator("input").first().focus();
      await page.keyboard.press("Space");
      await page.waitForFunction(() =>
        document.activeElement?.id.startsWith("combined-category-"),
      );

      await page.waitForFunction(
        () => !document.querySelector('[data-official-id="synthetic-one"]'),
      );
      assert(await source.evaluate((n) => n.open));
      assert.equal(await category.isChecked(), false);
      await category.check();
      await page.waitForFunction(
        () =>
          document.querySelector("#combined-map-categories input")
            ?.indeterminate === true,
      );
      await combined.locator("input").first().check();
      await page.locator('[data-official-id="synthetic-one"]').waitFor();
      // Collapse/reopen expands map without losing the current key scroll/disclosure.
      const mapWidth = (await page.locator("#map").boundingBox()).width;
      await page.locator("#close-key").click();
      await page.waitForFunction(
        (w) => document.querySelector("#map").clientWidth > w,
        mapWidth,
      );
      await page.locator("#toggle-key").click();
      assert(await source.evaluate((n) => n.open));
      assert.deepEqual(
        (await new AxeBuilder({ page }).include("#map-key").analyze())
          .violations,
        [],
      );
      const center = () =>
        page.evaluate(async () => {
          const { viewer } = await import("/src/main.ts");
          return [
            viewer.map.getCenter().lat,
            viewer.map.getCenter().lng,
            viewer.map.getZoom(),
          ];
        });
      const before = await center();
      await page.locator('[data-official-id="synthetic-one"]').click();
      await page.locator(".readable-marker-popup").waitFor();
      assert.deepEqual(await center(), before, "opening does not move camera");
      await page.evaluate(async () => {
        const { viewer } = await import("/src/main.ts");
        viewer.map.panBy([45, 30], { animate: false });
      });
      assert(
        await page.locator(".readable-marker-popup").isVisible(),
        "selection survives pan",
      );
      const selectedDetails = page.getByRole("button", {
        name: "Selected details",
        exact: true,
      });
      await selectedDetails.click();
      assert.equal(await selectedDetails.getAttribute("aria-expanded"), "true");
      await page
        .getByRole("button", { name: "Close summary", exact: true })
        .click();
      assert.equal(
        await selectedDetails.getAttribute("aria-expanded"),
        "false",
      );
      await selectedDetails.click();
      await page
        .locator(".map-selection-inspector")
        .getByRole("button", { name: "Expand", exact: true })
        .focus();
      await page.keyboard.press("Escape");
      assert.equal(
        await selectedDetails.getAttribute("aria-expanded"),
        "false",
      );
      // Explicit visibility changes override movement deferral and remove stale selection.
      await combined.locator("input").first().uncheck();
      await page.locator(".readable-marker-popup").waitFor({ state: "hidden" });
      assert(await page.locator(".map-selection-inspector").isHidden());
      await combined.locator("input").first().check();
      await page.locator('[data-official-id="synthetic-one"]').waitFor();
      // Authoritative private-data removal also overrides a deferred pan redraw.
      const mapBox = await page.locator("#map").boundingBox();
      await page.mouse.click(
        mapBox.x + mapBox.width / 2,
        mapBox.y + mapBox.height / 2 + 90,
        { button: "right" },
      );
      await page
        .getByRole("button", { name: "Add owned POI here", exact: true })
        .click();
      await page.locator("#point-title").fill("Synthetic removable point");
      await page.locator("#point-x").fill("1200");
      await page.locator("#point-y").fill("1600");
      await page.locator("#point-category").fill("Synthetic category");
      await page
        .locator("#point-notes")
        .fill("Synthetic long private notes ".repeat(100));
      await page.locator("#point-owned").check();
      await page.locator("#save-point").click();
      await page
        .getByRole("heading", {
          name: "Synthetic removable point",
          exact: true,
        })
        .waitFor();
      await page.locator("#close-workspace").click();
      await page.evaluate(async () => {
        const { viewer } = await import("/src/main.ts");
        viewer.map.setView([1600, 1200], 2, { animate: false });
      });
      const target = await page.evaluate(async () => {
        const { viewer } = await import("/src/main.ts");
        const p = viewer.map.latLngToContainerPoint([1600, 1200]),
          r = viewer.map.getContainer().getBoundingClientRect();
        return [r.x + p.x, r.y + p.y];
      });
      await page.mouse.click(...target);
      await page.locator(".readable-marker-popup").waitFor();
      assert.match(
        await page.locator(".readable-marker-popup").innerText(),
        /Synthetic removable point/,
      );
      await page.evaluate(async () => {
        const { viewer } = await import("/src/main.ts");
        viewer.map.panBy([20, 15], { animate: false });
      });
      assert(await page.locator(".readable-marker-popup").isVisible());
      // Replacing popup A with B must retain pending redraw until B closes.
      await page.evaluate(async () => {
        const { viewer } = await import("/src/main.ts");
        window.__menuRedrawRemovals = 0;
        viewer.map.eachLayer((layer) => {
          if (
            layer.getRadius &&
            layer.getLatLng &&
            layer.getLatLng().lat === 1600 &&
            layer.getLatLng().lng === 1200
          )
            layer.on("remove", () => window.__menuRedrawRemovals++);
        });
        viewer.map.panBy([10, 10], { animate: false });
        const L = (await import("/node_modules/.vite/deps/leaflet.js")).default;
        const { markerPopup, markerPopupOptions } = await import(
          "/src/map/marker-popup.ts"
        );
        L.popup(markerPopupOptions)
          .setLatLng([1600, 1200])
          .setContent(markerPopup("Synthetic replacement").root)
          .openOn(viewer.map);
      });
      await page.waitForFunction(
        () =>
          document.querySelectorAll(".leaflet-popup-close-button").length === 1,
      );
      assert.equal(await page.evaluate(() => window.__menuRedrawRemovals), 0);
      await page.locator(".leaflet-popup-close-button").click();
      await page.waitForFunction(() => window.__menuRedrawRemovals > 0);
      await page.waitForFunction(
        () => document.querySelectorAll(".readable-marker-popup").length === 0,
      );
      const updatedTarget = await page.evaluate(async () => {
        const { viewer } = await import("/src/main.ts");
        const p = viewer.map.latLngToContainerPoint([1600, 1200]),
          r = viewer.map.getContainer().getBoundingClientRect();
        return [r.x + p.x, r.y + p.y];
      });
      await page.mouse.click(...updatedTarget);
      await page.locator(".readable-marker-popup").waitFor();
      await page.evaluate(async () => {
        const { viewer } = await import("/src/main.ts");
        viewer.map.panBy([10, 10], { animate: false });
      });
      await page
        .getByRole("group", { name: "Map workflow tools" })
        .getByRole("button", { name: "Search", exact: true })
        .click();
      await page.locator("#workspace-tab-points").click();
      await page
        .getByRole("button", { name: "Delete point", exact: true })
        .click();
      await page.locator("#confirm-delete-point").click();
      await page.waitForFunction(
        () => !document.querySelector("[data-annotation]"),
      );
      await page.locator("#close-workspace").click();
      await page.locator(".readable-marker-popup").waitFor({ state: "hidden" });
      assert.equal(await page.locator(".readable-marker-popup").count(), 0);
      assert(await page.locator(".map-selection-inspector").isHidden());
      // Corner cards with long notes remain reachable without camera movement.
      await page.locator("#close-key").click();
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 844 });
        for (const scale of [100, 200]) {
          await page.evaluate((scale) => {
            document.documentElement.style.fontSize = scale + "%";
          }, scale);
          for (const corner of [
            [12, 12],
            [-12, -12],
          ]) {
            const result = await page.evaluate(async (corner) => {
              const { viewer } = await import("/src/main.ts");
              const L = (await import("/node_modules/.vite/deps/leaflet.js"))
                .default;
              const { markerPopup, markerPopupOptions } = await import(
                "/src/map/marker-popup.ts"
              );
              viewer.map.closePopup();
              const map = viewer.map,
                size = map.getSize(),
                position = map.containerPointToLatLng([
                  corner[0] < 0 ? size.x + corner[0] : corner[0],
                  corner[1] < 0 ? size.y + corner[1] : corner[1],
                ]);
              const content = markerPopup("Synthetic edge location");
              content.details.textContent = "Synthetic long notes ".repeat(400);
              const action = document.createElement("button");
              action.textContent = "Synthetic action";
              content.actions.append(action);
              const before = [
                map.getCenter().lat,
                map.getCenter().lng,
                map.getZoom(),
              ];
              L.popup(markerPopupOptions)
                .setLatLng(position)
                .setContent(content.root)
                .openOn(map);
              return before;
            }, corner);
            await page.waitForTimeout(250);
            assert.deepEqual(await center(), result);
            const bounds = await page
                .locator(".readable-marker-popup")
                .boundingBox(),
              map = await page.locator("#map").boundingBox();
            assert(
              bounds.x >= map.x - 1 &&
                bounds.y >= map.y - 1 &&
                bounds.x + bounds.width <= map.x + map.width + 1 &&
                bounds.y + bounds.height <= map.y + map.height + 1,
              JSON.stringify({ bounds, map, width, scale }),
            );
            assert.deepEqual(
              (await new AxeBuilder({ page }).include("#map").analyze())
                .violations,
              [],
            );
            await page
              .getByRole("button", { name: "Synthetic action", exact: true })
              .click();
            await page.locator(".leaflet-popup-close-button").click();
          }
        }
      }
      assert.deepEqual(errors, []);
      console.log(
        name +
          " organized menu PASS: combined/source controls, retained disclosure, retract/restore, stationary edge popup, pan persistence, authoritative filter",
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
