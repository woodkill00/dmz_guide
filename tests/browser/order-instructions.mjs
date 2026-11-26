import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { monitorBrowser } from "./health.mjs";
const base = "http://127.0.0.1:4173";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch(),
    health = monitorBrowser(browser);
  try {
    const page = await browser.newPage();
    await page.goto(base + "/");
    await page.waitForSelector('[data-weapon-save-state="ready"]');
    const data = await page.evaluate(async () => {
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      const { saveProfile } = await import("/assets/src/storage/store.mjs");
      const { hajinOrderSequence } = await import(
        "/assets/src/content/hajin-order-sequence.mjs"
      );
      const pack = await (
        await fetch("/assets/content/packs/official-starter.json")
      ).json();
      await saveProfile(newProfile(pack), 0);
      return {
        pages: hajinOrderSequence.pages
          .slice(0, 3)
          .map((p) => ({ key: "hajin-" + p.page, ids: p.objectiveIds })),
        steps: Object.fromEntries(
          pack.objectives.map((r) => [r.id, r.steps || []]),
        ),
        multi: pack.objectives.find(
          (r) => !r.spoiler && r.track === "dmz-order" && r.steps?.length > 1,
        )?.id,
      };
    });
    await page.locator("#hub-refresh").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("revision 1"),
    );
    const first = data.pages[0],
      second = data.pages[1],
      third = data.pages[2];
    const group = (key) =>
      page.locator('[data-order-disclosure="' + key + '"]');
    const objectives = (id) =>
      page.locator('[data-mission-objectives="' + id + '"]');
    const assertPage = async (p) => {
      assert.equal(await group(p.key).evaluate((n) => n.open), true);
      for (const id of p.ids) {
        const loc = objectives(id);
        if (!(await loc.count())) continue;
        assert.equal(await loc.evaluate((n) => n.open), true);
        assert.deepEqual(
          await loc.locator(".mission-objective-steps > li").allTextContents(),
          data.steps[id],
        );
      }
    };
    await assertPage(first);
    assert.equal(await group(second.key).evaluate((n) => n.open), false);
    const gear = first.ids[0];
    await objectives(gear).locator(":scope > summary").press("Enter");
    assert.equal(await objectives(gear).evaluate((n) => n.open), false);
    await page.locator("#hub-refresh").click();
    await page.waitForSelector('[data-order-disclosure="hajin-1"]');
    assert.equal(await objectives(gear).evaluate((n) => n.open), false);
    await group(first.key).locator(":scope > summary").click();
    assert.equal(await group(first.key).evaluate((n) => n.open), false);
    await page.locator("#hub-refresh").click();
    await page.waitForSelector('[data-order-disclosure="hajin-1"]');
    assert.equal(await group(first.key).evaluate((n) => n.open), false);
    await page.locator('[data-order-complete="hajin-1"]').click();
    await page.waitForFunction(() =>
      document
        .querySelector("#hub-progress")
        ?.textContent.includes("revision 2"),
    );
    await assertPage(second);
    await page.goto(base + "/missions/?pack=official%3Amw4-dmz-starter");
    await group(second.key).waitFor();
    await assertPage(second);
    assert.equal(await group(first.key).evaluate((n) => n.open), false);
    const detail = second.ids.find((id) => data.steps[id]?.length);
    await objectives(detail).locator(":scope > summary").click();
    await page.locator("#progress-query").fill("Gear");
    assert.equal(await objectives(detail).evaluate((n) => n.open), false);
    await page.locator("#progress-query").fill("");
    await page.locator('[data-order-complete="hajin-2"]').click();
    await page.waitForFunction(
      () => document.querySelector('[data-order-complete="hajin-2"]')?.checked,
    );
    await assertPage(third);
    // Multi-objective missions retain every line, and Enter works for native disclosures.
    if (data.multi) {
      const m = objectives(data.multi);
      if (await m.count()) {
        const parents = m.locator(
          "xpath=ancestor::details[@data-order-disclosure]",
        );
        if (!(await parents.evaluate((n) => n.open)))
          await parents.locator(":scope > summary").click();
        if (!(await m.evaluate((n) => n.open)))
          await m.locator(":scope > summary").press("Enter");
        assert.deepEqual(
          await m.locator(".mission-objective-steps > li").allTextContents(),
          data.steps[data.multi],
        );
      }
    }
    for (const width of [320, 390, 1440])
      for (const zoom of [false, true]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (big) =>
            (document.documentElement.style.fontSize = big ? "200%" : ""),
          zoom,
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
    if (name === "chromium") {
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
      await page.setViewportSize({ width: 390, height: 1000 });
      await page.locator('[data-order-key="hajin-3"]').screenshot({
        path: "test-results/order-instructions-directory-390.png",
      });
      await page.goto(base + "/");
      await group(third.key).waitFor();
      await page.locator("#dashboard-orders").screenshot({
        path: "test-results/order-instructions-dashboard-390.png",
      });
    }
    health();
    console.log(
      name +
        ": exact objective lines, first unfinished defaults/advance, keyboard+pointer collapse retained across rerenders, multi-line and320/390/1440+200% PASS",
    );
  } finally {
    await browser.close();
  }
}
