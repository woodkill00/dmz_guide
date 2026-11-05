import { mkdir } from "node:fs/promises";
// Synthetic map/markers only, no provider requests or owner-local assets.
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
const server = await createServer({
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
  server: { host: "127.0.0.1", port: 5278, strictPort: true, hmr: false },
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
                id: "dmz_gasStation",
                name: "Synthetic stations",
                group: "Facilities",
                icon,
              },
            ],
            records: [
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
      await page.setViewportSize({ width: 1440, height: 620 });
      await page.goto("http://127.0.0.1:5278/");
      await page.locator("#zoom-in:enabled").waitFor();
      await page.locator('[data-official-id="synthetic-one"]').waitFor();
      await page.waitForFunction(
        () => document.querySelector("#map-key-content").clientHeight >= 120,
      );
      await page.evaluate(() => {
        const section = document.createElement("section");
        section.id = "synthetic-key-list";
        for (let index = 0; index < 80; index++) {
          const row = document.createElement("div");
          row.className = "category-filter key-item";
          row.dataset.testKeyIndex = String(index);
          row.textContent = `Synthetic layer ${index + 1}`;
          section.append(row);
        }
        document.querySelector("#map-key-content").prepend(section);
      });
      const keyControls = page.locator(".key-toolbar");
      const keyContent = page.locator("#map-key-content");
      const keyDivider = page.getByRole("separator", {
        name: "Resize map key sections",
      });
      const initialPanelSizes = await page.evaluate(() => ({
        controls: document.querySelector(".key-toolbar").clientHeight,
        list: document.querySelector("#map-key-content").clientHeight,
      }));
      assert(
        initialPanelSizes.list >= 120,
        `Expected at least 120px of layer list, received ${initialPanelSizes.list}px`,
      );
      assert(initialPanelSizes.controls > 0);
      assert.equal(await keyDivider.count(), 1);
      assert(
        (await keyDivider.getAttribute("aria-controls")).includes(
          "map-key-content",
        ),
      );

      await keyControls.hover({ position: { x: 120, y: 20 } });
      await page.mouse.wheel(0, 1200);
      await page.waitForFunction(
        () => document.querySelector(".key-toolbar").scrollTop > 0,
      );
      assert.equal(
        await keyContent.evaluate((element) => element.scrollTop),
        0,
      );
      await page.mouse.wheel(0, -1200);
      await page.waitForFunction(
        () => document.querySelector(".key-toolbar").scrollTop === 0,
      );

      await keyContent.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      assert(
        await keyContent.evaluate(
          (element) =>
            element.scrollTop + element.clientHeight >=
            element.scrollHeight - 2,
        ),
      );
      const lastSyntheticLayer = page.locator('[data-test-key-index="79"]');
      await lastSyntheticLayer.scrollIntoViewIfNeeded();
      assert.equal(
        await lastSyntheticLayer.evaluate((row) => {
          const panel = document
            .querySelector("#map-key-content")
            .getBoundingClientRect();
          const item = row.getBoundingClientRect();
          return item.top >= panel.top && item.bottom <= panel.bottom;
        }),
        true,
      );
      const firstSyntheticLayer = page.locator('[data-test-key-index="0"]');
      await firstSyntheticLayer.scrollIntoViewIfNeeded();
      assert.equal(
        await firstSyntheticLayer.evaluate((row) => {
          const panel = document
            .querySelector("#map-key-content")
            .getBoundingClientRect();
          const item = row.getBoundingClientRect();
          return item.top >= panel.top && item.bottom <= panel.bottom;
        }),
        true,
      );
      await keyContent.evaluate((element) => {
        element.scrollTop = 0;
      });
      assert.equal(
        await firstSyntheticLayer.evaluate((row) => {
          const panel = document
            .querySelector("#map-key-content")
            .getBoundingClientRect();
          const item = row.getBoundingClientRect();
          return item.top >= panel.top && item.bottom <= panel.bottom;
        }),
        true,
      );

      const layerStateBeforeResize = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '#map-key-content input[type="checkbox"]',
          ),
        ].map((input) => [input.id, input.checked]),
      );
      const mapPositionBeforeResize = await page
        .locator("#position")
        .textContent();
      const dividerBounds = await keyDivider.boundingBox();
      assert(dividerBounds);
      const dividerValueBeforePointer = Number(
        await keyDivider.getAttribute("aria-valuenow"),
      );
      await page.mouse.move(
        dividerBounds.x + dividerBounds.width / 2,
        dividerBounds.y + dividerBounds.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        dividerBounds.x + dividerBounds.width / 2,
        dividerBounds.y + dividerBounds.height / 2 + 40,
        { steps: 4 },
      );
      await page.mouse.up();
      const dividerValueAfterPointer = Number(
        await keyDivider.getAttribute("aria-valuenow"),
      );
      assert(dividerValueAfterPointer > dividerValueBeforePointer);
      await keyDivider.focus();
      await page.keyboard.press("ArrowUp");
      assert(
        Number(await keyDivider.getAttribute("aria-valuenow")) <
          dividerValueAfterPointer,
      );
      await page.keyboard.press("End");
      assert.equal(
        await keyDivider.getAttribute("aria-valuenow"),
        await keyDivider.getAttribute("aria-valuemax"),
      );
      await page.keyboard.press("Home");
      assert.equal(
        await keyDivider.getAttribute("aria-valuenow"),
        await keyDivider.getAttribute("aria-valuemin"),
      );
      assert.deepEqual(
        await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              '#map-key-content input[type="checkbox"]',
            ),
          ].map((input) => [input.id, input.checked]),
        ),
        layerStateBeforeResize,
      );
      assert.equal(
        await page.locator("#position").textContent(),
        mapPositionBeforeResize,
      );

      await page.setViewportSize({ width: 1440, height: 520 });
      await page.waitForFunction(() => {
        const toolbar = document.querySelector(".key-toolbar");
        const list = document.querySelector("#map-key-content");
        return toolbar.clientHeight > 0 && list.clientHeight > 0;
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator("#map-key").waitFor({ state: "hidden" });
      await page.locator("#toggle-key").click();
      await page.waitForFunction(() => {
        const toolbar = document.querySelector(".key-toolbar");
        const list = document.querySelector("#map-key-content");
        return toolbar.clientHeight > 0 && list.clientHeight > 0;
      });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert(
        await keyDivider.evaluate(
          (element) => element.getBoundingClientRect().height >= 20,
        ),
      );
      await page.setViewportSize({ width: 1440, height: 900 });
      console.log(`${name} map-key scroll/resize/state-preservation PASS`);
      const tool = page.getByRole("group", { name: "Map workflow tools" });
      await tool.getByRole("button", { name: "Layers", exact: true }).click();
      assert(await page.locator("#layers-dialog").isVisible());
      await page.keyboard.press("Escape");
      await tool.getByRole("button", { name: "Search", exact: true }).click();
      await page.locator("#workspace-dialog[open]").waitFor();
      await page
        .getByRole("button", { name: "Close workspace", exact: true })
        .click();
      await page.locator('[data-official-id="synthetic-one"]').click();
      const inspector = page.getByRole("region", {
        name: "Selected location inspector",
      });
      await tool.getByRole("button", {name:"Selected details",exact:true}).click();
      await inspector.waitFor();
      assert.match(await inspector.innerText(), /Synthetic station/);
      assert.equal(await page.locator(".map-marker-selected").count(), 1);
      await inspector
        .getByRole("button", { name: "Expand", exact: true })
        .click();
      await inspector
        .getByRole("button", { name: "Minimize", exact: true })
        .click();
      assert.equal(
        await inspector
          .getByRole("button", { name: "Expand", exact: true })
          .getAttribute("aria-expanded"),
        "false",
      );
      await inspector
        .getByRole("button", { name: "Expand", exact: true })
        .click();
      await inspector.getByText("Panel size", { exact: true }).click();
      await inspector
        .getByRole("slider", { name: "Selection panel width" })
        .fill("500");
      assert.equal(
        await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("hajin-selection-layout-v1")).width,
        ),
        500,
      );
      await page.screenshot({
        path: `.local/hub058-inspector-${name}-desktop.png`,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      assert((await inspector.boundingBox()).height <= 844 * 0.45 + 1);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: `.local/hub058-inspector-${name}-mobile.png`,
      });
      await inspector
        .getByRole("button", { name: "Close summary", exact: true })
        .click();
      assert(await inspector.isHidden());
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator(".leaflet-popup-close-button").click();
      await page.locator('[data-official-id="synthetic-one"]').click();
      await page
        .locator(".leaflet-popup-content")
        .getByRole("button", { name: "Add waypoint", exact: true })
        .click();
      await page.locator("#route-plan-summary:not([hidden])").waitFor();
      await tool.getByRole("button", { name: "Routes", exact: true }).click();
      await page.locator("dialog[open]").waitFor();
      assert.match(
        await page.locator("dialog[open]").innerText(),
        /route|waypoint/i,
      );
      await page.keyboard.press("Escape");
      await page.locator("#route-show-next").click();
      await page.locator("#route-next-reached").click();
      await page.waitForFunction(
        () => document.querySelector("#route-next-reached")?.disabled,
      );
      await page.locator("#route-tracker-toggle").click();
      assert.equal(
        await page
          .locator("#route-tracker-toggle")
          .getAttribute("aria-expanded"),
        "false",
      );
      await page.reload();
      await page.locator("#zoom-in:enabled").waitFor();
      await page.locator("#route-plan-summary:not([hidden])").waitFor();
      assert.equal(
        await page
          .locator("#route-tracker-toggle")
          .getAttribute("aria-expanded"),
        "false",
      );
      await page.locator("#route-tracker-toggle").click();
      assert(await page.locator("#route-next-reached").isDisabled());
      await tool.getByText("Advanced", { exact: true }).click();
      await tool.getByRole("button", { name: "Reset panel layout" }).click();
      assert.equal(
        await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("hajin-selection-layout-v1")).width,
        ),
        380,
      );
      assert.deepEqual(errors, []);
      console.log(
        name +
          " map workflow PASS: toolbar/search/layers, selection/highlight/collapse/resize/mobile/reset, authoritative waypoint action",
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
