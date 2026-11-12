import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { pathToFileURL } from "node:url";
import { collectionFixture } from "../helpers/collection-needs.mjs";
export async function runCollectionTests({ browser, base }) {
  const context = await browser.newContext(),
    page = await context.newPage();
  const ready = () =>
    page.waitForFunction(
      () =>
        document.querySelector("main")?.getAttribute("aria-busy") === "false",
    );
  const badge = () => page.locator('[data-collection-state="craft:wire"]');
  const wire = () => page.locator('[name="owned:craft:wire"]');
  try {
    await page.goto(`${base}/inventory/?pack=demo%3Atraining-pack`);
    await ready();
    await page.evaluate(async (pack) => {
      const { validatePack } = await import("/assets/src/content/validate.mjs");
      validatePack(
        pack,
        await (await fetch("/assets/schemas/pack.schema.json")).json(),
      );
      const { commitRecord, saveProfile } = await import(
        "/assets/src/storage/store.mjs"
      );
      const { newProfile } = await import("/assets/src/domain/profile.mjs");
      await commitRecord("content", pack.id, { pack, revision: 0 }, 0);
      const profile = newProfile(pack);
      for (const i of pack.items)
        if (i.id !== "craft:wire") profile.inventory[i.id] = 0;
      profile.goals = [{ id: "craft:unrelated-recipe", quantity: 1 }];
      await saveProfile(profile, 0);
    }, collectionFixture());
    const inventory = async () => {
      await page.goto(`${base}/inventory/?pack=qa044%3Acollection`);
      await ready();
    };
    await inventory();
    await page.locator("#inventory-view").selectOption("needed");
    assert.equal(
      await page.locator('[data-inventory-item="craft:spare"]').count(),
      0,
    );
    assert.equal(await badge().getAttribute("data-state"), "review");
    assert.match(await badge().textContent(), /Craft/);
    await wire().fill("0");
    await page.waitForFunction(
      () =>
        document.querySelector('[data-collection-state="craft:wire"]').dataset
          .state === "short",
    );
    assert.match(await badge().textContent(), /More needed/);
    await wire().fill("12");
    await page.waitForFunction(
      () =>
        document.querySelector('[data-collection-state="craft:wire"]').dataset
          .state === "covered",
    );
    const node = await wire().elementHandle();
    await wire().fill("13");
    assert(await wire().evaluate((el, old) => el === old, node));
    await wire().fill("12");
    const savedRevision = await page.evaluate(
      async () =>
        (await import("/assets/src/client/common.mjs")).state.revision,
    );
    await page.locator('#inventory-form button[type="submit"]').click();
    await page.waitForFunction(async (previous) => {
      const { state } = await import("/assets/src/client/common.mjs");
      return !state.saving && state.revision === previous + 1;
    }, savedRevision);
    const saved = await page.evaluate(async () => {
      const { state } = await import("/assets/src/client/common.mjs");
      const { readRecord } = await import("/assets/src/storage/store.mjs");
      return readRecord("profiles", state.pack.id);
    });
    assert.equal(saved.value.revision, savedRevision + 1);
    assert.equal(saved.value.inventory["craft:wire"], 12);
    await inventory();
    await page.locator("#inventory-view").selectOption("needed");
    assert.equal(await wire().inputValue(), "12");
    assert.equal(await badge().getAttribute("data-state"), "covered");
    await page
      .locator('[data-inventory-item="craft:wire"] [data-show-use]')
      .click();
    await page.locator('[name="reserve:craft:wire"]').fill("2");
    assert.equal(await badge().getAttribute("data-state"), "short");
    await page.locator("#cancel-inventory").click();
    await page.waitForFunction(
      () =>
        document.querySelector('[name="reserve:craft:wire"]')?.value === "0",
    );
    assert.equal(await badge().getAttribute("data-state"), "covered");
    await page.locator('[data-show-use="craft:wire"]').first().click();
    assert.match(
      await page
        .locator('[data-upgrade-needs-detail="craft:wire"]')
        .textContent(),
      /Required 12; missing 0/,
    );
    for (const width of [320, 390, 900, 1440, 1920])
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (t) => (document.documentElement.dataset.theme = t),
          theme,
        );
        const overflow = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          offenders: [...document.querySelectorAll("*")]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
            .slice(0, 15)
            .map((e) => [
              e.tagName,
              e.className,
              e.getBoundingClientRect().right,
            ]),
        }));
        assert(overflow.scroll <= overflow.width + 1, JSON.stringify(overflow));
        for (const [stock, state] of [
          ["0", "short"],
          ["", "review"],
          ["12", "covered"],
        ]) {
          await wire().fill(stock);
          assert.equal(await badge().getAttribute("data-state"), state);
          assert(
            await badge().evaluate((el) => {
              const style = getComputedStyle(el);
              const linear = (c) => {
                const v = c / 255;
                return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              };
              const luminance = (color) =>
                color
                  .match(/[\d.]+/g)
                  .slice(0, 3)
                  .map(Number)
                  .map(linear)
                  .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
              const a = luminance(style.color),
                b = luminance(style.backgroundColor);
              return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5;
            }),
            `${state} text contrast`,
          );
        }
        await page.evaluate(
          () => (document.documentElement.style.fontSize = "200%"),
        );
        assert(
          await page.evaluate(
            () =>
              parseFloat(getComputedStyle(document.documentElement).fontSize) >=
              32,
          ),
        );
        const largeOverflow = await page.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          offenders: [...document.querySelectorAll("*")]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
            .slice(0, 15)
            .map((e) => [
              e.tagName,
              e.className,
              e.getBoundingClientRect().right,
            ]),
        }));
        assert(
          largeOverflow.scroll <= largeOverflow.width + 1,
          JSON.stringify(largeOverflow),
        );
        await wire().scrollIntoViewIfNeeded();
        await wire().evaluate((node) =>
          node.scrollIntoView({ block: "center", inline: "nearest" }),
        );
        await wire().focus();
        await page.evaluate(() => new Promise(requestAnimationFrame));
        const enlargedBox = await wire().boundingBox();
        const statusGeometry = () =>
          wire().evaluate((input) => {
            const rect = (node) => {
              const box = node.getBoundingClientRect();
              return { top: box.top, height: box.height, width: box.width };
            };
            const row = input.closest(".inventory-row");
            return {
              scrollY,
              input: rect(input),
              row: rect(row),
              name: rect(row.querySelector(".inventory-name")),
              badge: rect(row.querySelector(".collection-state")),
              owned: rect(input.closest(".owned-cell")),
              label: rect(input.closest("label")),
              inputMarginTop: getComputedStyle(input).marginTop,
              focused: document.activeElement === input,
            };
          });
        const initialGeometry = await statusGeometry();
        for (const [stock, state] of [
          ["0", "short"],
          ["", "review"],
          ["12", "covered"],
        ]) {
          await wire().fill(stock);
          assert.equal(await badge().getAttribute("data-state"), state);
          const nextBox = await wire().boundingBox();
          assert.equal(nextBox.x, enlargedBox.x);
          assert.equal(nextBox.width, enlargedBox.width);
          assert.equal(nextBox.height, enlargedBox.height);
          if (Math.abs(nextBox.y - enlargedBox.y) > 4)
            assert.fail(
              `${width}/${theme}/200% stable status geometry ${stock}: ${nextBox.y - enlargedBox.y}px; ${JSON.stringify({ before: initialGeometry, after: await statusGeometry() })}`,
            );
        }
        await page.evaluate(
          () => (document.documentElement.style.fontSize = ""),
        );
      }
    await page.goto(`${base}/upgrades/?pack=qa044%3Acollection`);
    await ready();
    await page.locator('[data-complete-upgrade="craft:upgrade"]').click();
    await page.locator("#upgrade-progress-apply").click();
    await page.waitForFunction(
      () => !document.querySelector("#upgrade-progress-confirm").open,
    );
    await inventory();
    await page.locator("#inventory-view").selectOption("needed");
    assert.equal(await page.locator("[data-inventory-item]").count(), 0);
    console.log(
      `${browser.browserType().name()} collection unfinished/crafting/yellow/red/green/reserves/Save/Cancel/completion/themes PASS`,
    );
  } finally {
    await context.close();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  for (const engine of [chromium, firefox, webkit]) {
    const browser = await engine.launch();
    try {
      await runCollectionTests({
        browser,
        base: process.env.TEST_BASE || "http://127.0.0.1:4173",
      });
    } finally {
      await browser.close();
    }
  }
