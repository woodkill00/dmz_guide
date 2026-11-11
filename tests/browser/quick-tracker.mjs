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
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const url = (path) => base + "/" + path + "/?pack=" + encodeURIComponent(pack);
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
const field = (id) =>
  page.locator('[data-field="inventory"][data-id="' + id + '"]');
const saved = () =>
  page.evaluate(async () =>
    (await import("/assets/src/storage/store.mjs")).loadProfile(
      "official:mw4-dmz-starter",
    ),
  );
const settle = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
try {
  await mkdir(".local/quick-entry/screenshots", { recursive: true });
  await page.goto(url("inventory"));
  await ready();
  await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { newProfile } = await import("/assets/src/domain/profile.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    await saveProfile(newProfile(state.pack), 0);
  });
  await page.reload();
  await ready();
  assert.equal(
    await page
      .getByRole("navigation", { name: "Quick tracker", exact: true })
      .count(),
    1,
  );
  const initialRows = await page
    .locator("[data-inventory-item]")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        id: n.dataset.inventoryItem,
        name: n.querySelector(".inventory-name a").textContent,
      })),
    );
  assert(initialRows.length <= 50);
  await field(initialRows[0].id).focus();
  await field(initialRows[0].id).press("Enter");
  assert.equal(
    await page.evaluate(() => document.activeElement?.dataset.id),
    initialRows[1].id,
  );
  // Enter ten independent values with keyboard navigation; filtering never commits or drops earlier drafts.
  for (const [index, item] of initialRows.slice(0, 10).entries()) {
    await page.locator("#inventory-query").fill(item.name);
    await field(item.id).fill(String(index + 1));
    await field(item.id).press("Tab");
  }
  assert.equal((await saved()).value.inventory[initialRows[0].id], undefined);
  const first = initialRows[0];
  await page.locator("#inventory-query").fill(first.name);
  const inputHandle = await field(first.id).elementHandle(),
    plus = page.locator('[data-stock-step="1"][data-id="' + first.id + '"]');
  await plus.scrollIntoViewIfNeeded();
  const rect = await plus.boundingBox();
  for (let i = 0; i < 20; i++) await plus.click();
  assert.equal(await field(first.id).inputValue(), "21");
  assert.deepEqual(await plus.boundingBox(), rect);
  assert(await inputHandle.evaluate((n) => n.isConnected));
  await page
    .locator(".quick-tracker-nav a")
    .filter({ hasText: "Upgrades" })
    .click();
  await page.locator("#draft-navigation").waitFor({ state: "visible" });
  await page.locator("#draft-stay").click();
  assert.equal(new URL(page.url()).pathname, "/inventory/");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  assert(await inputHandle.evaluate((n) => n.isConnected));
  let record = await saved();
  for (const [index, item] of initialRows.slice(0, 10).entries())
    assert.equal(record.value.inventory[item.id], index ? index + 1 : 21);
  await page.reload();
  await ready();
  await page.locator("#inventory-query").fill(first.name);
  assert.equal(await field(first.id).inputValue(), "21");
  await page.locator('[data-show-use="' + first.id + '"]').click();
  const reserve = page.locator(
    '[data-field="reserves"][data-id="' + first.id + '"]',
  );
  await reserve.fill("-1");
  await page.locator('[data-show-use="' + first.id + '"]').click();
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    (id) => document.activeElement?.dataset.id === id,
    first.id,
  );
  assert(await reserve.isVisible());
  assert.equal(await reserve.inputValue(), "-1");
  await reserve.fill("0");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  // A concurrent writer must not be overwritten; all raw edits remain available.
  await page.evaluate(async () => {
    const { loadProfile, saveProfile } = await import(
      "/assets/src/storage/store.mjs"
    );
    const r = await loadProfile("official:mw4-dmz-starter");
    await saveProfile(r.value, r.value.revision);
  });
  await field(first.id).fill("55");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(() => !document.querySelector("#error").hidden);
  assert.equal(await field(first.id).inputValue(), "55");
  assert.equal((await saved()).value.inventory[first.id], 21);
  await page.locator("#cancel-inventory").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".inventory-save-bar")?.dataset.dirty === "false",
  );
  await page.reload();
  await ready();
  await page.locator("#inventory-query").fill("");
  await page.evaluate(() => scrollTo(0, 0));
  await settle();
  assert.match(
    await page.locator("[data-tracker-context-label]").innerText(),
    /source-backed starter reference/,
  );
  for (const [width, height] of [
    [1280, 800],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    await settle();
    const visible = await page.locator('[data-field="inventory"]').evaluateAll(
      (nodes) =>
        nodes.filter((n) => {
          const r = n.getBoundingClientRect();
          return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight;
        }).length,
    );
    assert(
      visible >= 6,
      "Inventory first viewport " + width + ": " + visible + " actionable rows",
    );
  }
  if (engine.name() !== "webkit")
    await page.screenshot({
      path:
        ".local/quick-entry/screenshots/inventory-" + engine.name() + ".png",
    });
  // Existing armory acquisition identities, stable row controls, immediate save and reload.
  await page.goto(base + "/armory/workbench/#acquisition");
  await page.waitForFunction(
    () =>
      document.querySelector("main")?.dataset.armoryRevision === "0" &&
      document.querySelector("[data-roster-manual]") &&
      !document.querySelector("[data-roster-manual]").disabled,
  );
  assert.equal(await page.locator("[data-roster-manual]").count(), 33);
  const manual = page.locator("[data-roster-manual]").first(),
    id = await manual.getAttribute("data-roster-manual"),
    handle = await manual.elementHandle();
  await manual.check();
  await page.waitForFunction(
    () => document.querySelector("main").dataset.armoryRevision === "1",
  );
  assert(await handle.evaluate((n) => n.isConnected));
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector("main")?.dataset.armoryRevision === "1",
  );
  assert(await page.locator('[data-roster-manual="' + id + '"]').isChecked());
  await page.locator("#acquisition-show").selectOption("missing");
  assert(
    !(await page.locator('[data-acquisition-weapon="' + id + '"]').isVisible()),
  );
  await page.locator("#acquisition-show").selectOption("all");
  await page.locator('[data-inspect-acquisition="' + id + '"]').click();
  assert.equal(await page.locator("#tracker-weapon").inputValue(), id);
  assert(await page.locator("#tracker-manual").isChecked());
  await page.locator("[data-owned-attachment]").first().check();
  await page.waitForFunction(
    () => document.querySelector("main").dataset.armoryRevision === "2",
  );
  assert.match(
    await page
      .locator(
        '[data-acquisition-weapon="' + id + '"] [data-acquisition-counts]',
      )
      .innerText(),
    /^1 attachments/,
  );
  for (const [width, height] of [
    [320, 400],
    [390, 844],
    [667, 375],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width, height });
    await settle();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Weapon acquisition overflow at " + width,
    );
  }
  // Each full page must retain navigation and reflow without document overflow.
  for (const path of ["inventory", "upgrades", "needed"]) {
    await page.goto(url(path));
    await ready();
    if (path === "upgrades") {
      for (const [width, height] of [
        [1280, 800],
        [1440, 900],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => scrollTo(0, 0));
        await settle();
        const count = await page
          .locator(".upgrade-family .upgrade-summary")
          .evaluateAll(
            (nodes) =>
              nodes.filter((n) => {
                const r = n.getBoundingClientRect();
                return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight;
              }).length,
          );
        assert(
          count >= 3,
          "Upgrade first viewport " +
            width +
            ": " +
            count +
            " family summaries",
        );
      }
    }
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
        [1920, 1080],
      ]) {
        await page.setViewportSize({ width, height });
        await settle();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          path + " " + theme + " overflow at " + width + "x" + height,
        );
      }
    }
    if (path === "upgrades") {
      await page
        .locator(".upgrade-family details[data-progress-detail] > summary")
        .first()
        .click();
      await page
        .getByRole("link", { name: "Edit global stock", exact: true })
        .first()
        .waitFor({ state: "visible" });
    } else if (path === "inventory")
      await page.locator("[data-show-use]").first().click();
    else
      await page
        .getByText("Calculation / printing", { exact: true })
        .first()
        .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await settle();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path + " expanded details overflow",
    );
    if (engine.name() !== "webkit")
      await page.screenshot({
        path:
          ".local/quick-entry/screenshots/" +
          path +
          "-" +
          engine.name() +
          ".png",
      });
  }
  await page.goto(url("needed"));
  await ready();
  const math = page
    .getByText("Calculation / printing", { exact: true })
    .first();
  if (await math.count()) {
    await math.click();
    await page
      .getByRole("link", { name: "Edit global stock", exact: true })
      .first()
      .click();
    await ready();
    assert(new URL(page.url()).searchParams.has("item"));
    assert((await page.locator("[data-inventory-item]").count()) <= 2);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS quick tracker: ten staged quantities/save/reload, stable repeated increments, hidden-reserve validation recovery, dirty navigation, stale-save retention, six first-viewport rows, 33 manuals with persistent attachment tracking, compact calculations/edit-stock link, responsive pages and clean runtime.",
  );
} finally {
  await context.close();
  await browser.close();
}
