import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
import { revealTrackerControl } from "./tracker-controls.mjs";
const engine = { chromium, firefox, webkit }[process.env.BROWSER || "chromium"];
const browser = await engine.launch(),
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  }),
  page = await context.newPage();
const base = process.env.TEST_BASE || "http://127.0.0.1:4173",
  pack = "official:mw4-dmz-starter";
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
const settle = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
const saved = () =>
  page.evaluate(async () =>
    (await import("/assets/src/storage/store.mjs")).loadProfile(
      "official:mw4-dmz-starter",
    ),
  );
try {
  await mkdir(".local/quick-entry/needed-layout", { recursive: true });
  await page.goto(base + "/needed/?pack=" + encodeURIComponent(pack));
  await ready();
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const profile = newProfile(state.pack);
    profile.inventory["mw4:dmz-cash"] = 50000;
    profile.inventory["mw4:ingredient-cpu"] = 7;
    await saveProfile(profile, 0);
  });
  await page.reload();
  await ready();
  const original = await saved();
  const expected = await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { upgradeBudget } = await import("/assets/src/domain/upgrade-budget.mjs");
    return upgradeBudget(state.pack, state.profile)
      .items.filter((row) => row.missing !== 0)
      .slice(0, 50)
      .map((row) => ({ id: row.id, held: row.held, missing: row.missing }));
  });
  assert(expected.length > 0);
  assert.equal(await page.locator("#needed-list table").count(), 0);
  assert.equal(
    await page.locator("[data-needed-item]").count(),
    expected.length,
  );
  for (const row of expected) {
    const item = page.locator('[data-needed-item="' + row.id + '"]');
    const read = (key) =>
      item
        .locator("[data-needed-" + key + "]")
        .evaluate((node) => node.firstChild.textContent.replaceAll(",", ""));
    assert.equal(
      await read("held"),
      row.held === null ? "Not entered / unknown" : String(row.held),
    );
    assert.equal(
      await read("missing"),
      row.missing === null ? "Not entered / unknown" : String(row.missing),
    );
  }
  const categoryGroup = page
    .locator("#needed-list [data-needed-category]")
    .first();
  const categoryName = await categoryGroup.getAttribute("data-needed-category");
  await categoryGroup.locator(":scope > summary").click();
  await settle();
  await page.locator("#needed-query").fill("No matching synthetic name");
  await page.locator("#needed-query").fill("");
  assert.equal(
    await page
      .locator('#needed-list [data-needed-category="' + categoryName + '"]')
      .evaluate((node) => node.open),
    false,
  );
  await page.locator("#needed-expand").click();
  await settle();
  const first = page.locator("[data-needed-item]").first(),
    id = await first.getAttribute("data-needed-item"),
    handle = await first.elementHandle();
  await page.locator("#needed-collapse").click();
  await settle();
  assert(!(await first.isVisible()));
  assert(await handle.evaluate((node) => node.isConnected));
  await page.locator("#needed-expand").click();
  await settle();
  assert(await first.isVisible());
  assert(await handle.evaluate((node) => node.isConnected));
  await first
    .getByRole("button", { name: "Calculation / printing", exact: true })
    .click();
  assert.equal(
    await first.locator("[data-needed-toggle]").getAttribute("aria-expanded"),
    "true",
  );
  assert(
    await first
      .getByRole("link", { name: "Edit global stock", exact: true })
      .isVisible(),
  );
  await page.locator("#needed-query").fill("No matching synthetic name");
  assert.equal(await page.locator("[data-needed-item]").count(), 0);
  await page.locator("#needed-query").fill("");
  assert.equal(
    await page
      .locator('[data-needed-item="' + id + '"] [data-needed-toggle]')
      .getAttribute("aria-expanded"),
    "true",
  );
  await page.locator("#needed-category").selectOption("Currency");
  const ids = await page
    .locator("[data-needed-item]")
    .evaluateAll((nodes) => nodes.map((node) => node.dataset.neededItem));
  assert(ids.length > 0);
  assert(
    await page.evaluate(async (ids) => {
      const { state } = await import("/assets/src/client/common.mjs");
      return ids.every(
        (id) =>
          state.pack.items.find((item) => item.id === id)?.kind === "currency",
      );
    }, ids),
  );
  await page.locator("#needed-category").selectOption("");
  for (const theme of ["dark", "light"]) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    for (const [width, height] of [
      [320, 400],
      [390, 844],
      [667, 375],
      [768, 1024],
      [1280, 800],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await settle();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        theme + " overflow " + width,
      );
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    scrollTo(0, 0);
  });
  await settle();
  if (engine.name() !== "webkit")
    await page.screenshot({
      path:
        ".local/quick-entry/needed-layout/desktop-" + engine.name() + ".png",
    });
  await revealTrackerControl(page, "#needed-refresh");
  await page.locator("#needed-refresh").click();
  await ready();
  assert.deepEqual(await saved(), original);
  const item = page.locator('[data-needed-item="' + id + '"]');
  if (await item.locator(".needed-detail").isHidden())
    await item.locator("[data-needed-toggle]").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await item.scrollIntoViewIfNeeded();
  await settle();
  if (engine.name() !== "webkit")
    await page.screenshot({
      path: ".local/quick-entry/needed-layout/mobile-" + engine.name() + ".png",
    });
  await item
    .getByRole("link", { name: "Edit global stock", exact: true })
    .click();
  await ready();
  assert.equal(new URL(page.url()).pathname, "/inventory/");
  assert.equal(new URL(page.url()).searchParams.get("item"), id);
  assert.deepEqual(await saved(), original);
  assert.deepEqual(errors, []);
  console.log(
    "PASS Needed layout: exact budget quantities, named family/type groups, stable expand/collapse, retained detail state, category/search filters, both themes and six viewport sizes, refresh and exact stock edit, unchanged saved profile and clean console.",
  );
} finally {
  await context.close();
  await browser.close();
}
