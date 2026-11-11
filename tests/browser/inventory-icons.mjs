import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium",
  browser = await { chromium, firefox, webkit }[engine].launch(),
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = "http://127.0.0.1:4173",
  ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
try {
  await page.goto(base + "/inventory/?pack=official%3Amw4-dmz-starter");
  await ready();
  await page.locator("#inventory-query").fill("Cash");
  assert.equal(
    await page.locator('[data-inventory-icon="mw4:dmz-cash"]').count(),
    1,
  );
  for (const cell of await page.locator("[data-inventory-icon]").all()) {
    assert.match(await cell.innerText(), /Icon needed/);
    assert.equal(await cell.locator("img").count(), 0);
  }
  const row = page.locator(".inventory-entry").first();
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 900, height: 900 },
    { width: 667, height: 375 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    const name = await row.locator(".inventory-name").boundingBox(),
      icon = await row.locator(".inventory-item-icon").boundingBox();
    assert(
      icon.x >= name.x + name.width - 1,
      "icon must be right of item name",
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert(await row.locator(".owned-cell").isVisible());
    assert(await row.locator("[data-show-use]:not([data-kind])").isVisible());
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mkdir(".local/field-upgrades/screenshots", { recursive: true });
  if (engine !== "webkit")
    await page.screenshot({
      path: ".local/field-upgrades/screenshots/icon-missing-" + engine + ".png",
    });
  await page.goto(base + "/inventory/?pack=demo%3Abundled-pictures");
  await ready();
  const icon = page.locator('[data-inventory-icon="demo:picture-token"]');
  await icon.locator("img").waitFor();
  assert.equal(await icon.getAttribute("data-icon-status"), "available");
  assert(
    await icon
      .locator("img")
      .evaluate((img) => img.complete && img.naturalWidth === 8),
  );
  const input = page.locator(
    '[data-field="inventory"][data-id="demo:picture-token"]',
  );
  await input.fill("7");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  await page.reload();
  await ready();
  await icon.locator("img").waitFor();
  assert.equal(await input.inputValue(), "7");
  await page.locator("#inventory-query").fill("missing");
  await page.locator("#inventory-query").fill("");
  await icon.locator("img").waitFor();
  assert.equal(await input.inputValue(), "7");
  if (engine !== "webkit")
    await page.screenshot({
      path:
        ".local/field-upgrades/screenshots/icon-attached-" + engine + ".png",
    });
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { hydrateInventoryIcons } = await import(
        "/assets/src/client/inventory-icons.mjs"
      );
    const pack = structuredClone(state.pack);
    pack.assets.find((a) => a.id === "demo:bundled-token").sha256 = "0".repeat(
      64,
    );
    const cell = document.querySelector("[data-inventory-icon]");
    cell.innerHTML = "<small>Icon needed</small>";
    await hydrateInventoryIcons(pack);
  });
  assert.equal(await icon.getAttribute("data-icon-status"), "missing");
  assert.match(await icon.innerText(), /Icon needed/);
  assert.equal(await input.inputValue(), "7");
  assert.deepEqual(errors, []);
  console.log(
    "PASS icon column beside name across 320–1440px; missing placeholders in base/mirrored rows; real bundled fixture image validates/loads across save/reload/filter; corrupt image falls back without losing controls or quantities.",
  );
} finally {
  await browser.close();
}
