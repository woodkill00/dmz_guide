import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
import { revealTrackerControl } from "./tracker-controls.mjs";
const name = process.env.BROWSER || "chromium",
  b = await { chromium, firefox, webkit }[name].launch();
const page = await b.newPage({ viewport: { width: 1440, height: 1100 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const ready = async () => {
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await page.waitForLoadState("networkidle");
};
const key = "official:mw4-dmz-starter",
  base = "http://127.0.0.1:4173";
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
  await page.goto(base + "/upgrades/?pack=" + encodeURIComponent(key));
  await ready();
  assert.equal(await page.locator(".fob-upgrade-card").count(), 9);
  const id = "mw4:rigid-synthetics";
  const inputs = page.locator(`[data-fob-owned="${id}"]`);
  assert((await inputs.count()) >= 2);
  await inputs.first().fill("7");
  assert.equal(await inputs.nth(1).inputValue(), "7");
  await page.locator(`[data-fob-save="${id}"]`).first().click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.inventory["mw4:rigid-synthetics"] === 7,
  );
  assert.equal(
    (await saved()).upgradeProgress["mw4:upgrade-stash-item-upgrade-i"]
      ?.completion,
    undefined,
  );
  assert.match(
    await page.locator(`[data-fob-material="${id}"]`).first().innerText(),
    /3 missing/,
  );
  await page.locator(`[data-fob-step="1"][data-item="${id}"]`).first().click();
  await page.waitForFunction(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value.inventory["mw4:rigid-synthetics"] === 8,
  );
  await inputs.first().fill("-1");
  await page.locator(`[data-fob-save="${id}"]`).first().click();
  assert.equal((await saved()).inventory[id], 8);
  assert(await page.locator("#error").isVisible());
  assert.equal(await inputs.first().inputValue(), "-1");
  await inputs.first().press("Escape");
  assert.equal(await inputs.first().inputValue(), "8");
  await inputs.first().fill("10");
  await page.locator(`[data-fob-cancel="${id}"]`).first().click();
  assert.equal(await inputs.first().inputValue(), "8");
  assert.equal((await saved()).inventory[id], 8);
  await inputs.first().fill("9");
  await page.getByRole("link", { name: "Needed", exact: true }).first().click();
  await page.locator("#draft-save").click();
  await page.waitForURL("**/needed/**");
  await ready();
  assert.equal((await saved()).inventory[id], 9);
  await page.goto(base + "/upgrades/?pack=" + encodeURIComponent(key));
  await ready();
  assert.equal(await inputs.first().inputValue(), "9");
  await revealTrackerControl(page, "#upgrade-layout");
  await page.locator("#upgrade-layout").selectOption("flat");
  assert.equal(await page.locator(".fob-upgrade-card").count(), 34);
  await page.locator("#upgrade-layout").selectOption("grouped");
  assert.equal(await page.locator(".fob-upgrade-card").count(), 9);
  await mkdir(".local/item-icons/fob-layout", { recursive: true });
  for (const width of [1920, 1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    const tier = await page
      .locator(".fob-upgrade-card .upgrade-manual > small")
      .first()
      .boundingBox();
    assert(tier && tier.height < 35, "Tier stays readable as a whole label");
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `.local/item-icons/fob-layout/${name}-${width}.png`,
        fullPage: true,
      });
    if (width === 390)
      await page
        .locator(".fob-upgrade-card")
        .first()
        .screenshot({
          path: `.local/item-icons/fob-layout/${name}-card-390.png`,
        });
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.locator("#theme-toggle").click();
  await page.setViewportSize({ width: 320, height: 1100 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.screenshot({
    path: `.local/item-icons/fob-layout/${name}-light-320.png`,
    fullPage: true,
  });
  await page
    .locator(".fob-upgrade-card")
    .first()
    .screenshot({
      path: `.local/item-icons/fob-layout/${name}-card-light-320.png`,
    });
  assert.deepEqual(errors, []);
  console.log(
    "PASS FOB card costs, shared saved stock, stepper, invalid retention, cancel, guarded navigation save, reload and responsive widths: " +
      name,
  );
} finally {
  await b.close();
}
