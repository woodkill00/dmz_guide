import assert from "node:assert/strict";
import { keyGuide, keyImages } from "../../src/content/keys.mjs";
export async function runKeysTests({ browser, base, localImages = false }) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/keys/");
    await page.locator("#key-filters:not([hidden])").waitFor();
    assert.equal(await page.locator("[data-key-row]:visible").count(), 18);
    assert.equal(await page.locator(".key-item-link img").count(), 18);
    assert.equal(
      await page
        .locator(".key-item-link")
        .first()
        .evaluate((a) => getComputedStyle(a).display),
      "flex",
    );
    for (const key of keyGuide.keys) {
      const link = page.getByRole("link", { name: key.name, exact: true });
      assert.equal(await link.locator("img").getAttribute("alt"), "");
      assert.equal(
        await link.locator("img").getAttribute("src"),
        `/local-key-images/icon-${key.id}.webp`,
      );
      const response = await context.request.get(
        base + `/local-key-images/icon-${key.id}.webp`,
      );
      assert.equal(response.status(), 200);
      assert(
        localImages
          ? response.headers()["content-type"] === "image/webp"
          : ["image/webp", "image/svg+xml"].includes(
              response.headers()["content-type"],
            ),
      );
    }
    await page.locator(".key-item-link img").first().click();
    assert(await page.locator("h1").innerText());
    assert(page.url().includes("/keys/blackmarket-weapons-locker/"));
    await page.goto(base + "/keys/");
    await page.locator("#key-filters:not([hidden])").waitFor();

    await page.locator("#key-search").fill("casino F4");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 2);
    await page.locator("#key-search").fill("");
    await page.locator("#key-type").selectOption("story");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 4);
    await page.locator("#key-search").fill("no matching synthetic term");
    assert(await page.locator("#key-empty").isVisible());
    await page.getByRole("button", { name: "Clear filters" }).click();
    assert.equal(await page.locator("[data-key-row]:visible").count(), 18);
    await page.locator("#key-search").fill("12 battery");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 1);
    await page
      .getByRole("link", { name: "Shopping DRC Locker", exact: true })
      .click();
    assert.match(await page.locator("main").innerText(), /12 K9 Battery Cores/);
    for (const key of keyGuide.keys) {
      await page.goto(base + `/keys/${key.id}/`);
      assert.equal(await page.locator("h1").innerText(), key.name);
      assert.equal(
        await page
          .getByRole("link", { name: "View this key on Game8" })
          .getAttribute("href"),
        keyGuide.sourceURL + "#" + key.sourceAnchor,
      );
      const img = page.locator(".key-screenshot img");
      await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const i = document.querySelector(".key-screenshot img");
        return i.complete && i.naturalWidth > 0;
      });
      const r = await context.request.get(
        base + `/local-key-images/${key.id}.webp`,
      );
      assert.equal(r.status(), 200);
      assert(
        localImages
          ? r.headers()["content-type"] === "image/webp"
          : ["image/webp", "image/svg+xml"].includes(
              r.headers()["content-type"],
            ),
      );
      if (localImages)
        assert.equal(
          await img.evaluate((i) => i.naturalWidth),
          keyImages[key.id].width,
        );
    }
    for (const path of [
      "/keys/",
      "/keys/shopping-drc-locker/",
      "/keys/police-station-armory/",
    ]) {
      await page.goto(base + path);
      assert.equal(
        await page
          .locator('nav[aria-label="Main navigation"] a[href="/keys/"]')
          .count(),
        1,
      );
      for (const width of [320, 390, 768, 1440])
        for (const theme of ["dark", "light"])
          for (const zoom of [false, true]) {
            await page.setViewportSize({ width, height: 1000 });
            await page.evaluate(
              ([theme, zoom]) => {
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.fontSize = zoom ? "200%" : "";
              },
              [theme, zoom],
            );
            assert(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              `${path} ${width} ${theme} ${zoom}`,
            );
          }
    }
    await page.goto(base + "/sitemap/");
    assert.equal(await page.locator('a[href="/keys/"]').count(), 2);
    const head = await context.request.head(
      base + "/local-key-images/mirae-electrical-room.webp",
    );
    assert.equal(head.status(), 200);
    assert.equal((await head.body()).length, 0);
    assert.equal(
      (
        await context.request.post(
          base + "/local-key-images/mirae-electrical-room.webp",
        )
      ).status(),
      405,
    );
    const noJS = await browser.newContext({ javaScriptEnabled: false }),
      plain = await noJS.newPage();
    try {
      await plain.goto(base + "/keys/");
      assert.equal(await plain.locator("[data-key-row]").count(), 18);
      await plain
        .getByRole("link", { name: "Mirae Electrical Room", exact: true })
        .click();
      assert.match(
        await plain.locator("main").innerText(),
        /Operation Critical Extraction/,
      );
    } finally {
      await noJS.close();
    }
    console.log(
      "053 keys PASS: 18 source/detail/image mappings, search/type/reset/empty, navigation/no-JS, GET/HEAD/POST and 48 layouts",
    );
  } finally {
    await context.close();
  }
}
