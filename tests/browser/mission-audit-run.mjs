import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { startBrowserServer } from "./server.mjs";

await writeFile("dist/__test-text-zoom.css", ":root{font-size:200%}");
const server = await startBrowserServer();
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (reason) => errors.push(reason.message));
  await page.goto(
    `${server.base}/missions/audit/?pack=official%3Amw4-dmz-starter`,
  );
  await page.locator("#mission-audit-pages button").first().waitFor();
  assert.equal(await page.locator("#mission-audit-pages button").count(), 24);
  assert.match(
    await page.locator("#mission-audit-summary").textContent(),
    /24 unrecorded/,
  );
  assert.match(
    await page.locator("#mission-audit-missions").textContent(),
    /No Order or Story Mission records/,
  );
  await page.locator("#mission-audit-pages button").first().click();
  await page.locator("#mission-audit-state").selectOption("fill-later");
  await page.locator("#mission-audit-note").fill("Check page roster later");
  await page.locator("#mission-audit-save").click();
  assert.match(
    await page.locator("#save-status").textContent(),
    /saved on this device/,
  );
  await page.reload();
  await page.locator("#mission-audit-pages button").first().waitFor();
  assert.match(
    await page.locator("#mission-audit-summary").textContent(),
    /1 sections to fill later/,
  );
  await page.locator("#mission-audit-filter").selectOption("fill-later");
  assert.equal(await page.locator("#mission-audit-pages button").count(), 1);
  await page.locator("#mission-audit-pages button").first().click();
  assert.equal(
    await page.locator("#mission-audit-note").inputValue(),
    "Check page roster later",
  );
  assert.equal(
    await page.locator("#mission-audit-state").inputValue(),
    "fill-later",
  );
  await page.locator("#mission-audit-pages button").first().focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#mission-audit-editor").isVisible(), true);
  await page.addStyleTag({ url: `${server.base}/__test-text-zoom.css` });
  assert.equal(errors.length, 0, errors.join("; "));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 2,
    ),
    false,
  );
  await page.goto(
    `${server.base}/data-review/?pack=official%3Amw4-dmz-starter`,
  );
  await page
    .locator("#mission-audit-health")
    .filter({ hasText: "1 sections marked Fill later" })
    .waitFor();
  await page.goto(
    `${server.base}/missions/audit/?pack=official%3Amw4-dmz-starter`,
  );
  await page.locator("#mission-audit-pages button").first().waitFor();
  await page.locator("#mission-audit-pages button").first().click();
  assert.equal(await page.locator("#mission-audit-undo").isDisabled(), false);
  await page.locator("#mission-audit-undo").click();
  await page.reload();
  await page.locator("#mission-audit-pages button").first().waitFor();
  assert.match(
    await page.locator("#mission-audit-summary").textContent(),
    /0 sections to fill later/,
  );
  await page.locator("#mission-audit-import").setInputFiles({
    name: "invalid-audit.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await page
    .locator("#mission-audit-import-preview")
    .filter({ hasText: "Import rejected" })
    .waitFor();
  assert.match(
    await page.locator("#mission-audit-import-preview").textContent(),
    /Import rejected/,
  );
  assert.equal(await page.locator("#mission-audit-restore").isVisible(), false);
  assert.match(
    await page.locator("#mission-audit-summary").textContent(),
    /0 sections to fill later/,
  );
  await page.locator("#mission-audit-pages button").first().click();
  await page.locator("#mission-audit-state").selectOption("fill-later");
  await page.locator("#mission-audit-save").click();
  await page.evaluate(() => {
    const key = "dmz:mission-audit:v1:official:mw4-dmz-starter";
    const audit = JSON.parse(localStorage.getItem(key));
    audit.entries[0].sourceFingerprint = "00000000";
    localStorage.setItem(key, JSON.stringify(audit));
  });
  await page.reload();
  await page.locator("#mission-audit-pages button").first().waitFor();
  await page.locator("#mission-audit-pages button").first().click();
  assert.equal(
    await page.locator("#mission-audit-stale-review-label").isVisible(),
    true,
  );
  await page.locator("#mission-audit-save").click();
  assert.match(
    await page.locator("#save-status").textContent(),
    /check the confirmation/,
  );
  await page.locator("#mission-audit-stale-review").check();
  await page.locator("#mission-audit-save").click();
  assert.equal(
    await page.locator("#mission-audit-stale-review-label").isVisible(),
    false,
  );
  assert.equal(
    await page.evaluate(() => {
      const audit = JSON.parse(
        localStorage.getItem("dmz:mission-audit:v1:official:mw4-dmz-starter"),
      );
      return audit.entries[0].sourceFingerprint === "00000000";
    }),
    false,
  );
  const savedAudit = await page.evaluate(() =>
    localStorage.getItem("dmz:mission-audit:v1:official:mw4-dmz-starter"),
  );
  const importAudit = JSON.parse(savedAudit);
  importAudit.entries[0].state = "needs-correction";
  await page.locator("#mission-audit-import").setInputFiles({
    name: "reviewed-audit.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importAudit)),
  });
  await page
    .locator("#mission-audit-import-preview")
    .filter({ hasText: "1 changed" })
    .waitFor();
  assert.match(
    await page.locator("#mission-audit-import-preview").textContent(),
    /0 added, 1 changed, 0 removed, 0 stale/,
  );
  await page.locator("#mission-audit-import-cancel").click();
  assert.equal(await page.locator("#mission-audit-restore").isVisible(), false);
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("dmz:mission-audit:v1:official:mw4-dmz-starter"),
    ),
    savedAudit,
  );
  await page.evaluate(() => {
    window.__auditFileText = File.prototype.text;
    File.prototype.text = function () {
      window.__auditReadStarted = true;
      return new Promise((resolve) => {
        window.__auditResolveRead = resolve;
      });
    };
  });
  await page.locator("#mission-audit-import").setInputFiles({
    name: "slow-audit.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importAudit)),
  });
  await page.waitForFunction(() => window.__auditReadStarted === true);
  await page.locator("#mission-audit-import-cancel").click();
  await page.evaluate((value) => {
    File.prototype.text = window.__auditFileText;
    window.__auditResolveRead(value);
  }, JSON.stringify(importAudit));
  assert.equal(await page.locator("#mission-audit-restore").isVisible(), false);
  assert.match(
    await page.locator("#mission-audit-import-preview").textContent(),
    /Import cancelled/,
  );
  await page
    .locator("#mission-audit-note")
    .fill("Keep this draft on failed save");
  await page.evaluate(() => {
    window.__auditOriginalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota reached", "QuotaExceededError");
    };
  });
  await page.locator("#mission-audit-save").click();
  assert.match(
    await page.locator("#save-status").textContent(),
    /Audit not saved/,
  );
  assert.equal(
    await page.locator("#mission-audit-note").inputValue(),
    "Keep this draft on failed save",
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__auditOriginalSetItem;
  });
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("dmz:mission-audit:v1:official:mw4-dmz-starter"),
    ),
    savedAudit,
  );
  await page.locator("#mission-audit-import").setInputFiles({
    name: "reviewed-audit.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importAudit)),
  });
  await page.locator("#mission-audit-restore").waitFor({ state: "visible" });
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator("#mission-audit-restore").click();
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("dmz:mission-audit:v1:official:mw4-dmz-starter"),
    ),
    savedAudit,
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#mission-audit-restore").click();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("dmz:mission-audit:v1:official:mw4-dmz-starter"),
        ).entries[0].state,
    ),
    "needs-correction",
  );
  await context.close();
  console.log(
    "Mission audit coverage, persistence, undo, import preview/cancel/restore, storage failure, stale review, keyboard and 390px/200% layout PASS",
  );
} finally {
  await browser.close();
  await server.stop();
}
