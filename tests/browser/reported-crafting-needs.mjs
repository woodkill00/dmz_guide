import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium";
const browser = await { chromium, firefox, webkit }[engine].launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const ready = async () => {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await page.waitForLoadState("networkidle");
};
try {
  await page.goto(
    "http://127.0.0.1:4173/inventory/?pack=official%3Amw4-dmz-starter",
  );
  await ready();
  for (const [name, total] of [
    ["Synthetics", 7800],
    ["Electronics", 9200],
    ["Chemicals", 10700],
    ["Metals", 10300],
  ]) {
    await page.locator("#inventory-query").fill(name);
    const cell = page
      .locator(
        `[data-upgrade-need="collection"][data-item="mw4:${name.toLowerCase()}"]`,
      )
      .first();
    assert(await cell.isVisible());
    assert.equal(
      await cell.locator("[data-tier-required]").innerText(),
      total.toLocaleString("en-US"),
    );
    assert.equal(
      await cell.locator("[data-tier-missing]").innerText(),
      "Enter owned",
    );
    assert.match(await cell.innerText(), /Craft estimate/);
  }
  await page.locator("#inventory-query").fill("Synthetics");
  const cell = page
    .locator('[data-upgrade-need="collection"][data-item="mw4:synthetics"]')
    .first();
  await page
    .locator('[data-field="inventory"][data-id="mw4:synthetics"]')
    .first()
    .fill("100");
  assert.equal(await cell.locator("[data-tier-missing]").innerText(), "7,700");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  await page.reload();
  await ready();
  await page.locator("#inventory-query").fill("Synthetics");
  assert.equal(await cell.locator("[data-tier-missing]").innerText(), "7,700");
  await mkdir(".local/item-icons/crafting", { recursive: true });
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await cell.scrollIntoViewIfNeeded();
    assert(await cell.isVisible());
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `.local/item-icons/crafting/${engine}-${width}.png`,
      });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS actual resource counts, blank-stock instruction, edit/save/reload, responsive widths, no page errors: " +
      engine,
  );
} finally {
  await browser.close();
}
