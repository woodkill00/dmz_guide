import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173",
  tag = process.env.UI_SWEEP_TAG || "verified";
const browser = await chromium.launch(),
  results = [];
const routes = [
  "/",
  "/inventory/?pack=official%3Amw4-dmz-starter",
  "/track/items/?pack=official%3Amw4-dmz-starter",
  "/needed/?pack=official%3Amw4-dmz-starter",
  "/quick-collect/?pack=official%3Amw4-dmz-starter",
  "/upgrades/?pack=official%3Amw4-dmz-starter",
  "/missions/?pack=official%3Amw4-dmz-starter",
  "/armory/",
  "/keys/",
  "/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Abandage",
  "/settings/",
  "/missions/audit/",
  "/quality/",
  "/help/",
  "/sitemap/",
  "/map/",
  "/map/x01/",
  "/map/safes/",
  "/map/loot/",
];
try {
  const context = await browser.newContext();
  const p = await context.newPage();
  await p.goto(base + "/");
  await p.waitForSelector('[data-weapon-save-state="ready"]');
  await p.evaluate(async () => {
    const { newProfile } = await import("/assets/src/domain/profile.mjs");
    const { saveProfile } = await import("/assets/src/storage/store.mjs");
    const pack = await (
      await fetch("/assets/content/packs/official-starter.json")
    ).json();
    const profile = newProfile(pack);
    profile.inventory = {
      "mw4:bandage": 7,
      "mw4:ingredient-detonators": 3,
      "mw4:synthetics": 123,
    };
    profile.buildTargets = { "mw4:bandage": 2 };
    await saveProfile(profile, 0);
  });
  for (const width of [390, 1440]) {
    await p.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      const started = performance.now(),
        response = await p.goto(base + route);
      await p
        .waitForLoadState("networkidle", { timeout: 5000 })
        .catch(() => {});
      if (await p.locator('main[aria-busy="true"]').count())
        await p.waitForSelector('main[aria-busy="false"]', { timeout: 10000 });
      if (route === "/map/") {
        await p.waitForSelector("#map-status[hidden]", {
          state: "attached",
          timeout: 60000,
        });
        assert(
          await p.locator(".leaflet-marker-icon").count(),
          "Populated map markers required",
        );
      }
      const metrics = await p.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        nodes: document.querySelectorAll("*").length,
        visibleControls: [
          ...document.querySelectorAll("button,input,select,summary"),
        ].filter(
          (n) =>
            n.getClientRects().length &&
            getComputedStyle(n).visibility !== "hidden",
        ).length,
        title: document.title,
      }));
      results.push({
        route,
        width,
        status: response.status(),
        settleMs: Math.round(performance.now() - started),
        ...metrics,
      });
      assert.equal(response.status(), 200, route);
      assert(metrics.documentWidth <= width + 1, route + " overflow");
      if (
        [
          "/",
          "/inventory/?pack=official%3Amw4-dmz-starter",
          "/missions/?pack=official%3Amw4-dmz-starter",
          "/map/",
        ].includes(route)
      )
        await p.screenshot({
          path:
            "test-results/109-" +
            tag +
            "-" +
            (route === "/" ? "home" : route.split("/")[1]) +
            "-" +
            width +
            ".png",
          fullPage: false,
        });
    }
  }
} finally {
  await browser.close();
}
await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/109-" + tag + "-sweep.json",
  JSON.stringify(
    {
      scope: "Isolated synthetic profile; Chromium settled family baselines",
      base,
      results,
    },
    null,
    2,
  ),
);
console.log(tag + ": " + results.length + " route/viewport cases PASS");
