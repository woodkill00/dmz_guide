import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import registry from "../../src/content/item-icons.json" with { type: "json" };
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium",
  browser = await { chromium, firefox, webkit }[engine].launch(),
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:4173",
  ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
try {
  for (const [pack, mappings] of Object.entries(registry.items)) {
    await page.goto(base + "/inventory/?pack=" + encodeURIComponent(pack));
    await ready();
    let loops = 0;
    while (await page.locator("[data-inventory-page-for]").count()) {
      await page.locator("[data-inventory-page-for]").first().click();
      assert(++loops < 100);
    }
    await page.waitForFunction(
      (mappings) =>
        [...document.querySelectorAll("[data-inventory-icon]")].every(
          (cell) =>
            !Object.hasOwn(mappings, cell.dataset.inventoryIcon) ||
            cell.dataset.iconStatus === "available",
        ),
      mappings,
      { timeout: 30000 },
    );
    const unique = await page
      .locator('[data-icon-status="available"]')
      .evaluateAll((cells) => [
        ...new Set(cells.map((c) => c.dataset.inventoryIcon)),
      ]);
    assert.equal(unique.length, Object.keys(mappings).length);
    const missing = await page
      .locator('[data-icon-status="missing"]')
      .allTextContents();
    const missingIds = await page
      .locator('[data-icon-status="missing"]')
      .evaluateAll((cells) => [
        ...new Set(cells.map((cell) => cell.dataset.inventoryIcon)),
      ]);
    const catalogIds = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      return state.pack.items
        .filter((item) => !item.spoiler)
        .map((item) => item.id);
    });
    assert.deepEqual(
      missingIds.sort(),
      catalogIds.filter((id) => !Object.hasOwn(mappings, id)).sort(),
    );
    assert(missing.every((text) => /Icon needed/.test(text)));
    assert.equal(
      await page
        .locator("img")
        .evaluateAll(
          (imgs) =>
            imgs.filter(
              (i) =>
                i.closest(".inventory-item-icon") &&
                (!i.complete || !i.naturalWidth),
            ).length,
        ),
      0,
    );
    for (const cell of await page
      .locator('[data-icon-status="available"]')
      .all()) {
      const a = cell.locator("a");
      assert.match(
        await a.getAttribute("href"),
        /^https:\/\/(?:codcentral\.net|tools\.tcno\.co|www\.dmztracker\.gg|dmzcodex\.com|wzstats\.gg)\//,
      );
    }
    await page.locator("#inventory-query").fill("Gold Skull");
    await page.waitForFunction(() =>
      [...document.querySelectorAll("[data-inventory-icon]")].every(
        (c) => c.dataset.iconStatus === "available",
      ),
    );
    assert.equal(await page.locator("[data-inventory-icon] img").count(), 2);
    const stock = page
      .locator(".inventory-group")
      .filter({ has: page.locator('[data-inventory-group="Misc items"]') })
      .locator('[data-field="inventory"]');
    await stock.fill("8");
    assert.equal(
      await page.locator('[data-field="inventory"]').last().inputValue(),
      "8",
    );
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
      { width: 1440, height: 1000 },
    ]) {
      await page.setViewportSize(viewport);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    if (engine !== "webkit") {
      await mkdir(".local/item-icons/screenshots", { recursive: true });
      await page.screenshot({
        path:
          ".local/item-icons/screenshots/" +
          (pack.startsWith("official") ? "starter" : "reference") +
          "-" +
          engine +
          ".png",
      });
    }
  }
  const entries = Object.values(registry.assets);
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < entries.length) {
        const a = entries[next++],
          r = await page.request.get(base + "/local-item-icons/" + a.file);
        assert.equal(r.status(), 200, a.file);
        assert.equal(r.headers()["content-type"], a.mime);
        assert.equal((await r.body()).length, a.bytes);
      }
    }),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS every registered local asset served with reviewed size/type; all mapped icons render; unmapped catalog items retain explicit fallbacks; source links, shared quantities, rapid section loading and mobile layout.",
  );
} finally {
  await browser.close();
}
