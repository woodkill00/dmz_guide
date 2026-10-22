import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { measuredFixture } from "./measured-scale.mjs";
import { captureDocumentEvidence } from "./page-edit.mjs";

// Isolated visual acceptance, not part of the timed measurement samples.
// The caller retains the shared strict browser-health monitor.
export async function runInventoryPaginationLayout(
  browser,
  base,
  prefix,
  { captureScreenshots = prefix !== "webkit" } = {},
) {
  const fixture = measuredFixture(101);
  const selectedPath = "/assets/content/packs/demo-training.json";
  const context = await browser.newContext();
  let payloadRequests = 0;
  await context.route("**/assets/content/manifest.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        packs: [selectedPath],
        catalogs: [
          {
            id: fixture.pack.id,
            title: fixture.pack.title,
            path: selectedPath,
          },
        ],
      }),
    }),
  );
  await context.route(`**${selectedPath}`, (route) => {
    payloadRequests++;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: fixture.body,
    });
  });
  const page = await context.newPage();
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  page.on("requestfailed", (request) =>
    failures.push(`Request ${request.url()}: ${request.failure()?.errorText}`),
  );
  const field = (id, kind = "inventory") =>
    page.locator(`[data-field="${kind}"][data-id="demo:scale-item-${id}"]`);
  const keyboardPage = async (selector, expected) => {
    await page.locator(selector).focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page.locator("#inventory-page-status").textContent(),
      expected,
    );
    assert(
      await page
        .locator(selector)
        .evaluate((node) => node === document.activeElement),
    );
  };
  const middle = "Items 51–100 of 101 matches. Page 2 of 3.";
  const first = "Items 1–50 of 101 matches. Page 1 of 3.";
  const last = "Items 101–101 of 101 matches. Page 3 of 3.";
  let style;
  try {
    await mkdir("test-results", { recursive: true });
    await page.goto(`${base}/inventory/?pack=demo%3Atraining-pack`);
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    await field(0).fill("0003");
    await field(0, "reserves").fill("4");
    await keyboardPage("#inventory-next", middle);
    await field(75).fill("");
    await field(75, "reserves").fill("0005");
    const controls = await page.evaluateHandle(() =>
      [
        "#inventory-query",
        "#inventory-view",
        "#inventory-previous",
        "#inventory-next",
        "#inventory-page-status",
      ].map((selector) => ({
        selector,
        node: document.querySelector(selector),
      })),
    );
    const baselineFont = await page
      .locator("body")
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    const css = new URL("/__inventory-pagination-text200.css", base).href;
    await page.route(css, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/css",
        body: ":root{font-size:200%}",
      }),
    );
    for (const theme of ["dark", "light"]) {
      if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
        await page.locator("#theme-toggle").focus();
        assert(
          await page
            .locator("#theme-toggle")
            .evaluate((node) => node === document.activeElement),
        );
        await page.keyboard.press("Enter");
      }
      await page.waitForFunction(
        (theme) => document.documentElement.dataset.theme === theme,
        theme,
      );
      const nextTheme = theme === "dark" ? "Light mode" : "Dark mode";
      assert.equal(
        await page.locator("#theme-toggle").textContent(),
        nextTheme,
      );
      assert.equal(
        await page.locator("#theme-toggle").getAttribute("aria-label"),
        `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      );
      for (const enlarged of [false, true]) {
        if (enlarged) style = await page.addStyleTag({ url: css });
        for (const width of [320, 390, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          await keyboardPage("#inventory-previous", first);
          assert.equal(await field(0).inputValue(), "0003");
          assert.equal(await field(0, "reserves").inputValue(), "4");
          if (width === 320) {
            if (captureScreenshots)
              await page.locator("#inventory-pagination").screenshot({
                path: `test-results/${prefix}-inventory-pager-${theme}-${enlarged ? "200" : "normal"}-first.png`,
              });
            assert.equal(
              await page
                .locator("#inventory-previous")
                .getAttribute("aria-disabled"),
              "true",
            );
            await keyboardPage("#inventory-previous", first);
          }
          await keyboardPage("#inventory-next", middle);
          assert.equal(await field(75).inputValue(), "");
          assert.equal(await field(75, "reserves").inputValue(), "0005");
          if (width === 320) {
            await keyboardPage("#inventory-next", last);
            if (captureScreenshots)
              await page.locator("#inventory-pagination").screenshot({
                path: `test-results/${prefix}-inventory-pager-${theme}-${enlarged ? "200" : "normal"}-last.png`,
              });
            assert.equal(
              await page
                .locator("#inventory-next")
                .getAttribute("aria-disabled"),
              "true",
            );
            await keyboardPage("#inventory-next", last);
            await keyboardPage("#inventory-previous", middle);
          }
          const retainedControls = await controls.evaluate((entries) =>
            entries.every(
              ({ selector, node }) => document.querySelector(selector) === node,
            ),
          );
          const geometry = await page.evaluate(() => {
            const rect = (node) => {
              const r = node.getBoundingClientRect();
              return {
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
                right: r.right,
              };
            };
            return {
              viewport: innerWidth,
              documentWidth: document.documentElement.scrollWidth,
              fontSize: parseFloat(getComputedStyle(document.body).fontSize),
              rows: document.querySelectorAll("[data-inventory-item]").length,
              status: document.querySelector("#inventory-page-status")
                .textContent,
              count: document.querySelector("#inventory-count").textContent,
              query: document.querySelector("#inventory-query").value,
              view: document.querySelector("#inventory-view").value,
              controls: [
                "#inventory-query",
                "#inventory-view",
                "#inventory-previous",
                "#inventory-next",
                "#inventory-page-status",
                '[data-field="inventory"][data-id="demo:scale-item-75"]',
                '[data-field="reserves"][data-id="demo:scale-item-75"]',
              ].map((selector) => ({
                selector,
                ...rect(document.querySelector(selector)),
              })),
            };
          });
          const dirty = await page.evaluate(async () =>
            (await import("/assets/src/client/common.mjs")).hasUnsavedDraft(),
          );
          const path = `test-results/${prefix}-inventory-pagination-${width}-${theme}-${enlarged ? "200" : "normal"}`;
          await writeFile(
            `${path}.json`,
            JSON.stringify(
              { theme, enlarged, retainedControls, dirty, geometry },
              null,
              2,
            ),
          );
          if (captureScreenshots)
            await captureDocumentEvidence(page, `${path}.png`);
          assert(retainedControls, "Paging keeps stable filter/pager controls");
          assert(
            dirty,
            "Viewport/theme/page changes do not checkpoint unsaved raw quantities",
          );
          assert.equal(geometry.rows, 50);
          assert.equal(geometry.status, middle);
          assert.equal(geometry.count, "101 of 101 items match.");
          assert.equal(geometry.query, "");
          assert.equal(geometry.view, "all");
          assert.equal(geometry.fontSize, baselineFont * (enlarged ? 2 : 1));
          assert(geometry.documentWidth <= width + 1, JSON.stringify(geometry));
          for (const control of geometry.controls) {
            assert(
              control.width > 0 &&
                control.height > 0 &&
                control.x >= -1 &&
                control.right <= width + 1,
              JSON.stringify(control),
            );
            if (
              ["#inventory-previous", "#inventory-next"].includes(
                control.selector,
              )
            )
              assert(
                control.width >= 44 && control.height >= 44,
                "Pager retains a 44px target",
              );
          }
          assert.equal(await field(75).inputValue(), "");
          assert.equal(await field(75, "reserves").inputValue(), "0005");
          if (width === 320) {
            await page.fill(
              "#inventory-query",
              "no matching fictional quantity",
            );
            const empty = "Items 0–0 of 0 matches. Page 1 of 1.";
            const emptyGeometry = await page
              .locator("#inventory-pagination")
              .evaluate((node) => {
                const r = node.getBoundingClientRect();
                return {
                  x: r.x,
                  right: r.right,
                  width: r.width,
                  documentWidth: document.documentElement.scrollWidth,
                };
              });
            await writeFile(
              `${path}-empty.json`,
              JSON.stringify(emptyGeometry, null, 2),
            );
            if (captureScreenshots)
              await captureDocumentEvidence(page, `${path}-empty.png`);
            assert.equal(
              await page.locator("#inventory-page-status").textContent(),
              empty,
            );
            assert.equal(
              await page.locator("#inventory-count").textContent(),
              "0 of 101 items match.",
            );
            assert.equal(
              await page.locator("[data-inventory-item]").count(),
              0,
            );
            assert(
              emptyGeometry.x >= -1 &&
                emptyGeometry.right <= width + 1 &&
                emptyGeometry.documentWidth <= width + 1,
            );
            for (const selector of ["#inventory-previous", "#inventory-next"]) {
              assert.equal(
                await page.locator(selector).getAttribute("aria-disabled"),
                "true",
              );
              await keyboardPage(selector, empty);
            }
            await page.fill("#inventory-query", "");
            assert.equal(await field(0).inputValue(), "0003");
            await keyboardPage("#inventory-next", middle);
            assert.equal(await field(75).inputValue(), "");
            assert.equal(await field(75, "reserves").inputValue(), "0005");
          }
          assert.equal(
            payloadRequests,
            1,
            "Paging and responsive changes do not refetch the selected catalog",
          );
        }
        if (style) {
          await style.evaluate((node) => node.remove());
          style = undefined;
        }
      }
    }
    await controls.dispose();
    assert.deepEqual(
      failures,
      [],
      "Pagination visual journeys retain strict browser health",
    );
  } finally {
    await context.close();
  }
}
