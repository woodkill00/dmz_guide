import { pollBrowser } from "./poll.mjs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { monitorBrowser, optionalCamoArtwork } from "./health.mjs";
import { runCollectionTests } from "./collection-needs.mjs";
import { runTieredUpgradeTests } from "./tiered-upgrades.mjs";
import { runOrdersNavigationTests } from "./orders-navigation.mjs";
import { revealTrackerControl } from "./tracker-controls.mjs";
import {
  runOrderReturnTests,
  runOrderEarlyReturnTests,
} from "./order-return.mjs";

const server = await startBrowserServer();
const base = server.base,
  results = [];
await mkdir("test-results/reliability", { recursive: true });
const ready = (page) => page.locator('main[aria-busy="false"]').waitFor();
const armoryReady = (page) =>
  page
    .locator('main[data-armory-ready="true"][data-armory-busy="false"]')
    .waitFor();

async function crossPageChecks(browser, engine) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  try {
    // Clean CI checkouts have no private local swatches. Exercise one exact
    // optional image's fallback while keeping every non-artwork error fatal.
    await context.route(
      "**/local-camo-images/han-86/military-camo-1.webp",
      (route) =>
        route.fulfill({
          status: 404,
          body: "Synthetic missing optional image",
        }),
    );
    const item = "mw4:ingredient-control-unit";
    const route = (path) => `${base}/${path}/?pack=official%3Amw4-dmz-starter`;
    await page.goto(route("inventory"));
    await ready(page);
    await page.locator("#inventory-query").fill("Control Unit");
    const stockSelector = `[data-field="inventory"][data-id="${item}"]`;
    await revealTrackerControl(page, stockSelector);
    await page.locator(stockSelector).first().fill("2");
    await page
      .getByRole("button", { name: "Save inventory", exact: true })
      .click();
    await pollBrowser(
      page,
      async () =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("official:mw4-dmz-starter")
        )?.value.inventory["mw4:ingredient-control-unit"] === 2,
    );
    await page.goto(route("needed"));
    await ready(page);
    await page.locator("#needed-query").fill("Control Unit");
    assert.equal(
      await page
        .locator(
          `[data-needed-item="${item}"] [data-needed-missing] .needed-number`,
        )
        .innerText(),
      "28",
    );
    await page.goto(route("quick-collect"));
    await ready(page);
    await page.locator("#collect-query").fill("Control Unit");
    const collect = page.locator(`[data-collect-row="${item}"]`);
    assert.equal(
      await collect.locator("[data-collect-remaining]").innerText(),
      "28",
    );
    await collect.locator("input").fill("5");
    await collect
      .getByRole("button", { name: "Add found Control Unit", exact: true })
      .click();
    await pollBrowser(
      page,
      async () =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("official:mw4-dmz-starter")
        )?.value.inventory["mw4:ingredient-control-unit"] === 7,
    );
    await page.goto(route("inventory"));
    await ready(page);
    await page.locator("#inventory-query").fill("Control Unit");
    assert.equal(await page.locator(stockSelector).first().inputValue(), "7");
    await page.goto(route("needed"));
    await ready(page);
    await page.locator("#needed-query").fill("Control Unit");
    assert.equal(
      await page
        .locator(
          `[data-needed-item="${item}"] [data-needed-missing] .needed-number`,
        )
        .innerText(),
      "23",
    );
    // A real UI edit must be reflected by the other owning page, not just storage.
    await page.goto(base + "/armory/han-86/#acquisition");
    await armoryReady(page);
    await page.locator("#tracker-manual").check();
    await page.waitForFunction(
      () => document.querySelector("main").dataset.armoryRevision === "1",
    );
    await page.locator('[data-extraction-step="1"]').click();
    await page.waitForFunction(
      () => document.querySelector("main").dataset.armoryRevision === "2",
    );
    await page.locator('.weapon-workspace-tabs a[href="#camos"]').click();
    await page.locator('[data-camo-tile="military-camo-1"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-camo-tile="military-camo-1"] img')
          ?.hidden,
    );
    await page.locator('[data-camo-complete="military-camo-1"]').check();
    await page.waitForFunction(
      () => document.querySelector("main").dataset.armoryRevision === "3",
    );
    await page.goto(base + "/");
    await page
      .locator('[data-dash-content="weapons"][data-weapon-save-state="ready"]')
      .waitFor();
    const card = page.locator(
      '[data-dash-content="weapons"] [data-weapon-card="han-86"]',
    );
    assert(await card.locator("[data-picker-manual]").isChecked());
    assert.equal(
      await card.locator("[data-weapon-context-progress]").textContent(),
      "1/3",
    );
    await card.locator("[data-picker-camo-open]").click();
    assert.equal(
      await card.locator("[data-picker-camo-link]").getAttribute("href"),
      "/armory/han-86/#camo:military-camo-2",
    );
    assert.match(
      await card.locator("[data-picker-camo-requirement]").textContent(),
      /Reach Weapon Level 18/,
    );
    assert.equal(
      await card.locator('[data-picker-track="prestige"]').count(),
      1,
    );
    await card.locator('[data-picker-extraction-step="-1"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-dash-content="weapons"]').dataset
          .weaponRevision === "4",
    );
    await page.goto(base + "/armory/han-86/#acquisition");
    await armoryReady(page);
    assert.equal(
      await page.locator("#weapon-extraction-count").textContent(),
      "0 / 3",
    );

    await page.goto(base + "/missions/?pack=official%3Amw4-dmz-starter");
    await ready(page);
    const first = page.locator("#hajin-page-1");
    assert(
      await first
        .locator('[data-mission-objectives="mw4:order-gear-up"]')
        .evaluate((n) => n.open),
    );
    assert.ok(
      (await first.locator(".mission-objective-steps>li").count()) >= 3,
    );
    await first.locator('[data-order-complete="mw4:order-gear-up"]').click();
    await pollBrowser(
      page,
      async () =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("official:mw4-dmz-starter")
        )?.value.completion["mw4:order-gear-up"] === "completed",
    );
    await first.locator('[data-order-complete="hajin-1"]').click();
    await pollBrowser(page, async () => {
      const p = (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value;
      return [
        "mw4:order-gear-up",
        "mw4:order-crackshot",
        "mw4:order-first-op",
      ].every((id) => p?.completion[id] === "completed");
    });
    await page.goto(base + "/");
    await page
      .locator("#dashboard-orders [data-order-show-completed]")
      .waitFor();
    assert.equal(
      await page
        .locator('#dashboard-orders [data-order-key="hajin-1"]')
        .count(),
      0,
    );
    await page.locator("#dashboard-orders [data-order-show-completed]").check();
    const completed = page.locator(
      '#dashboard-orders [data-order-key="hajin-1"] [data-order-complete="hajin-1"]',
    );
    await completed.waitFor();
    assert(await completed.isChecked());
    const beforeReopen = await page.evaluate(
      async () =>
        (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("official:mw4-dmz-starter")
        ).value.revision,
    );
    await completed.click();
    await pollBrowser(
      page,
      async (expected) => {
        const p = (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("official:mw4-dmz-starter")
        )?.value;
        return (
          p?.revision === expected &&
          [
            "mw4:order-gear-up",
            "mw4:order-crackshot",
            "mw4:order-first-op",
          ].every((id) => p.completion[id] !== "completed")
        );
      },
      beforeReopen + 1,
    );
    await page.waitForFunction(() => {
      const c = document.querySelector(
        '#dashboard-orders [data-order-key="hajin-1"] [data-order-complete="hajin-1"]',
      );
      return c && !c.checked && !c.disabled;
    });
    await page.goto(base + "/missions/?pack=official%3Amw4-dmz-starter");
    await ready(page);
    // A history-restored document may expose its old ready attribute before
    // pageshow reconciliation finishes. Require the actual owning UI result.
    await page.waitForFunction(() => {
      const control = document.querySelector(
        '#hajin-page-1 [data-order-complete="hajin-1"]',
      );
      return control && !control.checked;
    });
    assert(
      !(await page
        .locator('#hajin-page-1 [data-order-complete="hajin-1"]')
        .isChecked()),
    );

    await page.goto(base + "/quality/");
    await page.locator("#quality-rows select:not(:disabled)").first().waitFor();
    // Weapon-reference gaps are resolved by source-backed combat identities.
    // Keep the editorial save/navigation journey on an actual outstanding item.
    await page.locator("#quality-type").selectOption("item");
    const row = page.locator("#quality-rows tr").first();
    const href = await row.locator("th a").getAttribute("href");
    assert.match(href, /^\/items\/[a-z0-9-]+\/$/);
    assert.match(
      await row.locator("td a").getAttribute("href"),
      /^\/local-services\/author\//,
    );
    await row.locator("select").selectOption("later");
    await page.waitForFunction(
      () => document.querySelector("#quality-rows select")?.disabled === false,
    );
    await page.reload();
    await page.locator("#quality-rows select:not(:disabled)").first().waitFor();
    await page.locator("#quality-type").selectOption("item");
    assert.equal(
      await page.locator("#quality-rows select").first().inputValue(),
      "later",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    const headingBefore = await page
      .locator("h1")
      .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
    const inputBefore = await page
      .locator("#quality-query")
      .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
    const before = await page
      .locator("body")
      .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    const enlarged = await page
      .locator("body")
      .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
    assert(enlarged >= before * 1.9, "Rendered text must enlarge");
    assert(
      await page
        .locator("#quality-query")
        .evaluate(
          (n, size) => parseFloat(getComputedStyle(n).fontSize) >= size * 1.9,
          inputBefore,
        ),
    );
    assert(
      await page
        .locator("h1")
        .evaluate(
          (n, size) => parseFloat(getComputedStyle(n).fontSize) > size,
          headingBefore,
        ),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    // Follow docs/release.md: the pinned WebKit screenshot tool injects a
    // CSP-blocked stylesheet. Keep its functional/layout/health checks strict;
    // Chromium and Firefox provide the visual captures.
    if (engine !== "webkit")
      await page.screenshot({
        path: `test-results/reliability/${engine}-quality-200.png`,
        fullPage: true,
      });
    await page.goto(base + href);
    await page.locator("main h1").waitFor();
    assert.equal(new URL(page.url()).pathname, href.split("#")[0]);
  } catch (error) {
    const diagnostic = await page
      .evaluate(async () => {
        const { state } = await import("/assets/src/client/common.mjs");
        const saved = (
          await (
            await import("/assets/src/storage/store.mjs")
          ).loadProfile("official:mw4-dmz-starter")
        )?.value;
        const ids = [
          "mw4:order-gear-up",
          "mw4:order-crackshot",
          "mw4:order-first-op",
        ];
        const control = document.querySelector(
          '#hajin-page-1 [data-order-complete="hajin-1"]',
        );
        return {
          url: location.href,
          navigation: performance.getEntriesByType("navigation")[0]?.type,
          pack: state.pack?.id,
          revision: state.revision,
          savedRevision: saved?.revision,
          memory: ids.map((id) => [id, state.profile?.completion[id]]),
          saved: ids.map((id) => [id, saved?.completion[id]]),
          control: control && {
            checked: control.checked,
            attribute: control.getAttribute("checked"),
            disabled: control.disabled,
            partial: control.indeterminate,
          },
          error: document.querySelector("#error")?.textContent,
          status: document.querySelector("#save-status")?.textContent,
        };
      })
      .catch((reason) => ({ unavailable: reason.message }));
    await writeFile(
      `test-results/reliability/${engine}-failure-state.json`,
      JSON.stringify(diagnostic, null, 2),
    );
    if (engine !== "webkit")
      await page
        .screenshot({
          path: `test-results/reliability/${engine}-failure.png`,
          fullPage: true,
        })
        .catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

let failure;
try {
  for (const [engine, type] of Object.entries({
    chromium,
    firefox,
    webkit,
  }).filter(([name]) => !process.env.BROWSER || process.env.BROWSER === name)) {
    const browser = await type.launch(),
      health = monitorBrowser(browser, {
        optionalArtwork: await optionalCamoArtwork(base),
      });
    try {
      for (const [family, run] of [
        ["inventory-needed", runCollectionTests],
        ["upgrades", runTieredUpgradeTests],
        ["orders-navigation", runOrdersNavigationTests],
        ["orders-cached-return", runOrderReturnTests],
        ["orders-initial-return", runOrderEarlyReturnTests],
      ]) {
        await run({ browser, base });
        results.push({ engine, family, status: "passed", synthetic: true });
      }
      await crossPageChecks(browser, engine);
      health();
      server.assertAlive();
      results.push({
        engine,
        family: "weapon-dashboard-orders-quality",
        status: "passed",
        synthetic: true,
      });
      console.log(`${engine} reliability journeys PASS`);
    } finally {
      await browser.close();
    }
  }
} catch (error) {
  failure = error;
  throw error;
} finally {
  await writeFile(
    `test-results/reliability/journeys-${process.env.BROWSER || "all"}.json`,
    JSON.stringify(
      {
        results,
        completed: !failure,
        failure: failure?.message || null,
        maps: "Separate map engine/Safe/Loot suites; not certified by this guide report.",
      },
      null,
      2,
    ),
  );
  await server.stop(failure);
}
