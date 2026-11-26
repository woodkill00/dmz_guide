import assert from "node:assert/strict";
import { readWeaponIntel } from "../../src/content/weapon-intel.mjs";
import { readWeaponAcquisition } from "../../src/content/weapon-acquisition.mjs";
import figures from "../../src/ui/weapon-figures.json" with { type: "json" };
const db = await readWeaponIntel();
export async function runGunsmithTests({
  browser,
  base,
  captureScreenshots = false,
  expectLocalArt = false,
}) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/armory/#reference");
    await page.waitForSelector('main[data-armory-ready="true"]');
    await page.locator(".weapon-picker summary").click();
    assert.equal(await page.locator("[data-weapon-context]").count(), 35);
    await page.locator("#weapon-context-search").fill("smg");
    assert.equal(
      await page.locator("[data-weapon-context]:visible").count(),
      (await readWeaponAcquisition()).weapons.filter(
        (w) => w.category === "smg",
      ).length,
    );
    await page.locator("#weapon-context-search").fill("does not exist");
    assert(await page.locator("#weapon-context-empty").isVisible());
    await page.locator("#weapon-context-search").fill("han 86");
    await page.locator('[data-weapon-context="han-86"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForURL("**/armory/han-86/#reference");
    assert.equal(new URL(page.url()).pathname, "/armory/han-86/");
    await page.waitForSelector('[data-armory-filter][data-enhanced="true"]');
    const expected = db.attachments.filter(
      (a) => a.weapons.includes("han-86") && a.slot === "optic",
    ).length;
    await page.locator('[data-focus-slot="optic"]').click();
    assert.equal(
      await page.locator("[data-armory-slot]").inputValue(),
      "optic",
    );
    assert.equal(
      await page.locator("[data-armory-row]:visible").count(),
      expected,
    );
    for (const [id, slot] of [
      ["cronen-squall", "stock"],
      ["ppsh-41", "fire-mods"],
      ["x-58-nyx", "muzzle"],
      ["warlord", "magazine"],
    ]) {
      await page.goto(base + `/armory/${id}/#reference`);
      await page.waitForSelector('[data-armory-filter][data-enhanced="true"]');
      await page.locator(`[data-focus-slot="${slot}"]`).click();
      assert.equal(await page.locator("[data-armory-slot]").inputValue(), slot);
      assert.equal(await page.locator("[data-armory-row]:visible").count(), 0);
    }
    await page.goto(base + "/armory/han-86/#reference");
    await page.waitForSelector('[data-armory-filter][data-enhanced="true"]');
    await page.locator("#gunsmith").scrollIntoViewIfNeeded();
    await page
      .getByRole("link", { name: "Build this weapon", exact: true })
      .click();
    await page.waitForSelector('main[data-armory-ready="true"]');
    assert.equal(await page.locator("#build-weapon").inputValue(), "han-86");
    assert.equal(
      await page.locator("#build-form [name=name]").inputValue(),
      "",
    );
    const stored = await page.evaluate(
      async () =>
        await (
          await import("/assets/src/storage/armory-store.mjs")
        ).readArmory(),
    );
    assert.equal(stored.value.revision, 0);
    assert.equal(stored.value.builds.length, 0);
    for (const query of ["weapon=m4&weapon=han-86", "weapon=invalid"]) {
      await page.goto(base + "/armory/workbench/?" + query + "#builder");
      await page.waitForFunction(() =>
        /ignored/.test(
          document.querySelector("#weapon-alias-notice")?.textContent,
        ),
      );
      assert.match(
        await page.locator("#weapon-alias-notice").innerText(),
        /Unknown or repeated weapon selection ignored/,
      );
      assert.equal(
        await page.locator("#weapon-alias").getAttribute("href"),
        "/armory/#builder",
      );
    }
    let layouts = 0;
    for (const route of [
      "/armory/",
      "/armory/han-86/",
      "/armory/pila/",
      "/armory/fss-carbon-edge-1095/",
    ]) {
      await page.goto(base + route + "#reference");
      await page.waitForSelector('[data-armory-filter][data-enhanced="true"]');
      for (const width of [320, 390, 768, 1440])
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
            assert(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              `${route} width${width} ${theme} zoom${zoom}`,
            );
            layouts++;
          }
    }
    if (expectLocalArt) {
      for (const [id, figure] of Object.entries(figures)) {
        if (!figure) continue;
        const result = await page.evaluate(async (id) => {
          const response = await fetch("/local-weapon-art/" + id + ".webp");
          if (response.headers.get("content-type") !== "image/webp")
            return false;
          const bitmap = await createImageBitmap(await response.blob());
          try {
            return bitmap.width === 1920 && bitmap.height === 1080;
          } finally {
            bitmap.close();
          }
        }, id);
        assert(result, `Actual official figure ${id} decodes`);
      }
    }
    if (captureScreenshots) {
      for (const route of ["/armory/", "/armory/han-86/"])
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 1050 });
          await page.goto(base + route + "#reference");
          await page.waitForSelector(
            '[data-armory-filter][data-enhanced="true"]',
          );
          await page.screenshot({
            path: `test-results/gunsmith050-${route === "/armory/" ? "roster" : "detail"}-${width}.png`,
          });
        }
    }
    // Early failed images precede deferred module execution on cold static pages.
    await page.addInitScript(() =>
      document.addEventListener(
        "error",
        (event) => {
          if (event.target?.matches?.("[data-local-weapon-art]"))
            window.earlyArtErrors = (window.earlyArtErrors || 0) + 1;
        },
        true,
      ),
    );
    await page.route("**/local-weapon-art/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "image/webp",
        body: "invalid synthetic image",
      }),
    );
    for (const route of ["/armory/han-86/", "/armory/"]) {
      let release;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      await page.route("**/assets/src/client/armory.mjs", async (route) => {
        await held;
        await route.continue();
      });
      try {
        const requested = page.waitForRequest(
          "**/assets/src/client/armory.mjs",
        );
        await page.goto(base + route + "#reference", { waitUntil: "commit" });
        await requested;
        await page.waitForFunction(() => window.earlyArtErrors > 0);
        await page
          .locator(".gs-native-art-fallback")
          .first()
          .waitFor({ state: "visible" });
      } finally {
        release();
      }
      await page.waitForSelector('[data-armory-filter][data-enhanced="true"]');
      assert((await page.locator(".gs-native-art-fallback").count()) > 0);
      await page.unroute("**/assets/src/client/armory.mjs");
    }
    await page.unroute("**/local-weapon-art/**");
    const native = await browser.newContext({ javaScriptEnabled: false });
    try {
      const p = await native.newPage();
      await p.goto(base + "/armory/");
      assert.equal(await p.locator("[data-weapon-context]").count(), 35);
      await p.locator(".weapon-picker summary").click();
      await p.locator('[data-weapon-context="m4"]').click();
      assert.equal(new URL(p.url()).pathname, "/armory/m4/");
      assert(await p.locator('[data-focus-slot="optic"]').count());
    } finally {
      await native.close();
    }
    console.log(
      `050 Gunsmith PASS: class/search/empty/keyboard selection, slot filter, query safety/no writes, missing-art/no-JS and ${layouts} layouts`,
    );
  } finally {
    await context.close();
  }
}
