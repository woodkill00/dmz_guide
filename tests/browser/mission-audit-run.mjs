import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
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
  await page.goto(`${server.base}/missions/?pack=official%3Amw4-dmz-starter`);
  await page
    .locator('a[href="/missions/audit/"]')
    .first()
    .waitFor({ state: "attached" });
  await page.goto(`${server.base}/sitemap/`);
  await page
    .locator('a[href="/missions/audit/"]')
    .first()
    .waitFor({ state: "attached" });
  await page.goto(
    `${server.base}/missions/audit/?pack=official%3Amw4-dmz-starter`,
  );
  await page.locator("#mission-audit-pages button").first().waitFor();
  assert.equal(await page.locator("#mission-audit-pages button").count(), 24);
  assert.match(
    await page.locator("#mission-audit-summary").textContent(),
    /17 unrecorded/,
  );
  assert.equal(
    await page.locator("#mission-audit-missions button").count(),
    648,
  );
  const missionRows = await page
    .locator("#mission-audit-missions")
    .textContent();
  for (const label of [
    "Healer · page 7",
    "Healer · page 10",
    "No Time · The Grid 1/2",
    "No Time · reported page 23",
  ])
    assert(missionRows.includes(label), `Distinct audit label: ${label}`);
  await page.locator("#mission-audit-pages button").first().click();
  const createLink = await page
    .locator("#mission-audit-links a")
    .first()
    .getAttribute("href");
  const createTarget = new URL(createLink);
  assert.equal(createTarget.origin, "http://127.0.0.1:4174");
  assert.equal(createTarget.searchParams.get("create"), "objectives");
  assert.equal(createTarget.searchParams.get("packKey"), "official-starter");
  await page.locator("#mission-audit-state").selectOption("fill-later");
  await page.locator("#mission-audit-note").fill("Check page roster later");
  await page.locator("#mission-audit-save").click();
  await page
    .locator("#save-status")
    .filter({ hasText: "saved on this device" })
    .waitFor();
  assert.match(
    await page.locator("#save-status").textContent(),
    /saved on this device/,
  );
  assert.doesNotMatch(
    await page.locator("#mission-audit-pages").textContent(),
    /Check page roster later/,
  );
  const [auditDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#mission-audit-export").click(),
  ]);
  let exported = "";
  for await (const chunk of await auditDownload.createReadStream())
    exported += chunk.toString();
  assert.equal(JSON.parse(exported).entries[0].note, "Check page roster later");
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
  await page
    .locator("#mission-audit-summary")
    .filter({ hasText: "0 sections to fill later" })
    .waitFor();
  assert.equal(await page.locator("#mission-audit-undo").isDisabled(), true);
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
  await page
    .locator("#save-status")
    .filter({ hasText: "saved on this device" })
    .waitFor();
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
  await page
    .locator("#save-status")
    .filter({ hasText: "saved on this device" })
    .waitFor();
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
  const beforeImported = structuredClone(importAudit.entries[0]);
  importAudit.entries[0] = {
    ...beforeImported,
    state: "needs-correction",
    revision: beforeImported.revision + 1,
  };
  importAudit.history.push({
    id: beforeImported.id,
    before: beforeImported,
    after: importAudit.entries[0],
    at: new Date().toISOString(),
  });
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
  await page
    .locator("#save-status")
    .filter({ hasText: "Audit not saved" })
    .waitFor();
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
  await page
    .locator("#mission-audit-import-preview")
    .filter({ hasText: "Audit restored" })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("dmz:mission-audit:v1:official:mw4-dmz-starter"),
        ).entries[0].state,
    ),
    "needs-correction",
  );
  assert.equal(await page.locator("#mission-audit-undo").isDisabled(), true);
  await page.locator("#mission-audit-search").fill("page 1");
  assert.equal(await page.locator("#mission-audit-undo").isDisabled(), true);
  await page.reload();
  await page.locator("#mission-audit-pages button").first().click();
  assert.equal(await page.locator("#mission-audit-undo").isDisabled(), true);
  await context.close();
  const syntheticPack = JSON.parse(
    await readFile("dist/assets/content/packs/demo-training.json", "utf8"),
  );
  const order = syntheticPack.objectives.find(
    (objective) => objective.track === "dmz-order",
  );
  order.orderPage = 3;
  syntheticPack.objectives.push({
    ...structuredClone(order),
    id: "demo:secret-story-audit-test",
    name: "Hidden Story Name",
    description: "Protected synthetic story steps",
    track: "dmz-story",
    spoiler: true,
    orderPage: undefined,
  });
  const syntheticContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const syntheticPage = await syntheticContext.newPage();
  const syntheticErrors = [];
  syntheticPage.on("pageerror", (reason) =>
    syntheticErrors.push(reason.message),
  );
  await syntheticPage.route(
    "**/assets/content/packs/demo-training.json",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(syntheticPack),
      }),
  );
  await syntheticPage.goto(
    `${server.base}/missions/audit/?pack=demo%3Atraining-pack`,
  );
  await syntheticPage
    .locator("#mission-audit-missions button")
    .first()
    .waitFor();
  assert.equal(
    await syntheticPage.locator("#mission-audit-missions button").count(),
    18,
  );
  assert.match(
    await syntheticPage.locator("#mission-audit-summary").textContent(),
    /23 unrecorded/,
  );
  assert.doesNotMatch(
    await syntheticPage.locator("#mission-audit-missions").textContent(),
    /Hidden Story Name|Protected synthetic story steps/,
  );
  await syntheticPage
    .locator("#mission-audit-search")
    .fill("Hidden Story Name");
  assert.equal(
    await syntheticPage.locator("#mission-audit-missions button").count(),
    0,
  );
  await syntheticPage.locator("#mission-audit-search").fill("");
  await syntheticPage
    .locator("#mission-audit-missions button")
    .filter({ hasText: "Training delivery order · rewards" })
    .click();
  assert.match(
    await syntheticPage.locator("#mission-audit-evidence").textContent(),
    /No dedicated reward field/,
  );
  await syntheticPage.locator("#mission-audit-state").selectOption("checked");
  await syntheticPage.locator("#mission-audit-save").click();
  assert.match(
    await syntheticPage.locator("#mission-audit-evidence").textContent(),
    /No dedicated reward field/,
  );
  await syntheticPage
    .locator("#mission-audit-missions button")
    .filter({ hasText: "Spoiler-protected mission" })
    .first()
    .click();
  assert.equal(
    await syntheticPage.locator("#mission-audit-editor").isVisible(),
    false,
  );
  assert.equal(
    await syntheticPage.locator("#mission-audit-spoiler-notice").isVisible(),
    true,
  );
  await syntheticPage.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    state.profile.spoilers = true;
    document
      .querySelector("#mission-audit-filter")
      .dispatchEvent(new Event("input"));
  });
  assert.equal(
    await syntheticPage.locator("#mission-audit-editor").isVisible(),
    true,
  );
  assert.equal(
    (
      await syntheticPage
        .locator("#mission-audit-links a")
        .last()
        .getAttribute("href")
    ).includes("id=demo%3Asecret-story-audit-test"),
    true,
  );
  await syntheticPage
    .locator("#mission-audit-note")
    .fill("Protected private note");
  await syntheticPage.locator("#mission-audit-save").click();
  await syntheticPage
    .locator("#save-status")
    .filter({ hasText: "saved on this device" })
    .waitFor();
  await syntheticPage.evaluate(async () => {
    const { state } = await import("/assets/src/client/common.mjs");
    state.profile.spoilers = false;
    document
      .querySelector("#mission-audit-filter")
      .dispatchEvent(new Event("input"));
  });
  assert.equal(
    await syntheticPage.locator("#mission-audit-editor").isVisible(),
    false,
  );
  assert.equal(
    await syntheticPage.locator("#mission-audit-note").inputValue(),
    "",
  );
  assert.equal(
    await syntheticPage.locator("#mission-audit-links").textContent(),
    "",
  );
  assert.doesNotMatch(
    await syntheticPage.locator("#mission-audit-spoiler-notice").textContent(),
    /Protected private note/,
  );
  assert.deepEqual(syntheticErrors, []);
  await syntheticPage.screenshot({
    path: "test-results/mission-audit-synthetic-mobile.png",
    fullPage: true,
  });
  await syntheticContext.close();
  const raceContext = await browser.newContext();
  const tabA = await raceContext.newPage();
  const tabB = await raceContext.newPage();
  const auditUrl = `${server.base}/missions/audit/?pack=official%3Amw4-dmz-starter`;
  await Promise.all([tabA.goto(auditUrl), tabB.goto(auditUrl)]);
  await Promise.all([
    tabA.locator("#mission-audit-pages button").first().waitFor(),
    tabB.locator("#mission-audit-pages button").first().waitFor(),
  ]);
  await tabA.locator("#mission-audit-pages button").nth(1).click();
  await tabA
    .locator("#mission-audit-note")
    .fill("Page two draft stays visible");
  await tabA.locator("#mission-audit-search").fill("page 2");
  assert.equal(
    await tabA.locator("#mission-audit-note").inputValue(),
    "Page two draft stays visible",
  );
  await tabA.locator("#mission-audit-filter").selectOption("checked");
  assert.equal(
    await tabA.locator("#mission-audit-note").inputValue(),
    "Page two draft stays visible",
  );
  await tabA.locator("#mission-audit-save").click();
  await tabA
    .locator("#save-status")
    .filter({ hasText: "saved on this device" })
    .waitFor();
  await tabB.locator("#mission-audit-pages button").nth(2).click();
  await tabB.locator("#mission-audit-note").fill("Page three unsaved conflict");
  await tabB.locator("#mission-audit-save").click();
  await tabB
    .locator("#save-status")
    .filter({ hasText: "Another tab changed" })
    .waitFor();
  assert.equal(
    await tabB.locator("#mission-audit-note").inputValue(),
    "Page three unsaved conflict",
  );
  await tabB.reload();
  await tabB.locator("#mission-audit-pages button").nth(1).click();
  assert.equal(
    await tabB.locator("#mission-audit-note").inputValue(),
    "Page two draft stays visible",
  );
  await tabA.evaluate(() => {
    window.__auditLockWait = new Promise((resolve) => {
      window.__releaseAuditLock = resolve;
    });
    navigator.locks.request(
      "dmz:mission-audit:v1:official:mw4-dmz-starter",
      async () => {
        window.__auditLockHeld = true;
        await window.__auditLockWait;
      },
    );
  });
  await tabA.waitForFunction(() => window.__auditLockHeld === true);
  await tabB.locator("#mission-audit-pages button").nth(2).click();
  await tabB.locator("#mission-audit-note").fill("Save behind a held lock");
  await tabB.locator("#mission-audit-save").click();
  await tabB
    .locator("#save-status")
    .filter({ hasText: "Saving audit" })
    .waitFor();
  for (const selector of [
    "#mission-audit-note",
    "#mission-audit-state",
    "#mission-audit-search",
    "#mission-audit-filter",
    "#pack-select",
  ])
    assert.equal(await tabB.locator(selector).isDisabled(), true, selector);
  await tabA.evaluate(() => window.__releaseAuditLock());
  await tabB
    .locator("#save-status")
    .filter({ hasText: "saved on this device" })
    .waitFor();
  assert.equal(
    await tabB.locator("#mission-audit-note").inputValue(),
    "Save behind a held lock",
  );
  const restoreFile = await tabB.evaluate(() => {
    const value = JSON.parse(
      localStorage.getItem("dmz:mission-audit:v1:official:mw4-dmz-starter"),
    );
    value.entries[0].state = "checked";
    return JSON.stringify(value);
  });
  await tabB.locator("#mission-audit-import").setInputFiles({
    name: "held-restore.json",
    mimeType: "application/json",
    buffer: Buffer.from(restoreFile),
  });
  await tabB.locator("#mission-audit-restore").waitFor({ state: "visible" });
  await tabA.evaluate(() => {
    window.__auditLockHeld = false;
    window.__auditLockWait = new Promise((resolve) => {
      window.__releaseAuditLock = resolve;
    });
    navigator.locks.request(
      "dmz:mission-audit:v1:official:mw4-dmz-starter",
      async () => {
        window.__auditLockHeld = true;
        await window.__auditLockWait;
      },
    );
  });
  await tabA.waitForFunction(() => window.__auditLockHeld === true);
  await tabB.locator("#mission-audit-restore").click();
  await tabB
    .locator("#save-status")
    .filter({ hasText: "Saving audit" })
    .waitFor();
  assert.equal(
    await tabB.locator("#mission-audit-import-cancel").isDisabled(),
    true,
  );
  await tabB.evaluate(() =>
    document.querySelector("#mission-audit-import-cancel").click(),
  );
  assert.doesNotMatch(
    await tabB.locator("#mission-audit-import-preview").textContent(),
    /Import cancelled/,
  );
  await tabA.evaluate(() => window.__releaseAuditLock());
  await tabB
    .locator("#mission-audit-import-preview")
    .filter({ hasText: "Audit restored" })
    .waitFor();
  assert.equal(await tabB.locator("#mission-audit-undo").isDisabled(), true);
  await raceContext.close();
  console.log(
    "Mission audit coverage, draft filters, two-tab conflict, import recovery, keyboard and 390px/200% layout PASS",
  );
} finally {
  await browser.close();
  await server.stop();
}
