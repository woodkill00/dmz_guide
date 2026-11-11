import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startBrowserServer } from "./server.mjs";

const server = await startBrowserServer();
const browser = await chromium.launch();
let failure;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `${server.base}/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Amirae-general-hospital`,
  );
  await page.locator("#location-timeline-title").waitFor();
  assert.match(
    await page.locator("#local-records").textContent(),
    /Source report/,
  );
  await page.goto(`${server.base}/field-desk/?pack=official%3Amw4-dmz-starter`);
  await page.waitForFunction(
    () =>
      document.querySelector("#discovery-item option[value='mw4:bandage']") !==
      null,
  );
  await page.locator("#discovery-item").selectOption("mw4:bandage");
  await page
    .locator("#discovery-location")
    .selectOption("mw4:mirae-general-hospital");
  await page.locator("#discovery-notes").fill("Synthetic private observation");
  await page.locator("#discovery-form button").click();
  await page.locator("#field-confirm").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#discovery-list")
      ?.textContent?.includes("Synthetic private observation"),
  );
  await page.goto(
    `${server.base}/local/?pack=official%3Amw4-dmz-starter&id=mw4%3Amirae-general-hospital`,
  );
  await page.locator("#location-timeline-title").waitFor();
  const reviewLink = page.locator("#local-records a[href*='#discovery-']");
  assert.equal(await reviewLink.count(), 1);
  await reviewLink.click();
  await page.waitForFunction(
    () => document.querySelector("#discovery-list details[open]") !== null,
  );
  assert.match(
    await page.locator("#discovery-list details[open]").textContent(),
    /Synthetic private observation/,
  );
  assert.deepEqual(errors, []);
  console.log("Location timeline browser journey PASS");
} catch (error) {
  failure = error;
  throw error;
} finally {
  await browser.close();
  await server.stop(failure);
}
