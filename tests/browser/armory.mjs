import assert from "node:assert/strict";
export async function runArmoryTests({
  browser,
  base,
  captureScreenshots = false,
}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(base + "/armory/");
    await page.waitForFunction(
      () =>
        document.querySelector("[data-weapon-filter]")?.dataset.enhanced ===
        "true",
    );
    assert.equal(await page.locator("[data-weapon-row]").count(), 33);
    assert.equal(await page.locator("[data-armory-row]").count(), 643);
    await page.locator("[data-weapon-search]").fill("han 86");
    assert.equal(await page.locator("[data-weapon-row]:visible").count(), 1);
    await page.locator("[data-weapon-row]:visible a").click();
    assert(new URL(page.url()).pathname === "/armory/han-86/");
    assert.match(await page.locator("main").innerText(), /uncertain mode/);
    assert.match(
      await page.locator("#patch-history").innerText(),
      /multiplayer/,
    );
    await page.waitForFunction(
      () =>
        document.querySelector("[data-armory-filter]")?.dataset.enhanced ===
        "true",
    );
    await page.locator("[data-armory-search]").fill("FSS IS300");
    assert.equal(await page.locator("[data-armory-row]:visible").count(), 1);
    assert.match(
      await page.locator("[data-armory-row]:visible").innerText(),
      /worse/,
    );
    await page.locator("[data-armory-slot]").selectOption("optic");
    assert.equal(await page.locator("[data-armory-row]:visible").count(), 0);
    assert.equal(await page.locator("[data-armory-empty]").isVisible(), true);
    await page.locator("[data-armory-search]").fill("");
    await page.locator("[data-armory-slot]").selectOption("");
    assert.equal(await page.locator("[data-armory-empty]").isVisible(), false);
    await page
      .getByRole("link", { name: "Open catalog record", exact: true })
      .click();
    assert.equal(new URL(page.url()).pathname, "/items/mw4--han-86/");
    assert.match(await page.locator("main").innerText(), /740/);
    let layouts = 0;
    for (const route of ["/armory/", "/armory/han-86/", "/armory/updates/"])
      for (const width of [320, 390, 768, 1440])
        for (const zoom of [false, true])
          for (const theme of ["dark", "light"]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(base + route);
            await page.evaluate((theme) => {
              document.documentElement.dataset.theme = theme;
            }, theme);
            if (zoom)
              await page.addStyleTag({ url: base + "/__test-text-zoom.css" });
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              true,
              `${route} ${width} ${zoom} ${theme}`,
            );
            if (zoom)
              assert.equal(
                await page.evaluate(
                  () => getComputedStyle(document.documentElement).fontSize,
                ),
                "32px",
              );
            const region = page.locator(".armory-table-wrap").first();
            if (await region.count()) {
              assert.equal(await region.getAttribute("tabindex"), "0");
              await region.focus();
              assert.equal(
                await region.evaluate((n) => n === document.activeElement),
                true,
              );
            } else {
              assert.match(
                await page.locator("main").innerText(),
                /npm run weapons:check/,
              );
            }
            layouts++;
          }
    if (captureScreenshots) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(base + "/armory/han-86/");
      await page.screenshot({ path: "test-results/armory-desktop.png" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: "test-results/armory-mobile.png" });
    }
    const native = await browser.newContext({ javaScriptEnabled: false });
    try {
      const p = await native.newPage();
      await p.goto(base + "/armory/");
      assert.equal(await p.locator("[data-weapon-row]").count(), 33);
      await p
        .getByRole("link", { name: "Open Han 86 Gunsmith", exact: true })
        .click();
      assert.equal(new URL(p.url()).pathname, "/armory/han-86/");
    } finally {
      await native.close();
    }
    console.log(
      `Armory: ${layouts} layouts/themes/text cases, real weapon/attachment filters, source/patch context, native detail link and no-JS navigation PASS`,
    );
  } finally {
    await context.close();
  }
}
