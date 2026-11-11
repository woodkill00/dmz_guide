import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium",
  b = await { chromium, firefox, webkit }[engine].launch();
const page = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:4173",
  pack = "official:mw4-dmz-starter",
  id = "mw4:ingredient-control-unit",
  url = (p) => `${base}/${p}/?pack=${encodeURIComponent(pack)}`;
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
try {
  await page.goto(url("quick-collect"));
  await ready();
  assert.match(
    await page
      .locator('.quick-tracker-nav a[aria-current="page"]')
      .getAttribute("href"),
    /quick-collect.*pack=official/,
  );
  assert.equal(await page.locator("[data-collect-row]").count(), 45);
  await page.locator("#collect-query").fill("Control Unit");
  const row = page.locator(`[data-collect-row="${id}"]`),
    input = row.locator("input"),
    add = row.getByRole("button", {
      name: "Add found Control Unit",
      exact: true,
    });
  assert.equal(await row.locator("[data-collect-remaining]").innerText(), "30");
  await input.fill("7");
  await add.click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.inventory["mw4:ingredient-control-unit"] === 7,
  );
  assert.equal(await row.locator("[data-collect-remaining]").innerText(), "23");
  await input.fill("-1");
  await add.click();
  assert.equal((await saved()).inventory[id], 7);
  assert.equal(await input.inputValue(), "-1");
  await input.fill("23");
  const before = await row.boundingBox();
  await add.click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.inventory["mw4:ingredient-control-unit"] === 30,
  );
  assert(await row.isVisible());
  assert.equal(await row.locator("[data-collect-remaining]").innerText(), "0");
  const after = await row.boundingBox();
  assert(Math.abs(before.y - after.y) < 2, "Covered row stays in place");
  await page.locator("#collect-undo").click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.inventory["mw4:ingredient-control-unit"] === 7,
  );
  assert.equal(await row.locator("[data-collect-remaining]").innerText(), "23");
  await input.fill("1");
  await row.locator("form").evaluate((f) => {
    f.requestSubmit();
    f.requestSubmit();
  });
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.inventory["mw4:ingredient-control-unit"] === 8,
  );
  await page.waitForFunction(
    () =>
      document.querySelector(
        '[data-collect-row="mw4:ingredient-control-unit"] [data-collect-remaining]',
      )?.textContent === "22",
  );
  await page.waitForFunction(
    () =>
      document.querySelector(
        '[data-inventory-icon="mw4:ingredient-control-unit"]',
      )?.dataset.iconStatus === "available",
  );
  await page.waitForLoadState("networkidle");
  await page.reload();
  await ready();
  await page.locator("#collect-query").fill("Control Unit");
  assert.equal(await row.locator("[data-collect-remaining]").innerText(), "22");
  await page.waitForLoadState("networkidle");
  await page.goto(url("inventory"));
  await ready();
  await page.locator("#inventory-query").fill("Control Unit");
  await page.waitForFunction(
    () =>
      document.querySelector(
        '[data-inventory-icon="mw4:ingredient-control-unit"]',
      )?.dataset.iconStatus === "available",
  );
  assert.equal(
    await page
      .locator(`[data-field="inventory"][data-id="${id}"]`)
      .first()
      .inputValue(),
    "8",
  );
  await page.waitForLoadState("networkidle");
  await page.goto(url("needed"));
  await ready();
  await page.locator("#needed-query").fill("Control Unit");
  assert.equal(
    await page
      .locator(
        `[data-needed-item="${id}"] [data-needed-missing] .needed-number`,
      )
      .innerText(),
    "22",
  );
  await page.waitForLoadState("networkidle");
  await page.goto(url("quick-collect"));
  await ready();
  await mkdir(".local/item-icons/quick-collect", { recursive: true });
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `.local/item-icons/quick-collect/${engine}-${width}.png`,
      });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS Quick collect45 items, add/invalid/zero-row stability/undo, duplicate in-flight guard, saved reload and Inventory/Needed agreement, mobile: " +
      engine,
  );
} finally {
  await b.close();
}
