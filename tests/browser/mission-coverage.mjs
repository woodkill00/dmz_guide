import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { collectionFixture } from "../helpers/collection-needs.mjs";

const server = await startBrowserServer();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${server.base}/missions/?pack=official%3Amw4-dmz-starter`);
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  assert.equal(await page.locator("#orders-coverage .orders-page").count(), 24);
  assert.equal(await page.locator("#orders-coverage .unrecorded").count(), 17);
  assert.equal(
    await page.locator("#orders-coverage [data-orders-page]").count(),
    7,
  );
  assert.match(
    await page.locator("#orders-coverage-title").locator("..").textContent(),
    /Fixed page assignments and source-reported chapter positions/,
  );
  const pack = collectionFixture();
  const story = {
    ...structuredClone(pack.objectives[0]),
    id: "craft:story-mission",
    name: "Fictional story mission",
    track: "dmz-story",
    steps: ["Find the fictional relay", "Return to the fictional base"],
    spoiler: false,
  };
  delete story.upgrade;
  const order = {
    ...story,
    id: "craft:order-mission",
    name: "Fictional Order",
    track: "dmz-order",
    orderPage: 3,
  };
  delete order.steps;
  pack.objectives.push(story, order);
  await page.evaluate(async (candidate) => {
    const { validatePack } = await import("/assets/src/content/validate.mjs");
    validatePack(
      candidate,
      await (await fetch("/assets/schemas/pack.schema.json")).json(),
    );
    const { commitRecord } = await import("/assets/src/storage/store.mjs");
    await commitRecord(
      "content",
      candidate.id,
      { pack: candidate, revision: 0 },
      0,
    );
  }, pack);
  await page.goto(
    `${server.base}/missions/?pack=${encodeURIComponent(pack.id)}`,
  );
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  assert.equal(await page.locator("#orders-coverage .recorded").count(), 1);
  await page.locator('[data-orders-page="3"]').click();
  assert.match(await page.locator("#progress-count").textContent(), /of 1/);
  await page.locator("#show-story-missions").click();
  assert.match(await page.locator("#progress-count").textContent(), /of 1/);
  await page
    .locator('[data-progress-detail="craft:story-mission"] > summary')
    .click();
  assert.match(
    await page.locator(".story-mission-steps").textContent(),
    /Find the fictional relay/,
  );
  assert(
    await page
      .locator('.story-mission-steps a[href^="/run-plan/"]')
      .isVisible(),
  );
  assert.deepEqual(errors, []);
  console.log("Mission coverage browser: pass");
} finally {
  await browser.close();
  await server.stop();
}
