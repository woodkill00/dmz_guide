import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startBrowserServer } from "./server.mjs";

const server = await startBrowserServer();
const browser = await chromium.launch();
let failure;
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${server.base}/run-plan/?pack=official%3Amw4-dmz-starter`);
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await page.locator("#run-plan-name").fill("Hajin materials");
  await page.locator("#run-plan-create button").click();
  await page.locator(".run-plan-card").waitFor();
  assert.match(
    await page.locator(".run-plan-card h2").textContent(),
    /Hajin materials/,
  );
  await page
    .locator(".run-plan-card details")
    .first()
    .locator("summary")
    .click();
  await page
    .locator("[data-edit-plan-form] input[name=name]")
    .fill("Hajin materials revised");
  await page.locator("[data-edit-plan-form] button").click();
  await page.waitForFunction(
    () =>
      document.querySelector(".run-plan-card h2")?.textContent ===
      "Hajin materials revised",
  );
  if (await page.locator("[data-objective-form] option").count()) {
    await page.locator("[data-objective-form] button").click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-objective-form]")?.previousElementSibling
          ?.tagName === "UL",
    );
  }
  if (await page.locator("[data-stop-form] option").count()) {
    await page.locator("[data-stop-form] button").click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-stop-form]")?.previousElementSibling
          ?.tagName === "OL",
    );
    assert.equal(
      await page.locator(".run-plan-card a[href*='area=']").count(),
      1,
    );
  }
  await page.locator("[data-key-form] select").selectOption({ index: 1 });
  await page.locator("[data-key-form] button").click();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-key-form]")?.nextElementSibling?.tagName ===
      "UL",
  );
  assert.match(
    await page.locator(".run-plan-card").textContent(),
    /Keys for selected access/,
  );
  await page.locator("[data-reservation-form] input[name=amount]").fill("3");
  await page.locator("[data-reservation-form] button").click();
  await page.waitForFunction(
    () => document.querySelector(".run-plan-reservations") !== null,
  );
  assert.match(
    await page.locator(".run-plan-reservations").textContent(),
    /3 reserved/,
  );
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector(".run-plan-reservations") !== null,
  );
  assert.match(
    await page.locator(".run-plan-reservations").textContent(),
    /3 reserved/,
  );
  await page.locator("[data-remove-reservation]").click();
  await page.waitForFunction(
    () => document.querySelector(".run-plan-reservations") === null,
  );
  assert.match(
    await page.locator(".run-plan-card").textContent(),
    /No supplies reserved yet/,
  );
  for (const [width, height] of [
    [320, 640],
    [390, 844],
    [768, 600],
    [1280, 800],
    [1920, 1080],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
      `horizontal overflow at ${width}x${height}`,
    );
    assert.equal(await page.locator(".run-plan-card").isVisible(), true);
  }
  assert.equal(await page.locator("a[data-feature-id='run-plan']").count(), 1);
  assert.deepEqual(errors, []);
  assert.equal(await page.locator("#error").isHidden(), true);
  console.log("Run plan browser journey PASS");
  await page.close();
} catch (error) {
  failure = error;
  throw error;
} finally {
  await browser.close();
  await server.stop(failure);
}
