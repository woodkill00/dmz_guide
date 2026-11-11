import assert from "node:assert/strict";
import { chromium } from "playwright";
import { revealTrackerControl } from "./tracker-controls.mjs";
const browser = await chromium.launch(),
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  }),
  page = await context.newPage();
const expected = [
  "Consumables",
  "Plate carriers",
  "Backpacks",
  "Tacticals",
  "Lethals",
  "Field upgrades",
  "Fire support",
  "Gear",
  "Ingredients",
];
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
const base = process.env.TEST_BASE || "http://127.0.0.1:4173";
const labels = () =>
  page.locator("[data-inventory-group]").evaluateAll((nodes) =>
    nodes.map((node) =>
      [...node.childNodes]
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => child.textContent)
        .join("")
        .trim(),
    ),
  );
try {
  await page.goto(base + "/inventory/?pack=official%3Amw4-dmz-starter");
  await ready();
  assert.deepEqual(
    (await labels()).filter((label) => expected.includes(label)),
    expected,
  );
  assert.match(
    await page.locator('[data-inventory-category="Equipment"]').innerText(),
    /^Equipment\s/,
  );
  const choices = await page
    .locator("#inventory-section option")
    .allTextContents();
  assert.deepEqual(
    choices.filter((label) => expected.includes(label)),
    expected,
  );
  const names = await page
    .locator(".inventory-group")
    .filter({ has: page.locator('[data-inventory-group="Consumables"]') })
    .locator(".inventory-name a")
    .allTextContents();
  assert.deepEqual(names, [
    "Energy Drink",
    "Bandage",
    "Pain Killers",
    "Sedative Inhaler",
    "Radiation Blockers",
    "Smelling Salts",
    "Medkit",
    "Staff Emergency Exfil Keycard",
    "Self-Revive Kit",
    "Door Breacher Charge",
  ]);
  await page.locator("#inventory-query").fill("Bandage");
  await page
    .locator('[data-field="inventory"][data-id="mw4:bandage"]')
    .fill("7");
  await page.locator('[data-item-blueprint="mw4:bandage"]').check();
  await page.locator("#inventory-query").fill("");
  await revealTrackerControl(page, "#inventory-sort");
  await page.locator("#inventory-sort").selectOption("rarity");
  assert.deepEqual(
    (await labels()).filter((label) => expected.includes(label)),
    expected,
  );
  await page.locator("#inventory-next").click();
  await page.locator("#inventory-previous").click();
  await page.locator("#inventory-query").fill("Bandage");
  assert.equal(
    await page
      .locator('[data-field="inventory"][data-id="mw4:bandage"]')
      .inputValue(),
    "7",
  );
  assert(await page.locator('[data-item-blueprint="mw4:bandage"]').isChecked());
  await page.locator("#cancel-inventory").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar").dataset.dirty === "false",
  );
  await page.locator("#inventory-query").fill("");
  await page.locator("#inventory-section").selectOption("Equipment");
  assert((await page.locator("[data-inventory-item]").count()) > 0);
  assert((await labels()).includes("Gear"));
  await page.goto(base + "/needed/?pack=official%3Amw4-dmz-starter");
  await ready();
  for (const group of await page
    .locator("#needed-list [data-needed-category]")
    .all()) {
    const types = await group
      .locator("[data-needed-type]")
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.neededType));
    const actual = types.filter((type) => expected.includes(type));
    assert.deepEqual(
      actual,
      [...actual].sort((a, b) => expected.indexOf(a) - expected.indexOf(b)),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS requested nine section labels/order in Inventory and dropdown, alphabetic items, rarity mode, paging with quantity/blueprint drafts, Gear filter and Needed subsection ordering.",
  );
} finally {
  await context.close();
  await browser.close();
}
