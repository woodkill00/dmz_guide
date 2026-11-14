// Original synthetic plan/terrain/source records only.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
const server = await createServer({
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
  server: { host: "127.0.0.1", port: 5280, strictPort: true, hmr: false },
});
await server.listen();
const base = "http://127.0.0.1:5280";
try {
  for (const [engineName, engine] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    const browser = await engine.launch(),
      context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      let renamedCapture = false;
      await page.goto("about:blank");
      const png = Buffer.from(
        await page.evaluate(() => {
          const c = document.createElement("canvas");
          c.width = c.height = 64;
          c.getContext("2d").fillRect(0, 0, 64, 64);
          return c.toDataURL().split(",")[1];
        }),
        "base64",
      );
      await context.route("**/maps/hajin/v1/background.webp", (route) =>
        route.fulfill({ body: png, contentType: "image/png" }),
      );
      await context.route("**/maps/hajin/official/icons/*", (route) =>
        route.fulfill({ body: png, contentType: "image/png" }),
      );
      await context.route("**/maps/hajin/official/markers.json", (route) =>
        route.fulfill({
          json: {
            schemaVersion: 1,
            sourcePage:
              "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
            capturedAt: "2026-11-10T00:00:00Z",
            synthetic: true,
            categories: [
              {
                id: "poiLabel",
                name: "Synthetic places",
                group: "Locations",
                icon: "/maps/hajin/official/icons/synthetic.png",
              },
            ],
            records: [
              {
                id: "synthetic-a",
                name: renamedCapture ? "Synthetic changed A" : "Synthetic A",
                category: "poiLabel",
                mapId: "hajin",
                coordinateSpaceVersion: "hajin-official-v1-4096",
                x: 0.2,
                y: 0.3,
              },
              {
                id: "synthetic-b",
                name: "Synthetic B",
                category: "poiLabel",
                mapId: "hajin",
                coordinateSpaceVersion: "hajin-official-v1-4096",
                x: 0.6,
                y: 0.7,
              },
            ],
          },
        }),
      );
      await page.goto(base + "/?tool=explore");
      await page
        .locator("#collection-plan-file")
        .waitFor({ state: "attached" });
      await page.locator("#map-collection-plan > summary").click();
      const plan = {
        kind: "dmz-collection-plan",
        version: 1,
        packId: "test:catalog",
        contentVersion: "synthetic.1",
        createdAt: new Date().toISOString(),
        scope: "unfinished",
        items: [
          {
            itemId: "test:item",
            name: "Synthetic target",
            needed: 4,
            minimum: false,
            areas: [
              { id: "test:area-a", name: "Synthetic A" },
              { id: "test:area-b", name: "Synthetic B" },
              { id: "test:unknown", name: "Unplaced synthetic area" },
            ],
          },
        ],
      };
      await page.locator("#collection-plan-file").setInputFiles({
        name: "synthetic-plan.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(plan)),
      });
      await page.locator("#collection-plan-accept").waitFor();
      assert.equal(await page.locator("#collection-plan-route").count(), 0);
      await page.locator("#collection-plan-accept").click();
      await page
        .getByText("Unplaced synthetic area · no positioned match; list only", {
          exact: true,
        })
        .waitFor();
      await page.locator("#collection-plan-highlight").click();
      await page.locator("[data-item-area-highlight]").first().waitFor();
      assert.equal(await page.locator("[data-item-area-highlight]").count(), 2);
      await page.locator("#find-locations").click();
      await page.locator("#collection-plan-route").click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#workspace-status")
            ?.textContent.includes("collection route saved") ||
          document.body.innerText.includes("New collection route saved"),
      );
      await page
        .locator("#map-collection-plan")
        .getByRole("button", { name: "Open routes", exact: true })
        .click();
      await page.locator("#planner-route-select").waitFor();
      assert.equal(
        await page.locator("#planner-route-select option").count(),
        1,
      );
      assert.equal(await page.locator("#route-mode").inputValue(), "road");
      assert.equal(await page.locator("#route-waypoints > li").count(), 2);
      await page.goto(base + "/?tool=explore");
      await page
        .locator("#collection-plan-file")
        .waitFor({ state: "attached" });
      await page.locator("#collection-plan-file").setInputFiles({
        name: "synthetic-plan.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(plan)),
      });
      await page.locator("#collection-plan-accept").click();
      await page.locator("#collection-plan-route").click();
      await page
        .getByText(
          "A route with these locations already exists. Open Routes to use it.",
          { exact: false },
        )
        .first()
        .waitFor();
      await page
        .locator("#map-collection-plan")
        .getByRole("button", { name: "Open routes", exact: true })
        .click();
      await page.locator("#planner-route-select").waitFor();
      assert.equal(
        await page.locator("#planner-route-select option").count(),
        1,
      );
      await page.goto(base + "/?tool=explore");
      await page.locator("#collection-plan-file").waitFor({ state: "attached" });
      const run = {
        kind: "dmz-run-plan-handoff",
        version: 1,
        packId: "test:catalog",
        contentVersion: "synthetic.1",
        planId: "test:run",
        name: "Synthetic route context",
        createdAt: new Date().toISOString(),
        objectiveIds: [],
        stops: [{ id: "test:area-a", name: "Synthetic A" }],
      };
      await page.locator("#collection-plan-file").setInputFiles({
        name: "run-plan.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(run)),
      });
      await page.locator("#run-plan-decline").waitFor();
      await page.locator("#run-plan-decline").click();
      assert.equal(await page.locator("#run-plan-accept").count(), 0);
      renamedCapture = true;
      await page.goto(base + "/?tool=explore");
      await page.locator("#collection-plan-file").waitFor({ state: "attached" });
      const oldCapturePlan = structuredClone(plan);
      oldCapturePlan.items[0].areas = [oldCapturePlan.items[0].areas[0]];
      await page.locator("#collection-plan-file").setInputFiles({
        name: "old-capture-plan.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(oldCapturePlan)),
      });
      await page.locator("#collection-plan-accept").click();
      await page.getByText("Synthetic A · no positioned match; list only", { exact: true }).waitFor();
      assert.equal(await page.locator("#collection-plan-route").isDisabled(), true);
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${engineName} reviewed collection import, no automatic route writes, registered-only highlight/road-route creation, unknown list-only, persistence and duplicate prevention`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
