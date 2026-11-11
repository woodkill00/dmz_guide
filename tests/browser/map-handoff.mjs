import assert from "node:assert/strict";
import { chromium } from "playwright";

// The handoff uses fixed local origins by design. Start the Guide on 4173 and
// the map on 5175 before this cross-origin browser journey.
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const guide = await context.newPage();
  const errors = [];
  guide.on("pageerror", (error) => errors.push(error.message));
  await guide.goto(
    "http://127.0.0.1:4173/run-plan/?pack=official%3Amw4-dmz-starter",
  );
  await guide.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await guide.locator("#run-plan-name").fill("Synthetic handoff test");
  await guide.locator("#run-plan-create button").click();
  await guide.locator(".run-plan-card").waitFor();
  await guide.locator("[data-stop-form] button").click();
  await guide.waitForFunction(
    () =>
      document.querySelector("[data-stop-form]")?.previousElementSibling
        ?.tagName === "OL",
  );
  const popupPromise = guide.waitForEvent("popup");
  await guide.locator("[data-send-map]").click();
  const map = await popupPromise;
  map.on("pageerror", (error) => errors.push(error.message));
  await map.locator("#run-plan-accept").waitFor({ timeout: 20000 });
  assert.match(
    await map.locator("#map-collection-plan").textContent(),
    /Private stock was not transferred/,
  );
  await map.locator("#run-plan-accept").click();
  await map.locator("#run-plan-highlight").waitFor();
  assert.match(
    await guide.locator("#save-status").textContent(),
    /received the plan for review/i,
  );
  const secondPopupPromise = guide.waitForEvent("popup");
  await guide.locator("[data-send-map]").click();
  const declinedMap = await secondPopupPromise;
  await declinedMap.locator("#run-plan-decline").waitFor({ timeout: 20000 });
  await declinedMap.locator("#run-plan-decline").click();
  assert.equal(await declinedMap.locator("#run-plan-accept").count(), 0);
  assert.equal(await guide.locator(".run-plan-card").count(), 1);
  assert.deepEqual(errors, []);
  console.log("Guide-to-map run-plan handoff PASS");
} finally {
  await browser.close();
}
