import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { features, featureURL } from "../../src/ui/feature-registry.mjs";
import { monitorBrowser } from "./health.mjs";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch(),
  health = monitorBrowser(browser),
  results = [];
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  for (const feature of features) {
    const url = new URL(featureURL(feature), base);
    assert.equal(
      url.origin,
      new URL(base).origin,
      "Registry entry left owned local origin",
    );
    if (feature.kind === "studio") {
      const response = await fetch(url, { redirect: "manual" });
      assert.equal(response.status, 302);
      const target = new URL(response.headers.get("location"));
      assert(["localhost", "127.0.0.1"].includes(target.hostname));
      assert.equal(target.protocol, "http:");
      results.push({
        id: feature.id,
        href: url.pathname + url.search,
        outcome: "capability-gated",
        reason:
          "Separate owner service redirect validated; real service shell tested in disposable repository",
      });
      continue;
    }
    const before = new URL(page.url().startsWith("http") ? page.url() : base);
    const response = await page.goto(url.href);
    if (response) assert.equal(response.status(), 200, feature.id);
    else
      assert.equal(
        url.pathname + url.search,
        before.pathname + before.search,
        "Only native fragment navigation may omit an HTTP response",
      );
    await page.waitForSelector("body");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    if (await page.locator('main[aria-busy="true"]').count())
      await page.waitForSelector('main[aria-busy="false"]');
    const state = await page.evaluate(() => ({
      title: document.title,
      page: document.body.dataset.page || null,
      heading: document.querySelector("h1")?.textContent.trim() || null,
      hasNavigation: !!document.querySelector(".site-nav"),
      bodyLength: document.body.textContent.trim().length,
      capabilityStatus: !!document.querySelector(
        "[data-local-service-status],.local-service-page",
      ),
    }));
    assert(state.bodyLength > 100, feature.id + " empty content");
    results.push({
      id: feature.id,
      kind: feature.kind,
      href: featureURL(feature),
      resolved: page.url(),
      ...state,
      outcome: "entry-rendered",
      scope:
        "Readiness/navigation only; behavioral owner suites recorded separately",
    });
  }
  health();
  assert.equal(results.length, features.length);
  await writeFile(
    "test-results/109-feature-readiness.json",
    JSON.stringify(
      { engine: browser.version(), viewport: [1440, 1000], base, results },
      null,
      2,
    ),
  );
  console.log(
    results.length +
      " registry entries checked with browser health; separate owner-service handoffs are capability-gated, not rendered-page passes",
  );
} finally {
  await browser.close();
}
