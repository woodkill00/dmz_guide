import assert from "node:assert/strict";
export async function runCompactUITests({ browser, base }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    for (const route of ["inventory", "upgrades", "collection", "items"]) {
      await page.goto(
        `${base}/${route}/?pack=observed%3Aupgrade-review-20261026`,
      );
      await page.waitForFunction(
        () => !document.querySelector('main[aria-busy="true"]'),
      );
      for (const width of [320, 390, 768, 900, 1440, 1920])
        for (const theme of ["dark", "light"])
          for (const zoom of [false, true]) {
            await page.setViewportSize({ width, height: 1000 });
            await page.evaluate(
              ({ theme, zoom }) => {
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.fontSize = zoom ? "200%" : "";
              },
              { theme, zoom },
            );
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth,
              ),
              false,
              `${route}/${width}/${theme}/${zoom}`,
            );
            const menu = page.locator(".nav-more");
            const summary = menu.locator(":scope > summary");
            await summary.click();
            assert.equal(await menu.getAttribute("open"), "");
            const panel = await menu.locator(":scope > div").boundingBox();
            assert(
              panel.x >= -1 && panel.x + panel.width <= width + 1,
              "menu fits viewport",
            );
            assert.equal(await menu.locator(".nav-menu-group").count(), 5);
            const last = menu.getByRole("link").last();
            await last.scrollIntoViewIfNeeded();
            await last.focus();
            const box = await last.boundingBox();
            assert(box.height >= 43.9, "menu action target remains usable");
            await page.keyboard.press("Escape");
            assert.equal(await menu.getAttribute("open"), null);
            assert.equal(
              await summary.evaluate((el) => el === document.activeElement),
              true,
            );
          }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
      assert(
        (await page.locator(".site-header").boundingBox()).height < 108,
        "header tighter than recorded baseline",
      );
      assert(
        (await page.locator(".page-heading").boundingBox()).height < 240,
        "heading tighter than recorded baseline",
      );
      const menu = page.locator(".nav-more"),
        summary = menu.locator(":scope > summary");
      await summary.click();
      await page.locator("#theme-toggle").click();
      assert.equal(
        await menu.getAttribute("open"),
        null,
        "outside pointer dismisses",
      );
      await summary.click();
      await page.locator("#theme-toggle").focus();
      assert.equal(
        await menu.getAttribute("open"),
        null,
        "focus departure dismisses",
      );
      assert.equal(
        await page
          .locator("#theme-toggle")
          .evaluate((el) => document.activeElement === el),
        true,
        "dismissal does not steal focus",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await summary.evaluate((el) => getComputedStyle(el).transitionDuration),
        "0s",
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      if (route === "inventory") {
        const control = page
          .locator("#inventory-fields [data-show-use][aria-expanded]")
          .first();
        await control.scrollIntoViewIfNeeded();
        await control.evaluate((el) =>
          window.scrollBy(
            0,
            el.getBoundingClientRect().bottom - innerHeight + 44,
          ),
        );
        const before = await control.boundingBox();
        await page.mouse.move(
          before.x + before.width / 2,
          before.y + before.height / 2,
        );
        await page.mouse.down();
        await page.evaluate(() => new Promise(requestAnimationFrame));
        assert.deepEqual(
          await control.boundingBox(),
          before,
          "mouse focus must not scroll between press and release",
        );
        await page.mouse.up();
        assert.equal(
          await control.getAttribute("aria-expanded"),
          "true",
          "release still activates the targeted control",
        );
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
  const touch = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 900 },
  });
  try {
    const page = await touch.newPage();
    await page.goto(
      `${base}/inventory/?pack=observed%3Aupgrade-review-20261026`,
    );
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
    const control = page
      .locator("#inventory-fields [data-show-use][aria-expanded]")
      .first();
    await control.tap();
    assert.equal(
      await control.getAttribute("aria-expanded"),
      "true",
      "touch activation stays native",
    );
    await control.focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await control.getAttribute("aria-expanded"),
      "false",
      "keyboard activation stays native",
    );
    await page.setViewportSize({ width: 1920, height: 1000 });
    const disabled = page
      .locator("#inventory-fields button:disabled:visible")
      .first();
    await disabled.scrollIntoViewIfNeeded();
    const box = await disabled.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(
      await disabled.evaluate((el) => document.activeElement === el),
      false,
      "disabled control cannot receive focus",
    );
  } finally {
    await touch.close();
  }
  const fallback = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  try {
    const page = await fallback.newPage();
    await page.goto(`${base}/items/`);
    await page.locator(".nav-more > summary").click();
    await page.locator('.site-nav > a[data-feature-id="settings"]').click();
    assert.equal(
      new URL(page.url()).pathname,
      "/settings/",
      "native navigation works without JS",
    );
  } finally {
    await fallback.close();
  }
  console.log(
    `${browser.browserType().name()} compact UI: 96 layout/theme/zoom cases, menu/focus/targets/reduced motion/noJS PASS`,
  );
}
