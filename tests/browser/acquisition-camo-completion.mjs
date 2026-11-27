import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173";
const stock = (page) =>
  page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/armory-store.mjs")
        ).readArmory()
      ).value,
  );
async function settled(page, revision) {
  await page.waitForFunction(
    async (revision) =>
      (
        await (
          await import("/assets/src/storage/armory-store.mjs")
        ).readArmory()
      ).value.revision === revision &&
      !document
        .querySelector("[data-acq-camo-complete]:not([disabled])")
        ?.closest('[aria-busy="true"]'),
    revision,
  );
  await page.waitForFunction(
    () =>
      document.querySelector("#weapon-acquisition")?.dataset.busy === "false" ||
      document.querySelector("main")?.dataset.armoryBusy === "false",
  );
}
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch(),
    context = await browser.newContext(),
    page = await context.newPage();
  await context.route(
    "**/assets/src/storage/armory-store.mjs",
    async (route) => {
      const response = await route.fetch();
      let source = (await response.text()).replace(
        "export async function saveArmory",
        "async function originalSaveArmory",
      );
      source +=
        '\nexport async function saveArmory(v,r,o){if(window.__quota)throw Error("Synthetic camo quota failure");return originalSaveArmory(v,r,o)}';
      await route.fulfill({ response, body: source });
    },
  );
  try {
    for (const path of [
      "/armory/workbench/#acquisition",
      "/armory/acquisition/",
    ]) {
      await page.goto(base + path);
      const strip = page.locator('[data-acquisition-camos="m4"]'),
        first = strip.locator('[data-acq-camo="military-camo-1"]'),
        panel = page.locator("#acq-camo-panel-m4"),
        checkbox = panel.locator("[data-acq-camo-complete]");
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-acquisition-camos="m4"] [data-acq-camo]',
          )?.dataset.state !== "unknown",
      );
      await first.click();
      const before = await stock(page);
      await checkbox.check();
      await settled(page, before.revision + 1);
      assert.equal(await first.getAttribute("data-state"), "completed");
      assert.equal(
        await strip
          .locator('[data-acq-camo="military-camo-2"]')
          .getAttribute("data-state"),
        "next",
      );
      assert.ok(await checkbox.isChecked());
      const after = await stock(page);
      for (const key of Object.keys(before).filter(
        (k) => !["revision", "camoCompletions"].includes(k),
      ))
        assert.deepEqual(after[key], before[key]);
      await page.reload();
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-acquisition-camos="m4"] [data-acq-camo="military-camo-1"]',
          )?.dataset.state === "completed",
      );
      await first.click();
      assert.ok(await checkbox.isChecked());
      await strip.locator('[data-acq-camo="divergence"]').click();
      const sharedRev = (await stock(page)).revision;
      await checkbox.check();
      await settled(page, sharedRev + 1);
      assert.ok(
        await page
          .locator('[data-acq-camo="divergence"]')
          .evaluateAll((nodes) =>
            nodes.every((n) => n.dataset.state === "completed"),
          ),
      );
      await page.goto(base + "/armory/camos/");
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-overview-weapon="m4"] [data-overview-camo="military-camo-1"]',
          )?.dataset.state === "completed",
      );
      assert.equal(
        await page
          .locator(
            '[data-overview-weapon="m4"] [data-overview-camo="divergence"]',
          )
          .getAttribute("data-state"),
        "completed",
      );
      await page.goto(base + "/armory/camos/m4/");
      await page.waitForFunction(
        () =>
          document.querySelector('[data-camo-tile="military-camo-1"]')?.dataset
            .state === "completed",
      );
      await page.locator('[data-camo-tile="military-camo-1"]').click();
      await page.locator('[data-camo-complete="military-camo-1"]').uncheck();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-camo-tile="military-camo-1"]')?.dataset
            .state === "next",
      );
      await page.goto(base + path);
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-acquisition-camos="m4"] [data-acq-camo="military-camo-1"]',
          )?.dataset.state === "next",
      );
      await first.click();
      assert.ok(!(await checkbox.isChecked()));
      const failureRev = (await stock(page)).revision;
      await page.evaluate(() => (window.__quota = true));
      await checkbox.click();
      const error = page.locator(
        path.includes("workbench") ? "#armory-error" : "#acq-error",
      );
      await error.filter({ hasText: "quota" }).waitFor();
      assert.equal((await stock(page)).revision, failureRev);
      assert.ok(!(await checkbox.isChecked()));
      assert.ok(await checkbox.isDisabled());
      await page.evaluate(() => (window.__quota = false));
      if (path.includes("workbench"))
        await page.locator('.armory-tabs a[href="#backups"]').click();
      await page
        .locator(path.includes("workbench") ? "#workspace-retry" : "#acq-retry")
        .click();
      await settled(page, failureRev + 1);
      if (path.includes("workbench"))
        await page.locator('.armory-tabs a[href="#acquisition"]').click();
      assert.ok(await checkbox.isChecked());
      assert.ok(await checkbox.isEnabled());
      await checkbox.uncheck();
      await settled(page, failureRev + 2);
      await strip.locator('[data-acq-camo="divergence"]').click();
      const undoRev = (await stock(page)).revision;
      await checkbox.uncheck();
      await settled(page, undoRev + 1);
      assert.ok(
        await page
          .locator('[data-acq-camo="divergence"]')
          .evaluateAll((nodes) =>
            nodes.every((n) => n.dataset.state !== "completed"),
          ),
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await checkbox.scrollIntoViewIfNeeded();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: `test-results/100-${name}-${path.includes("workbench") ? "workbench" : "acquisition"}-mobile.png`,
      });
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    console.log(
      `${name}: both owners tick/untick exact revisions, next/shared states, reload/full-tracker parity, unrelated data, quota rollback/locks/retry and mobile PASS`,
    );
  } finally {
    await context.close();
    await browser.close();
  }
}
