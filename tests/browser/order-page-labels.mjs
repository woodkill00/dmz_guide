import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { monitorBrowser } from "./health.mjs";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch(),
    health = monitorBrowser(browser);
  try {
    const page = await browser.newPage();
    await page.goto(base + "/");
    await page.waitForSelector('[data-weapon-save-state="ready"]');
    await page.evaluate(async () => {
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const pack = await (
        await fetch("/assets/content/packs/official-starter.json")
      ).json();
      await saveProfile(newProfile(pack), 0);
    });
    await page.locator("#hub-refresh").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("revision 1"),
    );
    assert.equal(
      await page.locator('[data-order-key="hajin-3"] h4 a').innerText(),
      "Page 3 · Human Intel 2/2",
    );
    for (const [set, count] of [
      ["hajin", 24],
      ["x01", 5],
    ]) {
      const index = page.locator('[data-order-page-index="' + set + '"]');
      await index.locator(":scope > summary").click();
      assert.equal(await index.locator("a").count(), count);
      for (let n = 1; n <= count; n++) {
        const link = index.locator("a").nth(n - 1);
        assert((await link.innerText()).startsWith("Page " + n));
        const url = new URL(await link.getAttribute("href"), base);
        assert.equal(url.searchParams.get("page"), set + "-" + n);
        assert.equal(url.searchParams.get("pack"), "official:mw4-dmz-starter");
      }
    }
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    if (name === "chromium")
      await page
        .locator("#dashboard-orders")
        .screenshot({ path: "test-results/order-pages-index-1440.png" });
    await page.locator('[data-order-page-index="hajin"] a').nth(23).click();
    await page.locator("#hajin-page-24").waitFor();
    assert.equal(
      await page.locator("#mission-directory-hajin .mission-page-card").count(),
      24,
    );
    assert.equal(
      await page.locator("#mission-directory-x01 .mission-page-card").count(),
      5,
    );
    for (const [set, count] of [
      ["hajin", 24],
      ["x01", 5],
    ])
      for (let n = 1; n <= count; n++) {
        const anchor = page.locator("#" + set + "-page-" + n + " h4 a");
        assert.equal(await anchor.innerText(), "Page " + n);
        const url = new URL(await anchor.getAttribute("href"), base);
        const response = await page.request.get(url.href);
        assert.equal(response.status(), 200);
        const html = await response.text();
        assert(
          html.includes(
            "<h1>" +
              (set === "hajin" ? "Hajin" : "X01") +
              " · Page " +
              n +
              "</h1>",
          ),
        );
      }
    health();
    console.log(
      name +
        ": numbered chapter titles, all24Hajin+5X01 index entries, directory anchors,29 readers200 and320/390/1440 PASS",
    );
  } finally {
    await browser.close();
  }
}
