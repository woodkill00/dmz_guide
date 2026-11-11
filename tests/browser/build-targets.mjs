import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
import { loadFixturePack } from "../helpers/catalog.mjs";
const engine = process.env.BROWSER || "chromium",
  browser = await { chromium, firefox, webkit }[engine].launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:4173",
  pack = "official:mw4-dmz-starter",
  url = (p) => `${base}/${p}/?pack=${encodeURIComponent(pack)}`;
const bandage = "mw4:bandage",
  energy = loadFixturePack("official-starter").items.find(
    (i) => i.name === "Energy Drink",
  ).id;
const ready = async () => {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await page.waitForLoadState("networkidle");
};
const saved = () =>
  page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value,
  );
const waitTarget = (id, q) =>
  page.waitForFunction(
    async ([id, q]) => {
      const p = (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value;
      return q == null
        ? !Object.hasOwn(p?.buildTargets || {}, id)
        : p?.buildTargets?.[id] === q;
    },
    [id, q],
  );
try {
  await page.goto(url("inventory"));
  await ready();
  await page.locator("#inventory-query").fill("Bandage");
  const control = page
    .locator(`[data-build-control][data-build-item="${bandage}"]`)
    .first();
  assert(await control.isVisible());
  await control.locator("[data-build-select]").check();
  await control.locator("[data-build-quantity]").fill("2");
  await page
    .getByRole("button", { name: "Cancel inventory edits", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector("#save-status").textContent.includes("canceled"),
  );
  await ready();
  await page.locator("#inventory-query").fill("Bandage");
  assert(!(await control.locator("[data-build-select]").isChecked()));
  await control.locator("[data-build-select]").check();
  await control.locator("[data-build-quantity]").fill("2");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await waitTarget(bandage, 2);
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  await page.waitForLoadState("networkidle");
  await page.goto(url("quick-collect"));
  await ready();
  const group = page.locator(`[data-build-group="${bandage}"]`),
    synthetics = () => group.locator('[data-collect-row="mw4:synthetics"]');
  await group.waitFor({ state: "visible" });
  assert(await group.isVisible());
  assert(await group.evaluate((n) => n.open));
  assert.equal(
    await synthetics().locator("[data-collect-remaining]").innerText(),
    "30",
  );
  assert.equal(
    await group
      .locator(".build-ingredient input, .build-ingredient button")
      .count(),
    0,
  );
  await page.goto(url("inventory"));
  await ready();
  await page.locator("#inventory-query").fill("Synthetics");
  await page
    .locator(
      '[data-inventory-item="mw4:synthetics"] input[data-field="inventory"]',
    )
    .fill("15");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.inventory["mw4:synthetics"] === 15,
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  await page.goto(url("quick-collect"));
  await ready();
  assert.equal(
    await synthetics().locator("[data-collect-remaining]").innerText(),
    "15",
  );
  assert.equal((await saved()).buildTargets[bandage], 2);
  await page.waitForLoadState("networkidle");
  await page.goto(base + "/items/?pack=" + encodeURIComponent(pack));
  await page.locator("#catalog-search").fill("Energy Drink");
  const entry = page.locator(
    `[data-build-control][data-build-pack="${pack}"][data-build-item="${energy}"]`,
  );
  await entry.locator("[data-build-select]").check();
  await waitTarget(energy, 1);
  await entry.locator("[data-build-quantity]").fill("2");
  await entry.locator("[data-build-quantity]").press("Tab");
  await waitTarget(energy, 2);
  assert.equal((await saved()).buildTargets[bandage], 2);
  assert.equal((await saved()).inventory["mw4:synthetics"], 15);
  await page.goto(url("quick-collect"));
  await ready();
  assert(await page.locator('[data-build-group="all"]').isVisible());
  await page.locator('[data-build-group="all"] > summary').click();
  const chemicals = page.locator(
    '[data-build-group="all"] [data-collect-row="mw4:chemicals"] [data-collect-remaining]',
  );
  assert.equal(await chemicals.innerText(), "50");
  await page.goto(url("local") + "&id=" + encodeURIComponent(energy));
  await ready();
  const local = page.locator(
    `[data-build-control][data-build-item="${energy}"]`,
  );
  assert(await local.locator("[data-build-select]").isChecked());
  await local.locator("[data-build-select]").uncheck();
  await waitTarget(energy, null);
  await page.goto(url("quick-collect"));
  await ready();
  assert.equal(await page.locator("[data-build-group]").count(), 1);
  assert.equal((await saved()).buildTargets[bandage], 2);
  await mkdir(".local/item-icons/build-targets", { recursive: true });
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `.local/item-icons/build-targets/${engine}-${width}.png`,
      });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS Inventory staged target/cancel/save, read-only ingredients updated from Inventory, public directory CAS quantity saves, combined two-build totals, private detail remove, persistence and mobile: " +
      engine,
  );
} catch (reason) {
  console.log(
    "Build target test diagnostic",
    await page.evaluate(() => ({
      url: location.href,
      error: document.querySelector("#error")?.textContent,
      build: document.querySelector("#build-collect")?.textContent,
    })),
    (await saved())?.buildTargets,
  );
  throw reason;
} finally {
  await browser.close();
}
