// Real owning map/masks with explicitly synthetic source records.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  root: fileURLToPath(new URL("../", import.meta.url)),
  cacheDir: ".local/ui-category-types-vite",
  server: { host: "127.0.0.1", port: 0, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}`;
const categories = [
  {
    id: "dmz_fortress_syntheticA",
    name: "SYNTHETIC Castle A",
    group: "Fortresses",
  },
  {
    id: "dmz_fortress_syntheticB",
    name: "SYNTHETIC Castle B",
    group: "Fortresses",
  },
  { id: "key-room-a", name: "SYNTHETIC Room A", group: "Keys" },
  { id: "key-room-b", name: "SYNTHETIC Room B", group: "Keys" },
  { id: "poiLabel", name: "POI", group: "Place names" },
  { id: "poiLabelSecondary", name: "Minor POI", group: "Place names" },
  { id: "dmz_gasStation", name: "Gas Station", group: "Facilities" },
];
const read = (page) =>
  page.evaluate(async () => {
    const { openWorkspace } = await import("/src/workspace/store.ts");
    const s = await openWorkspace();
    try {
      return (await s.read()).current;
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
        egress = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await context.route("**/*", (r) => {
        if (new URL(r.request().url()).origin === base) return r.continue();
        egress.push(r.request().url());
        return r.abort();
      });
      const image = await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        c.getContext("2d").fillRect(0, 0, 128, 128);
        return c.toDataURL().split(",")[1];
      });
      await context.route("**/maps/hajin/v1/background.webp", (r) =>
        r.fulfill({
          contentType: "image/png",
          body: Buffer.from(image, "base64"),
        }),
      );
      await context.route("**/maps/hajin/official/icons/synthetic.png", (r) =>
        r.fulfill({
          contentType: "image/png",
          body: Buffer.from(image, "base64"),
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
            categories: categories.map((c) => ({
              ...c,
              icon: "/maps/hajin/official/icons/synthetic.png",
            })),
            records: categories.map((c, i) => ({
              id: `synthetic-${i}`,
              name: c.name,
              category: c.id,
              mapId: "hajin",
              coordinateSpaceVersion: "hajin-official-v1-4096",
              x: 0.15 + i * 0.09,
              y: 0.3 + i * 0.04,
            })),
          },
        }),
      );
      await page.goto(base);
      await page.locator('html[data-ui-mounted="071-v1"]').waitFor();
      await page.locator("#workspace-open:enabled").waitFor();
      await page.locator('[data-official-id="synthetic-0"]').waitFor();
      const combined = page.locator("#combined-map-categories");
      await combined.locator(":scope > summary").click();
      const rows = combined.locator("[data-combined-category]");
      assert.deepEqual(
        (
          await rows.evaluateAll((nodes) =>
            nodes.map((n) => n.dataset.combinedCategory),
          )
        ).sort(),
        ["fortress", "gas", "keys", "poi"],
      );
      const text = await combined.textContent();
      assert.ok(!text.includes("SYNTHETIC Castle"));
      assert.ok(!text.includes("SYNTHETIC Room"));
      const before = await read(page),
        fortress = combined.locator('[data-combined-category="fortress"]');
      await fortress.uncheck();
      await page
        .locator('[data-official-id="synthetic-0"]')
        .waitFor({ state: "detached" });
      await page
        .locator('[data-official-id="synthetic-1"]')
        .waitFor({ state: "detached" });
      assert.ok(
        await page.locator('[data-official-id="synthetic-2"]').isVisible(),
      );
      const source = page.locator(
        'details[data-menu-section="source-official"]',
      );
      await source.locator(":scope > summary").click();
      const forts = source
        .locator(".category-sublist")
        .filter({ has: page.locator("summary", { hasText: "Fortresses" }) });
      if (!(await forts.evaluate((n) => n.open)))
        await forts.locator(":scope > summary").click();
      assert.ok((await source.textContent()).includes("SYNTHETIC Castle A"));
      await source
        .locator('[data-key-category="dmz_fortress_syntheticA"]')
        .check();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-combined-category="fortress"]')
            ?.indeterminate === true,
      );
      await fortress.check();
      await page.locator('[data-official-id="synthetic-1"]').waitFor();
      await combined.locator('[data-combined-category="keys"]').uncheck();
      await page
        .locator('[data-official-id="synthetic-2"]')
        .waitFor({ state: "detached" });
      await page
        .locator('[data-official-id="synthetic-3"]')
        .waitFor({ state: "detached" });
      let confirmed;
      const deadline = Date.now() + 8000;
      do {
        confirmed = await read(page);
        if (
          confirmed?.data.visibility.categoryMask.official?.["key-room-a"] ===
            false &&
          confirmed?.data.visibility.categoryMask.official?.["key-room-b"] ===
            false
        )
          break;
        await new Promise((r) => setTimeout(r, 30));
      } while (Date.now() < deadline);
      assert.equal(
        confirmed?.data.visibility.categoryMask.official?.["key-room-a"],
        false,
      );
      assert.equal(
        confirmed?.data.visibility.categoryMask.official?.["key-room-b"],
        false,
      );
      await page.waitForFunction(
        (revision) =>
          Number(
            document.querySelector("#workspace-dialog")?.dataset.revision,
          ) >= revision &&
          !document.querySelector("#workspace-content")?.inert &&
          document
            .querySelector("#workspace-content")
            ?.getAttribute("aria-busy") !== "true",
        confirmed.revision,
      );
      await page.reload();
      await page.locator("#workspace-open:enabled").waitFor();
      await combined.locator(":scope > summary").click();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-combined-category="keys"]')?.checked ===
          false,
      );
      await combined.locator("#key-section-combined-show").click();
      await page.locator('[data-official-id="synthetic-3"]').waitFor();
      const after = await read(page);
      assert.deepEqual(after.data.snapshots, before?.data.snapshots ?? []);
      assert.equal(
        after.data.annotations.length,
        before?.data.annotations.length ?? 0,
      );
      assert.ok(after.revision > (before?.revision ?? 0));
      await page.waitForFunction(
        () =>
          document.querySelector("#workspace-message")?.textContent ===
          "combined categories shown",
      );
      const legacyBytes = await page.evaluate(() =>
        localStorage.getItem("hajin.source-filters.v1.official"),
      );
      await page.locator("#workspace-open").click();
      await page.locator("#workspace-tab-backup").click();
      await page.locator("#preview-mask-migration").click();
      await page.locator("#commit-mask-migration").click();
      await page.waitForFunction(
        () =>
          document.querySelector("#workspace-message")?.textContent ===
          "Legacy source masks migrated",
      );
      await page.locator("#close-workspace").click();
      await page.locator("#ui-task-view").click();
      if (!(await combined.evaluate((n) => n.open)))
        await combined.locator(":scope > summary").click();
      await combined.locator('[data-combined-category="keys"]').uncheck();
      await page.waitForFunction(
        () =>
          document.querySelector("#workspace-message")?.textContent ===
          "Combined categories saved",
      );
      const migrated = await read(page);
      assert.ok(migrated.data.migrations.includes("source-masks-v1"));
      assert.equal(
        migrated.data.visibility.categoryMask.official["key-room-a"],
        false,
      );
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("hajin.source-filters.v1.official"),
        ),
        legacyBytes,
      );
      await page.reload();
      await page.locator("#workspace-open:enabled").waitFor();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-combined-category="keys"]')?.checked ===
          false,
      );
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("hajin.source-filters.v1.official"),
        ),
        legacyBytes,
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(egress, []);
      await context.close();
      console.log(
        `${name} category types PASS: named sites/keys/locations, original source rows, mixed state, masks/reload, bulk and immutable records`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
