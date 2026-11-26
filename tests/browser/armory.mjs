import assert from "node:assert/strict";
export async function runArmoryTests({
  browser,
  base,
  captureScreenshots = false,
}) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/armory/#reference");
    await page.waitForSelector('main[data-armory-ready="true"]');
    assert.equal(await page.locator("[data-weapon-context]").count(), 35);
    await page.locator(".weapon-picker summary").click();
    await page.locator("#weapon-context-search").fill("han 86");
    assert.equal(
      await page.locator("[data-weapon-context]:visible").count(),
      1,
    );
    await page.locator('[data-weapon-context="han-86"]').click();
    await page.waitForSelector('main[data-armory-ready="true"]');
    assert.equal(new URL(page.url()).pathname, "/armory/han-86/");
    assert.match(
      await page.locator("#reference").innerText(),
      /uncertain mode/,
    );
    assert.match(
      await page.locator("#patch-history").innerText(),
      /multiplayer/,
    );
    await page.locator("[data-armory-search]").fill("FSS IS300");
    assert.equal(await page.locator("[data-armory-row]:visible").count(), 1);
    assert.match(
      await page.locator("[data-armory-row]:visible").innerText(),
      /worse/,
    );
    await page.locator("[data-armory-slot]").selectOption("optic");
    assert.equal(await page.locator("[data-armory-row]:visible").count(), 0);
    assert(await page.locator("[data-armory-empty]").isVisible());
    await page.locator("[data-armory-search]").fill("");
    await page.locator("[data-armory-slot]").selectOption("");
    assert(!(await page.locator("[data-armory-empty]").isVisible()));
    await page
      .getByRole("link", { name: "Open catalog record", exact: true })
      .click();
    assert.equal(new URL(page.url()).pathname, "/items/mw4--han-86/");
    assert.match(await page.locator("main").innerText(), /740/);
    let layouts = 0;
    for (const route of [
      "/armory/#reference",
      "/armory/han-86/#reference",
      "/armory/updates/",
    ])
      for (const width of [320, 390, 768, 1440])
        for (const zoom of [false, true])
          for (const theme of ["dark", "light"]) {
            await page.setViewportSize({ width, height: 900 });
            await page.goto(base + route);
            if (!route.includes("updates"))
              await page.waitForSelector('main[data-armory-ready="true"]');
            await page.evaluate(
              ({ theme, zoom }) => {
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.fontSize = zoom ? "200%" : "";
              },
              { theme, zoom },
            );
            assert(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              `${route} ${width} ${zoom} ${theme}`,
            );
            const region = page.locator(".armory-table-wrap:visible").first();
            if (await region.count()) {
              assert.equal(await region.getAttribute("tabindex"), "0");
              await region.focus();
              assert(
                await region.evaluate((n) => n === document.activeElement),
              );
            } else
              assert.match(
                await page.locator("main").innerText(),
                /npm run weapons:check/,
              );
            layouts++;
          }
    if (captureScreenshots) {
      for (const [label, width] of [
        ["desktop", 1440],
        ["mobile", 390],
      ]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(base + "/armory/han-86/#reference");
        await page.waitForSelector('main[data-armory-ready="true"]');
        await page.screenshot({ path: `test-results/armory-${label}.png` });
      }
    }
    const native = await browser.newContext({ javaScriptEnabled: false });
    try {
      const p = await native.newPage();
      await p.goto(base + "/armory/");
      assert.equal(await p.locator("[data-weapon-context]").count(), 35);
      await p.locator(".weapon-picker summary").click();
      await p.locator('[data-weapon-context="han-86"]').click();
      assert.equal(new URL(p.url()).pathname, "/armory/han-86/");
      assert.match(
        await p.locator("#reference").innerText(),
        /Official launch sheet/,
      );
    } finally {
      await native.close();
    }
    console.log(
      `108 public armory PASS: weapon list, source/slot filters, catalog links, native detail and ${layouts} responsive/text/theme layouts`,
    );
  } finally {
    await context.close();
  }
}
