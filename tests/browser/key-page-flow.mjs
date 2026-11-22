// Disposable browser contexts; only synthetic key stock is written.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { openParentDetails } from "./reviewer-disclosures.mjs";
const base = process.env.TEST_BASE || "http://127.0.0.1:4173";
await mkdir("test-results", { recursive: true });
async function layout(page, label) {
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    nested: [
      ...document.querySelectorAll(
        "main div,main section,main aside,main details",
      ),
    ]
      .filter((e) => {
        const s = getComputedStyle(e);
        return (
          e.getClientRects().length &&
          /(auto|scroll)/.test(s.overflowY) &&
          e.scrollHeight > e.clientHeight + 3
        );
      })
      .map((e) => ({
        id: e.id,
        class: e.className,
        height: e.clientHeight,
        scroll: e.scrollHeight,
      })),
    filter: getComputedStyle(document.querySelector("#key-filter-menu"))
      .position,
  }));
  assert.equal(result.overflow, false, label + " page width");
  assert.deepEqual(result.nested, [], label + " nested vertical scroll");
  assert.equal(result.filter, "static", label + " non-overlay filters");
}
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch(),
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base + "/keys/");
    await page.locator('main[data-key-workspace-ready="true"]').waitFor();
    assert.equal(await page.locator("[data-key-row]").count(), 89);
    await page.locator("#key-region").selectOption("x01");
    await layout(page, name + " desktop");
    const row = page.locator(
      '[data-key-row=""][data-key-id="x01-archive-closet"]',
    );
    await row.scrollIntoViewIfNeeded();
    const rect = await row.boundingBox();
    await page.mouse.move(
      rect.x + rect.width * 0.6,
      Math.max(20, Math.min(950, rect.y + 30)),
    );
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 550);
    await page.waitForFunction((y) => scrollY > y + 100, before);
    await layout(page, name + " wheel over X01 list");
    // Active filtering and pending field blur must not reopen collapsed groups.
    await page.locator("#key-search").fill("Archive Closet");
    const input = page.locator(
      '[data-private-field="quantity"][data-key-id="x01-archive-closet"]',
    );
    await input.fill("3");
    const original = await input.elementHandle();
    await page.locator("#key-collapse-areas").scrollIntoViewIfNeeded();
    await page.locator("#key-collapse-areas").click();
    await page.waitForFunction(
      () => document.activeElement?.id === "key-collapse-areas",
    );
    assert(await original.evaluate((e) => e.isConnected));
    assert.equal(await input.inputValue(), "3");
    await page.waitForFunction(
      () =>
        document.querySelector("#key-save-status")?.textContent ===
        "Saved on this device.",
    );
    assert.equal(await page.locator("[data-key-group][open]").count(), 0);
    await page.locator("#key-expand-areas").click();
    assert(await input.isVisible());
    assert.equal(await input.inputValue(), "3");
    await page.getByRole("button", { name: "Clear filters" }).click();
    for (const target of await page
      .locator("#keys-x01 [data-target-use]")
      .all()) {
      await target.check();
    }
    await page.locator("#key-source-review > summary").click();
    const comparisons = page.locator("#key-source-review details > summary");
    await comparisons.click();
    await page.locator("#key-toggle-trip").click();
    assert.match(await page.locator("#key-trip-count").innerText(), /14/);
    assert((await page.locator("#key-trip-panel").boundingBox()).height > 650);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ["dark", "light"]) {
        await page.evaluate(
          (t) => (document.documentElement.dataset.theme = t),
          theme,
        );
        await layout(page, `${name} ${width} ${theme}`);
      }
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    await layout(page, name + " 200% text");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
      document.documentElement.dataset.uiVariant = "modern";
    });
    await layout(page, name + " modern CSS cascade");
    await page.evaluate(
      () => (document.documentElement.dataset.uiVariant = "legacy"),
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("#key-region").selectOption("x01");
    await page
      .locator("#keys-x01")
      .evaluate((e) => e.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: `test-results/107-${name}-desktop.png` });
    await page.setViewportSize({ width: 390, height: 1000 });
    await page
      .locator("#keys-x01")
      .evaluate((e) => e.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: `test-results/107-${name}-mobile.png` });
    await page.reload();
    await page.locator('main[data-key-workspace-ready="true"]').waitFor();
    await openParentDetails(page.locator("#key-region"));
    await page.locator("#key-region").selectOption("x01");
    assert.equal(await input.inputValue(), "3");
    assert.deepEqual(errors, []);
    console.log(
      `${name}: one page scroll+real wheel, non-overlay filters, focused-input pointer collapse preserves node/value and visible focus, save/reload, source/trip expansion,320–1440/light/dark/200%/modern CSS PASS`,
    );
  } catch (e) {
    await page.screenshot({ path: `test-results/107-${name}-failure.png` });
    throw e;
  } finally {
    await context.close();
    await browser.close();
  }
}
