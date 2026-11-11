import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import { revealTrackerControl } from "./tracker-controls.mjs";
const engine = { chromium, firefox, webkit }[process.env.BROWSER || "chromium"];
const browser = await engine.launch(),
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  }),
  page = await context.newPage();
const base = process.env.TEST_BASE || "http://127.0.0.1:4173",
  pack = "official:mw4-dmz-starter",
  item = "mw4:bandage";
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const url = (path) => base + "/" + path + "/?pack=" + encodeURIComponent(pack),
  ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
const owned = () =>
    page.locator('[data-field="inventory"][data-id="' + item + '"]'),
  blueprint = () =>
    page.getByRole("checkbox", {
      name: "Blueprint owned for Bandage",
      exact: true,
    });
const saved = () =>
  page.evaluate(async () =>
    (await import("/assets/src/storage/store.mjs")).loadProfile(
      "official:mw4-dmz-starter",
    ),
  );
const clean = () =>
  page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
const save = () =>
  page.getByRole("button", { name: "Save inventory", exact: true }).click();
try {
  await mkdir(".local/quick-entry/blueprints", { recursive: true });
  await page.goto(url("inventory"));
  await ready();
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const p = newProfile(state.pack);
    p.inventory["mw4:bandage"] = 0;
    p.inventory["mw4:dmz-cash"] = 300;
    await saveProfile(p, 0);
  });
  await page.reload();
  await ready();
  await page.locator("#inventory-query").fill("Bandage");
  assert.equal(await blueprint().count(), 1);
  assert(!(await blueprint().isChecked()));
  const handle = await blueprint().elementHandle();
  await blueprint().scrollIntoViewIfNeeded();
  const before = await blueprint().boundingBox();
  await blueprint().focus();
  await page.keyboard.press("Space");
  assert(await blueprint().isChecked());
  assert.deepEqual(await blueprint().boundingBox(), before);
  assert(await handle.evaluate((node) => node.isConnected));
  assert.equal((await saved()).value.itemBlueprints, undefined);
  await owned().fill("17");
  await page.locator("#inventory-query").fill("CPU");
  await page.locator("#inventory-query").fill("Bandage");
  assert(await blueprint().isChecked());
  assert.equal(await owned().inputValue(), "17");
  await page.locator("#inventory-query").fill("");
  await page.locator("#inventory-next").click();
  await page.locator("#inventory-previous").click();
  assert(await blueprint().isChecked());
  assert.equal((await saved()).value.inventory[item], 0);
  await page
    .locator(".quick-tracker-nav a")
    .filter({ hasText: "Upgrades" })
    .click();
  await page.locator("#draft-navigation").waitFor({ state: "visible" });
  await page.locator("#draft-stay").click();
  await page.locator("#inventory-query").fill("Bandage");
  const live = await blueprint().elementHandle();
  await save();
  await clean();
  assert(await live.evaluate((node) => node.isConnected));
  assert.equal((await saved()).value.itemBlueprints[item], true);
  assert.equal((await saved()).value.inventory[item], 17);
  await page.reload();
  await ready();
  await page.locator("#inventory-query").fill("Bandage");
  assert(await blueprint().isChecked());
  await blueprint().uncheck();
  await owned().fill("-1");
  await save();
  await page.waitForFunction(
    () => document.activeElement?.dataset.id === "mw4:bandage",
  );
  assert(!(await blueprint().isChecked()));
  assert.equal((await saved()).value.itemBlueprints[item], true);
  await page.locator("#cancel-inventory").click();
  await clean();
  assert(await blueprint().isChecked());
  await page.evaluate(async () => {
    const { loadProfile, saveProfile } = await import(
      "/assets/src/storage/store.mjs"
    );
    const row = await loadProfile("official:mw4-dmz-starter");
    row.value.inventory["mw4:bandage"] = 42;
    await saveProfile(row.value, row.value.revision);
  });
  await blueprint().uncheck();
  await owned().fill("19");
  await save();
  await page.waitForFunction(() => !document.querySelector("#error").hidden);
  assert(!(await blueprint().isChecked()));
  assert.equal(await owned().inputValue(), "19");
  assert.equal((await saved()).value.inventory[item], 42);
  assert.equal((await saved()).value.itemBlueprints[item], true);
  await page.locator("#cancel-inventory").click();
  await clean();
  assert(await blueprint().isChecked());
  await revealTrackerControl(page, "#export-current-profile");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#export-current-profile").click(),
  ]);
  const backup = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(backup.itemBlueprints[item], true);
  await blueprint().uncheck();
  await save();
  await clean();
  assert.equal((await saved()).value.itemBlueprints[item], undefined);
  assert.equal((await saved()).value.inventory[item], 42);
  await page.goto(url("settings"));
  await ready();
  await page.locator("#import-profile").setInputFiles({
    name: "synthetic-blueprint-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.locator("#restore-preview").waitFor({ state: "visible" });
  assert.match(
    await page.locator("#restore-summary").innerText(),
    /Item blueprint ownership/,
  );
  await page.locator("#apply-restore").click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      ).value.itemBlueprints?.["mw4:bandage"] === true,
  );
  const restored = await saved();
  assert.equal(restored.value.inventory[item], 42);
  assert.equal(restored.previous.itemBlueprints[item], undefined);
  await page.goto(url("collection"));
  await ready();
  await page.locator("#recipe-query").fill("Bandage");
  const label = page.locator('[data-item-blueprint-for="' + item + '"]');
  await label.waitFor();
  assert.match(await label.innerText(), /Blueprint owned/);
  await page.locator("[data-craft-id]").first().click();
  await page.locator("#craft-dialog").waitFor({ state: "visible" });
  assert.match(
    await page.locator("#craft-preview .item-blueprint-state").innerText(),
    /Blueprint owned/,
  );
  assert(await page.locator("#craft-apply").isDisabled());
  assert.deepEqual(await saved(), restored);
  await page.keyboard.press("Escape");
  await page.goto(url("inventory"));
  await ready();
  await page.locator("#inventory-query").fill("Bandage");
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
        theme + " overflow " + width,
      );
      assert(await blueprint().isChecked());
    }
  }
  if (engine.name() !== "webkit") {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: ".local/quick-entry/blueprints/desktop-" + engine.name() + ".png",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await blueprint().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: ".local/quick-entry/blueprints/mobile-" + engine.name() + ".png",
    });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS item blueprints: keyboard/stable checkbox, shared staged quantity edits, filter/page/departure retention, save/reload/uncheck/cancel/invalid/CAS, actual backup restore and previous snapshot, Collection and craft preview state without bypass, both themes/mobile and clean runtime.",
  );
} finally {
  await context.close();
  await browser.close();
}
