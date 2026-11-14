import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { collectionFixture } from "../helpers/collection-needs.mjs";

const server = await startBrowserServer();
const browser = await chromium.launch();
let failure;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `${server.base}/data-review/?pack=official%3Amw4-dmz-starter`,
  );
  await page.waitForFunction(() =>
    document
      .querySelector("#review-count")
      ?.textContent?.includes("visible issues"),
  );
  assert.equal((await page.locator("#review-list li").count()) > 0, true);
  const repairLink = page
    .locator('#review-list a[href^="http://127.0.0.1:4174/"]')
    .first();
  assert.equal(await repairLink.count(), 1);
  const repair = new URL(await repairLink.getAttribute("href"));
  assert.equal(repair.searchParams.get("packId"), "official:mw4-dmz-starter");
  assert.equal(repair.searchParams.get("intent"), "edit");
  await page
    .getByText("Browse records needing review", { exact: true })
    .click();
  await page.locator("#review-query").fill("no registered map position");
  assert.match(
    await page.locator("#review-list").textContent(),
    /No registered map position/i,
  );
  const pack = collectionFixture();
  pack.claims = [
    {
      id: "claim:fictional-impact",
      entityId: pack.objectives[0].id,
      field: "requirements",
      value: "Old synthetic claim",
      status: "fictional",
      sourceId: pack.sources[0].id,
      locator: "Synthetic fixture",
    },
  ];
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
    `${server.base}/data-review/?pack=${encodeURIComponent(pack.id)}`,
  );
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  const candidate = await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    const { addRunPlan, emptyRunPlans, saveRunPlans } = await import(
      "/assets/src/domain/run-plans.mjs"
    );
    const doc = addRunPlan(emptyRunPlans(state.pack), {
      id: "qa:source-impact",
      name: "Fictional source check",
      date: "2026-11-11",
      objectives: [{ type: "objective", id: state.pack.objectives[0].id }],
      stops: [],
      reservations: {},
    });
    await saveRunPlans(doc, 0);
    const next = structuredClone(state.pack);
    next.objectives[0].description += " Synthetic candidate change.";
    next.claims[0].value = "New synthetic claim";
    return next;
  });
  await page.locator("#source-impact-file").setInputFiles({
    name: "synthetic-candidate.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(candidate)),
  });
  await page.locator("#source-impact-check").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#source-impact-status")
      ?.textContent?.includes("1 affected"),
  );
  assert.match(
    await page.locator("#source-impact-status").textContent(),
    /1 affected/,
  );
  assert.match(
    await page.locator("#source-impact-results").textContent(),
    /changed/,
  );
  assert.match(
    await page.locator("#source-change-results").innerText(),
    /Old synthetic claim.*New synthetic claim/s,
  );
  await page.locator('[data-reject-claim="claim:fictional-impact"]').click();
  assert.match(
    await page.locator("#source-change-status").innerText(),
    /1 rejected/,
  );
  const persisted = await page.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    const { loadRunPlans } = await import("/assets/src/domain/run-plans.mjs");
    return {
      description: state.pack.objectives[0].description,
      planCount: (await loadRunPlans(state.pack)).plans.length,
    };
  });
  assert.equal(persisted.description, pack.objectives[0].description);
  assert.equal(persisted.planCount, 1);
  const planLink = page.locator("#source-impact-results a");
  assert.match(await planLink.getAttribute("href"), /plan=qa%3Asource-impact/);
  await planLink.click();
  await page.waitForURL(/\/run-plan\//);
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  assert.equal(
    await page.locator('[data-plan-id="qa:source-impact"]').count(),
    1,
  );
  assert.deepEqual(errors, []);
  console.log("Data review browser journey PASS");
} catch (error) {
  failure = error;
  throw error;
} finally {
  await browser.close();
  await server.stop(failure);
}
