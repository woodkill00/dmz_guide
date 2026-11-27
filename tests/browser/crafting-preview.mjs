import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { serviceOrigin } from "../../src/domain/local-services.mjs";
const base =
  process.env.DMZ_SITE_URL || serviceOrigin("guide", "http://127.0.0.1");
const pack = "official:mw4-dmz-starter",
  query = "?pack=" + encodeURIComponent(pack);
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(base + "/" + query);
    await page.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("No saved profile"),
    );
    await page.evaluate(async () => {
      const p = await (
        await fetch("/assets/content/packs/official-starter.json")
      ).json();
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const profile = newProfile(p);
      profile.buildTargets = { "mw4:bandage": 2 };
      profile.inventory["mw4:synthetics"] = 5;
      await saveProfile(profile, 0);
    });
    const stock = () =>
      page.evaluate(async () =>
        JSON.stringify(
          (
            await (
              await import("/assets/src/storage/store.mjs")
            ).loadProfile("official:mw4-dmz-starter")
          )?.value,
        ),
      );
    const initial = await stock();
    await page.locator("#hub-refresh").click();
    for (const surface of [
      "dashboard",
      "quick-collect",
      "inventory",
      "upgrades",
      "items",
    ]) {
      if (surface !== "dashboard")
        await page.goto(base + "/" + surface + "/" + query);
      if (surface === "inventory") {
        await page.locator("#inventory-query").fill("Synthetics");
        await page.locator("#inventory-expand").click();
      }
      if (surface === "items")
        await page.locator("#catalog-search").fill("Synthetics");
      const primaryTile =
        surface === "quick-collect"
          ? page.locator(".build-summary-item > [data-build-peek]").first()
          : null;
      const primaryBefore = primaryTile
        ? await primaryTile.boundingBox()
        : null;
      let preview = page.locator(".craft-preview:visible").first();
      await preview.waitFor({ state: "visible", timeout: 45000 });
      assert.equal(await preview.getAttribute("open"), null, surface);
      await preview.locator(":scope > summary").focus();
      await page.keyboard.press("Enter");
      assert.notEqual(await preview.getAttribute("open"), null, surface);
      if (primaryTile) {
        const tileBox = await primaryTile.boundingBox(),
          previewBox = await preview.boundingBox();
        assert.ok(
          tileBox.height < 150 &&
            Math.abs(tileBox.height - primaryBefore.height) < 2,
          "preview must not stretch the primary tile",
        );
        assert.ok(
          previewBox.y >= tileBox.y + tileBox.height - 1,
          "preview must be under its tile",
        );
      }
      const chips = preview.locator("a.item-craft-button");
      assert.ok(
        (await chips.count()) > 0 && (await chips.count()) <= 8,
        surface,
      );
      assert.equal(
        await preview
          .locator("button .craft-preview, a .craft-preview, a a")
          .count(),
        0,
      );
      const href = await chips.first().getAttribute("href");
      const url = new URL(href, base);
      assert.equal(url.origin, new URL(base).origin);
      assert.equal(
        url.searchParams.get("pack"),
        surface === "items" ? null : pack,
      );
      assert.equal(await stock(), initial, "disclosure must not edit profile");
      if (surface === "dashboard") {
        await page
          .locator(
            '[data-dash-item="mw4:synthetics"][data-dash-owner="builds"]',
          )
          .first()
          .click();
        await page
          .locator('[data-dash-detail="builds"]')
          .waitFor({ state: "visible" });
      }
      if (surface === "quick-collect") {
        await page
          .locator('[data-build-peek="mw4:synthetics"]')
          .first()
          .click();
        await page
          .locator('[data-build-info="mw4:synthetics"]')
          .first()
          .waitFor({ state: "visible" });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      preview = page.locator(".craft-preview:visible").first();
      await preview.scrollIntoViewIfNeeded();
      const box = await preview.boundingBox();
      assert.ok(box.width <= 390, surface);
      await page.screenshot({
        path: `test-results/096-preview-${name}-${surface}.png`,
      });
      await page.setViewportSize({ width: 1440, height: 900 });
      if (surface === "dashboard") {
        await chips.first().click();
        await page.waitForURL((u) => u.pathname === "/local/");
        await page.goto(base + "/" + query);
      }
      console.log(
        `${name} ${surface}: bounded icon/name preview, keyboard, primary controls, private links,390px, unchanged profile PASS`,
      );
    }
  } finally {
    await browser.close();
  }
}
