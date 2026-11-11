import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto(
    "http://127.0.0.1:4173/inventory/?pack=official%3Amw4-dmz-starter",
  );
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  const bandage = page.locator(
    '[data-field="inventory"][data-id="mw4:bandage"]',
  );
  await bandage.fill("17");
  for (const type of ["Field upgrades", "Ingredients", "Equipment"]) {
    const group = page
      .locator(".inventory-group")
      .filter({ has: page.locator(`[data-inventory-group="${type}"]`) });
    const button = group.locator("[data-inventory-page-for]");
    if (await button.count()) {
      assert.equal(
        (await button.innerText()).trim(),
        type === "Equipment" ? "Gear" : type,
      );
      await button.click();
    }
    await assert.doesNotReject(() => bandage.waitFor({ state: "visible" }));
    assert.equal(await bandage.inputValue(), "17");
  }
  assert.equal(
    await page
      .locator('[data-inventory-group="Field upgrades"]')
      .getAttribute("aria-expanded"),
    "true",
  );
  assert.equal(
    await page
      .locator('[data-inventory-group="Ingredients"]')
      .getAttribute("aria-expanded"),
    "true",
  );
  assert(
    await page
      .locator(
        '[data-field="inventory"][data-id="mw4:printer-item-inflatable-decoy"]',
      )
      .isVisible(),
  );
  console.log(
    "PASS section loads retain previously visible expanded sections and unsaved quantities; labels are type names.",
  );
} finally {
  await browser.close();
}
