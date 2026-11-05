import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { startOwnedServer } from "../../scripts/server-readiness.mjs";
const server = await startOwnedServer({
  cwd: process.env.DMZ_TEST_GUIDE_ROOT || process.cwd(),
});
const fixture = (variant) =>
  `<!doctype html><html data-ui-variant="${variant}"><head><title>Synthetic catalog</title><link rel="stylesheet" href="/assets/src/styles.css"></head><body><main><h1>Synthetic public records</h1><form id="catalog-filters" data-default-pack=""><label>Search<input id="catalog-search" maxlength="200"></label><label>Type<select name="type"><option value="">All</option><option value="item">Items</option><option value="recipe">Recipes</option></select></label><label>Pack<select name="pack"><option value="">All</option><option value="a">A</option><option value="b">B</option></select></label><label>Sort<select id="catalog-sort"><option value="name">Name</option><option value="status">Evidence</option></select></label><button>Search</button><a id="clear-filters" href="?">Clear</a></form><p id="catalog-count" role="status">125 records</p><p id="catalog-empty" hidden>No matches</p>${[
    "a",
    "b",
  ]
    .map(
      (pack, index) =>
        `<section data-catalog-section><h2>Catalog ${pack}</h2><div class="item-directory">${Array.from(
          { length: index ? 60 : 65 },
          (_, i) => {
            const n = index ? i + 65 : i;
            return `<article data-record-card data-name="record ${String(n).padStart(3, "0")}" data-status="${n % 2 ? "reported" : "unknown"}" data-search="record ${n} ${n % 2 ? "odd" : "even"}" data-type="${n % 2 ? "recipe" : "item"}" data-pack="${pack}"><h3><a href="/__record/${n}/">Record ${String(n).padStart(3, "0")}</a></h3><p>Unknown is not zero.</p></article>`;
          },
        ).join("")}</div></section>`,
    )
    .join(
      "",
    )}<script type="module" src="/assets/src/client/catalog.mjs"></script></main></body></html>`;
let failure;
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext(),
        page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await context.route("**/__catalog-pagination*", (route) =>
        route.fulfill({ contentType: "text/html", body: fixture("modern") }),
      );
      await context.route("**/__record/*/", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: "<h1>Synthetic native detail</h1>",
        }),
      );
      if (process.env.DMZ_TEST_CATALOG_SOURCE)
        await context.route("**/assets/src/client/catalog.mjs", async (route) =>
          route.fulfill({
            contentType: "text/javascript",
            body: await readFile(process.env.DMZ_TEST_CATALOG_SOURCE, "utf8"),
          }),
        );
      await page.goto(server.base + "/__catalog-pagination");
      await page.locator("#catalog-pagination").waitFor();
      assert.equal(await page.locator("[data-record-card]").count(), 50);
      await page
        .locator("[data-record-card]")
        .first()
        .evaluate((node) => {
          window.__firstRow = node;
          node
            .querySelector("a")
            .addEventListener(
              "click",
              () => (window.__nativeClicks = (window.__nativeClicks ?? 0) + 1),
            );
        });
      await page
        .getByLabel("Rows per page", { exact: true })
        .selectOption("25");
      assert.equal(await page.locator("[data-record-card]").count(), 25);
      assert.equal(
        await page.evaluate(
          () =>
            document.querySelector("[data-record-card]") === window.__firstRow,
        ),
        true,
      );
      await page
        .getByLabel("Rows per page", { exact: true })
        .selectOption("100");
      assert.equal(await page.locator("[data-record-card]").count(), 100);
      await page
        .getByRole("button", { name: "Next page", exact: true })
        .click();
      assert.equal(await page.locator("[data-record-card]").count(), 25);
      assert.match(
        await page.locator("#catalog-count").textContent(),
        /125 matching/,
      );
      await page.locator("#catalog-search").fill("record 124");
      assert.equal(await page.locator("[data-record-card]").count(), 1);
      await page.locator("#catalog-search").fill("");
      assert.equal(await page.locator("[data-record-card]").count(), 100);
      await page.locator("[name=pack]").selectOption("b");
      assert.equal(await page.locator("[data-record-card]").count(), 60);
      await page.locator("[name=pack]").selectOption("");
      await page.locator("#catalog-sort").selectOption("status");
      assert.equal(await page.locator("[data-record-card]").count(), 100);
      await page.locator("#catalog-sort").selectOption("name");
      await page
        .getByLabel("Rows per page", { exact: true })
        .selectOption("50");
      await page
        .getByRole("button", { name: "Next page", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Next page", exact: true })
        .click();
      const link = page.locator('a[href="/__record/124/"]');
      await page.locator("#catalog-search").focus();
      await link.click();
      await page
        .getByRole("heading", { name: "Synthetic native detail" })
        .waitFor();
      await page.goBack();
      await page.locator("#catalog-pagination").waitFor();
      assert.match(
        await page.locator("#catalog-page-status").textContent(),
        /3/,
      );
      assert.equal(await page.locator('a[href="/__record/124/"]').count(), 1);
      assert.equal(await page.locator("[data-record-card]").count(), 25);
      await page.locator("#clear-filters").click();
      await page.locator("#catalog-pagination").waitFor();
      assert.equal(await page.locator("[data-record-card]").count(), 50);
      assert.deepEqual(errors, []);
      await context.close();
      const nojs = await browser.newContext({ javaScriptEnabled: false });
      await nojs.route("**/__catalog-pagination*", (r) =>
        r.fulfill({ contentType: "text/html", body: fixture("modern") }),
      );
      const plain = await nojs.newPage();
      await plain.goto(server.base + "/__catalog-pagination");
      assert.equal(
        await plain.locator("[data-record-card] a[href]").count(),
        125,
      );
      assert.equal(await plain.locator("#catalog-pagination").count(), 0);
      await nojs.close();
      const actual = await browser.newContext(),
        p = await actual.newPage();
      if (process.env.DMZ_TEST_CATALOG_SOURCE)
        await actual.route("**/assets/src/client/catalog.mjs", async (r) =>
          r.fulfill({
            contentType: "text/javascript",
            body: await readFile(process.env.DMZ_TEST_CATALOG_SOURCE, "utf8"),
          }),
        );
      await p.goto(server.base + "/catalog/");
      assert.equal(
        await p.locator("html").getAttribute("data-ui-variant"),
        "modern",
      );
      await p.locator("#catalog-pagination").waitFor();
      await p.locator("[name=pack]").selectOption("");
      const urls = new Set();
      do {
        for (const href of await p
          .locator("[data-record-card] h3 a")
          .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href"))))
          urls.add(href);
        const next = p.getByRole("button", { name: "Next page", exact: true });
        if (await next.isDisabled()) break;
        await next.click();
      } while (true);
      const raw = await (
        await actual.request.get(server.base + "/catalog/")
      ).text();
      const expected = [...raw.matchAll(/<h3><a href="([^"]+)"/g)].map(
        (match) => match[1],
      );
      assert.deepEqual(
        [...urls].sort(),
        [...new Set(expected)].sort(),
        "every original public detail URL remains reachable across pages",
      );
      await actual.close();
      console.log(
        `${name} catalog125/25/50/100/filter/sort/nativeBack/noJS/all-builtURLs PASS`,
      );
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
