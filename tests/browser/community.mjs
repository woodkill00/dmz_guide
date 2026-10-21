import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
export async function runCommunityTests({ browser, base }) {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  await page.goto(base + "/community/?pack=demo%3Atraining-pack");
  await page.waitForSelector("#correction-record option", {
    state: "attached",
  });
  assert.match(
    await page.locator("#discord-status").textContent(),
    /No Discord/,
  );
  const snapshots = () =>
    page.evaluate(async () => {
      const { listRecords } = await import("/assets/src/storage/store.mjs");
      return {
        profiles: await listRecords("profiles"),
        content: await listRecords("content"),
      };
    });
  const before = await snapshots();
  await page.selectOption("#correction-record", "demo:wire");
  for (const [id, value] of [
    ["proposed", "A sourced correction <img src=x onerror=alert(1)>"],
    ["reason", "The source states a different description"],
    ["evidence", "https://example.com/source"],
    ["attribution", "Fixture contributor"],
    ["rights", "Original fixture text, MIT"],
  ])
    await page.fill("#correction-" + id, value);
  await page
    .getByRole("button", { name: "Preview correction", exact: true })
    .click();
  const event = page.waitForEvent("download");
  await page.click("#export-correction");
  const file = await event,
    raw = await readFile(await file.path(), "utf8"),
    packet = JSON.parse(raw);
  assert.equal(packet.entityId, "demo:wire");
  assert.equal(await page.locator("#correction-json img").count(), 0);
  assert(!("inventory" in packet));
  await page.setInputFiles("#review-file", {
    name: "correction.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await page.waitForSelector("#review-stage:not([hidden])");
  await page.fill("#reviewer", "Local fixture reviewer");
  await page.fill("#review-notes", "Source scope still needs confirmation");
  const reviewEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export reviewed packet", exact: true })
    .click();
  const reviewFile = await reviewEvent,
    review = JSON.parse(await readFile(await reviewFile.path(), "utf8"));
  assert.equal(review.decision, "needs-evidence");
  assert.deepEqual(review.correction, packet);
  await page.selectOption("#pack-select", "official:mw4-dmz-starter");
  await page.waitForFunction(
    () => document.querySelector("#review-stage").hidden,
  );
  assert.equal(await page.locator("#correction-preview").isVisible(), false);
  await page.waitForFunction(() =>
    document.querySelector("#save-status").textContent.includes("Saved"),
  );
  await page.setInputFiles("#review-file", {
    name: "mismatch.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await page.waitForSelector("#review-stage:not([hidden])");
  assert.match(await page.locator("#review-context").textContent(), /MISMATCH/);
  await page.click("#cancel-review");
  assert.equal(await page.locator("#review-stage").isVisible(), false);
  await page.setInputFiles("#review-file", {
    name: "valid-again.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await page.waitForSelector("#review-stage:not([hidden])");
  await page.selectOption("#review-decision", "approved");
  await page.setInputFiles("#review-file", {
    name: "invalid-replacement.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await page.waitForSelector("#error:not([hidden])");
  assert.equal(await page.locator("#review-stage").isVisible(), false);
  await page.setInputFiles("#review-file", {
    name: "valid-reset.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await page.waitForSelector("#review-stage:not([hidden])");
  assert.equal(
    await page.locator("#review-decision").inputValue(),
    "needs-evidence",
  );
  assert.equal(await page.locator("#review-notes").inputValue(), "");
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = async function () {
      await new Promise((r) => setTimeout(r, 500));
      return read.call(this);
    };
  });
  await page.setInputFiles("#review-file", {
    name: "delayed.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await page.selectOption("#pack-select", "demo:training-pack");
  await page.waitForTimeout(650);
  assert.equal(await page.locator("#review-stage").isVisible(), false);
  assert.deepEqual(await snapshots(), before);
  await page.setInputFiles("#review-file", {
    name: "hostile.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":1,"schemaVersion":1}'),
  });
  await page.waitForSelector("#error:not([hidden])");
  assert.match(await page.locator("#error").textContent(), /Duplicate/);
  await page.screenshot({
    path: "test-results/community-390.png",
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await context.close();
}
