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
const base = "http://127.0.0.1:4173",
  ready = (p) =>
    p.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
try {
  for (const [pack, id] of [
    ["official:mw4-dmz-starter", "mw4:ingredient-control-unit"],
    ["observed:upgrade-review-20261026", "reported:control-unit"],
  ]) {
    await page.goto(base + "/inventory/?pack=" + encodeURIComponent(pack));
    await ready(page);
    await page.waitForLoadState("networkidle");
    const expected = await page.evaluate(async (id) => {
      const { state } = await import("/assets/src/client/common.mjs"),
        { newProfile } = await import("/assets/src/domain/profile.mjs"),
        { saveProfile } = await import("/assets/src/storage/store.mjs"),
        { upgradeBudget } = await import(
          "/assets/src/domain/upgrade-budget.mjs"
        );
      const p = newProfile(state.pack);
      p.inventory[id] = 7;
      p.reserves[id] = 2;
      await saveProfile(p, 0);
      return upgradeBudget(state.pack, p).items.find((r) => r.id === id)
        .required;
    }, id);
    assert(expected > 0);
    await page.waitForLoadState("networkidle");
    await page.reload();
    await ready(page);
    await page.waitForLoadState("networkidle");
    await page.locator("#inventory-query").fill("Control Unit");
    const cell = () =>
        page
          .locator(`[data-upgrade-need="collection"][data-item="${id}"]`)
          .first(),
      stock = () =>
        page.locator(`[data-field="inventory"][data-id="${id}"]`).first();
    assert(await cell().locator("[data-tier-required]").isVisible());
    assert.equal(
      await cell().locator("[data-tier-required]").innerText(),
      String(expected),
    );
    assert.equal(
      await cell().locator("[data-tier-missing]").innerText(),
      String(expected + 2 - 7),
    );
    await stock().fill("12");
    assert.equal(
      await cell().locator("[data-tier-missing]").innerText(),
      String(expected + 2 - 12),
    );
    await page.locator(`[data-show-use="${id}"]`).first().click();
    const secondary = page
      .locator(`[data-upgrade-need="all"][data-item="${id}"]`)
      .first();
    assert(await secondary.isVisible());
    assert.equal(
      await secondary.locator("[data-tier-required]").innerText(),
      String(expected),
    );
    assert.equal(
      await secondary.locator("[data-tier-missing]").innerText(),
      String(expected + 2 - 12),
    );
    assert.match(
      await secondary.locator("[data-tier-uncertainty]").innerText(),
      /Listed \/ provisional/,
    );
    const collectionText = page
      .locator(`[data-upgrade-needs-detail="${id}"] section`)
      .first();
    assert.match(
      await collectionText.innerText(),
      new RegExp(`Required ${expected}; missing ${expected + 2 - 12}`),
    );
    const review = page
      .locator(`[data-item-detail="${id}"] [data-inventory-review]`)
      .first();
    assert(await review.isVisible());
    assert.match(
      await review.innerText(),
      /complete requirement list has not been confirmed|source-observed requirements/,
    );
    assert(!/Owned quantity is not entered/.test(await review.innerText()));
    const badge = page.locator(`[data-collection-state="${id}"]`).first();
    assert.match(
      await badge.getAttribute("title"),
      /complete requirement list|source-observed requirements/,
    );
    assert(!/Need amount unknown/.test(await badge.getAttribute("title")));
    await page
      .getByRole("button", { name: "Save inventory", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".inventory-save-bar")?.dataset.dirty ===
        "false",
    );
    await page.waitForFunction(
      (id) =>
        [...document.querySelectorAll(`[data-inventory-icon="${id}"]`)].every(
          (cell) => cell.dataset.iconStatus === "available",
        ),
      id,
    );
    await page.waitForLoadState("networkidle");
    await page.reload();
    await ready(page);
    await page.waitForLoadState("networkidle");
    await page.locator("#inventory-query").fill("Control Unit");
    assert.equal(
      await cell().locator("[data-tier-missing]").innerText(),
      String(expected + 2 - 12),
    );
    if (pack.startsWith("official")) {
      for (const [name, total] of [
        ["Detonators", 40],
        ["Power Regulator", 30],
        ["Gold Skull", 35],
      ]) {
        await page.locator("#inventory-query").fill(name);
        const metric = page
          .locator('[data-upgrade-need="collection"]')
          .first()
          .locator("[data-tier-required]");
        assert(await metric.isVisible());
        assert.equal(await metric.innerText(), String(total));
      }
      await page.locator("#inventory-query").fill("Control Unit");
      await mkdir(".local/item-icons/listed", { recursive: true });
      if (engine !== "webkit")
        await page.screenshot({
          path: ".local/item-icons/listed/actual-inventory-" + engine + ".png",
        });
    }
    await page.waitForLoadState("networkidle");
    await page.goto(base + "/needed/?pack=" + encodeURIComponent(pack));
    await ready(page);
    await page.waitForLoadState("networkidle");
    await page.locator("#needed-scope").selectOption("collection");
    await page.locator("#needed-query").fill("Control Unit");
    const row = page.locator(`[data-needed-item="${id}"]`);
    assert(await row.locator("[data-needed-required]").isVisible());
    assert.equal(
      await row.locator("[data-needed-required] .needed-number").innerText(),
      String(expected),
    );
    assert.equal(
      await row.locator("[data-needed-missing] .needed-number").innerText(),
      String(expected + 2 - 12),
    );
    for (const width of [320, 390, 900, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
  }
  await page.evaluate(async () => {
    const { loadProfile, saveProfile } = await import(
      "/assets/src/storage/store.mjs"
    );
    const row = await loadProfile("official:mw4-dmz-starter");
    row.value.contentVersion = "old-catalog";
    await saveProfile(row.value, row.value.revision);
  });
  await page.goto(base + "/inventory/?pack=official%3Amw4-dmz-starter");
  await ready(page);
  await page.waitForLoadState("networkidle");
  assert(await page.locator("#inventory-tracking-update").isVisible());
  assert.match(
    await page.locator("#inventory-plan-warning").innerText(),
    /older catalog/,
  );
  assert.match(
    await page.locator("#inventory-tracking-update").getAttribute("href"),
    /needed.*budget-setup/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS real starter/reference catalog visible numeric Needed/Missing, saved quantity/reserve subtraction, save/reload and Needed agreement; actual starter30/40/30/35 examples; mobile.",
  );
} finally {
  await browser.close();
}
