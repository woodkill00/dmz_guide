// Synthetic workspace only; exercises the real modern map pane and original boss domains.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  cacheDir: ".local/ui-bosses-vite",
  server: { host: "127.0.0.1", port: 5292, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = "http://127.0.0.1:5292";
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
      page.on("pageerror", (error) => errors.push(error.message));
      const png = Buffer.from(
        await page.evaluate(() => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 128;
          canvas.getContext("2d").fillRect(0, 0, 128, 128);
          return canvas.toDataURL().split(",")[1];
        }),
        "base64",
      );
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== base) {
          external.push(url.href);
          return route.abort();
        }
        if (url.pathname.endsWith("/official/markers.json"))
          return route.fulfill({
            json: {
              schemaVersion: 1,
              sourcePage:
                "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
              capturedAt: "2026-11-05T00:00:00Z",
              categories: [],
              markers: [],
            },
          });
        if (url.pathname.startsWith("/maps/"))
          return route.fulfill({ body: png, contentType: "image/png" });
        return route.continue();
      });
      await page.goto(base + "/?tool=map");
      await page
        .locator('html[data-ui-mounted="071-v1"][data-ui-adapter="map-pane"]')
        .waitFor();
      await page.locator("#workspace-open:enabled").waitFor();
      // Same mixed LT/Commander/legacy-tag fixture used by boss-board.browser.cjs.
      await page.evaluate(async () => {
        const { openWorkspace } = await import("/src/workspace/store.ts"),
          { emptyWorkspace } = await import("/src/workspace/model.ts"),
          { emptyFieldGuide } = await import("/src/workspace/field-guide.ts");
        const db = await openWorkspace();
        try {
          const old = await db.read(),
            w = emptyWorkspace();
          w.fieldGuide = emptyFieldGuide();
          const entry = (id, name, type, tags) => ({
            id,
            name: "SYNTHETIC " + name,
            type,
            goal: 5,
            starting: 0,
            notes: "",
            pinned: false,
            waypoint: null,
            source: null,
            ...(tags ? { tags } : {}),
          });
          w.fieldGuide.checklists = {
            version: 1,
            entries: [
              entry("tank", "NK Battle Tank", "commander", {
                enabled: true,
                starting: 7,
                goal: 9,
              }),
              entry("ltB", "LT second-in-source", "lieutenant", {
                enabled: true,
                starting: 4,
                goal: null,
              }),
              entry("death", "Deathstalker", "commander"),
              entry("ltA", "LT first-in-source", "lieutenant"),
              entry("col", "Colossus", "commander"),
              entry("ltP", "LT paused", "lieutenant", {
                enabled: false,
                starting: 5,
                goal: null,
              }),
            ],
            kills: [],
            dogTags: [
              {
                id: "legacy-cmd-tag",
                entryId: "tank",
                date: "2026-10-31",
                at: "2026-10-31T00:00:00.000Z",
                notes: "SYNTHETIC retained legacy",
                session: null,
              },
            ],
          };
          await db.commit(w, old.current?.revision ?? 0);
        } finally {
          db.close();
        }
      });
      await page.goto(base + "/?tool=boss-checklist");
      await page.locator("#boss-list-heading").waitFor();
      const ids = (kind) =>
        page
          .locator(`[data-boss-group=${kind}] [data-boss-id]`)
          .evaluateAll((rows) => rows.map((row) => row.dataset.bossId));
      assert.deepEqual(await ids("lieutenant"), ["ltB", "ltA", "ltP"]);
      assert.deepEqual(await ids("commander"), ["tank", "death", "col"]);
      assert.equal(
        await page.locator(".boss-commanders [id*=boss-quick-tags]").count(),
        0,
      );
      assert.equal(
        await page.locator("#ui-map-task #boss-checklist").count(),
        1,
      );
      assert.equal(
        await page
          .locator(".boss-directory")
          .first()
          .evaluate((node) => getComputedStyle(node).display),
        "block",
        "desktop narrow task pane uses its own container width",
      );
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const plus = page.locator("#boss-quick-tags-plus-ltB"),
          minus = page.locator("#boss-quick-tags-minus-ltB");
        await plus.scrollIntoViewIfNeeded();
        const p = await plus.boundingBox(),
          m = await minus.boundingBox();
        assert.ok(
          p.width >= 44 && p.height >= 44 && m.width >= 44 && m.height >= 44,
        );
        for (const [target, expected] of [
          [p, 5],
          [p, 6],
          [m, 5],
          [m, 4],
        ]) {
          await page.mouse.click(
            target.x + target.width / 2,
            target.y + target.height / 2,
          );
          await page.waitForFunction(
            (value) =>
              document.querySelector(
                "[data-boss-id=ltB] td:nth-child(3) strong",
              )?.textContent === String(value),
            expected,
          );
          await page.waitForFunction(
            () =>
              document
                .querySelector("#workspace-content")
                ?.getAttribute("aria-busy") === "false",
          );
          assert.equal(
            await page
              .locator("[data-boss-id=ltB]")
              .evaluate((node) =>
                node.classList.contains("boss-tags-complete"),
              ),
            expected >= 5,
          );
          assert.ok(
            Math.abs((await plus.boundingBox()).y - p.y) <= 1,
            "counter remains at its clicked coordinates",
          );
        }
        assert.equal(
          await page
            .locator("#ui-map-task")
            .evaluate((node) => node.scrollWidth > node.clientWidth + 1),
          false,
        );
      }
      await page.locator("#boss-order-ltA").focus();
      await page.keyboard.press("Home");
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-boss-group=lieutenant] [data-boss-id]")
            ?.getAttribute("data-boss-id") === "ltA",
      );
      await page.locator("#boss-order-ltA").evaluate((node) => {
        window.__bossDrag = new DataTransfer();
        node.dispatchEvent(
          new DragEvent("dragstart", {
            bubbles: true,
            dataTransfer: window.__bossDrag,
          }),
        );
      });
      await page.locator("[data-boss-id=ltB]").evaluate((node) => {
        const rect = node.getBoundingClientRect();
        node.dispatchEvent(
          new DragEvent("drop", {
            bubbles: true,
            clientY: rect.bottom - 1,
            dataTransfer: window.__bossDrag,
          }),
        );
      });
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-boss-group=lieutenant] [data-boss-id]")
            ?.getAttribute("data-boss-id") === "ltB",
      );
      for (const id of ["tank", "death", "col"]) {
        await page.locator("#boss-open-" + id).click();
        await page.locator("#boss-detail-heading").waitFor();
        assert.equal(await page.locator(".boss-tag-panel").count(), 0);
        assert.equal(await page.locator(".boss-detail-counts dd").count(), 1);
        await page
          .getByRole("link", { name: "Back to boss list", exact: true })
          .click();
      }
      await context.route("**/__boss-text.css", (route) =>
        route.fulfill({
          contentType: "text/css",
          body: ":root{font-size:200%}",
        }),
      );
      await page.addStyleTag({ url: base + "/__boss-text.css" });
      await page.locator("#boss-open-ltB").evaluate((node) => {
        node.textContent = "SyntheticLongUnbrokenLieutenantName".repeat(5);
      });
      assert.equal(
        await page
          .locator("#ui-map-task")
          .evaluate((node) => node.scrollWidth > node.clientWidth + 1),
        false,
        "long labels and200%text stay within task pane",
      );
      await page.reload();
      await page.locator("#boss-list-heading").waitFor();
      assert.deepEqual(await ids("lieutenant"), ["ltB", "ltA", "ltP"]);
      assert.deepEqual(await ids("commander"), ["tank", "death", "col"]);
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      await context.close();
      console.log(
        `${name} modern boss pane counters/groups/order/details/narrow-text PASS`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
