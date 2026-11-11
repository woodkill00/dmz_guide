import { revealTrackerControl } from "./tracker-controls.mjs";
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const base = process.env.TEST_BASE || "http://127.0.0.1:4173";
const engine = { chromium, firefox, webkit }[process.env.BROWSER || "chromium"];
assert(engine, "Unsupported test browser");
const browser = await engine.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
// Playwright WebKit screenshots inject an inline animation-sync stylesheet under strict CSP.
// Keep all functional/geometry/error checks; capture visual evidence in Chromium and Firefox.
const captureScreenshots = engine.name() !== "webkit";
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
const route = "/inventory/?pack=official%3Amw4-dmz-starter",
  cash = "mw4:dmz-cash";
const input = (id) => page.locator(`[data-field="inventory"][data-id="${id}"]`);
const find = async (q) => {
  await page.locator("#inventory-query").fill(q);
  await page.waitForTimeout(100);
};
const saved = () =>
  page.evaluate(
    async () =>
      await (
        await import("/assets/src/storage/store.mjs")
      ).loadProfile("official:mw4-dmz-starter"),
  );
try {
  await mkdir(".local/inventory/screenshots", { recursive: true });
  await page.goto(base + route);
  await ready();
  // Save a real legacy profile, including quantities and prior completion, then reproduce the owner's exact number.
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const p = newProfile({ ...state.pack, schemaVersion: 1 });
    p.contentVersion = "2026.11.01.1";
    p.inventory["mw4:dmz-cash"] = 42;
    p.inventory["mw4:metals"] = 7;
    p.completion["mw4:printer-access"] = "completed";
    await saveProfile(p, 0);
  });
  await page.reload();
  await ready();
  await find("cash");
  assert.equal(await input(cash).getAttribute("max"), "2000000");
  await input(cash).fill("1333601");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.locator("#currency-format-confirm").waitFor({ state: "visible" });
  assert.equal((await saved()).value.inventory[cash], 42);
  await page.locator("#cancel-currency-format").click();
  assert.equal(await input(cash).inputValue(), "1333601");
  assert.equal((await saved()).value.schemaVersion, 1);
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.locator("#confirm-currency-format").click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.schemaVersion === 3,
  );
  await ready();
  let record = await saved();
  assert.equal(record.value.inventory[cash], 1333601);
  assert.equal(record.value.inventory["mw4:metals"], 7);
  assert.equal(record.value.completion["mw4:printer-access"], "completed");
  assert.equal(record.previous.inventory[cash], 42);
  await page.reload();
  await ready();
  await find("cash");
  assert.equal(await input(cash).inputValue(), "1333601");
  await input(cash).fill("2000001");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  assert.equal((await saved()).value.inventory[cash], 1333601);
  await input(cash).fill("2000000");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.inventory["mw4:dmz-cash"] === 2000000,
  );
  await find("metals");
  await input("mw4:metals").fill("1000001");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  assert.equal((await saved()).value.inventory["mw4:metals"], 7);
  await input("mw4:metals").fill("31");
  await find("gold");
  assert.equal(await page.locator("[data-inventory-item]").count(), 2);
  assert.match(await page.locator("#inventory-fields").innerText(), /Ultra/);
  await revealTrackerControl(page, "#inventory-sort");
  await page.locator("#inventory-sort").selectOption("rarity");
  await find("metals");
  assert.equal(await input("mw4:metals").inputValue(), "31");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.inventory["mw4:metals"] === 31,
  );
  await find("");
  await page.locator("#inventory-section").selectOption("Ingredients");
  await revealTrackerControl(page, "#inventory-sort");
  await page.locator("#inventory-sort").selectOption("name");
  assert.equal(await page.locator("[data-inventory-item]").count(), 31);
  assert.equal(
    await page
      .locator('[data-inventory-item="mw4:x01-specter-fabric-sample"]')
      .count(),
    1,
  );
  assert.equal(
    await page
      .locator('[data-inventory-item="mw4:x01-sr-16-bio-agent-sample"]')
      .count(),
    1,
  );
  const names = await page.locator(".inventory-name>a").allTextContents();
  assert.deepEqual(
    names,
    [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    ),
  );
  if (captureScreenshots)
    await page.screenshot({
      path: ".local/inventory/screenshots/ingredients-desktop.png",
      fullPage: true,
      caret: "initial",
    });
  await page.setViewportSize({ width: 390, height: 844 });
  if (captureScreenshots)
    await page.screenshot({
      path: ".local/inventory/screenshots/ingredients-mobile.png",
      fullPage: true,
      caret: "initial",
    });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.goto(base + "/items/");
  await page.locator("#catalog-search").waitFor();
  await page.waitForTimeout(500);
  assert.equal(await page.locator("#catalog-pack").inputValue(), "");
  assert.equal(
    await page
      .locator('[data-record-card][data-fixture="true"]:visible')
      .count(),
    0,
  );
  await page.locator("#catalog-search").fill("Gold Skull");
  await page.locator("#catalog-filters button[type=submit]").click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator("[data-record-card]:visible").count(), 2);
  assert.equal(await page.locator("[data-directory-edit]:visible").count(), 2);
  await page.goto(base + "/items/manage/");
  assert.equal(await page.locator("[data-add-item]").count(), 2);
  const href = await page
    .locator("[data-add-item]")
    .first()
    .getAttribute("href");
  const url = new URL(href);
  assert.equal(url.searchParams.get("create"), "items");
  assert.equal(url.searchParams.get("packId"), "official:mw4-dmz-starter");
  if (captureScreenshots)
    await page.screenshot({
      path: ".local/inventory/screenshots/manage-mobile.png",
      fullPage: true,
      caret: "initial",
    });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: exact legacy cash reproduction, cancel/confirm/recovery/reload, cash/material limits, drafts, 29 ingredients, rarity/name groups, all real catalogs, add/edit links, desktop/mobile overflow, clean browser console.",
  );
} finally {
  await context.close();
  await browser.close();
}
