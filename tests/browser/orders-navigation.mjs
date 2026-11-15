import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { pathToFileURL } from "node:url";
import { openCatalogContext } from "./open-catalog-context.mjs";

export async function runOrdersNavigationTests({ browser, base }) {
  const context = await browser.newContext({
    viewport: { width: 1360, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto(`${base}/`);
    const entry = page
      .locator('.site-nav [data-feature-id="missions"]')
      .first();
    assert.equal(await entry.textContent(), "Orders");
    await page.locator(".site-nav .nav-more > summary").first().click();
    const orders = page.locator(".site-nav .nav-orders-group").first();
    await orders.waitFor();
    assert.equal(await orders.locator(".nav-orders-pages").count(), 2);
    const hajin = orders.locator(".nav-orders-pages").first();
    await hajin.locator(":scope > summary").click();
    await hajin.getByRole("link", { name: "Hajin page 6" }).waitFor();
    assert.equal(await hajin.locator('a[href*="#hajin-page-"]').count(), 24);
    await hajin.getByRole("link", { name: "Hajin page 6" }).click();
    await page.locator('main[aria-busy="false"]').waitFor();
    assert.equal(new URL(page.url()).hash, "#hajin-page-6");
    assert.equal(await page.locator("#hajin-page-6").isVisible(), true);
    assert.equal(await page.locator("h1").first().textContent(), "Orders");
    assert.equal(
      await page.locator("#mission-directory-hajin .mission-page-card").count(),
      24,
    );
    await page.locator(".site-nav .nav-more > summary").first().click();
    const x01 = page.locator(".site-nav .nav-orders-pages").last();
    await x01.locator(":scope > summary").click();
    await x01.getByRole("link", { name: "X01 page 3" }).waitFor();
    assert.equal(await x01.locator('a[href*="#x01-page-"]').count(), 5);
    await x01.getByRole("link", { name: "X01 page 3" }).click();
    await page.locator('main[aria-busy="false"]').waitFor();
    assert.equal(new URL(page.url()).hash, "#x01-page-3");
    assert.equal(await page.locator("#x01-page-3").isVisible(), true);
    assert.equal(
      await page.locator("#mission-directory-x01 .mission-page-card").count(),
      5,
    );
    await page.goto(`${base}/missions/?pack=official%3Amw4-dmz-starter`);
    await page.locator('main[aria-busy="false"]').waitFor();
    await page.locator(".site-nav .nav-more > summary").first().click();
    await page.locator(".site-nav .nav-orders-group").first().waitFor();
    await openCatalogContext(page);
    await page.locator("#pack-select").selectOption("demo:training-pack");
    await page.locator('main[aria-busy="false"]').waitFor();
    const revisedLink = page
      .locator('.site-nav .nav-orders-group a[href*="#x01-page-2"]')
      .first();
    assert.equal(
      new URL(await revisedLink.getAttribute("href")).searchParams.get("pack"),
      "demo:training-pack",
    );
    await page.locator(".site-nav .nav-more > summary").first().click();
    await page
      .locator(".site-nav [data-navigation-filter]")
      .first()
      .fill("Hajin page 6");
    await page
      .locator(".site-nav .nav-orders-pages")
      .first()
      .locator(":scope > summary")
      .click();
    assert.equal(
      await page
        .getByRole("link", { name: "Hajin page 6" })
        .first()
        .isVisible(),
      true,
    );
    assert.equal(
      await page
        .getByRole("link", { name: "Hajin page 7", includeHidden: true })
        .first()
        .isVisible(),
      false,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/`);
    const mobile = page.locator(".ui-mobile-sections");
    if (await mobile.count()) {
      await mobile.locator(":scope > summary").click();
      assert.equal(
        await mobile.locator('[data-feature-id="missions"]').isVisible(),
        true,
      );
    }
    await page.locator(".site-nav .nav-more > summary").first().click();
    const mobileX01 = page.locator(".site-nav .nav-orders-pages").last();
    await mobileX01.locator(":scope > summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await mobileX01.evaluate((node) => node.open), true);
    await mobileX01.getByRole("link", { name: "X01 page 2" }).click();
    await page.locator('main[aria-busy="false"]').waitFor();
    assert.equal(new URL(page.url()).hash, "#x01-page-2");
    await page.goto(`${base}/`);
    await page.evaluate(async () => {
      const { renderMainNavigation } = await import(
        "/assets/src/ui/site-navigation.mjs"
      );
      const { setupNavigationMenu } = await import(
        "/assets/src/client/navigation-menu.mjs"
      );
      const fixture = document.createElement("div");
      fixture.id = "companion-orders-test";
      fixture.innerHTML = renderMainNavigation({
        page: "home",
        surface: "map",
      });
      document.body.append(fixture);
      setupNavigationMenu(document);
    });
    await page.locator("#companion-orders-test .nav-more > summary").click();
    const companion = page.locator("#companion-orders-test .nav-orders-group");
    await companion.waitFor();
    assert.equal(await companion.locator('a[href*="#x01-page-"]').count(), 5);
    assert.equal(
      await companion.locator('a[href*="#x01-page-2"]').getAttribute("target"),
      "_blank",
    );
    console.log(`${browser.browserType().name()} Orders navigation PASS`);
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
      await runOrdersNavigationTests({
        browser,
        base: process.env.TEST_BASE || "http://127.0.0.1:4173",
      });
    } finally {
      await browser.close();
    }
  }
}
