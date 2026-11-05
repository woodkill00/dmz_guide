// Modern display only. Synthetic terrain/captures, no owner profile or provider reads.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer as netServer } from "node:net";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
process.env.DMZ_UI_VARIANT = "modern";
const root =
  process.env.DMZ_TEST_APP_ROOT ||
  fileURLToPath(new URL("../", import.meta.url));
const probe = netServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const server = await createServer({
  root,
  cacheDir: root + `/.local/ui-theme-${process.pid}-${port}`,
  server: { host: "127.0.0.1", port, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
const base = `http://127.0.0.1:${port}`;
const marker = (id, name, category, x, y) => ({
  id,
  name,
  category,
  mapId: "hajin",
  coordinateSpaceVersion: "hajin-official-v1-4096",
  x: x / 4096,
  y: y / 4096,
  notes: "Synthetic theme fixture only.",
});
const snapshot = {
  schemaVersion: 1,
  sourcePage: "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
  capturedAt: "2026-11-05T00:00:00Z",
  categories: [
    {
      id: "safe",
      name: "Safes",
      group: "Synthetic",
      icon: "/maps/hajin/official/icons/safe.png",
    },
    {
      id: "spawn",
      name: "Spawn Point",
      group: "Synthetic",
      icon: "/maps/hajin/official/icons/spawn.png",
    },
  ],
  records: [
    marker("safe-a", "SYNTHETIC Safe", "safe", 2048, 2048),
    marker("spawn-a", "SYNTHETIC Spawn", "spawn", 1200, 1200),
  ],
};
async function setTheme(page, theme) {
  await page
    .locator("#theme-toggle[aria-label]")
    .waitFor({ state: "attached" });
  if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
    const button = page.locator("#theme-toggle"),
      details = button.locator("xpath=ancestor::details[1]");
    if (
      (await details.count()) &&
      !(await details.evaluate((node) => node.open))
    )
      await details.locator(":scope > summary").click();
    await button.click();
    await page.waitForFunction(
      (theme) => document.documentElement.dataset.theme === theme,
      theme,
    );
    if (
      (await details.count()) &&
      (await details.evaluate((node) => node.open))
    )
      await details.locator(":scope > summary").click();
  }
}
async function hit(page, selector) {
  const control = page.locator(selector);
  await control.scrollIntoViewIfNeeded();
  const result = await control.evaluate((node) => {
    const rect = node.getBoundingClientRect(),
      hit = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
    return {
      width: rect.width,
      height: rect.height,
      font: parseFloat(getComputedStyle(node).fontSize),
      visible: hit === node || node.contains(hit),
    };
  });
  assert.ok(
    result.width >= 43.99 &&
      result.height >= 43.99 &&
      result.font >= 14 &&
      result.visible,
    JSON.stringify({ selector, result }),
  );
}
async function camera(page, surface) {
  if (surface === "help") return null;
  return page.evaluate(async (surface) => {
    const module = await import(
      surface === "safe" ? "/src/safe-run/app.ts" : "/src/main.ts"
    );
    assert:;
    const map = module.viewer?.map;
    if (!map) throw new Error("Exact camera API unavailable for " + surface);
    return { center: map.getCenter(), zoom: map.getZoom() };
  }, surface);
}
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      for (const surface of ["map", "safe", "help"]) {
        for (const [width, zoom] of [
          [1440, 100],
          [320, 100],
          [1440, 200],
          [320, 200],
        ]) {
          const context = await browser.newContext({
              viewport: { width, height: 900 },
            }),
            page = await context.newPage(),
            errors = [],
            external = [];
          page.on("pageerror", (error) => errors.push(error.message));
          const image = Buffer.from(
            await page.evaluate(() => {
              const c = document.createElement("canvas");
              c.width = c.height = 128;
              c.getContext("2d").fillRect(0, 0, 128, 128);
              return c.toDataURL().split(",")[1];
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
              return route.fulfill({ json: snapshot });
            if (url.pathname.startsWith("/maps/"))
              return url.pathname.endsWith(".json")
                ? route.fulfill({
                    status: 404,
                    body: "Synthetic unavailable source",
                  })
                : route.fulfill({ body: image, contentType: "image/png" });
            return route.continue();
          });
          await context.route("**/__theme-text.css", (route) =>
            route.fulfill({
              contentType: "text/css",
              body: ":root{font-size:200% !important}",
            }),
          );
          await page.goto(
            base +
              (surface === "map"
                ? "/?tool=points"
                : surface === "safe"
                  ? "/safes.html"
                  : "/help.html"),
          );
          await page.locator('html[data-ui-variant="modern"]').waitFor();
          if (surface === "map") {
            await page.locator("#point-title:enabled").waitFor();
          }
          if (surface === "safe") {
            await page.locator("#safe-settings:not([disabled])").waitFor();
          }
          if (zoom === 200)
            await page.addStyleTag({ url: base + "/__theme-text.css" });
          for (const theme of ["light", "dark"]) {
            const before = await camera(page, surface);
            await setTheme(page, theme);
            const report = await new AxeBuilder({ page })
              .withRules([
                "color-contrast",
                "landmark-one-main",
                "landmark-unique",
                "landmark-no-duplicate-banner",
                "region",
              ])
              .analyze();
            assert.deepEqual(
              report.violations.map((v) => ({
                id: v.id,
                nodes: v.nodes
                  .slice(0, 8)
                  .map((n) => ({
                    target: n.target,
                    summary: n.failureSummary,
                  })),
              })),
              [],
              JSON.stringify({ name, surface, width, zoom, theme }),
            );
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth + 1,
              ),
              false,
              JSON.stringify({ name, surface, width, zoom, theme }),
            );
            if (surface === "map") await hit(page, "#point-title");
            if (surface === "safe") await hit(page, "#start-x");
            if (surface !== "help")
              assert.deepEqual(
                await camera(page, surface),
                before,
                JSON.stringify({
                  name,
                  surface,
                  width,
                  zoom,
                  theme,
                  camera: "theme switch",
                }),
              );
          }
          assert.deepEqual(errors, []);
          assert.deepEqual(external, []);
          await context.close();
        }
      }
      console.log(
        `${name} modern Map/Safe/Help light/dark contrast/landmarks/hit-targets/text200/camera PASS`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
