import { revealTrackerControl } from "./tracker-controls.mjs";
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
const base = process.env.TEST_BASE || "http://127.0.0.1:4173";
const id = "official:mw4-dmz-starter",
  cash = "mw4:dmz-cash";
async function ready(page) {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
}
const saved = (page) =>
  page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      ).value,
  );
for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  try {
    for (const legacy of [false, true]) {
      const context = await browser.newContext(),
        page = await context.newPage();
      try {
        await page.goto(base + "/inventory/?pack=" + encodeURIComponent(id));
        await ready(page);
        await page.evaluate(async (legacy) => {
          const { state } = await import("/assets/src/client/common.mjs"),
            { newProfile } = await import("/assets/src/domain/profile.mjs"),
            { saveProfile } = await import("/assets/src/storage/store.mjs");
          const profile = newProfile({
            ...state.pack,
            schemaVersion: legacy ? 1 : 2,
          });
          profile.inventory["mw4:dmz-cash"] = 42;
          profile.inventory["mw4:metals"] = 7;
          await saveProfile(profile, 0);
        }, legacy);
        await page.reload();
        await ready(page);
        await page.locator("#inventory-query").fill("cash");
        const amount = page.locator(
            `[data-field="inventory"][data-id="${cash}"]`,
          ),
          reserve = page.locator(`[data-field="reserves"][data-id="${cash}"]`);
        const save = () =>
          page
            .getByRole("button", { name: "Save inventory", exact: true })
            .click();
        for (const input of ["6,209,662", "6209662"]) {
          const revision = (await saved(page)).revision;
          await amount.fill(input);
          await revealTrackerControl(
            page,
            `[data-field="reserves"][data-id="${cash}"]`,
          );
          await reserve.fill("6,200,000");
          await save();
          if (legacy && input.includes(",")) {
            await page
              .locator("#currency-format-confirm")
              .waitFor({ state: "visible" });
            await page.locator("#confirm-currency-format").click();
          }
          await page.waitForFunction(
            async (revision) =>
              (
                await (
                  await import("/assets/src/storage/store.mjs")
                ).loadProfile("official:mw4-dmz-starter")
              ).value.revision > revision,
            revision,
          );
          await ready(page);
          const profile = await saved(page);
          assert.equal(profile.inventory[cash], 6209662);
          assert.equal(profile.reserves[cash], 6200000);
          assert.equal(profile.inventory["mw4:metals"], 7);
          assert.equal(profile.schemaVersion, 3);
          await page.reload();
          await ready(page);
          await page.locator("#inventory-query").fill("cash");
          assert.equal(await amount.inputValue(), "6,209,662");
          assert.equal(await reserve.inputValue(), "6,200,000");
        }
        await amount.fill("999,999,999");
        const revision = (await saved(page)).revision;
        await save();
        await page.waitForFunction(
          async (revision) =>
            (
              await (
                await import("/assets/src/storage/store.mjs")
              ).loadProfile("official:mw4-dmz-starter")
            ).value.revision > revision,
          revision,
        );
        await ready(page);
        assert.equal((await saved(page)).inventory[cash], 999999999);
        for (const invalid of ["1,000,000,000", "6,20,9662", "-1", "1.5"]) {
          await amount.fill(invalid);
          await save();
          await page.locator("#error").waitFor({ state: "visible" });
          assert.equal((await saved(page)).inventory[cash], 999999999);
          assert.equal(await amount.inputValue(), invalid);
        }
      } finally {
        await context.close();
      }
    }
    console.log(
      `${name}: Inventory6209662 grouped/raw saves, reload formatting, reserve/unrelated stock, explicit legacy confirmation, max and invalid-draft retention PASS`,
    );
  } finally {
    await browser.close();
  }
}
