import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
import { revealTrackerControl } from "./tracker-controls.mjs";
const engine = { chromium, firefox, webkit }[process.env.BROWSER || "chromium"],
  browser = await engine.launch(),
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  }),
  page = await context.newPage();
const names = [
  "Inflatable Decoy",
  "Ammo Box",
  "Trophy System",
  "Armor Box",
  "Defibrillator",
  "DDOS",
  "Recon Drone",
  "SAM Airburst Turret",
  "Consumable Box",
  "Medical Box",
  "Hazmat Box",
  "Portable Radar",
  "Razor Wire Trap",
  "Rebreather",
  "Riot Shield",
  "Seeker Drone",
  "Smoke Wall",
  "Revive Pistol",
  "Fulton Drop Marker",
  "Utility Box",
  "Survivor Box",
];
const base = process.env.TEST_BASE || "http://127.0.0.1:4173",
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
const saved = (id) =>
  page.evaluate(
    async (id) =>
      (await import("/assets/src/storage/store.mjs")).loadProfile(id),
    id,
  );
const ordered = () => page.locator(".inventory-name > a").allTextContents();
try {
  await mkdir(".local/field-upgrades/screenshots", { recursive: true });
  for (const [key, ammo, utility, previousVersion] of [
    [
      "official:mw4-dmz-starter",
      "mw4:printer-item-ammo-box",
      "mw4:field-upgrade-utility-box",
      "2026.11.06.3",
    ],
    [
      "observed:upgrade-review-20261026",
      "reported:ammo-box",
      "reported:utility-box",
      "2026.11.06.1",
    ],
  ]) {
    const url = (path) =>
      base + "/" + path + "/?pack=" + encodeURIComponent(key);
    await page.goto(url("inventory"));
    await ready();
    await page.locator("#inventory-section").selectOption("Field upgrades");
    assert.deepEqual(await ordered(), names);
    await page.evaluate(
      async ({ key, ammo, previousVersion }) => {
        const { state } = await import("/assets/src/client/common.mjs"),
          { newProfile } = await import("/assets/src/domain/profile.mjs"),
          { saveProfile } = await import("/assets/src/storage/store.mjs");
        const p = newProfile(state.pack);
        p.contentVersion = previousVersion;
        p.inventory[ammo] = 7;
        p.reserves[ammo] = 2;
        p.itemBlueprints = { [ammo]: true };
        await saveProfile(p, 0);
      },
      { key, ammo, previousVersion },
    );
    await page.reload();
    await ready();
    await page.locator("#inventory-section").selectOption("Field upgrades");
    assert.deepEqual(await ordered(), names);
    assert.equal(
      await page
        .locator('[data-field="inventory"][data-id="' + ammo + '"]')
        .inputValue(),
      "7",
    );
    const before = (await saved(key)).value;
    await page.goto(url("needed"));
    await ready();
    assert(await page.locator("#budget-setup").isVisible());
    await page.locator("#budget-setup").click();
    await page.locator("#budget-setup-cancel").click();
    assert.equal((await saved(key)).value.contentVersion, previousVersion);
    await page.locator("#budget-setup").click();
    await page.locator("#budget-setup-confirm").click();
    await page.waitForFunction(
      async (key) =>
        (await (await import("/assets/src/storage/store.mjs")).loadProfile(key))
          .value.contentVersion ===
        (await import("/assets/src/client/common.mjs")).state.pack
          .contentVersion,
      key,
    );
    const updated = await saved(key);
    for (const field of [
      "inventory",
      "reserves",
      "itemBlueprints",
      "completion",
      "goals",
      "spendHistory",
    ])
      assert.deepEqual(updated.value[field], before[field]);
    assert.equal(updated.previous.contentVersion, previousVersion);
    await page.goto(url("inventory"));
    await ready();
    await page.locator("#inventory-section").selectOption("Field upgrades");
    assert.deepEqual(await ordered(), names);
    const quantity = page.locator(
      '[data-field="inventory"][data-id="' + utility + '"]',
    );
    await quantity.fill("3");
    await revealTrackerControl(page, "#inventory-sort");
    await page.locator("#inventory-sort").selectOption("rarity");
    assert.equal(await quantity.inputValue(), "3");
    await page.locator("#inventory-sort").selectOption("name");
    assert.deepEqual(await ordered(), names);
    await page
      .getByRole("button", { name: "Save inventory", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".inventory-save-bar").dataset.dirty === "false",
    );
    await page.reload();
    await ready();
    await page.locator("#inventory-section").selectOption("Field upgrades");
    assert.deepEqual(await ordered(), names);
    assert.equal(await quantity.inputValue(), "3");
    assert.equal((await saved(key)).value.itemBlueprints[ammo], true);
    for (const theme of ["dark", "light"]) {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      for (const [width, height] of [
        [320, 400],
        [390, 844],
        [667, 375],
        [1280, 800],
        [1440, 900],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          key + " " + theme + " overflow " + width,
        );
      }
    }
    if (engine.name() !== "webkit") {
      await page
        .locator('[data-inventory-group="Field upgrades"]')
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path:
          ".local/field-upgrades/screenshots/" +
          key.split(":")[0] +
          "-" +
          engine.name() +
          ".png",
      });
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS 21 Field upgrades in requested order for both catalogs; missing boxes editable/save/reload; old-version cancel/rebind with quantities/reserves/blueprints/history intact; rarity-mode drafts; both themes/mobile and clean console.",
  );
} finally {
  await context.close();
  await browser.close();
}
