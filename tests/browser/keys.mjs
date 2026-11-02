import { allKeys, keyAccess } from "../../src/content/key-access.mjs";
import assert from "node:assert/strict";
import { keyGuide, keyImages } from "../../src/content/keys.mjs";
export async function runKeysTests({ browser, base, localImages = false }) {
  const context = await browser.newContext(),
    page = await context.newPage();
  try {
    await page.goto(base + "/keys/");
    await page.locator("#key-filters:not([hidden])").waitFor();
    assert.equal(
      await page.locator("[data-key-row]:visible").count(),
      keyAccess.uses.length,
    );
    assert.equal(
      await page.locator(".key-item-link img").count(),
      keyAccess.uses.length,
    );
    assert.equal(
      await page
        .locator(".key-item-link")
        .first()
        .evaluate((a) => getComputedStyle(a).display),
      "flex",
    );
    for (const key of keyGuide.keys) {
      const link = page
        .locator(`.key-item-link[href="/keys/${key.id}/"]`)
        .first();
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
    const firstTarget = await page
      .locator(".key-item-link")
      .first()
      .getAttribute("href");
    await page.locator(".key-item-link img").first().click();
    assert(await page.locator("h1").innerText());
    assert(page.url().endsWith(firstTarget));
    assert.equal(
      await page.locator("h1").innerText(),
      allKeys.find((k) => firstTarget === `/keys/${k.id}/`).name,
    );
    await page.goto(base + "/keys/");
    await page.locator("#key-filters:not([hidden])").waitFor();

    await page.locator("#key-search").fill("casino F4");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 3);
    await page.locator("#key-search").fill("");
    await page.locator("#key-type").selectOption("story");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 6);
    await page.locator("#key-search").fill("no matching synthetic term");
    assert(await page.locator("#key-empty").isVisible());
    await page.getByRole("button", { name: "Clear filters" }).click();
    assert.equal(
      await page.locator("[data-key-row]:visible").count(),
      keyAccess.uses.length,
    );
    assert.equal(
      await page.locator("[data-key-group]").count(),
      keyAccess.groups.length,
    );
    await page.locator("#key-location").selectOption("mirae-general-hospital");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 4);
    assert.equal(await page.locator("[data-key-group]:visible").count(), 1);
    assert.match(await page.locator("#key-count").innerText(), /4 of 62 keys/);
    await page.locator("#key-location").selectOption("");
    await page.locator("#key-search").fill("Police");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 5);
    assert.match(await page.locator("#key-count").innerText(), /2 of 62 keys/);
    await page.locator("#key-search").fill("F4");
    assert.equal(await page.locator("[data-key-row]:visible").count(), 6);
    assert.equal(await page.locator("[data-key-group]:visible").count(), 1);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page
      .locator('.key-item-link[href="/keys/hospital-chemical-lockers/"]')
      .click();
    assert.match(
      await page.locator(".key-access-use").innerText(),
      /Bring first[\s\S]*player-reported/,
    );
    assert.equal(await page.locator(".key-access-chain").count(), 1);
    const chain = await page.locator(".key-access-chain li").allTextContents();
    assert(chain[0].startsWith("Hospital Chemical Lab"));
    assert(chain[1].startsWith("Hospital Chemical Lockers"));
    assert.match(
      await page.locator(".key-access-use").innerText(),
      /Player report[\s\S]*Website context:/,
    );
    await page
      .locator('.key-access-link[href="/keys/hospital-chemical-lab/"]')
      .first()
      .click();
    assert.equal(await page.locator("h1").innerText(), "Hospital Chemical Lab");
    assert.equal(
      await page
        .getByRole("heading", { name: "This key is needed to reach" })
        .count(),
      1,
    );
    const generic = await context.request.get(
      base + "/assets/src/key-generic.svg",
    );
    assert.equal(generic.status(), 200);
    await page.goto(base + "/keys/");
    await page.locator("#key-filters:not([hidden])").waitFor();
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
      "/keys/hospital-chemical-lockers/",
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
      assert.equal(
        await plain.locator("[data-key-row]").count(),
        keyAccess.uses.length,
      );
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
      "053 keys PASS: 18 source/detail/image mappings, search/type/reset/empty, navigation/no-JS, GET/HEAD/POST and 64 layouts; 057 grouped71uses/62unique/filter/player-reported chain/provenance",
    );
  } finally {
    await context.close();
  }
}
