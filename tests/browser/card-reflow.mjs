import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
import { startBrowserServer } from "./server.mjs";
import { renderItemCard } from "../../src/ui/item-card.mjs";
const server = await startBrowserServer();
await mkdir("test-results/card-reflow", { recursive: true });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(server.base + "/armory/");
      await page.waitForSelector(
        'main[data-armory-ready="true"][data-armory-busy="false"]',
      );
      const card = page.locator('[data-weapon-card="m4"]');
      const help = card.locator(".picker-count-help > summary");
      assert.equal(
        await card.locator(".picker-controls").count(),
        1,
        "Ownership and extraction controls need their own row below the weapon name",
      );
      const geometry = async () =>
        card.evaluate((node) => {
          const box = node.getBoundingClientRect();
          const bad = [
            ...node.querySelectorAll(
              "a, label, button, strong, small, select, fieldset, summary, .picker-count-description",
            ),
          ]
            .filter((child) => {
              const rect = child.getBoundingClientRect();
              return (
                rect.width &&
                rect.height &&
                (rect.left < box.left - 1 || rect.right > box.right + 1)
              );
            })
            .map((child) => ({
              tag: child.tagName,
              text: child.textContent.trim().slice(0, 80),
            }));
          const heading = node
            .querySelector(".picker-card-heading")
            .getBoundingClientRect();
          const controls = node
            .querySelector(".picker-controls")
            .getBoundingClientRect();
          return {
            bad,
            controlsBelowName: controls.top >= heading.bottom,
            scrollOverflow: node.scrollWidth > node.clientWidth + 1,
          };
        });
      for (const font of ["", "125%", "200%"]) {
        await page.evaluate(
          (value) => (document.documentElement.style.fontSize = value),
          font,
        );
        for (const width of [180, 220, 260, 300, 350, 380]) {
          await card.evaluate((node, width) => {
            node.style.inlineSize = width + "px";
            node.style.boxSizing = "border-box";
            node.querySelector("[data-weapon-context] strong").textContent =
              "SYNTHETIC Long Weapon Name 12345678901234567890";
          }, width);
          const result = await geometry();
          assert(
            result.controlsBelowName,
            `${name}/${width}/${font}: name must have its own row`,
          );
          assert.deepEqual(
            result.bad,
            [],
            `${name}/${width}/${font}: contents escape card`,
          );
          assert(
            !result.scrollOverflow,
            `${name}/${width}/${font}: card must not scroll horizontally`,
          );
          const spacing = await card.evaluate((node, width) => {
            const scale =
              parseFloat(getComputedStyle(document.documentElement).fontSize) /
              16;
            const apart = (a, b) => {
              const x = a.getBoundingClientRect(),
                y = b.getBoundingClientRect();
              return (
                Math.max(
                  y.left - x.right,
                  x.left - y.right,
                  y.top - x.bottom,
                  x.top - y.bottom,
                ) >=
                8 * scale - 1
              );
            };
            const owners = [
              ...node.querySelectorAll(".picker-ownership label"),
            ];
            return {
              ownership: apart(owners[0], owners[1]),
              toolbar: apart(
                node.querySelector(".picker-ownership"),
                node.querySelector(".picker-extractions"),
              ),
              tracks: [...node.querySelectorAll(".picker-track-row")].every(
                (row) =>
                  apart(
                    row.querySelector(".picker-challenge"),
                    row.querySelector("fieldset"),
                  ),
              ),
              narrowFooter:
                width > 260 ||
                [...node.querySelectorAll(".picker-track-row")].every((row) => {
                  const challenge = row
                    .querySelector(".picker-challenge")
                    .getBoundingClientRect();
                  const done = row
                    .querySelector("fieldset")
                    .getBoundingClientRect();
                  return (
                    done.top >= challenge.bottom + 8 * scale - 1 &&
                    Math.abs(done.right - row.getBoundingClientRect().right) <=
                      1
                  );
                }),
            };
          }, width);
          assert.deepEqual(
            spacing,
            {
              ownership: true,
              toolbar: true,
              tracks: true,
              narrowFooter: true,
            },
            `${name}/${width}/${font}: groups need consistent breathing room`,
          );
          await help.focus();
          await page.keyboard.press("Enter");
          await card
            .locator(".picker-count-help[open] .picker-count-description")
            .waitFor({ state: "visible" });
          assert.deepEqual(
            (await geometry()).bad,
            [],
            `${name}/${width}/${font}: open help escapes card`,
          );
          await page.keyboard.press("Escape");
        }
      }
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
      await card.evaluate((node) => {
        node.style.inlineSize = "350px";
        node.querySelector("[data-weapon-context] strong").textContent =
          "SYNTHETIC spacing example";
        node.querySelector("[data-picker-camo-name]").textContent =
          "SYNTHETIC Harmonic Break";
        node.querySelector("[data-picker-camo-status]").textContent =
          "Remaining · check prerequisites";
        node.querySelector("[data-prestige-name]").textContent =
          "SYNTHETIC Pyroclast";
        node.querySelector("[data-prestige-status]").textContent =
          "Current prestige";
      });
      await card.screenshot({
        path: `test-results/card-reflow/${name}-spacing-350.png`,
      });
      await card.evaluate((node) => (node.style.inlineSize = "260px"));
      await card.screenshot({
        path: `test-results/card-reflow/${name}-spacing-260.png`,
      });
      await card.evaluate((node) => (node.style.inlineSize = "260px"));
      await help.hover();
      assert.match(await help.getAttribute("title"), /manual.*extractions/i);
      await help.focus();
      await page.keyboard.press("Enter");
      await card
        .locator(".picker-count-help[open] .picker-count-description")
        .waitFor({ state: "visible" });
      assert.deepEqual((await geometry()).bad, []);
      await page.keyboard.press("Escape");
      assert(
        !(await card
          .locator(".picker-count-help")
          .evaluate((node) => node.open)),
      );
      await help.click();
      assert(
        await card.locator(".picker-count-help").evaluate((node) => node.open),
      );
      await help.click();
      assert(
        !(await card
          .locator(".picker-count-help")
          .evaluate((node) => node.open)),
      );
      await help.click();
      await card.locator('[data-picker-extraction-step="1"]').click();
      await page.waitForSelector(
        'main[data-armory-revision="1"][data-armory-busy="false"]',
      );
      assert.equal(
        (
          await card.locator("[data-weapon-context-progress]").textContent()
        ).trim(),
        "1/3",
      );
      assert.match(await help.getAttribute("aria-label"), /1 of 3/);
      assert(
        !(await card
          .locator(".picker-count-help")
          .evaluate((node) => node.open)),
      );
      assert.match(await help.getAttribute("aria-label"), /1\/3/);
      await card
        .locator("[data-weapon-context] strong")
        .evaluate((node) => (node.textContent = "M4"));
      await card.scrollIntoViewIfNeeded();
      await card.screenshot({
        path: `test-results/card-reflow/${name}-m4-card.png`,
      });
      await page.evaluate(
        () => (document.documentElement.dataset.theme = "light"),
      );
      await card.screenshot({
        path: `test-results/card-reflow/${name}-m4-light.png`,
      });
      await page.evaluate(
        () => (document.documentElement.dataset.theme = "dark"),
      );
      await page.screenshot({
        path: `test-results/card-reflow/${name}-compact.png`,
        fullPage: false,
      });
      await page.reload();
      await page.waitForSelector(
        'main[data-armory-revision="1"][data-armory-busy="false"]',
      );
      assert.equal(
        (
          await card.locator("[data-weapon-context-progress]").textContent()
        ).trim(),
        "1/3",
      );
      await card.locator('[data-picker-extraction-step="-1"]').click();
      await page.waitForSelector(
        'main[data-armory-revision="2"][data-armory-busy="false"]',
      );
      await page.setViewportSize({ width: 320, height: 800 });
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.deepEqual((await geometry()).bad, []);
      const { default: AxeBuilder } = await import(
        "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs"
      );
      for (const theme of ["dark", "light"]) {
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        assert.deepEqual(
          (
            await new AxeBuilder({ page })
              .include('[data-weapon-card="m4"]')
              .analyze()
          ).violations,
          [],
        );
      }
      await page.goto(server.base + "/");
      await page.waitForSelector('#dashboard-weapons [data-weapon-card="m4"]');
      const dashboardCard = page.locator(
        '#dashboard-weapons [data-weapon-card="m4"]',
      );
      assert.equal(await dashboardCard.locator(".picker-controls").count(), 1);
      assert.equal(
        (
          await dashboardCard
            .locator("[data-weapon-context-progress]")
            .textContent()
        ).trim(),
        "0/3",
      );
      assert(
        await dashboardCard.evaluate(
          (node) => node.scrollWidth <= node.clientWidth + 1,
        ),
      );
      const items = await context.newPage();
      const itemHTML = renderItemCard(
        {
          id: "synthetic:long-item",
          name: "SYNTHETIC ExtremelyLongUnbrokenItemNameForReflow Legendary Backpack",
          rarity: "legendary",
        },
        {
          packId: "synthetic:layout",
          size: "compact",
          quantityLabel: "Needed",
          quantityValue: "12",
          notes: [
            "SYNTHETIC UnbrokenNoteWithoutSpacesToProveWrapping1234567890",
          ],
        },
      );
      await items.setContent(
        `<link rel="stylesheet" href="${server.base}/assets/src/styles.css"><link rel="stylesheet" href="${server.base}/assets/src/ui/item-card.css"><div id="fixture">${itemHTML}</div>`,
      );
      await items.evaluate(() => document.fonts.ready);
      for (const font of ["", "200%"]) {
        for (const width of [180, 220, 260]) {
          const result = await items.evaluate(
            ({ width, font }) => {
              document.documentElement.style.fontSize = font;
              document.querySelector("#fixture").style.inlineSize =
                width + "px";
              const node = document.querySelector(".item-card"),
                box = node.getBoundingClientRect();
              return {
                cardFits: box.width <= width + 1,
                scrollFits: node.scrollWidth <= node.clientWidth + 1,
                nameFits:
                  node.querySelector(".item-card__name").getBoundingClientRect()
                    .right <=
                  box.right + 1,
              };
            },
            { width, font },
          );
          assert(
            result.cardFits && result.scrollFits && result.nameFits,
            `${name}/${width}/${font}: shared item card overflow`,
          );
        }
      }
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `${name}: 180–380px cards, long names,100/125/200% text, measured group gaps and narrow footers, native help, +/- and reload, Dashboard parity, dark/light Axe PASS`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.stop();
}
