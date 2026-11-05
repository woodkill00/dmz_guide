import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser } from "./health.mjs";

/** Presentation gate; existing armory/workbench suites still own full transactional coverage. */
export async function runUIWeaponsTests({ browser, base }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(base + "/armory/");
    await page.waitForFunction(
      () => document.documentElement.dataset.uiShellMounted === "071-v1",
    );
    assert.equal(
      await page.locator("html").getAttribute("data-ui-variant"),
      "modern",
    );
    assert.equal(await page.locator("[data-weapon-row]").count(), 33);
    await page.locator("[data-weapon-search]").fill("han 86");
    assert.equal(await page.locator("[data-weapon-row]:visible").count(), 1);
    await page.locator("[data-weapon-row]:visible a").click();
    await page.waitForURL("**/armory/han-86/");
    assert.match(
      await page.locator("#codmunity-data").innerText(),
      /not Warzone mode/,
    );
    assert.match(
      await page.locator("#codmunity-data").innerText(),
      /not tested in DMZ/,
    );
    assert.match(
      await page.locator("#patch-history").innerText(),
      /multiplayer/,
    );
    assert(await page.locator('[data-codmunity-mode="mw4"]').isVisible());
    assert(await page.locator('[data-codmunity-mode="dmz"]').isVisible());
    const detailURL = page.url();
    for (const width of [1440, 768, 390, 320]) {
      for (const theme of ["dark", "light"]) {
        for (const text of [100, 200]) {
          await page.setViewportSize({ width, height: 844 });
          await page.evaluate(
            ({ theme, text }) => {
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.fontSize = text + "%";
            },
            { theme, text },
          );
          assert.equal(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth + 1,
            ),
            false,
            `${width}/${theme}/${text}`,
          );
          const nav = page.getByRole("navigation", { name: "Weapon tools" });
          for (const link of await nav.getByRole("link").all()) {
            await link.scrollIntoViewIfNeeded();
            const box = await link.boundingBox();
            assert(
              box && box.height >= 44,
              "Weapon tools retain operational targets",
            );
          }
          assert.match(
            await page.locator(".gs-detail-footer").innerText(),
            /\*WZ/,
          );
          assert.equal(page.url(), detailURL);
        }
      }
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "100%";
    });
    await page.goto(base + "/armory/workbench/");
    await page.waitForFunction(
      () => document.querySelector("main")?.dataset.armoryReady === "true",
    );
    assert.equal(await page.locator("#build-form").count(), 1);
    await page.locator("#compare-mode").selectOption("dmz");
    assert.match(
      await page.locator("#comparison-result").innerText(),
      /unknown|select|observation|evidence|choose/i,
    );
    await page.locator('.armory-tabs a[href="#builder"]').click();
    await page
      .locator('#build-form [name="name"]')
      .fill("Synthetic071 unsaved template");
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "light";
    });
    assert.equal(
      await page.locator('#build-form [name="name"]').inputValue(),
      "Synthetic071 unsaved template",
    );
  } finally {
    await context.close();
  }

  const noJS = await browser.newContext({ javaScriptEnabled: false });
  try {
    const p = await noJS.newPage();
    await p.goto(base + "/armory/han-86/");
    assert.match(
      await p.locator("#codmunity-data").innerText(),
      /not tested in DMZ/,
    );
    assert.equal(await p.locator("html").getAttribute("data-ui-mounted"), null);
    assert(
      await p
        .getByRole("link", { name: "All weapons", exact: true })
        .isVisible(),
    );
  } finally {
    await noJS.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = await startBrowserServer();
  try {
    for (const [name, engine] of Object.entries({
      chromium,
      firefox,
      webkit,
    })) {
      const browser = await engine.launch(),
        health = monitorBrowser(browser);
      try {
        await runUIWeaponsTests({ browser, base: server.base });
        health();
        console.log(name + "071 weapon presentation PASS");
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.stop();
  }
}
