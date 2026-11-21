import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { serviceOrigin } from "../../src/domain/local-services.mjs";
import { features, featureURL } from "../../src/ui/feature-registry.mjs";
const base =
  process.env.DMZ_SITE_URL || serviceOrigin("guide", "http://127.0.0.1");
const path = featureURL(features.find((f) => f.id === "track-items")),
  official = "official:mw4-dmz-starter";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    await page.goto(base + path);
    await page.locator('.track-items-directory[data-ready="true"]').waitFor();
    assert.equal(
      await page.locator("#track-items-pack").inputValue(),
      official,
    );
    const selected = () =>
      page.locator("[data-track-items-pack]:not([hidden])");
    assert.equal(
      await selected().locator("[data-track-item]:not([hidden])").count(),
      303,
    );
    assert.deepEqual(
      await selected()
        .locator("[data-track-rarity]")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.trackRarity)),
      [
        "Common",
        "Uncommon",
        "Rare",
        "Epic",
        "Legendary",
        "Ultra",
        "Not recorded",
      ],
    );
    assert.equal(
      await selected()
        .locator("[data-track-rarity]")
        .evaluateAll((groups) => {
          const c = new Intl.Collator("en", {
            numeric: true,
            sensitivity: "base",
          });
          return groups.every((group) => {
            const names = [
              ...group.querySelectorAll(
                ".track-item-row > div > a > span:last-child",
              ),
            ].map((n) => n.textContent);
            return names.every((n, i) => !i || c.compare(names[i - 1], n) <= 0);
          });
        }),
      true,
    );
    await page.waitForFunction(
      () =>
        document.querySelector(
          '.track-items-directory [data-icon-status="available"]',
        ),
      {},
      { timeout: 30000 },
    );
    await page.locator("#track-items-query").fill("Detonators");
    await page.waitForFunction(() =>
      document
        .querySelector("#track-items-count")
        .textContent.startsWith("1 of"),
    );
    assert.equal(
      await selected().locator("[data-track-item]:not([hidden])").count(),
      1,
    );
    const link = selected().locator(
      "[data-track-item]:not([hidden]) > div > a",
    );
    const destination = new URL(await link.getAttribute("href"), base);
    assert.equal(destination.searchParams.get("pack"), official);
    assert.equal(
      destination.searchParams.get("id"),
      "mw4:ingredient-detonators",
    );
    await page.locator("#track-items-query").fill("");
    for (const rarity of ["Common", "Rare"])
      await selected()
        .locator(`[data-track-rarity="${rarity}"] > summary`)
        .click();
    assert.equal(
      await selected()
        .locator('[data-track-rarity="Common"]')
        .getAttribute("open"),
      null,
    );
    assert.equal(
      await selected()
        .locator('[data-track-rarity="Rare"]')
        .getAttribute("open"),
      null,
    );
    assert.notEqual(
      await selected()
        .locator('[data-track-rarity="Epic"]')
        .getAttribute("open"),
      null,
    );
    await page.locator("[data-track-items-expand]").click();
    const other = await page
      .locator("[data-track-items-pack]")
      .evaluateAll(
        (sections, id) =>
          sections.find(
            (s) =>
              s.dataset.trackItemsPack !== id &&
              s.querySelector("[data-track-item]"),
          )?.dataset.trackItemsPack,
        official,
      );
    await page.locator("#track-items-pack").selectOption(other);
    assert.equal(new URL(page.url()).searchParams.get("pack"), other);
    assert.equal(
      new URL(
        await page
          .locator('[data-tracker-feature="inventory"]')
          .getAttribute("href"),
        base,
      ).searchParams.get("pack"),
      other,
    );
    const weapons = new URL(
      await page
        .locator('[data-tracker-feature="armory-workbench"]')
        .getAttribute("href"),
      base,
    );
    assert.equal(weapons.hash, "#acquisition");
    assert.equal(weapons.searchParams.get("pack"), null);
    await page.locator("#track-items-pack").selectOption(official);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.locator("[data-tracker-link]").evaluateAll((links) =>
        links.every((link) => {
          const range = document.createRange();
          range.selectNodeContents(link);
          return range.getClientRects().length === 1;
        }),
      ),
      true,
      "mobile tab labels must not split into fragments",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
    );
    await page.screenshot({ path: `test-results/098-${name}-mobile.png` });
    const databases = await page.evaluate(async () =>
      typeof indexedDB.databases === "function"
        ? (await indexedDB.databases()).map((d) => d.name)
        : [],
    );
    assert.ok(!databases.includes("dmz-guide-local"));
    assert.ok(!databases.includes("dmz-armory-local"));
    for (const id of ["quick-collect", "inventory", "planner"]) {
      const feature = features.find((f) => f.id === id);
      await page.goto(
        base + featureURL(feature) + "?pack=" + encodeURIComponent(official),
      );
      const tab = page.locator('[data-tracker-feature="track-items"]');
      await tab.waitFor({ state: "visible" });
      await tab.click();
      await page.waitForURL((u) => u.pathname === path);
      assert.equal(await tab.getAttribute("aria-current"), "page");
    }
    console.log(
      `${name}:303 items/rarity/name order,search,independent sections,catalog links,Track/Inventory/QuickCollect Items tab,mobile,no directory profile writes PASS`,
    );
  } finally {
    await browser.close();
  }
}
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ javaScriptEnabled: false }),
    page = await context.newPage();
  await page.goto(base + path);
  assert.equal(
    await page
      .locator("[data-track-items-pack]:not([hidden]) [data-track-item]")
      .count(),
    303,
  );
  console.log("No-JavaScript default catalog303 items PASS");
} finally {
  await browser.close();
}
