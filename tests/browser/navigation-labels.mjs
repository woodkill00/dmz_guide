import { chromium, firefox, webkit } from "playwright";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { serviceOrigin } from "../../src/domain/local-services.mjs";
const base =
  process.env.DMZ_SITE_URL || serviceOrigin("guide", "http://127.0.0.1");
let audited = 0;
async function audit(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = folder + "/" + entry.name;
    if (entry.isDirectory()) await audit(path);
    else if (entry.name.endsWith(".html")) {
      const text = await readFile(path, "utf8"),
        nav = text.match(/<nav class="site-nav[\s\S]*?<\/nav>/)?.[0];
      if (nav) {
        assert.ok(!nav.includes(">Prepare</a>"), path);
        assert.ok(
          !nav.includes('data-navigation-group="Track" aria-label="Track"'),
          path,
        );
        assert.ok(nav.includes('data-feature-id="planner"'));
        audited++;
      }
    }
  }
}
await audit("dist");
await audit(".local/unified-map");
console.log(`${audited} generated guide/map navigation blocks audited`);
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    await page.goto(base + "/");
    const track = page.locator('.site-nav [data-feature-id="planner"]').first();
    assert.equal(await track.textContent(), "Track");
    await track.click();
    await page.waitForURL((u) => u.pathname === "/planner/");
    await page.locator(".site-nav > .nav-more > summary").click();
    const progression = page.locator('[data-navigation-group="Track"]');
    await progression.locator(".nav-orders-group").waitFor();
    assert.equal(await progression.getAttribute("aria-label"), "Progression");
    assert.equal(
      await page
        .locator('[data-navigation-group="Prepare"] .nav-orders-group')
        .count(),
      0,
    );
    await progression.locator(".nav-orders-pages > summary").first().click();
    await progression.locator('[data-orders-hash="#hajin-page-1"]').click();
    await page.waitForURL(
      (u) => u.pathname === "/missions/" && u.hash === "#hajin-page-1",
    );
    await page.goto(base + "/features/#prepare");
    assert.equal(await page.locator("#prepare > h2").textContent(), "Track");
    assert.equal(
      await page.locator("#track > h2").textContent(),
      "Progression",
    );
    const result = await page.evaluate(async () => {
      const { renderMainNavigation } = await import(
        "/assets/src/ui/site-navigation.mjs"
      );
      const { navigationConfig } = await import(
        "/assets/src/ui/navigation-config.mjs"
      );
      const { setupNavigationMenu } = await import(
        "/assets/src/client/navigation-menu.mjs"
      );
      const oldConfig = structuredClone(navigationConfig);
      oldConfig.primary.find((row) => row.id === "planner").label = "Prepare";
      oldConfig.groups.find((row) => row.key === "Prepare").label = "Prepare";
      oldConfig.groups.find((row) => row.key === "Track").label = "Track";
      const legacy = new DOMParser().parseFromString(
        renderMainNavigation({ page: "features", navigation: oldConfig }),
        "text/html",
      );
      for (const group of legacy.querySelectorAll("[data-navigation-group]"))
        group.removeAttribute("data-navigation-group");
      setupNavigationMenu(legacy);
      if (
        legacy.querySelector('[data-feature-id="planner"]').textContent !==
          "Track" ||
        legacy
          .querySelector('[data-navigation-group="Track"]')
          .getAttribute("aria-label") !== "Progression"
      )
        throw Error("Legacy HTML label migration failed");
      legacy.querySelector(".nav-more").open = true;
      await new Promise((resolve) => setTimeout(resolve, 20));
      if (
        !legacy.querySelector(
          '[data-navigation-group="Track"] .nav-orders-group',
        )
      )
        throw Error("Legacy Orders placement failed");
      const edited = structuredClone(navigationConfig);
      edited.primary.forEach((row, n) => (row.label = `Link ${n}`));
      edited.groups.forEach((row, n) => (row.label = `Section ${n}`));
      edited.hubs.forEach((row, n) => (row.label = `Hub ${n}`));
      const parsed = new DOMParser().parseFromString(
        renderMainNavigation({ page: "features" }),
        "text/html",
      );
      const before = [...parsed.querySelectorAll("a")].map((a) =>
        a.getAttribute("href"),
      );
      document.querySelector(".site-nav").outerHTML = renderMainNavigation({
        page: "features",
        navigation: edited,
      });
      setupNavigationMenu(document, edited);
      const after = [...document.querySelectorAll(".site-nav a")].map((a) =>
        a.getAttribute("href"),
      );
      return { before, after };
    });
    assert.deepEqual(result.before, result.after);
    await page.locator(".site-nav > .nav-more > summary").click();
    await page
      .locator('[data-navigation-group="Track"] .nav-orders-group')
      .waitFor();
    await page.goto(base + "/map/");
    await page.locator(".site-nav").waitFor();
    assert.equal(
      await page.locator('.site-nav [data-feature-id="planner"]').textContent(),
      "Track",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/");
    await page.locator(".site-nav > .nav-more > summary").click();
    await page
      .locator('[data-navigation-group="Track"] .nav-orders-group')
      .waitFor();
    await page.screenshot({ path: `test-results/097-${name}-mobile.png` });
    console.log(
      `${name}: Track destination, Progression/Orders, old anchors, renamed-label invariant hrefs/insertion, map and mobile PASS`,
    );
  } finally {
    await browser.close();
  }
}
