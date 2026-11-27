import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
import { startBrowserServer } from "./server.mjs";
import { renderItemCard } from "../../src/ui/item-card.mjs";
import {
  dashboardTile,
  dashboardUpgradeCards,
} from "../../src/ui/dashboard-page.mjs";
import { dashboardBlueprintCards } from "../../src/ui/blueprint-cards.mjs";
import { dashboardOrderCards } from "../../src/ui/order-cards.mjs";
import { itemSummaryMarkup } from "../../src/client/build-collect-view.mjs";
import { craftingItemLink } from "../../src/ui/crafting-uses.mjs";

const server = await startBrowserServer();
await mkdir("test-results/card-reflow", { recursive: true });
const synthetic = {
  id: "synthetic:reflow",
  name: "SYNTHETIC LongUnbrokenItemNameForReusableCardRegression Backpack",
  rarity: "legendary",
  section: "Backpacks",
  owned: false,
};
const pack = {
  id: "synthetic:layout",
  items: [synthetic],
  recipes: [],
  objectives: [],
};
const cases = [
  ["/features/", ".hub-card"],
  ["/guides/", ".record-card"],
  ["/missions/", ".mission-page-card"],
  ["/upgrades/", ".fob-upgrade-card"],
  ["/upgrades/", ".upgrade-material-card"],
  ["/items/", ".item-row"],
  ["/track/items/", "[data-track-items-pack]:not([hidden]) .track-item-row"],
  ["/armory/m4/", ".camo-tile"],
  [
    "/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Aingredient-detonators",
    ".item-action-card",
  ],
];
try {
  for (const [engineName, engine] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
        viewport: { width: 1100, height: 900 },
      });
      const page = await context.newPage();
      const failures = [];
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const check = async (selector, family) => {
        const card = page.locator(selector).first();
        await card.waitFor({ state: "attached" });
        await card.evaluate((node) => {
          for (
            let parent = node.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            if (parent.tagName === "DETAILS") parent.open = true;
          }
          for (const details of node.querySelectorAll("details"))
            details.open = true;
          for (const pin of node.querySelectorAll("[data-pin-feature]"))
            pin.hidden = false;
          const heading = node.querySelector(
            ".item-card__name,.item-identity h3 a,.track-item-row a,h3 a,h4 a,h2 a,h3,h4,h2,strong",
          );
          if (heading)
            heading.textContent =
              "SYNTHETIC LongUnbrokenNameForCardReflowWithNoSpaces1234567890";
        });
        for (const font of ["100%", "200%"]) {
          for (const width of [220, 280, 360]) {
            const result = await card.evaluate(
              (node, { width, font }) => {
                document.documentElement.style.fontSize = font;
                node.style.inlineSize = width + "px";
                node.style.maxInlineSize = "none";
                node.style.boxSizing = "border-box";
                const box = node.getBoundingClientRect();
                const bad = [...node.querySelectorAll("*")]
                  .filter((child) => {
                    if (child.closest(".sr-only,[hidden]")) return false;
                    // Wide data tables may scroll inside a bounded, visible region.
                    for (
                      let p = child.parentElement;
                      p && p !== node;
                      p = p.parentElement
                    ) {
                      const r = p.getBoundingClientRect();
                      if (
                        p.matches(
                          ".table-wrap,.table-scroll,.armory-table-wrap",
                        ) &&
                        child.closest("table") &&
                        ["auto", "scroll"].includes(
                          getComputedStyle(p).overflowX,
                        ) &&
                        r.left >= box.left &&
                        r.right <= box.right
                      )
                        return false;
                    }
                    const r = child.getBoundingClientRect();
                    return (
                      r.width &&
                      r.height &&
                      (r.left < box.left - 1 || r.right > box.right + 1)
                    );
                  })
                  .map((child) => ({
                    tag: child.className || child.tagName,
                    text: child.textContent.trim().slice(0, 45),
                    min: getComputedStyle(child).minWidth,
                    white: getComputedStyle(child).whiteSpace,
                    parent: child.parentElement.className,
                  }))
                  .slice(0, 8);
                return {
                  bad,
                  overflow: node.scrollWidth > node.clientWidth + 1,
                  ...(node.scrollWidth > node.clientWidth + 1
                    ? {
                        cardWidth: [node.scrollWidth, node.clientWidth],
                        scrollingDescendants: [...node.querySelectorAll("*")]
                          .filter((child) => {
                            const box = child.getBoundingClientRect();
                            return (
                              box.width &&
                              box.height &&
                              child.scrollWidth > child.clientWidth + 1 &&
                              !child.closest("table,.sr-only,[hidden]")
                            );
                          })
                          .slice(0, 18)
                          .map((child) => ({
                            tag: child.className || child.tagName,
                            text: child.textContent.trim().slice(0, 45),
                            width: [child.scrollWidth, child.clientWidth],
                            overflow: getComputedStyle(child).overflowX,
                            font: getComputedStyle(child).font,
                          })),
                      }
                    : {}),
                };
              },
              { width, font },
            );
            if (result.bad.length || result.overflow)
              failures.push({ family, width, font, ...result });
            if (family === "item-row" && width === 280 && font === "200%")
              await card.screenshot({
                path: `test-results/card-reflow/${engineName}-item-row-200.png`,
              });
          }
        }
        await page.evaluate(
          () => (document.documentElement.style.fontSize = "100%"),
        );
        await card.evaluate((node) => {
          for (const details of node.querySelectorAll("details"))
            details.open = false;
        });
        await card.evaluate((node) => (node.style.inlineSize = "280px"));
        await card.screenshot({
          path: `test-results/card-reflow/${engineName}-${family}.png`,
        });
      };
      for (const [route, selector] of cases) {
        await page.goto(server.base + route);
        await page
          .locator('html[data-layout-system="109"]')
          .waitFor({ state: "attached" });
        if (selector === ".upgrade-material-card") {
          await page
            .locator(".fob-upgrade-card details")
            .first()
            .evaluate((node) => (node.open = true));
        }
        if (selector === ".camo-tile") {
          await page.locator('.weapon-workspace-tabs a[href="#camos"]').click();
          await page.locator("#camos").waitFor({ state: "visible" });
        }
        await page.locator(selector).first().waitFor({ state: "attached" });
        await page
          .locator(selector)
          .first()
          .evaluate((node) => {
            for (
              let parent = node.parentElement;
              parent;
              parent = parent.parentElement
            )
              if (parent.tagName === "DETAILS") parent.open = true;
          });
        // Test the real parent grid before overriding an isolated card's width.
        for (const width of [320, 768, 1100]) {
          await page.setViewportSize({ width, height: 900 });
          for (const font of ["100%", "200%"]) {
            const actual = await page.evaluate(
              ({ selector, font }) => {
                document.documentElement.style.fontSize = font;
                const nodes = [...document.querySelectorAll(selector)].filter(
                  (n) => n.checkVisibility(),
                );
                const boxes = nodes.map((n) => n.getBoundingClientRect());
                return {
                  noVisibleCards: nodes.length === 0,
                  pageOverflow:
                    document.documentElement.scrollWidth > innerWidth + 1,
                  overlap: boxes.some((a, i) =>
                    boxes
                      .slice(i + 1)
                      .some(
                        (b) =>
                          Math.min(a.right, b.right) -
                            Math.max(a.left, b.left) >
                            1 &&
                          Math.min(a.bottom, b.bottom) -
                            Math.max(a.top, b.top) >
                            1,
                      ),
                  ),
                  cardOverflow: nodes.some(
                    (n) => n.scrollWidth > n.clientWidth + 1,
                  ),
                };
              },
              { selector, font },
            );
            if (Object.values(actual).some(Boolean))
              failures.push({
                family: selector,
                layout: "actual page",
                width,
                font,
                ...actual,
              });
          }
        }
        await page.setViewportSize({ width: 1100, height: 900 });
        await page.evaluate(
          () => (document.documentElement.style.fontSize = "100%"),
        );
        await check(selector, selector.match(/\.([\w-]+)$/)[1]);
        if (selector === ".fob-upgrade-card") {
          // A fresh profile has no stock. Native activation must report that
          // guard accessibly without saving anything or assuming quantities.
          const before = await page.evaluate(async () => {
            const { state } = await import("/assets/src/client/common.mjs");
            const { loadProfile } = await import(
              "/assets/src/storage/store.mjs"
            );
            const before = await loadProfile(state.pack.id);
            return before;
          });
          const purchase = page
            .locator(".fob-upgrade-card [data-upgrade-spend]")
            .first();
          await purchase.evaluate((node) => {
            document.documentElement.style.fontSize = "200%";
            for (
              let parent = node.parentElement;
              parent;
              parent = parent.parentElement
            )
              if (parent.tagName === "DETAILS") parent.open = true;
          });
          await purchase.focus();
          await purchase.screenshot({
            path: `test-results/card-reflow/${engineName}-upgrade-purchase-200.png`,
          });
          await page.keyboard.press("Enter");
          await page.locator("#error").waitFor({ state: "visible" });
          assert.equal(
            (await page.locator("#error").textContent()).trim(),
            "Inventory not entered for every listed cost; no spending recorded.",
          );
          assert.deepEqual(
            await page.evaluate(async () => {
              const { state } = await import("/assets/src/client/common.mjs");
              return (
                await import("/assets/src/storage/store.mjs")
              ).loadProfile(state.pack.id);
            }),
            before,
          );
          await page.evaluate(
            () => (document.documentElement.style.fontSize = "100%"),
          );
        }
      }
      // Synthetic content, real renderers and the actual host page's CSS cascade.
      for (const route of ["/", "/quick-collect/"]) {
        await page.goto(server.base + route);
        await page
          .locator('html[data-layout-system="109"]')
          .waitFor({ state: "attached" });
        const fixture = route === "/" ? "#dashboard" : "main";
        const cards = ["icon", "inline", "compact", "regular"]
          .map(
            (size) =>
              `<div data-reflow-case="${size}">${renderItemCard(synthetic, {
                packId: pack.id,
                size,
                quantityLabel: "Still needed",
                quantityValue: "1,234,567",
                notes: [
                  "SYNTHETIC LongUnbrokenAcquisitionInformationWithoutSpaces1234567890",
                ],
                facts: [{ label: "Required", value: "1,234,567" }],
              })}</div>`,
          )
          .join("");
        const tile =
          route === "/"
            ? dashboardTile(
                { ...synthetic, remaining: 12 },
                pack,
                "needed",
                "fixture",
              )
            : itemSummaryMarkup(
                [{ ...synthetic, required: 1234567, remaining: 1234567 }],
                pack,
                {
                  key: "reflow",
                  title: "Synthetic test only",
                  describe: () => "Synthetic description",
                },
              );
        const order = dashboardOrderCards(
          {
            status: "ready",
            orders: [
              {
                set: "hajin",
                page: 1,
                label: "Page 1 · Synthetic",
                done: 0,
                total: 1,
                rows: [
                  {
                    id: "synthetic:order",
                    name: synthetic.name,
                    done: false,
                    steps: ["Synthetic instruction for the test only."],
                  },
                ],
              },
            ],
          },
          pack,
        );
        const upgrades = dashboardUpgradeCards(
          [
            {
              id: "synthetic:upgrade",
              familyId: "synthetic:family",
              name: synthetic.name,
              currentName: synthetic.name,
              done: 0,
              total: 1,
              requirements: [
                { id: synthetic.id, required: 1234567, missing: 1234567 },
              ],
            },
          ],
          pack,
          { schemaVersion: 3, contentVersion: pack.contentVersion },
        );
        const craft = craftingItemLink(synthetic, pack, () => "/items/");
        await page.locator(fixture).evaluate(
          (node, html) => {
            const host = document.createElement("section");
            host.dataset.reflowHost = "true";
            host.innerHTML = html;
            node.append(host);
          },
          cards +
            tile +
            dashboardBlueprintCards([synthetic], pack) +
            order +
            upgrades +
            `<details class="craft-preview" open><summary>Crafting fixture</summary><div class="craft-preview-links">${craft}</div></details>`,
        );
        for (const size of ["icon", "inline", "compact", "regular"]) {
          await check(
            `[data-reflow-case="${size}"] .item-card`,
            `${route === "/" ? "dashboard" : "collect"}-${size}`,
          );
        }
        await check(
          route === "/"
            ? "[data-reflow-host] .dash-tile"
            : "[data-reflow-host] .build-summary-tile",
          route === "/" ? "dashboard-tile" : "collect-tile",
        );
        await check(
          "[data-reflow-host] .dash-blueprint",
          route === "/" ? "dashboard-blueprint" : "collect-blueprint",
        );
        for (const selector of [
          ".dash-order",
          ".dash-upgrade",
          ".item-craft-button",
        ])
          await check(
            `[data-reflow-host] ${selector}`,
            `${route === "/" ? "dashboard" : "collect"}-${selector.slice(1)}`,
          );
      }
      assert.deepEqual(errors, [], `${engineName}: runtime errors`);
      assert.deepEqual(failures, [], `${engineName}: reusable card overflow`);
      console.log(
        `${engineName}: reusable feature/reference/Order/upgrade cards and all item variants in Dashboard/Quick Collect hosts PASS`,
      );
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.stop();
}
