import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { pathToFileURL } from "node:url";
import { tieredUpgradeFixture } from "../helpers/upgrade-families.mjs";
export async function runTieredUpgradeTests({ browser, base }) {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
  const family = (id) => page.locator(`[data-upgrade-family-id="${id}"]`);
  const current = (id) =>
    family(id).locator(":scope > article [data-complete-upgrade]");
  const complete = async (id) => {
    await page.locator(`[data-complete-upgrade="${id}"]`).click();
    await page.locator("#upgrade-progress-apply").click();
    await page.waitForFunction(
      () => !document.querySelector("#upgrade-progress-confirm").open,
    );
  };
  const go = async (route) => {
    await page.goto(`${base}/${route}/?pack=qa044%3Aupgrade-tiers`);
    await ready();
  };
  const item = "demo:wire";
  const cell = (scope) =>
    page.locator(`[data-upgrade-need="${scope}"][data-item="${item}"]`);
  const values = async (scope, required, missing) => {
    assert.equal(
      await cell(scope).locator("[data-tier-required]").textContent(),
      String(required),
    );
    assert.equal(
      await cell(scope).locator("[data-tier-missing]").textContent(),
      String(missing),
    );
  };
  try {
    await page.goto(`${base}/inventory/?pack=demo%3Atraining-pack`);
    await ready();
    await page.evaluate(async (pack) => {
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      validatePack(
        pack,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      const { commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
      const profile = newProfile(pack);
      profile.inventory[pack.items[0].id] = 0;
      await saveProfile(profile, 0);
    }, tieredUpgradeFixture());
    await go("upgrades");
    assert.equal(await page.locator(".upgrade-family").count(), 2);
    assert.equal(await page.locator(".compact-progress").count(), 2);
    assert.equal(
      await current("tier:bank-i").getAttribute("data-complete-upgrade"),
      "tier:bank-i",
    );
    await family("tier:bank-i").locator(":scope > details > summary").click();
    assert.deepEqual(
      await family("tier:bank-i")
        .locator("[data-tier-family] [data-complete-upgrade]")
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.completeUpgrade)),
      ["tier:bank-ii", "tier:bank-iii"],
    );
    assert.equal(
      await page
        .locator('[id^="progress-detail-"]')
        .evaluateAll(
          (nodes) => new Set(nodes.map((n) => n.id)).size === nodes.length,
        ),
      true,
    );
    await complete("tier:bank-ii");
    assert.equal(
      await current("tier:bank-i").getAttribute("data-complete-upgrade"),
      "tier:bank-i",
      "higher completed does not skip lower",
    );
    await complete("tier:bank-i");
    assert.equal(
      await current("tier:bank-i").getAttribute("data-complete-upgrade"),
      "tier:bank-iii",
    );
    await page.locator("#upgrade-undo").click();
    await page.locator("#upgrade-progress-apply").click();
    await page.waitForFunction(
      () =>
        document.querySelector(
          '[data-upgrade-family-id="tier:bank-i"] > article [data-complete-upgrade]',
        )?.dataset.completeUpgrade === "tier:bank-i",
    );
    await page.reload();
    await ready();
    assert.equal(
      await current("tier:bank-i").getAttribute("data-complete-upgrade"),
      "tier:bank-i",
    );
    await page.locator("#progress-query").fill("Bank III");
    assert.equal(await page.locator(".upgrade-family").count(), 1);
    assert.equal(
      await current("tier:bank-i").getAttribute("data-complete-upgrade"),
      "tier:bank-i",
      "filter cannot replace true current tier",
    );
    await page.locator("#progress-clear").click();
    await go("inventory");
    await values("next", 7, 7);
    await values("all", 41, 41); // II completed, I restored unknown
    await page.locator("#inventory-view").selectOption("needed");
    assert.equal(await page.locator("[data-inventory-item]").count(), 1);
    const stock = page.locator(`[data-field="inventory"][data-id="${item}"]`);
    await stock.scrollIntoViewIfNeeded();
    await stock.focus();
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const before = await stock.boundingBox();
    await stock.fill("100");
    await values("next", 7, 0);
    await values("all", 41, 0);
    assert.deepEqual(
      await stock.boundingBox(),
      before,
      "valid quantity edits preserve input geometry",
    );
    await page.locator('#inventory-form button[type="submit"]').click();
    await page.waitForFunction(() =>
      document
        .querySelector("#save-status")
        ?.textContent.includes("Saved locally"),
    );
    await page.reload();
    await ready();
    await page.locator("#inventory-view").selectOption("needed");
    assert.equal(
      await page.locator("[data-inventory-item]").count(),
      1,
      "covered materials remain needed until unfinished uses complete",
    );
    await values("all", 41, 0);
    await stock.fill("5");
    await values("all", 41, 36);
    await page.locator("#cancel-inventory").click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-field="inventory"][data-id="demo:wire"]')
          ?.value === "100",
    );
    await values("all", 41, 0);
    assert.equal(await stock.inputValue(), "100");
    await page.locator("#inventory-view").selectOption("upgrade-next");
    assert.equal(await page.locator("[data-inventory-item]").count(), 1);
    for (const width of [1920, 1440, 900, 768, 390, 320])
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (t) => (document.documentElement.dataset.theme = t),
          theme,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `inventory overflow${width}/${theme}`,
        );
      }
    await page.setViewportSize({ width: 1920, height: 1000 });
    const controls = page.locator(
      `[data-inventory-item="${item}"] .stock-steps button`,
    );
    for (const control of await controls.all()) {
      const box = await control.boundingBox();
      assert(
        box.width >= 43.9 && box.height >= 43.9,
        "wide stock steppers remain44px targets",
      );
    }
    const inputBox = await stock.boundingBox();
    assert(
      inputBox.width >= 85,
      "owned input retains readable number width beside steppers",
    );
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    assert(
      (await stock.boundingBox()).width >= 160,
      "large text keeps full owned input readable beside/wrapped above steppers",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "wide200% overflow",
    );
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "inventory200%overflow",
    );
    await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    await go("upgrades");
    // Complete remaining current tiers through the real status-only UI.
    for (const group of ["tier:bank-i", "tier:stash-i"])
      for (let i = 0; i < 3; i++) {
        const header = await family(group).locator(":scope > h2").textContent();
        if (header.includes("All listed tier identities recorded completed"))
          break;
        const id = await current(group).getAttribute("data-complete-upgrade");
        await complete(id);
      }
    assert(
      (
        await family("tier:bank-i").locator(":scope > h2").textContent()
      ).includes("All listed tier identities recorded completed"),
    );
    await go("inventory");
    await page.locator("#inventory-view").selectOption("needed");
    assert.equal(await page.locator("[data-inventory-item]").count(), 0);
    await page.locator("#inventory-view").selectOption("all");
    await values("all", "-", "-");
    assert.equal(
      await page
        .locator(`[data-id="${item}"][data-field="inventory"]`)
        .inputValue(),
      "100",
    );
    assert.equal(
      await page.evaluate(async () => {
        const { state } = await import("/assets/src/client/common.mjs");
        return state.profile.goals.length;
      }),
      0,
    );
    // Fictional long family proves lazy bounded tier pagination and unique controls.
    const longPack = tieredUpgradeFixture(),
      seed = longPack.objectives[0];
    longPack.id = "qa044:long-family";
    longPack.title = "FICTIONAL QA044 long family";
    const roman = (number) => {
      let value = "";
      for (const [n, letters] of [
        [1000, "M"],
        [900, "CM"],
        [500, "D"],
        [400, "CD"],
        [100, "C"],
        [90, "XC"],
        [50, "L"],
        [40, "XL"],
        [10, "X"],
        [9, "IX"],
        [5, "V"],
        [4, "IV"],
        [1, "I"],
      ])
        while (number >= n) {
          value += letters;
          number -= n;
        }
      return value;
    };
    longPack.objectives = Array.from({ length: 151 }, (_, i) => ({
      ...structuredClone(seed),
      id: `long:tier-${i}`,
      name: `Long family ${roman(i + 1)}`,
      upgrade: {
        ...seed.upgrade,
        tierLabel: roman(i + 1),
        observationKeys: [`long-${i}`],
      },
    }));
    await page.evaluate(async (pack) => {
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      validatePack(
        pack,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      const { commitRecord } = await import("/assets/src/storage/store.mjs");
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
    }, longPack);
    await page.goto(`${base}/upgrades/?pack=qa044%3Along-family`);
    await ready();
    assert.equal(await page.locator(".compact-progress").count(), 1);
    await page.locator("[data-toggle-tier-family]").click();
    assert.equal(await page.locator(".compact-progress").count(), 51);
    await page.getByRole("button", { name: "Next tiers", exact: true }).click();
    assert.equal(await page.locator(".compact-progress").count(), 51);
    assert.equal(
      await page
        .locator("[data-tier-family] [data-complete-upgrade]")
        .first()
        .getAttribute("data-complete-upgrade"),
      "long:tier-51",
    );
    await page.getByRole("button", { name: "Next tiers", exact: true }).click();
    assert.equal(await page.locator(".compact-progress").count(), 51);
    assert.equal(
      await page
        .getByRole("button", { name: "Next tiers", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page
        .locator('[id^="progress-detail-"]')
        .evaluateAll(
          (nodes) => new Set(nodes.map((n) => n.id)).size === nodes.length,
        ),
      true,
    );
    await page.locator("[data-toggle-tier-family]").click();
    assert.equal(await page.locator(".compact-progress").count(), 1);
    const partialPack = tieredUpgradeFixture();
    partialPack.id = "qa044:partial-needs";
    partialPack.title = "FICTIONAL QA044 partial costs";
    partialPack.objectives = partialPack.objectives.filter(
      (r) => r.id === "tier:bank-i",
    );
    partialPack.objectives[0].requirementsKnown = false;
    await page.evaluate(async (pack) => {
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      validatePack(
        pack,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      const { commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
      const profile = newProfile(pack);
      profile.inventory[pack.items[0].id] = 0;
      await saveProfile(profile, 0);
    }, partialPack);
    await page.goto(`${base}/inventory/?pack=qa044%3Apartial-needs`);
    await ready();
    await values("next", 5, 5);
    assert(
      (
        await cell("next").locator("[data-tier-uncertainty]").textContent()
      ).includes("Partial / unknown"),
    );
    assert.equal(
      await cell("next").locator("[data-tier-uncertainty]").isVisible(),
      true,
      "partial facts qualified in collapsed row",
    );
    assert.deepEqual(errors, []);
    console.log(
      browser.browserType().name(),
      "044 tier grouping/current/undo/filter/draft/required/missing/coveredmembership/completion/themes PASS",
    );
  } finally {
    await context.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  for (const engine of [chromium, firefox, webkit]) {
    const browser = await engine.launch();
    try {
      await runTieredUpgradeTests({
        browser,
        base: process.env.TEST_BASE || "http://127.0.0.1:4173",
      });
    } finally {
      await browser.close();
    }
  }
}
