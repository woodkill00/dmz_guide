import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
import { revealTrackerControl } from "./tracker-controls.mjs";
const engine = process.env.BROWSER || "chromium",
  browser = await { chromium, firefox, webkit }[engine].launch(),
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = "http://127.0.0.1:4173/inventory/?pack=official%3Amw4-dmz-starter";
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
const group = (type) =>
  page
    .locator(".inventory-group")
    .filter({ has: page.locator(`[data-inventory-group="${type}"]`) });
const load = async (type) => {
  const g = group(type);
  const b = g.locator("[data-inventory-page-for]");
  if (await b.count()) await b.click();
  return group(type);
};
const save = async () => {
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
};
const seed = async (mode) => {
  await page.evaluate(async (mode) => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile, loadProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
    const existing = await loadProfile(state.pack.id);
    const p =
      mode === "initial"
        ? newProfile(state.pack)
        : structuredClone(existing.value);
    if (mode === "initial") {
      p.inventory["mw4:dmz-cash"] = 1307735;
      p.inventory["mw4:ingredient-gold-skull"] = 4;
    }
    if (mode === "grants" || mode === "revoke") {
      for (const id of [
        "mw4:upgrade-uncommon-ingredient-printing",
        "mw4:upgrade-epic-ingredient-printing",
      ])
        p.upgradeProgress[id] = {
          completion: mode === "grants" ? "completed" : "incomplete",
          availability: "unknown",
          reviewRequired: false,
        };
    }
    if (mode === "finish-skull" || mode === "restore-skull") {
      for (const o of state.pack.objectives.filter(
        (o) =>
          o.track === "dmz-upgrade" &&
          o.requirements.some((r) => r.itemId === "mw4:ingredient-gold-skull"),
      ))
        p.upgradeProgress[o.id] = {
          completion: mode === "finish-skull" ? "completed" : "incomplete",
          availability: "unknown",
          reviewRequired: false,
        };
    }
    await saveProfile(p, existing?.value.revision ?? 0);
  }, mode);
  await page.reload();
  await ready();
};
try {
  await page.goto(url);
  await ready();
  await seed("initial");
  await page.locator("#inventory-query").fill("Staff Emergency Exfil Keycard");
  const key = page.locator(
    '[data-item-blueprint="mw4:x01-staff-emergency-exfil-keycard"]',
  );
  await key.check();
  await save();
  await page.reload();
  await ready();
  await page.locator("#inventory-query").fill("Staff Emergency Exfil Keycard");
  assert(await key.isChecked());
  await page.locator("#inventory-query").fill("");
  await revealTrackerControl(page, "#inventory-section");
  await page.locator("#inventory-section").selectOption("Field upgrades");
  assert.equal(
    await group("Field upgrades").locator("[data-item-blueprint]").count(),
    21,
  );
  await group("Field upgrades")
    .locator('[data-item-blueprint="mw4:field-upgrade-utility-box"]')
    .check();
  await save();
  await page.locator("#inventory-section").selectOption("Resources");
  assert.deepEqual(
    await group("Resources").locator(".inventory-name a").allTextContents(),
    ["Synthetics", "Electronics", "Chemicals", "Metals"],
  );
  await page.locator("#inventory-section").selectOption("");
  await page.locator("#inventory-query").fill("Gold Skull");
  assert.equal(
    await page
      .locator('[data-inventory-item="mw4:ingredient-gold-skull"]')
      .count(),
    2,
  );
  const own = (g) =>
    group(g).locator(
      '[data-field="inventory"][data-id="mw4:ingredient-gold-skull"]',
    );
  await own("Misc items").fill("9");
  assert.equal(await own("Upgrade materials").inputValue(), "9");
  await own("Upgrade materials").fill("12");
  assert.equal(await own("Misc items").inputValue(), "12");
  await group("Upgrade materials").locator('[data-stock-step="1"]').click();
  assert.equal(await own("Misc items").inputValue(), "13");
  await group("Upgrade materials")
    .locator("[data-show-use]:not([data-kind])")
    .click();
  assert(
    await group("Upgrade materials").locator("[data-item-detail]").isVisible(),
  );
  assert(
    !(await group("Misc items").locator("[data-item-detail]").isVisible()),
  );
  await save();
  await page.reload();
  await ready();
  await page.locator("#inventory-query").fill("Gold Skull");
  assert.equal(await own("Misc items").inputValue(), "13");
  assert.equal(await own("Upgrade materials").inputValue(), "13");
  await own("Upgrade materials").fill("99");
  await page.locator("#cancel-inventory").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  assert.equal(await own("Misc items").inputValue(), "13");
  await seed("finish-skull");
  await page.locator("#inventory-query").fill("Gold Skull");
  assert.equal(await group("Upgrade materials").count(), 0);
  assert.match(await group("Misc items").innerText(), /Upgrade use completed/);
  assert.equal(await own("Misc items").inputValue(), "13");
  await seed("restore-skull");
  await page.locator("#inventory-query").fill("Gold Skull");
  assert.equal(await group("Upgrade materials").count(), 1);
  assert.equal(await own("Upgrade materials").inputValue(), "13");
  await page.locator("#inventory-query").fill("Power Regulator");
  const regulator = (type) =>
    group(type).locator(
      '[data-item-blueprint="mw4:ingredient-power-regulator"]',
    );
  assert.equal(
    await page
      .locator('[data-item-blueprint="mw4:ingredient-power-regulator"]')
      .count(),
    2,
  );
  await regulator("Ingredients").check();
  assert(await regulator("Upgrade materials").isChecked());
  await regulator("Upgrade materials").uncheck();
  assert(!(await regulator("Ingredients").isChecked()));
  await regulator("Ingredients").check();
  await group("Ingredients")
    .locator("[data-show-use]:not([data-kind])")
    .click();
  await group("Ingredients").locator('[data-field="reserves"]').fill("3");
  assert.equal(
    await group("Upgrade materials")
      .locator('[data-field="reserves"]')
      .inputValue(),
    "3",
  );
  await save();
  await seed("grants");
  await revealTrackerControl(page, "#inventory-section");
  await page.locator("#inventory-section").selectOption("Ingredients");
  for (const id of ["mw4:biomaterials", "mw4:ingredient-power-regulator"]) {
    const b = group("Ingredients").locator(`[data-item-blueprint="${id}"]`);
    assert(await b.isChecked());
    assert(await b.isDisabled());
  }
  await page.locator("#inventory-section").selectOption("");
  await page.locator("#inventory-query").fill("Cash");
  const cash = page.locator('[data-field="inventory"][data-id="mw4:dmz-cash"]');
  assert.equal(await cash.inputValue(), "1,307,735");
  await cash.fill("1,333,601");
  await cash.blur();
  assert.equal(await cash.inputValue(), "1,333,601");
  await save();
  const persisted = await page.evaluate(
    async () =>
      await (
        await import("/assets/src/storage/store.mjs")
      ).loadProfile("official:mw4-dmz-starter"),
  );
  assert.equal(persisted.value.inventory["mw4:dmz-cash"], 1333601);
  assert.equal(persisted.value.itemBlueprints["mw4:biomaterials"], undefined);
  assert.equal(
    persisted.value.itemBlueprints["mw4:x01-staff-emergency-exfil-keycard"],
    true,
  );
  assert.equal(
    persisted.value.itemBlueprints["mw4:field-upgrade-utility-box"],
    true,
  );
  for (const invalid of ["1,33,601", "-1", "1.5", "2,000,001"]) {
    await cash.fill(invalid);
    assert(!(await cash.evaluate((n) => n.checkValidity())));
  }
  await page.locator("#cancel-inventory").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  assert.equal(await cash.inputValue(), "1,333,601");
  await group("Currency").locator('[data-stock-step="1"]').click();
  assert.equal(await cash.inputValue(), "1,333,602");
  await page.locator("#cancel-inventory").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  await seed("revoke");
  await revealTrackerControl(page, "#inventory-section");
  await page.locator("#inventory-section").selectOption("Ingredients");
  assert(
    !(await group("Ingredients")
      .locator('[data-item-blueprint="mw4:biomaterials"]')
      .isChecked()),
  );
  assert(await regulator("Ingredients").isChecked());
  assert(!(await regulator("Ingredients").isDisabled()));
  await page.locator("#inventory-section").selectOption("");
  await page.locator("#inventory-query").fill("Gold Skull");
  await mkdir(".local/field-upgrades/screenshots", { recursive: true });
  if (engine !== "webkit")
    await page.screenshot({
      path:
        ".local/field-upgrades/screenshots/material-views-" + engine + ".png",
    });
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
  assert.deepEqual(errors, []);
  console.log(
    "PASS keycard/all-field blueprint save/reload; derived uncommon/epic grants and revocation; shared misc/upgrade edits/stepper/save/cancel; completion hide/restore; resource order; formatted cash strict validation and numeric storage; mobile layout.",
  );
} finally {
  await browser.close();
}
