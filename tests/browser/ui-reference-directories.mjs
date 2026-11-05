import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";
import { fixtureCatalog } from "../helpers/catalog.mjs";
import { renderCatalog } from "../../src/ui/render.mjs";
// Synthetic rendering probe: public evidence must use the same spoiler masking
// as identities and approved search text, even when a source title contains it.
const previousVariant = process.env.DMZ_UI_VARIANT;
try {
  process.env.DMZ_UI_VARIANT = "modern";
  const pack = structuredClone(
    fixtureCatalog.entries
      .map((entry) => entry.pack)
      .find((pack) => pack.guides.some((guide) => guide.spoiler)),
  );
  const secret = pack.guides.find((guide) => guide.spoiler).title;
  pack.sources[0].title = secret;
  const recipe = pack.recipes.find(
    (recipe) => !recipe.spoiler && recipe.inputs.length,
  );
  recipe.sourceIds = [pack.sources[0].id];
  recipe.inputs[0].consumption = "unknown";
  delete recipe.inputs[0].consumed;
  const html = renderCatalog([pack]);
  assert.equal(
    html.includes(secret),
    false,
    "new reference facts never expose protected source titles",
  );
  assert.match(html, /Consumption unknown/);
  assert.match(html, /data-ui-directory-pagination="false"/);
} finally {
  if (previousVariant === undefined) delete process.env.DMZ_UI_VARIANT;
  else process.env.DMZ_UI_VARIANT = previousVariant;
}
const server = await startBrowserServer();
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    const health = monitorBrowser(browser);
    try {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const page = await context.newPage();
      for (const path of ["catalog", "items", "recipes", "guides", "weapons"]) {
        await page.goto(`${server.base}/${path}/`);
        assert.equal(
          await page.locator("html").getAttribute("data-ui-variant"),
          "modern",
        );
        const directories = page.locator(
          "[data-catalog-section][data-ui-directory]",
        );
        assert.ok(
          await directories.count(),
          `${path} explicitly opts into modern directory presentation`,
        );
        assert.equal(
          await directories.locator("[data-ui-directory-rows]").count(),
          0,
          "catalog controller retains all searchable nodes",
        );
        const count = await page.locator("[data-record-card]").count();
        assert.ok(count > 0);
        await page.locator("#catalog-pack").selectOption("");
        const first = page.locator("[data-record-card]:visible").first();
        const identity = await first.locator("h3 a").getAttribute("href");
        await first.evaluate((node) => {
          window.__referenceIdentity = node;
        });
        await page
          .locator("#catalog-search")
          .fill("impossible synthetic no-match sentinel");
        assert.equal(
          await page.locator("[data-record-card]:visible").count(),
          0,
        );
        await page.locator("#catalog-search").fill("");
        assert.equal(await page.locator("[data-record-card]").count(), count);
        assert.equal(
          await page.evaluate(() =>
            document.contains(window.__referenceIdentity),
          ),
          true,
        );
        assert.ok(
          await page
            .locator(`[data-record-card] h3 a[href='${identity}']`)
            .count(),
        );
        assert.ok(
          await page.locator("[data-reference-facts]").count(),
          `${path} keeps reference facts in flow`,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
        );
      }
      await page.goto(`${server.base}/recipes/?pack=demo%3Atraining-pack`);
      await context.route("**/__reference-text-zoom.css", (route) =>
        route.fulfill({
          contentType: "text/css",
          body: ":root{font-size:200%}",
        }),
      );
      await page.addStyleTag({
        url: `${server.base}/__reference-text-zoom.css`,
      });
      await page.setViewportSize({ width: 320, height: 640 });
      const expandedRecipe = page.locator("[data-record-card]:visible").first();
      await expandedRecipe
        .locator("[data-reference-facts]")
        .evaluate((node) => {
          node.open = true;
        });
      await expandedRecipe.locator("h3 a").evaluate((node) => {
        node.textContent = "SyntheticVeryLongUnbrokenReferenceIdentity".repeat(
          5,
        );
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        "expanded recipe and long identity wrap at 320px and 200% text",
      );
      const recipes = await page
        .locator("[data-reference-facts]")
        .allTextContents();
      assert.ok(
        recipes.some((text) => text.includes("Requirement completeness")),
      );
      assert.ok(
        recipes.some(
          (text) =>
            text.includes("Consumed material") ||
            text.includes("Retained tool"),
        ),
      );
      for (const hub of ["dmz-guide", "dmz-fob", "dmz-weapons"]) {
        await page.goto(`${server.base}/${hub}/`);
        assert.equal(
          await page.locator("main > p > a[href='/dmz-guide/']").count(),
          0,
          "hub shortcuts do not duplicate modern navigation",
        );
        assert.ok(await page.locator("main [data-feature-id]").count());
      }
      await page.goto(`${server.base}/sitemap/`);
      await page.locator("#home-mindmap-app:not([hidden])").waitFor();
      assert.ok(await page.locator("#mindmap-notes a[href]").count());
      assert.equal(await page.locator("#topology-root").count(), 1);
      const external = page.locator("main a[href='http://127.0.0.1:4174/']");
      assert.equal(await external.getAttribute("target"), "_blank");
      await context.close();
      const native = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 320, height: 640 },
      });
      const plain = await native.newPage();
      await plain.goto(`${server.base}/recipes/`);
      assert.ok(await plain.locator("[data-record-card] h3 a[href]").count());
      assert.equal(
        await plain.locator("[data-ui-directory-pagination-controls]").count(),
        0,
      );
      await plain.goto(`${server.base}/sitemap/`);
      assert.ok(await plain.locator(".sitemap-links a[href]").count());
      assert.match(
        await plain.locator("main").innerText(),
        /complete clickable page directory|complete readable page directory/,
      );
      await native.close();
      health();
      server.assertAlive();
      console.log(`${name} modern reference/hub/topology/native-reading PASS`);
    } finally {
      await browser.close();
    }
  }
} catch (error) {
  failure = error;
  throw error;
} finally {
  await server.stop(failure);
}
