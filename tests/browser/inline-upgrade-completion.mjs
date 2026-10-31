import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
for (const engine of [chromium, firefox, webkit]) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  try {
    await page.goto(
      "http://127.0.0.1:4173/upgrades/?pack=observed%3Aupgrade-review-20261026",
    );
    const action = page.locator("[data-complete-upgrade]").first();
    await action.waitFor();
    await page.locator("#upgrade-layout").selectOption("flat");
    const names = await page.locator(".upgrade-summary h2").allTextContents();
    assert.deepEqual(
      names.filter((name) => name.startsWith("Bank Upgrade ")),
      [
        "Bank Upgrade I",
        "Bank Upgrade II",
        "Bank Upgrade III",
        "Bank Upgrade IV",
        "Bank Upgrade V",
        "Bank Upgrade VI",
        "Bank Upgrade VII",
      ],
    );
    assert(
      names.indexOf("Bank Upgrade I") < names.indexOf("Dog Tag Case Upgrade I"),
    );
    const original = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { upgradeProgress, revision, updatedAt, ...rest } = state.profile;
      return rest;
    });
    const id = await action.getAttribute("data-complete-upgrade");
    await action.click();
    await page.locator("#upgrade-progress-cancel").click();
    assert.equal(await action.isChecked(), false);
    await page.waitForFunction(
      (id) => document.activeElement?.dataset.completeUpgrade === id,
      id,
    );
    await action.click();
    await page.locator("#upgrade-progress-apply").click();
    await page.waitForFunction(
      () => document.querySelector("[data-complete-upgrade]")?.checked === true,
    );
    await page.reload();
    await action.waitFor();
    assert.equal(await action.isChecked(), true);
    await action.click();
    await page.locator("#upgrade-progress-apply").click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-complete-upgrade]")?.checked === false,
    );
    assert.deepEqual(
      await page.evaluate(async () => {
        const { state } = await import("/assets/src/client/common.mjs");
        const { upgradeProgress, revision, updatedAt, ...rest } = state.profile;
        return rest;
      }),
      original,
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      const box = await action.locator("..").boundingBox();
      assert(
        box.height >= 43.9,
        "44px labelled target, allowing subpixel rounding",
      );
      const check = await action.boundingBox();
      assert(Math.abs(check.width - 18) < 0.1);
      assert(Math.abs(check.height - 18) < 0.1);
    }
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      const box = await action.locator("..").boundingBox();
      assert(
        box.width >= 100 && box.height <= 100,
        "200% completion wording remains readable rather than letter-wrapped",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const columnPositions = await page.evaluate(() => ({
      headings: [...document.querySelectorAll(".upgrade-list-heading > span")]
        .slice(0, 5)
        .map((n) => n.getBoundingClientRect().x),
      cells: [...document.querySelector(".upgrade-summary").children]
        .slice(0, 5)
        .map((n) => n.getBoundingClientRect().x),
    }));
    columnPositions.headings.forEach((x, i) =>
      assert(
        Math.abs(x - columnPositions.cells[i]) < 2,
        "sticky labels align to row cells",
      ),
    );
    await page.locator(".compact-progress").nth(8).scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const row = document.querySelectorAll(".compact-progress")[8];
      window.scrollTo(
        0,
        window.scrollY + row.getBoundingClientRect().top - 200,
      );
    });
    await page.waitForFunction(
      () =>
        Math.abs(
          document
            .querySelector(".upgrade-list-heading")
            .getBoundingClientRect().y,
        ) < 2,
    );

    const header = await page.locator(".upgrade-list-heading").boundingBox();
    assert(
      Math.abs(header.y) < 2,
      "column headings stick to viewport during list scroll",
    );
    await page
      .locator(".compact-progress")
      .nth(8)
      .locator("[data-complete-upgrade]")
      .focus();
    const focused = await page
      .locator(".compact-progress")
      .nth(8)
      .locator("[data-complete-upgrade]")
      .boundingBox();
    assert(
      focused.y >= header.y + header.height,
      "sticky heading does not cover focused control",
    );
    console.log(
      engine.name(),
      "inline completion/cancel/reload/undo/resource invariance/responsive PASS",
    );
  } finally {
    await browser.close();
  }
}
