import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch(),
  context = await browser.newContext(),
  page = await context.newPage();
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
try {
  for (const [pack, prefix] of [
    ["official:mw4-dmz-starter", "mw4:printer-item-"],
    ["observed:upgrade-review-20261026", "reported:"],
  ]) {
    await page.goto(
      "http://127.0.0.1:4173/inventory/?pack=" + encodeURIComponent(pack),
    );
    await ready();
    await page.locator("#inventory-section").selectOption("Tacticals");
    for (const name of [
      "snapshot-grenade",
      "smoke-grenade",
      "shock-stick",
      "stim",
    ]) {
      const id = prefix + name,
        row = page.locator('[data-inventory-item="' + id + '"]');
      assert.equal(await row.count(), 1);
      assert.equal(
        await row
          .locator(
            'xpath=ancestor::section[contains(@class,"inventory-group")]',
          )
          .locator("[data-inventory-group]")
          .getAttribute("data-inventory-group"),
        "Tacticals",
      );
    }
    const id = prefix + "stim",
      quantity = page.locator('[data-field="inventory"][data-id="' + id + '"]');
    await quantity.fill("7");
    const blueprint = page.locator('[data-item-blueprint="' + id + '"]');
    if (await blueprint.count()) await blueprint.check();
    await page.locator("#inventory-section").selectOption("Equipment");
    assert.equal(
      await page.locator('[data-inventory-item="' + id + '"]').count(),
      0,
    );
    await page.locator("#inventory-section").selectOption("Tacticals");
    assert.equal(await quantity.inputValue(), "7");
    if (await blueprint.count()) assert(await blueprint.isChecked());
    await page.locator("#cancel-inventory").click();
    await page.waitForFunction(
      () =>
        document.querySelector(".inventory-save-bar").dataset.dirty === "false",
    );
  }
  console.log(
    "PASS all four items in Tacticals for starter and older reference catalog; absent from Gear; quantity and applicable blueprint drafts retained across category filters.",
  );
} finally {
  await context.close();
  await browser.close();
}
