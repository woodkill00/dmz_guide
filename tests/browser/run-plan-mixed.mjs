import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { startBrowserServer } from "./server.mjs";

const server = await startBrowserServer();
const browser = await chromium.launch();
let failure;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (reason) => errors.push(reason.message));
  await page.goto(`${server.base}/run-plan/?pack=official%3Amw4-dmz-starter`);
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  const itemId = await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    const { saveProfile } = await import("/assets/src/storage/store.mjs");
    const itemId = state.pack.items[0].id;
    await saveProfile(
      {
        ...structuredClone(state.profile),
        inventory: { ...state.profile.inventory, [itemId]: 4 },
      },
      state.revision,
    );
    return itemId;
  });
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  for (const name of ["First mixed run", "Second mixed run"]) {
    await page.locator("#run-plan-name").fill(name);
    await page.locator("#run-plan-create button").click();
    await page.waitForFunction(
      (count) => document.querySelectorAll(".run-plan-card").length === count,
      name.startsWith("First") ? 1 : 2,
    );
  }
  const first = page.locator(".run-plan-card").nth(0);
  await first
    .locator("[data-objective-form] select")
    .selectOption({ index: 1 });
  await first.locator("[data-objective-form] button").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".run-plan-card [data-remove-objective]") !== null,
  );
  await first.locator("[data-stop-form] select").selectOption({ index: 1 });
  await first.locator("[data-stop-form] button").click();
  await page.waitForFunction(
    () => document.querySelector(".run-plan-card [data-remove-stop]") !== null,
  );
  await first.locator("[data-key-form] select").selectOption({ index: 1 });
  await first.locator("[data-key-form] button").click();
  await page.waitForFunction(
    () =>
      document.querySelector(
        ".run-plan-card [data-remove-objective][aria-label*='key']",
      ) !== null ||
      document.querySelectorAll(".run-plan-card [data-remove-objective]")
        .length >= 2,
  );
  for (let index = 0; index < 2; index++) {
    const card = page.locator(".run-plan-card").nth(index);
    await card.locator("[data-reservation-form] select").selectOption(itemId);
    await card.locator("[data-reservation-form] input[name=amount]").fill("3");
    await card.locator("[data-reservation-form] button").click();
    await page.waitForFunction(
      (count) =>
        document.querySelectorAll(".run-plan-reservations li").length === count,
      index + 1,
    );
  }
  assert.match(
    await page
      .locator(".run-plan-card")
      .nth(0)
      .locator(".run-plan-reservations")
      .textContent(),
    /Covered/,
  );
  assert.match(
    await page
      .locator(".run-plan-card")
      .nth(1)
      .locator(".run-plan-reservations")
      .textContent(),
    /2 short/,
  );
  await mkdir("test-results/feature-073", { recursive: true });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const detail = page
      .locator(".run-plan-card")
      .nth(0)
      .locator("details")
      .filter({ hasText: "Recorded prerequisites" });
    if (await detail.count())
      await detail.first().evaluate((node) => {
        node.open = true;
      });
    await page.screenshot({
      path: `test-results/feature-073/run-plan-populated-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .locator(".run-plan-card")
    .nth(1)
    .locator('[data-move="up"]')
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector(".run-plan-card h2")?.textContent ===
      "Second mixed run",
  );
  assert.match(
    await page
      .locator(".run-plan-card")
      .nth(0)
      .locator(".run-plan-reservations")
      .textContent(),
    /Covered/,
  );
  assert.match(
    await page
      .locator(".run-plan-card")
      .nth(1)
      .locator(".run-plan-reservations")
      .textContent(),
    /2 short/,
  );
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  assert.deepEqual(await page.locator(".run-plan-card h2").allTextContents(), [
    "Second mixed run",
    "First mixed run",
  ]);
  assert.equal(
    await page
      .locator(".run-plan-card")
      .nth(1)
      .locator("[data-remove-objective]")
      .count(),
    2,
  );
  assert.equal(
    await page
      .locator(".run-plan-card")
      .nth(1)
      .locator("[data-remove-stop]")
      .count(),
    1,
  );
  await page.evaluate(() => {
    const card = [...document.querySelectorAll(".run-plan-card")][1];
    card.querySelector("[data-remove-stop]").click();
    card.querySelector("[data-remove-objective]").click();
  });
  await page.waitForFunction(() => {
    const card = [...document.querySelectorAll(".run-plan-card")][1];
    return (
      card &&
      !card.querySelector("[data-remove-stop]") &&
      card.querySelectorAll("[data-remove-objective]").length === 1
    );
  });
  assert.deepEqual(errors, []);
  console.log("Mixed run plan browser journey PASS");
} catch (reason) {
  failure = reason;
  throw reason;
} finally {
  await browser.close();
  await server.stop(failure);
}
