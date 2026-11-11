import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch(),
  context = await browser.newContext(),
  page = await context.newPage(),
  base = "http://127.0.0.1:4173",
  pack = "official:mw4-dmz-starter";
const ready = () =>
  page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
const saved = () =>
  page.evaluate(
    async () =>
      (
        await (
          await import("/assets/src/storage/store.mjs")
        ).loadProfile("official:mw4-dmz-starter")
      )?.value,
  );
const confirm = async () => {
  await page.locator("#field-confirm").click();
  await page.waitForFunction(
    () => document.querySelector("#field-review").hidden,
  );
};
const raw = async (text) => {
  await page
    .getByText("Recognized text / manual text import", { exact: true })
    .click();
  await page.locator("#scan-text").fill(text);
  await page.locator("#scan-parse").click();
  await page.locator("#scan-preview").click();
};
try {
  await page.goto(base + "/field-desk/?pack=" + encodeURIComponent(pack));
  await ready();
  await raw("Bandage 10");
  await confirm();
  await page.locator("#field-query").fill("Bandage");
  await page.locator('[data-transfer-count="mw4:bandage"]').fill("2");
  await page.locator('[data-transfer-out="mw4:bandage"]').click();
  const before = await saved();
  const second = await context.newPage();
  await second.goto(base + "/field-desk/?pack=" + encodeURIComponent(pack));
  await second.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await second.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs"),
      { saveProfile } = await import("/assets/src/storage/store.mjs");
    const p = structuredClone(state.profile);
    p.inventory["mw4:bandage"] = 11;
    await saveProfile(p, state.revision, { label: "Synthetic competing tab" });
  });
  await page.locator("#field-confirm").click();
  await page.waitForFunction(() =>
    document.querySelector("#error")?.textContent.includes("Another tab"),
  );
  assert(await page.locator("#field-review").isVisible());
  const conflict = await saved();
  assert.equal(conflict.inventory["mw4:bandage"], 11);
  assert.equal(conflict.fieldOps.carried["mw4:bandage"], undefined);
  assert.equal(
    conflict.fieldOps.history.length,
    before.fieldOps.history.length + 1,
  );
  const dl = page.waitForEvent("download");
  await page.locator("#field-export-pending").click();
  await dl;
  await page.locator("#field-discard").click();
  await page.reload();
  await ready();
  await page
    .locator("#field-history details")
    .last()
    .locator("summary")
    .click();
  await page
    .locator("#field-history details")
    .last()
    .locator("[data-undo-field]")
    .click();
  await page.waitForFunction(() =>
    document.querySelector("#error")?.textContent.includes("Later edits"),
  );
  assert.equal((await saved()).inventory["mw4:bandage"], 11);
  const backup = await saved();
  await page
    .locator("#field-import")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          kind: "dmz-field-backup",
          version: 1,
          profile: backup,
          photos: [{ id: "bad" }],
        }),
      ),
    });
  await page.waitForFunction(() =>
    document.querySelector("#error")?.textContent.includes("photo"),
  );
  assert.deepEqual(await saved(), backup);
  assert(await page.locator("#field-review").isHidden());
  await page.locator("#field-discard").click();
  await page.locator("#field-reset-receipts").click();
  await confirm();
  assert.deepEqual((await saved()).fieldOps.receipts, []);
  assert.equal((await saved()).inventory["mw4:bandage"], 11);
  console.log(
    "PASS real IndexedDB two-tab CAS preserves newer quantity and journal; failed staged save remains exportable; conflicting undo and malformed photo backup reject without mutation; receipt reset preserves quantities",
  );
} finally {
  await browser.close();
}
